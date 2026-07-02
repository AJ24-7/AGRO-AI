"""Helpers to enrich crop recommendations with weather, photos, and news."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus
import xml.etree.ElementTree as ET

import requests


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"


CROP_IMAGE_FALLBACKS = {
    "rice": "https://images.unsplash.com/photo-1536053376604-99c8c5eb6c8b?auto=format&fit=crop&w=1400&q=80",
    "wheat": "https://images.unsplash.com/photo-1535379453347-1ffd615e2e08?auto=format&fit=crop&w=1400&q=80",
    "maize": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1400&q=80",
    "corn": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1400&q=80",
    "cotton": "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=1400&q=80",
    "sugarcane": "https://images.unsplash.com/photo-1619681393784-d120267933ba?auto=format&fit=crop&w=1400&q=80",
    "soybean": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=1400&q=80",
    "groundnut": "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=1400&q=80",
    "potato": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=1400&q=80",
    "banana": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=1400&q=80",
    "barley": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "mustard": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "linseed": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "chickpea": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "bajra": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "moong": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "coconut": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "pepper": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "spices": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "ragi": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "bengal gram": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "jute": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "chilli": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "pigeon pea": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "jowar": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "millets": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "cumin": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    "pulses": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
}


WEATHER_CODE_MAP = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def crop_image_url(crop_name: str) -> str:
    crop_key = (crop_name or "").strip().lower()
    if crop_key in CROP_IMAGE_FALLBACKS:
        return CROP_IMAGE_FALLBACKS[crop_key]
    query = quote_plus(f"{crop_name} crop farm field")
    return f"https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80&{query}"


def reverse_geocode(latitude: Optional[float], longitude: Optional[float]) -> Dict[str, Optional[str]]:
    if latitude is None or longitude is None:
        return {
            "latitude": None,
            "longitude": None,
            "country": None,
            "country_code": None,
            "state": None,
            "district": None,
            "location_label": None,
        }

    params = {
        "format": "jsonv2",
        "lat": latitude,
        "lon": longitude,
        "zoom": 10,
        "addressdetails": 1,
    }

    try:
        response = requests.get(
            NOMINATIM_REVERSE_URL,
            params=params,
            timeout=8,
            headers={"User-Agent": "AgroAI/1.0"},
        )
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return {
            "latitude": latitude,
            "longitude": longitude,
            "country": None,
            "country_code": None,
            "state": None,
            "district": None,
            "location_label": None,
        }

    address = payload.get("address") or {}
    return {
        "latitude": latitude,
        "longitude": longitude,
        "country": address.get("country"),
        "country_code": (address.get("country_code") or "").upper() or None,
        "state": address.get("state") or address.get("region") or address.get("province"),
        "district": address.get("county") or address.get("state_district") or address.get("city") or address.get("town"),
        "location_label": payload.get("display_name"),
    }


def fetch_weather(latitude: Optional[float], longitude: Optional[float]) -> Optional[Dict[str, Any]]:
    if latitude is None or longitude is None:
        return None

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,wind_speed_10m,precipitation,weather_code",
        "timezone": "auto",
    }

    try:
        response = requests.get(OPEN_METEO_URL, params=params, timeout=8)
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return None

    current = payload.get("current") or {}
    weather_code = current.get("weather_code")
    return {
        "temperature_c": current.get("temperature_2m"),
        "wind_speed_kph": current.get("wind_speed_10m"),
        "precipitation_mm": current.get("precipitation"),
        "weather_code": weather_code,
        "weather_summary": WEATHER_CODE_MAP.get(weather_code, "Weather update unavailable"),
    }


def fetch_crop_news(crop_name: str,
                    location_context: Optional[Dict[str, Optional[str]]] = None,
                    limit: int = 3) -> List[Dict[str, str]]:
    location_context = location_context or {}
    state = (location_context.get("state") or "").strip()
    district = (location_context.get("district") or "").strip()
    country = (location_context.get("country") or "").strip()
    country_code = (location_context.get("country_code") or "IN").strip().upper()

    location_terms = " ".join([part for part in [district, state, country] if part])
    query = f"{crop_name} farming agriculture"
    if location_terms:
        query = f"{query} {location_terms}"

    language = "en-IN" if country_code == "IN" else "en-US"
    params = {
        "q": query,
        "hl": language,
        "gl": country_code,
        "ceid": f"{country_code}:en",
    }

    try:
        response = requests.get(GOOGLE_NEWS_RSS, params=params, timeout=8)
        response.raise_for_status()
        root = ET.fromstring(response.text)
    except Exception:
        return []

    news: List[Dict[str, str]] = []
    for item in root.findall("./channel/item")[:limit]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        published_at = (item.findtext("pubDate") or "").strip()

        if not title or not link:
            continue

        normalized_date = None
        if published_at:
            try:
                parsed = datetime.strptime(published_at, "%a, %d %b %Y %H:%M:%S %Z")
                normalized_date = parsed.isoformat()
            except Exception:
                normalized_date = published_at

        news.append({
            "title": title,
            "link": link,
            "published_at": normalized_date,
        })

    return news


def build_crop_insight(crop_name: str,
                       latitude: Optional[float] = None,
                       longitude: Optional[float] = None,
                       news_limit: int = 3) -> Dict[str, Any]:
    location_context = reverse_geocode(latitude, longitude)
    return {
        "crop_name": crop_name,
        "crop_image_url": crop_image_url(crop_name),
        "weather": fetch_weather(latitude, longitude),
        "news": fetch_crop_news(crop_name, location_context=location_context, limit=news_limit),
        "location": location_context,
    }
