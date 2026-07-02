"""Contextual farming assistant with persistent chat history."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Any, List
from urllib import parse, request
import json
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..config import settings
from ..ml.farm_location import build_farm_location_profile

router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])

INTENT_KEYWORDS = {
    "crop":       ["crop", "grow", "plant", "seed", "variety", "sow", "harvest"],
    "fertilizer": ["fertilizer", "urea", "dap", "nutrient", "npk", "compost", "manure"],
    "disease":    ["disease", "leaf", "infection", "fungus", "pest", "blight", "rust", "treat", "spot"],
    "soil":       ["soil", "ph", "nitrogen", "phosphorus", "potassium", "moisture", "clay", "loam"],
    "weather":    ["weather", "rain", "temperature", "drought", "flood", "season", "monsoon", "humidity"],
    "farm":       ["farm", "land", "field", "plot", "area", "acre", "hectare", "irrigation"],
    "market":     ["price", "market", "sell", "profit", "mandi", "rate", "income", "export"],
    "greeting":   ["hello", "hi", "hey", "help", "start", "what can", "how do"],
}


def _detect_intent(text: str) -> str:
    lowered = text.lower()
    # Score each intent by number of keyword matches to pick most relevant
    scores = {intent: 0 for intent in INTENT_KEYWORDS}
    for intent, keywords in INTENT_KEYWORDS.items():
        for kw in keywords:
            if kw in lowered:
                scores[intent] += 1
    best = max(scores, key=lambda i: scores[i])
    return best if scores[best] > 0 else "greeting"


def _is_unknown_weather(summary: str | None) -> bool:
    if not summary:
        return True
    lowered = summary.strip().lower()
    return lowered.startswith("unknown weather") or lowered in {"unknown", "n/a", "na", "none"}


def _normalize_weather_summary(
    summary: str | None,
    temperature_c: float | None,
    precipitation_mm: float | None,
    wind_speed_kph: float | None,
) -> str:
    if not _is_unknown_weather(summary):
        return summary or "Weather data unavailable"

    metrics: list[str] = []
    if temperature_c is not None:
        metrics.append(f"{temperature_c:.1f}°C")
    if precipitation_mm is not None:
        metrics.append(f"{precipitation_mm:.1f} mm rain")
    if wind_speed_kph is not None:
        metrics.append(f"{wind_speed_kph:.1f} km/h wind")

    if metrics:
        return f"Current conditions: {' · '.join(metrics)}"
    return "Weather data temporarily unavailable"


def _farm_context(db: Session, user_id: int) -> schemas.ChatFarmContext:
    farms = db.query(models.Farm).filter(models.Farm.user_id == user_id).all()
    latest_farm = (
        db.query(models.Farm)
        .filter(models.Farm.user_id == user_id)
        .order_by(models.Farm.id.desc())
        .first()
    )

    if latest_farm is None:
        return schemas.ChatFarmContext(total_farms=0)

    rec_crops = latest_farm.recommended_crops or []
    crop_labels = [item.get("crop") for item in rec_crops if isinstance(item, dict) and item.get("crop")]

    weather_summary = latest_farm.weather_summary
    # If weather text is unknown, try one refresh from live coordinates and persist it.
    if _is_unknown_weather(weather_summary) and latest_farm.latitude is not None and latest_farm.longitude is not None:
        try:
            profile = build_farm_location_profile(
                latest_farm.latitude,
                latest_farm.longitude,
                latest_farm.boundary_points,
            )
            refreshed_summary = profile.get("weather_summary")
            if refreshed_summary:
                weather_summary = refreshed_summary
                latest_farm.weather_summary = refreshed_summary
                latest_farm.weather_code = profile.get("weather_code")
                latest_farm.temperature_c = profile.get("temperature_c")
                latest_farm.precipitation_mm = profile.get("precipitation_mm")
                latest_farm.wind_speed_kph = profile.get("wind_speed_kph")
                db.commit()
        except Exception:
            # Keep existing stored values and normalize below.
            pass

    weather_summary = _normalize_weather_summary(
        weather_summary,
        latest_farm.temperature_c,
        latest_farm.precipitation_mm,
        latest_farm.wind_speed_kph,
    )

    return schemas.ChatFarmContext(
        total_farms=len(farms),
        latest_farm_name=latest_farm.farm_name,
        latest_location=latest_farm.location_label or latest_farm.location,
        weather_summary=weather_summary,
        recommended_crops=crop_labels[:5],
    )


def _crop_context(db: Session, user_id: int) -> schemas.ChatCropContext:
    latest = (
        db.query(models.CropRecommendation)
        .filter(models.CropRecommendation.user_id == user_id)
        .order_by(models.CropRecommendation.id.desc())
        .first()
    )
    top_crops_query = (
        db.query(models.CropRecommendation.recommended_crop, func.count().label("count"))
        .filter(models.CropRecommendation.user_id == user_id)
        .group_by(models.CropRecommendation.recommended_crop)
        .order_by(func.count().desc())
        .limit(3)
        .all()
    )
    top_crops = [row[0] for row in top_crops_query if row[0]]

    if latest is None:
        return schemas.ChatCropContext(top_crops=top_crops)

    return schemas.ChatCropContext(
        latest_crop=latest.recommended_crop,
        latest_confidence=latest.confidence,
        top_crops=top_crops,
    )


def _knowledge_links(intent: str) -> List[schemas.ChatKnowledgeLink]:
    links_by_intent = {
        "crop": [
            schemas.ChatKnowledgeLink(title="FAO Crop Calendars", url="https://www.fao.org/giews/countrybrief/country.jsp"),
            schemas.ChatKnowledgeLink(title="ICAR Research Portal", url="https://icar.gov.in/"),
        ],
        "fertilizer": [
            schemas.ChatKnowledgeLink(title="Integrated Nutrient Management (FAO)", url="https://www.fao.org/soils-portal/soil-management/soil-fertility/en/"),
            schemas.ChatKnowledgeLink(title="Soil Health Card Portal", url="https://soilhealth.dac.gov.in/"),
        ],
        "disease": [
            schemas.ChatKnowledgeLink(title="FAO Plant Pests & Diseases", url="https://www.fao.org/plant-health/"),
            schemas.ChatKnowledgeLink(title="Plantwise Knowledge Bank", url="https://plantwiseplusknowledgebank.org/"),
        ],
        "soil": [
            schemas.ChatKnowledgeLink(title="ICAR Soil Testing Labs", url="https://icar.gov.in/"),
            schemas.ChatKnowledgeLink(title="FAO Soil Portal", url="https://www.fao.org/soils-portal/en/"),
        ],
        "weather": [
            schemas.ChatKnowledgeLink(title="Open-Meteo Live Forecast", url="https://open-meteo.com/"),
            schemas.ChatKnowledgeLink(title="IMD Agromet Advisory", url="https://www.imd.gov.in/pages/agromet_main.php"),
        ],
        "farm": [
            schemas.ChatKnowledgeLink(title="Open-Meteo Weather", url="https://open-meteo.com/"),
            schemas.ChatKnowledgeLink(title="FAO Climate-Smart Agriculture", url="https://www.fao.org/climate-smart-agriculture/"),
        ],
        "market": [
            schemas.ChatKnowledgeLink(title="Agmarknet Commodity Prices", url="https://agmarknet.gov.in/"),
            schemas.ChatKnowledgeLink(title="eNAM – National Agriculture Market", url="https://www.enam.gov.in/"),
        ],
        "greeting": [
            schemas.ChatKnowledgeLink(title="AgroPilot Help Centre", url="https://icar.gov.in/"),
        ],
    }
    return links_by_intent.get(intent, links_by_intent["greeting"])


def _safe_json_get(url: str) -> dict[str, Any]:
    req = request.Request(url, headers={"User-Agent": "AgroPilotAI/1.0"})
    with request.urlopen(req, timeout=6) as response:
        return json.loads(response.read().decode("utf-8"))


def _web_query(intent: str, message: str, farm_ctx: schemas.ChatFarmContext, crop_ctx: schemas.ChatCropContext) -> str:
    place = farm_ctx.latest_location or farm_ctx.latest_farm_name or "India"
    crop = crop_ctx.latest_crop or "crop"
    if intent == "crop":
        return f"best crops to plant now near {place} with current weather and season"
    if intent == "fertilizer":
        return f"best fertilizer schedule for {crop} by growth stage"
    if intent == "disease":
        return f"latest treatment and prevention guidelines for {message} crop disease"
    if intent == "soil":
        return "optimal NPK and soil pH ranges for major food crops"
    if intent == "weather":
        return f"agricultural weather advisory for {place}"
    if intent == "market":
        return f"latest mandi and wholesale market price trends for {crop} in India"
    if intent == "farm":
        return f"precision farming best practices for small farms in {place}"
    return message


def _web_query_candidates(intent: str, message: str, farm_ctx: schemas.ChatFarmContext, crop_ctx: schemas.ChatCropContext) -> List[str]:
    place = farm_ctx.latest_location or farm_ctx.latest_farm_name or "India"
    crop = crop_ctx.latest_crop or "crop"
    weather = (farm_ctx.weather_summary or "").lower()
    base = _web_query(intent, message, farm_ctx, crop_ctx)
    candidates: list[str] = [base, f"{message} agriculture"]

    if intent == "crop":
        candidates.extend([
            f"seasonal crop calendar {place}",
            "kharif rabi crop selection India",
            "drought tolerant crops India" if "0.0 mm" in weather or "dry" in weather else "best crops by monsoon season India",
        ])
    elif intent == "fertilizer":
        candidates.extend([
            f"NPK fertilizer schedule for {crop}",
            "integrated nutrient management guidelines FAO",
        ])
    elif intent == "disease":
        candidates.extend([
            f"common diseases in {crop} and treatment",
            "plant disease management FAO guidelines",
        ])
    elif intent == "soil":
        candidates.extend([
            "soil pH and NPK optimal ranges for crops",
            "soil health card recommendation guide India",
        ])
    elif intent == "weather":
        candidates.extend([
            f"agromet advisory {place}",
            "farm weather irrigation planning guide",
        ])
    elif intent == "market":
        candidates.extend([
            f"{crop} mandi price trend India",
            "eNAM commodity prices today",
        ])
    else:
        candidates.extend([
            f"smart farming guide {place}",
            "FAO climate smart agriculture practices",
        ])

    deduped: list[str] = []
    seen = set()
    for query in candidates:
        key = query.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(query.strip())
    return deduped[:6]


def _extract_ddg_related_topics(items: list[dict[str, Any]], limit: int) -> list[schemas.ChatWebResult]:
    results: list[schemas.ChatWebResult] = []
    for item in items:
        if len(results) >= limit:
            break
        if "Topics" in item and isinstance(item["Topics"], list):
            nested = _extract_ddg_related_topics(item["Topics"], limit - len(results))
            results.extend(nested)
            continue
        text = item.get("Text")
        url = item.get("FirstURL")
        if not text or not url:
            continue
        title = text.split(" - ")[0].strip()[:120]
        snippet = text[:220]
        results.append(
            schemas.ChatWebResult(
                title=title or "Web source",
                url=url,
                snippet=snippet,
                source="DuckDuckGo",
            )
        )
    return results


def _wiki_results(query: str, limit: int = 3) -> list[schemas.ChatWebResult]:
    params = parse.urlencode({
        "action": "opensearch",
        "search": query,
        "limit": str(limit),
        "namespace": "0",
        "format": "json",
    })
    try:
        req = request.Request(
            f"https://en.wikipedia.org/w/api.php?{params}",
            headers={"User-Agent": "AgroPilotAI/1.0"},
        )
        with request.urlopen(req, timeout=6) as response:
            payload = json.loads(response.read().decode("utf-8"))

        titles = payload[1] if isinstance(payload, list) and len(payload) > 1 else []
        snippets = payload[2] if isinstance(payload, list) and len(payload) > 2 else []
        urls = payload[3] if isinstance(payload, list) and len(payload) > 3 else []

        results: list[schemas.ChatWebResult] = []
        for title, snippet, url in zip(titles, snippets, urls):
            if not title or not url:
                continue
            results.append(
                schemas.ChatWebResult(
                    title=str(title)[:120],
                    url=str(url),
                    snippet=(str(snippet) or f"Reference article about {title}.")[:240],
                    source="Wikipedia",
                )
            )
        return results
    except Exception:
        return []


def _dedupe_web_results(items: List[schemas.ChatWebResult], limit: int = 4) -> List[schemas.ChatWebResult]:
    seen_urls = set()
    deduped: list[schemas.ChatWebResult] = []
    for item in items:
        if item.url in seen_urls:
            continue
        seen_urls.add(item.url)
        deduped.append(item)
        if len(deduped) >= limit:
            break
    return deduped


def _live_search_link_results(query: str) -> list[schemas.ChatWebResult]:
    encoded = parse.quote_plus(query)
    return [
        schemas.ChatWebResult(
            title=f"Live search: {query[:80]}",
            url=f"https://duckduckgo.com/?q={encoded}",
            snippet="Direct live web search link generated for this query.",
            source="DuckDuckGo Search",
        ),
        schemas.ChatWebResult(
            title=f"Google search: {query[:80]}",
            url=f"https://www.google.com/search?q={encoded}",
            snippet="Alternative live web search link for broader results.",
            source="Google Search",
        ),
    ]


def _web_results(intent: str, message: str, farm_ctx: schemas.ChatFarmContext, crop_ctx: schemas.ChatCropContext) -> List[schemas.ChatWebResult]:
    candidates = _web_query_candidates(intent, message, farm_ctx, crop_ctx)
    results: list[schemas.ChatWebResult] = []

    for query in candidates:
        if len(results) >= 4:
            break

        params = parse.urlencode({
            "q": query,
            "format": "json",
            "no_html": "1",
            "skip_disambig": "1",
        })

        try:
            data = _safe_json_get(f"https://api.duckduckgo.com/?{params}")
            abstract = (data.get("AbstractText") or "").strip()
            abstract_url = data.get("AbstractURL")
            heading = (data.get("Heading") or "").strip()
            if abstract and abstract_url:
                results.append(
                    schemas.ChatWebResult(
                        title=heading or "Web summary",
                        url=abstract_url,
                        snippet=abstract[:260],
                        source=(data.get("AbstractSource") or "DuckDuckGo"),
                    )
                )

            related = data.get("RelatedTopics") or []
            if isinstance(related, list):
                results.extend(_extract_ddg_related_topics(related, limit=max(0, 4 - len(results))))
        except Exception:
            pass

        if len(results) < 3:
            results.extend(_wiki_results(query, limit=max(0, 4 - len(results))))

        results = _dedupe_web_results(results, limit=4)

    if results:
        return results

    # Hard fallback: always provide live search URLs for this specific query so user gets web-specific paths.
    fallback_query = candidates[0] if candidates else message
    return _dedupe_web_results(_live_search_link_results(fallback_query), limit=2)


# ─── Intent-specific, context-aware responses ─────────────────────────────────

def _action_items(
    intent: str,
    message: str,
    farm_ctx: schemas.ChatFarmContext,
    crop_ctx: schemas.ChatCropContext,
) -> List[str]:
    """Return 3 actionable steps that are specific to intent + live user context."""
    farm = farm_ctx.latest_farm_name or "your farm"
    crop = crop_ctx.latest_crop or "your crop"
    conf = f"{crop_ctx.latest_confidence}%" if crop_ctx.latest_confidence is not None else "unknown"

    if intent == "crop":
        top = ", ".join(crop_ctx.top_crops) if crop_ctx.top_crops else "none yet"
        return [
            f"Your top recommended crops are: {top}. Re-run recommendation after the next soil test.",
            f"Validate {crop} (confidence {conf}) against local market demand and seasonal calendar.",
            "Ensure N-P-K and pH values are updated in Soil Analysis before next cycle.",
        ]
    if intent == "fertilizer":
        return [
            f"Pull the latest Fertilizer Plan for {crop} on the Fertilizer page before purchasing.",
            "Split basal dose at sowing and top-dress at tillering/flowering stages to reduce losses.",
            "Avoid applying fertilizer within 48 h of expected heavy rain — monitor weather on your farm.",
        ]
    if intent == "disease":
        recs = ", ".join(farm_ctx.recommended_crops) if farm_ctx.recommended_crops else crop
        return [
            f"Upload a clear leaf photo on the Disease Detection page — {recs} is most at risk right now.",
            "Isolate infected plants and apply the suggested treatment within 24 h of detection.",
            "Re-scan every 4 days until confidence drops below 30% to confirm recovery.",
        ]
    if intent == "soil":
        return [
            "Upload your latest soil report (OCR) on the Soil Analysis page for precise N-P-K data.",
            f"pH outside 5.5–7.5 on {farm} requires lime or sulphur amendment before next sowing.",
            "Run a fresh Crop Recommendation immediately after each soil test upload.",
        ]
    if intent == "weather":
        wx = farm_ctx.weather_summary or "not yet available"
        return [
            f"Current weather on {farm}: {wx}. Check forecast before irrigation scheduling.",
            "Delay fertilizer application if precipitation > 20 mm forecast within 48 h.",
            "Use the Farm Profile page to keep GPS-linked weather summaries current.",
        ]
    if intent == "farm":
        return [
            f"You have {farm_ctx.total_farms} farm(s) registered. Add precise GPS boundary for accurate area and weather.",
            f"Review recommended crops for {farm}: {', '.join(farm_ctx.recommended_crops) or 'run a recommendation first'}.",
            "Update farm profile after every major change in irrigation source or land use.",
        ]
    if intent == "market":
        return [
            f"Check Agmarknet for live {crop} mandi prices before committing to a sale.",
            "Compare eNAM rates across nearby markets to pick the highest buyer.",
            f"Plan harvest timing for {farm} to align with peak price periods in your region.",
        ]
    # greeting / fallback
    return [
        "Try: 'What crop should I plant?' or 'How do I treat leaf rust?'",
        "Upload a soil report for AI-powered crop and fertilizer recommendations.",
        "Visit Disease Detection to scan any suspicious plant photo right now.",
    ]


def _analysis(
    intent: str,
    message: str,
    farm_ctx: schemas.ChatFarmContext,
    crop_ctx: schemas.ChatCropContext,
) -> str:
    """Short diagnostic string shown as metadata on the response card."""
    crop_label = crop_ctx.latest_crop or "none"
    conf = f"{crop_ctx.latest_confidence}%" if crop_ctx.latest_confidence is not None else "—"
    farm_label = farm_ctx.latest_farm_name or "none"
    wx = farm_ctx.weather_summary or "—"
    word_count = len(message.split())
    return (
        f"Intent: {intent} · Words: {word_count} · "
        f"Farm: {farm_label} · Weather: {wx} · "
        f"Latest crop: {crop_label} ({conf} confidence)"
    )


def _compose_reply(
    intent: str,
    message: str,
    farm_ctx: schemas.ChatFarmContext,
    crop_ctx: schemas.ChatCropContext,
    actions: List[str],
    web_results: List[schemas.ChatWebResult],
) -> str:
    """Build a concise, grounded answer with optional OSS-LLM synthesis."""
    provider = (settings.CHATBOT_LLM_PROVIDER or "none").strip().lower()
    if provider == "ollama":
        llm_reply = _compose_with_ollama(intent, message, farm_ctx, crop_ctx, actions, web_results)
        if llm_reply:
            return llm_reply

    return _compose_fallback(intent, message, farm_ctx, crop_ctx, actions, web_results)


def _primary_crop(farm_ctx: schemas.ChatFarmContext, crop_ctx: schemas.ChatCropContext) -> str:
    if farm_ctx.recommended_crops:
        return farm_ctx.recommended_crops[0]
    if crop_ctx.top_crops:
        return crop_ctx.top_crops[0]
    if crop_ctx.latest_crop:
        return crop_ctx.latest_crop
    return "Wheat"


def _format_web_evidence(web_results: List[schemas.ChatWebResult], limit: int = 3) -> str:
    if not web_results:
        return "- Live sources not available in this attempt."
    lines: list[str] = []
    for idx, item in enumerate(web_results[:limit], start=1):
        snippet = (item.snippet or "").replace("\n", " ").strip()
        if len(snippet) > 170:
            snippet = f"{snippet[:167]}..."
        lines.append(f"{idx}. {item.title} ({item.source}): {snippet}")
    return "\n".join(lines)


def _compose_prompt(
    intent: str,
    message: str,
    farm_ctx: schemas.ChatFarmContext,
    crop_ctx: schemas.ChatCropContext,
    actions: List[str],
    web_results: List[schemas.ChatWebResult],
) -> str:
    location = farm_ctx.latest_location or farm_ctx.latest_farm_name or "your area"
    weather = farm_ctx.weather_summary or "weather data unavailable"
    primary_crop = _primary_crop(farm_ctx, crop_ctx)
    evidence = _format_web_evidence(web_results, limit=3)
    top_crops = ", ".join(crop_ctx.top_crops[:3]) if crop_ctx.top_crops else "not available"
    action_hint = actions[0] if actions else "Use the recommendation and monitor weather weekly."

    return (
        "You are an agriculture copilot. Generate a concise actionable answer from provided evidence only.\n"
        "Do not dump full text. No long paragraphs. No markdown tables.\n"
        "\n"
        "Required response style:\n"
        "1) Start with: 'Based on your location ...'\n"
        "2) Give the best direct recommendation first (for crop intent, exactly one primary crop to plant now).\n"
        "3) Add 2-3 short bullet points of supporting web evidence.\n"
        "4) End with a follow-up question like: 'Would you like the step-by-step growing method?'.\n"
        "\n"
        f"Intent: {intent}\n"
        f"User question: {message}\n"
        f"Location: {location}\n"
        f"Weather summary: {weather}\n"
        f"Primary crop candidate: {primary_crop}\n"
        f"Top saved crops: {top_crops}\n"
        f"Action hint: {action_hint}\n"
        "Web evidence:\n"
        f"{evidence}\n"
    )


def _compose_with_ollama(
    intent: str,
    message: str,
    farm_ctx: schemas.ChatFarmContext,
    crop_ctx: schemas.ChatCropContext,
    actions: List[str],
    web_results: List[schemas.ChatWebResult],
) -> str:
    prompt = _compose_prompt(intent, message, farm_ctx, crop_ctx, actions, web_results)
    payload = json.dumps(
        {
            "model": settings.CHATBOT_OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.2,
            },
        }
    ).encode("utf-8")

    endpoint = f"{settings.CHATBOT_OLLAMA_BASE_URL.rstrip('/')}/api/generate"
    req = request.Request(
        endpoint,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "AgroPilotAI/1.0"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=settings.CHATBOT_LLM_TIMEOUT_SECONDS) as response:
            data = json.loads(response.read().decode("utf-8"))
        text = (data.get("response") or "").strip()
        return text
    except Exception:
        return ""


def _compose_fallback(
    intent: str,
    message: str,
    farm_ctx: schemas.ChatFarmContext,
    crop_ctx: schemas.ChatCropContext,
    actions: List[str],
    web_results: List[schemas.ChatWebResult],
) -> str:
    location = farm_ctx.latest_location or farm_ctx.latest_farm_name or "your area"
    weather = farm_ctx.weather_summary or "weather data unavailable"
    crop = _primary_crop(farm_ctx, crop_ctx)

    evidence = []
    for item in web_results[:2]:
        snippet = (item.snippet or "").replace("\n", " ").strip()
        if len(snippet) > 140:
            snippet = f"{snippet[:137]}..."
        evidence.append(f"- {item.title}: {snippet}")

    if not evidence:
        evidence.append("- Live web snippets were not available; please open the source links for latest advisory.")

    if intent == "crop":
        return (
            f"Based on your location {location} and current weather ({weather}), you should plant {crop} in this cycle.\n"
            "Why this is suitable now:\n"
            f"{chr(10).join(evidence)}\n"
            f"Immediate next step: {(actions[0] if actions else 'Prepare seed and field, then verify moisture before sowing.')}\n"
            "Would you like the step-by-step growing method for this crop?"
        )

    return (
        f"Based on your location {location} and current weather ({weather}), here is the best next action for '{message}':\n"
        f"{(actions[0] if actions else 'Use the top recommendation and verify local advisory before applying it.')}\n"
        "Web-backed notes:\n"
        f"{chr(10).join(evidence)}\n"
        "Would you like a step-by-step implementation plan?"
    )


def _save_message(db: Session, user_id: int, session_id: str, role: str, content: str,
                  intent: str = None, meta_json=None):
    record = models.ChatMessage(
        user_id=user_id,
        session_id=session_id or "default",
        role=role,
        content=content,
        intent=intent,
        meta_json=meta_json,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/ask", response_model=schemas.ChatReply)
def ask(payload: schemas.ChatInput,
        db: Session = Depends(get_db),
        user=Depends(get_current_user)):
    message = payload.message.strip()
    if not message:
        message = "help"

    intent = _detect_intent(message)
    farm_ctx = _farm_context(db, user.id)
    crop_ctx = _crop_context(db, user.id)
    actions = _action_items(intent, message, farm_ctx, crop_ctx)
    analysis = _analysis(intent, message, farm_ctx, crop_ctx)
    web_results = _web_results(intent, message, farm_ctx, crop_ctx)
    if not web_results:
        web_results = _live_search_link_results(_web_query(intent, message, farm_ctx, crop_ctx))
    knowledge_links = _knowledge_links(intent)
    if web_results:
        knowledge_links = knowledge_links + [
            schemas.ChatKnowledgeLink(title=item.title, url=item.url) for item in web_results
        ]
    reply = _compose_reply(intent, message, farm_ctx, crop_ctx, actions, web_results)

    _save_message(db, user.id, payload.session_id or "default", "user", message, intent=intent)
    _save_message(
        db,
        user.id,
        payload.session_id or "default",
        "assistant",
        reply,
        intent=intent,
        meta_json={
            "analysis": analysis,
            "action_items": actions,
            "farm_context": farm_ctx.model_dump(),
            "crop_context": crop_ctx.model_dump(),
            "knowledge_links": [link.model_dump() for link in knowledge_links],
            "web_results": [item.model_dump() for item in web_results],
        },
    )

    return {
        "reply": reply,
        "intent": intent,
        "analysis": analysis,
        "action_items": actions,
        "farm_context": farm_ctx,
        "crop_context": crop_ctx,
        "knowledge_links": knowledge_links,
        "web_results": web_results,
    }


@router.get("/history", response_model=List[schemas.ChatMessageOut])
def history(limit: int = Query(default=60, ge=1, le=300),
            session_id: str = Query(default="default"),
            db: Session = Depends(get_db),
            user=Depends(get_current_user)):
    rows = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.user_id == user.id,
                models.ChatMessage.session_id == session_id)
        .order_by(models.ChatMessage.created_at.desc(), models.ChatMessage.id.desc())
        .limit(limit)
        .all()
    )
    rows.reverse()
    return rows


@router.delete("/history")
def clear_history(session_id: str = Query(default="default"),
                  db: Session = Depends(get_db),
                  user=Depends(get_current_user)):
    (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.user_id == user.id,
                models.ChatMessage.session_id == session_id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"message": "Chat history cleared."}
