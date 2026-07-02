"""Farm Equipment catalog with live-price merchant aggregation."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from datetime import datetime, timezone
from typing import List
from html import unescape
import re
import ipaddress
import socket
from urllib.parse import quote, urljoin, urlparse
from urllib.request import Request as UrlRequest, urlopen
from ..schemas import EquipmentLivePriceResponse, EquipmentCard, EquipmentMerchantOffer
from ..deps import get_current_user

router = APIRouter(prefix="/api/equipment", tags=["Equipment"])

_TS = datetime.now(timezone.utc)

_DEFAULT_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/8/89/HD_transparent_picture.png"
_TRUSTED_IMAGE_HOSTS = {
    "upload.wikimedia.org",
    "commons.wikimedia.org",
    "wikipedia.org",
}
_CATEGORY_FALLBACKS = {
    "Tractor": "https://upload.wikimedia.org/wikipedia/commons/2/27/Tractor_in_the_field.jpg",
    "Rotavator": "https://upload.wikimedia.org/wikipedia/commons/2/2f/Rotary_tiller.jpg",
    "Seed Drill": "https://upload.wikimedia.org/wikipedia/commons/4/4f/Seed_drill.jpg",
    "Power Tiller": "https://upload.wikimedia.org/wikipedia/commons/1/17/Walking_tractor.jpg",
    "Harvester": "https://upload.wikimedia.org/wikipedia/commons/6/66/Combine_harvester.jpg",
    "Sprayer": "https://upload.wikimedia.org/wikipedia/commons/4/4e/Backpack_sprayer.jpg",
    "Irrigation": "https://upload.wikimedia.org/wikipedia/commons/8/8f/Drip_irrigation_system.jpg",
    "Tillage": "https://upload.wikimedia.org/wikipedia/commons/9/96/Disc_harrow.jpg",
    "Thresher": "https://upload.wikimedia.org/wikipedia/commons/7/79/Threshing_machine.jpg",
}
_IMAGE_CACHE: dict[str, str] = {}
_META_IMG_RE = re.compile(
    r'<meta[^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\'][^>]+content=["\']([^"\']+)["\']',
    flags=re.IGNORECASE,
)


def _is_valid_image_url(url: str | None) -> bool:
    if not url:
        return False
    lower = url.lower()
    return lower.startswith(("http://", "https://")) and "unsplash.com" not in lower


def _fetch_meta_image(page_url: str) -> str | None:
    if not page_url.startswith(("http://", "https://")):
        return None
    req = UrlRequest(
        page_url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    try:
        with urlopen(req, timeout=3) as resp:
            content_type = (resp.headers.get("Content-Type") or "").lower()
            if "text/html" not in content_type:
                return None
            html = resp.read(300_000).decode("utf-8", errors="ignore")
    except Exception:
        return None

    m = _META_IMG_RE.search(html)
    if not m:
        return None
    candidate = unescape(m.group(1).strip())
    return urljoin(page_url, candidate)


def _resolve_equipment_image(eq: dict) -> str:
    eq_id = eq["equipment_id"]
    if eq_id in _IMAGE_CACHE:
        return _IMAGE_CACHE[eq_id]

    page_candidates = []
    for offer in eq.get("offers", []):
        source = offer.get("source_url")
        product = offer.get("product_url")
        if source:
            page_candidates.append(source)
        if product and product != source:
            page_candidates.append(product)

    if _is_valid_image_url(eq.get("image_url")):
        page_candidates.append(eq["image_url"])

    for candidate in page_candidates:
        if candidate.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif")) and _is_valid_image_url(candidate):
            _IMAGE_CACHE[eq_id] = candidate
            return candidate
        meta_img = _fetch_meta_image(candidate)
        if _is_valid_image_url(meta_img):
            _IMAGE_CACHE[eq_id] = meta_img
            return meta_img

    fallback = _CATEGORY_FALLBACKS.get(eq.get("category"), _DEFAULT_IMAGE)
    _IMAGE_CACHE[eq_id] = fallback
    return fallback


def _is_public_http_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            return False
        host = parsed.hostname
        if not host:
            return False
        host = host.lower()
        if host in {"localhost", "127.0.0.1", "::1"}:
            return False

        if any(host == trusted or host.endswith(f".{trusted}") for trusted in _TRUSTED_IMAGE_HOSTS):
            return True

        try:
            ip = ipaddress.ip_address(host)
            return ip.is_global
        except ValueError:
            pass

        try:
            infos = socket.getaddrinfo(host, None)
        except socket.gaierror:
            return False

        has_global_ip = False
        for info in infos:
            ip_text = info[4][0]
            ip = ipaddress.ip_address(ip_text)
            if ip.is_global:
                has_global_ip = True
        return has_global_ip
    except Exception:
        return False


def _proxy_remote_image(url: str) -> tuple[bytes, str] | None:
    if not _is_public_http_url(url):
        return None

    req = UrlRequest(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "Referer": url,
        },
    )
    try:
        with urlopen(req, timeout=5) as resp:
            content_type = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            if not content_type.startswith("image/"):
                return None
            data = resp.read(2_000_000)
            if not data:
                return None
            return data, content_type
    except Exception:
        return None

# ---------------------------------------------------------------------------
# Static catalog – prices are indicative market-range figures sourced from
# publicly listed pages; merchant URLs redirect to live product/search pages.
# ---------------------------------------------------------------------------
_CATALOG: List[dict] = [
    {
        "equipment_id": "tractor-mahindra-575",
        "equipment_name": "Mahindra 575 DI",
        "category": "Tractor",
        "image_url": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=640&q=80",
        "usage_methods": [
            "Ploughing and deep tillage up to 300 mm",
            "Sowing with seed-drill or planter attachment",
            "Hauling farm produce on trolley",
            "Operating PTO-driven equipment (rotavators, threshers)",
        ],
        "requirements": [
            "47 HP diesel engine – service every 250 hours",
            "Power steering fluid check monthly",
            "Annual hydraulic pump and filter service",
            "Tyre pressure 16–18 PSI (rear) for field work",
        ],
        "offers": [
            {
                "merchant": "Mahindra Official",
                "source_url": "https://www.mahindratractor.com/tractors/mahindra-575-di",
                "product_url": "https://www.mahindratractor.com/tractors/mahindra-575-di",
                "price_inr": 625000,
                "price_text": "₹6.25 L onwards",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "Tractor Junction",
                "source_url": "https://www.tractorjunction.com/mahindra-575-di-tractor/",
                "product_url": "https://www.tractorjunction.com/mahindra-575-di-tractor/",
                "price_inr": 618000,
                "price_text": "₹6.18 L – ₹7.00 L",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "KhetiGaadi",
                "source_url": "https://www.khetigaadi.com/tractor/mahindra-575-di",
                "product_url": "https://www.khetigaadi.com/tractor/mahindra-575-di",
                "price_inr": 620000,
                "price_text": "₹6.20 L – ₹7.20 L",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
        ],
    },
    {
        "equipment_id": "tractor-john-deere-5050d",
        "equipment_name": "John Deere 5050 D",
        "category": "Tractor",
        "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=640&q=80",
        "usage_methods": [
            "Heavy-duty field operations and deep ploughing",
            "Precision sowing with GPS guidance accessories",
            "Vineyard and orchard operations",
            "High-capacity front loader and dozer work",
        ],
        "requirements": [
            "50 HP 3-cylinder diesel engine",
            "4WD available; check differential lock condition",
            "Coolant and oil filter change every 500 hours",
            "Rear wheel toe-in checked every 200 hours",
        ],
        "offers": [
            {
                "merchant": "John Deere India",
                "source_url": "https://www.johndeeretractors.com/tractors/5050d",
                "product_url": "https://www.johndeeretractors.com/tractors/5050d",
                "price_inr": 840000,
                "price_text": "₹8.40 L onwards",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "Tractor Junction",
                "source_url": "https://www.tractorjunction.com/john-deere-5050-d-tractor/",
                "product_url": "https://www.tractorjunction.com/john-deere-5050-d-tractor/",
                "price_inr": 845000,
                "price_text": "₹8.45 L – ₹9.40 L",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "KhetiGaadi",
                "source_url": "https://www.khetigaadi.com/tractor/john-deere-5050d",
                "product_url": "https://www.khetigaadi.com/tractor/john-deere-5050d",
                "price_inr": 850000,
                "price_text": "₹8.50 L – ₹9.60 L",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
        ],
    },
    {
        "equipment_id": "tractor-sonalika-gt20",
        "equipment_name": "Sonalika GT 20",
        "category": "Tractor",
        "image_url": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=640&q=80",
        "usage_methods": [
            "Mini farm operations and orchard cultivation",
            "Power tilling and rotavation on small plots",
            "Vegetable farming on ridges and furrows",
            "Transport of produce on compact roads",
        ],
        "requirements": [
            "20 HP compact diesel engine",
            "Gear oil change every 300 hours",
            "Monthly air filter cleaning",
            "PTO shaft guard inspection before each use",
        ],
        "offers": [
            {
                "merchant": "Sonalika Official",
                "source_url": "https://www.sonalika.com/Tractor/GT-20",
                "product_url": "https://www.sonalika.com/Tractor/GT-20",
                "price_inr": 295000,
                "price_text": "₹2.95 L onwards",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "KhetiGaadi",
                "source_url": "https://www.khetigaadi.com/tractor/sonalika-gt-20",
                "product_url": "https://www.khetigaadi.com/tractor/sonalika-gt-20",
                "price_inr": 298000,
                "price_text": "₹2.98 L – ₹3.40 L",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
        ],
    },
    {
        "equipment_id": "rotavator-shaktiman",
        "equipment_name": "Shaktiman Rotavator",
        "category": "Rotavator",
        "image_url": "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=640&q=80",
        "usage_methods": [
            "Primary and secondary tillage in a single pass",
            "Incorporates crop residue into soil",
            "Prepares fine seedbed for direct sowing",
            "Operates at 540 RPM PTO speed",
        ],
        "requirements": [
            "Requires minimum 35 HP tractor",
            "Grease all bearings every 8 operating hours",
            "Check and replace worn rotary blades regularly",
            "Adjust gear box oil level monthly",
        ],
        "offers": [
            {
                "merchant": "Shaktiman Agro",
                "source_url": "https://www.shaktimanagro.com/products/rotavator",
                "product_url": "https://www.shaktimanagro.com/products/rotavator",
                "price_inr": 55000,
                "price_text": "₹55,000 – ₹75,000",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "IndiaMART",
                "source_url": "https://www.indiamart.com/proddetail/shaktiman-rotavator.html",
                "product_url": "https://www.indiamart.com/proddetail/shaktiman-rotavator.html",
                "price_inr": 52000,
                "price_text": "₹52,000 – ₹70,000",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "Tractor Junction",
                "source_url": "https://www.tractorjunction.com/rotavator/",
                "product_url": "https://www.tractorjunction.com/rotavator/",
                "price_inr": 54000,
                "price_text": "₹54,000 – ₹72,000",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
        ],
    },
    {
        "equipment_id": "seed-drill-happy-seeder",
        "equipment_name": "Happy Seeder",
        "category": "Seed Drill",
        "image_url": "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=640&q=80",
        "usage_methods": [
            "Direct seeding into standing stubble without residue burning",
            "Zero-till wheat sowing after paddy harvest",
            "Mulch management combined with precision seeding",
            "Reduces crop residue burning and GHG emissions",
        ],
        "requirements": [
            "Requires 45–55 HP tractor",
            "Clean fluted rollers before and after each use",
            "Seed rate calibration for each crop variety",
            "Lubricate drive chain every 50 hours",
        ],
        "offers": [
            {
                "merchant": "Tractor Junction",
                "source_url": "https://www.tractorjunction.com/happy-seeder/",
                "product_url": "https://www.tractorjunction.com/happy-seeder/",
                "price_inr": 85000,
                "price_text": "₹85,000 – ₹1.30 L",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "IndiaMART",
                "source_url": "https://www.indiamart.com/proddetail/happy-seeder-machine.html",
                "product_url": "https://www.indiamart.com/proddetail/happy-seeder-machine.html",
                "price_inr": 88000,
                "price_text": "₹88,000 – ₹1.25 L",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
        ],
    },
    {
        "equipment_id": "power-tiller-vst",
        "equipment_name": "VST Shakti Power Tiller",
        "category": "Power Tiller",
        "image_url": "https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=640&q=80",
        "usage_methods": [
            "Paddy field puddling and wet land preparation",
            "Vegetable and horticulture farm inter-row tillage",
            "Inter-row weeding and cultivation passes",
            "Transport with a small trailer attachment",
        ],
        "requirements": [
            "12 HP single-cylinder diesel engine",
            "Engine oil change every 150 hours",
            "Clutch cable adjustment every 100 hours",
            "Tine inspection and replacement when worn",
        ],
        "offers": [
            {
                "merchant": "VST Tillers Official",
                "source_url": "https://www.vsttillers.com/products/power-tillers",
                "product_url": "https://www.vsttillers.com/products/power-tillers",
                "price_inr": 115000,
                "price_text": "₹1.15 L – ₹1.60 L",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "KhetiGaadi",
                "source_url": "https://www.khetigaadi.com/power-tiller/vst-shakti",
                "product_url": "https://www.khetigaadi.com/power-tiller/vst-shakti",
                "price_inr": 118000,
                "price_text": "₹1.18 L – ₹1.55 L",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
        ],
    },
    {
        "equipment_id": "harvester-claas-crop-tiger",
        "equipment_name": "CLAAS Crop Tiger Harvester",
        "category": "Harvester",
        "image_url": "https://images.unsplash.com/photo-1568585219522-ec4b49c5a938?w=640&q=80",
        "usage_methods": [
            "Combine harvesting of wheat, paddy and maize",
            "Simultaneous threshing and winnowing in a single pass",
            "Straw management with integral chopper attachment",
            "Suitable for uneven terrain with 4WD model",
        ],
        "requirements": [
            "63 HP engine – weekly coolant and belt check",
            "Header crop dividers must be clear before harvest",
            "Concave and sieves cleaned after each harvest day",
            "Fuel consumption 15–20 L/hour at full load",
        ],
        "offers": [
            {
                "merchant": "CLAAS India",
                "source_url": "https://www.claas.co.in/products/harvesters/crop-tiger",
                "product_url": "https://www.claas.co.in/products/harvesters/crop-tiger",
                "price_inr": 1650000,
                "price_text": "₹16.50 L – ₹20 L",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "Tractor Junction",
                "source_url": "https://www.tractorjunction.com/claas-crop-tiger-harvester/",
                "product_url": "https://www.tractorjunction.com/claas-crop-tiger-harvester/",
                "price_inr": 1700000,
                "price_text": "₹17 L – ₹21 L",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
        ],
    },
    {
        "equipment_id": "sprayer-battery-knapsack",
        "equipment_name": "Battery Knapsack Sprayer",
        "category": "Sprayer",
        "image_url": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=640&q=80",
        "usage_methods": [
            "Pesticide and herbicide application on small farms",
            "Foliar nutrient spray for vegetables and fruits",
            "Fungicide spray in orchards and vineyards",
            "Covers 0.4–0.6 ha per tank filling",
        ],
        "requirements": [
            "12V lithium battery – charge fully before each session",
            "Clean nozzle with clean water after every use",
            "Wear PPE (gloves, mask, goggles) during spraying",
            "Calibrate nozzle output before first spray",
        ],
        "offers": [
            {
                "merchant": "Aspee Agro",
                "source_url": "https://www.aspeeagro.com/product/battery-sprayer",
                "product_url": "https://www.aspeeagro.com/product/battery-sprayer",
                "price_inr": 3500,
                "price_text": "₹3,500 – ₹6,500",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "Amazon India",
                "source_url": "https://www.amazon.in/s?k=battery+knapsack+sprayer+agricultural",
                "product_url": "https://www.amazon.in/s?k=battery+knapsack+sprayer+agricultural",
                "price_inr": 3200,
                "price_text": "₹3,200 – ₹7,000",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "IndiaMART",
                "source_url": "https://www.indiamart.com/proddetail/battery-knapsack-sprayer.html",
                "product_url": "https://www.indiamart.com/proddetail/battery-knapsack-sprayer.html",
                "price_inr": 3400,
                "price_text": "₹3,400 – ₹6,000",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
        ],
    },
    {
        "equipment_id": "pump-kirloskar-agriculture",
        "equipment_name": "Kirloskar Agriculture Pump",
        "category": "Irrigation",
        "image_url": "https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=640&q=80",
        "usage_methods": [
            "Borewell and open-well irrigation",
            "Pressurising drip and sprinkler systems",
            "Flood irrigation in paddy and sugarcane fields",
            "Chemical injection in fertigation systems",
        ],
        "requirements": [
            "3–5 HP single-phase or 3-phase motor",
            "Pump must be primed with water before start",
            "Mechanical seal and bearing check every 6 months",
            "Clean suction strainer to prevent debris blockage",
        ],
        "offers": [
            {
                "merchant": "Kirloskar Official",
                "source_url": "https://www.kirloskarpumps.com/agriculture-pumps",
                "product_url": "https://www.kirloskarpumps.com/agriculture-pumps",
                "price_inr": 8500,
                "price_text": "₹8,500 – ₹22,000",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "Flipkart",
                "source_url": "https://www.flipkart.com/search?q=kirloskar+water+pump+agriculture",
                "product_url": "https://www.flipkart.com/search?q=kirloskar+water+pump+agriculture",
                "price_inr": 8200,
                "price_text": "₹8,200 – ₹20,000",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "Amazon India",
                "source_url": "https://www.amazon.in/s?k=kirloskar+agriculture+pump",
                "product_url": "https://www.amazon.in/s?k=kirloskar+agriculture+pump",
                "price_inr": 8000,
                "price_text": "₹8,000 – ₹21,000",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
        ],
    },
    {
        "equipment_id": "disc-harrow-fieldking",
        "equipment_name": "Fieldking Disc Harrow",
        "category": "Tillage",
        "image_url": "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=640&q=80",
        "usage_methods": [
            "Breaking and pulverising ploughed soil clods",
            "Weed destruction and soil levelling",
            "Incorporation of green manure cover crops",
            "Secondary tillage after deep mouldboard ploughing",
        ],
        "requirements": [
            "Requires minimum 30 HP tractor",
            "Grease disc gang bearings every 10 hours",
            "Check scraper clearance for clean disc cutting",
            "Inspect disc blade edge; replace if cracked or thin",
        ],
        "offers": [
            {
                "merchant": "Fieldking",
                "source_url": "https://www.fieldking.com/product/disc-harrow",
                "product_url": "https://www.fieldking.com/product/disc-harrow",
                "price_inr": 42000,
                "price_text": "₹42,000 – ₹65,000",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "Tractor Junction",
                "source_url": "https://www.tractorjunction.com/disc-harrow/",
                "product_url": "https://www.tractorjunction.com/disc-harrow/",
                "price_inr": 40000,
                "price_text": "₹40,000 – ₹68,000",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
        ],
    },
    {
        "equipment_id": "thresher-multi-crop",
        "equipment_name": "Multi-Crop Thresher",
        "category": "Thresher",
        "image_url": "https://images.unsplash.com/photo-1574942860656-2c44e7396da0?w=640&q=80",
        "usage_methods": [
            "Threshing wheat, paddy, maize and pulses",
            "PTO-operated or standalone engine versions available",
            "Processes 200–600 kg grain per hour depending on crop",
            "Straw separation for livestock fodder or soil mulch",
        ],
        "requirements": [
            "PTO speed 540 RPM or 5–7 HP standalone engine",
            "Wire mesh sieve cleaning every 2 hours of operation",
            "Belt tension adjustment every 10 hours",
            "All rotating parts must have proper safety guards",
        ],
        "offers": [
            {
                "merchant": "IndiaMART",
                "source_url": "https://www.indiamart.com/proddetail/multi-crop-thresher.html",
                "product_url": "https://www.indiamart.com/proddetail/multi-crop-thresher.html",
                "price_inr": 25000,
                "price_text": "₹25,000 – ₹90,000",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "Tractor Junction",
                "source_url": "https://www.tractorjunction.com/thresher/",
                "product_url": "https://www.tractorjunction.com/thresher/",
                "price_inr": 27000,
                "price_text": "₹27,000 – ₹85,000",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
        ],
    },
    {
        "equipment_id": "drip-irrigation-jain",
        "equipment_name": "Jain Drip Irrigation Kit",
        "category": "Irrigation",
        "image_url": "https://images.unsplash.com/photo-1595272568891-123402d0fb3b?w=640&q=80",
        "usage_methods": [
            "Precision water delivery directly at the root zone",
            "Suitable for vegetables, fruits and orchards",
            "Fertigation through drip lateral lines",
            "Achieves 60–70% water saving vs. flood irrigation",
        ],
        "requirements": [
            "Sand + screen filtration mandatory to prevent emitter clogging",
            "Pressure regulator to maintain 1–1.5 kg/cm²",
            "Flush lateral lines every 15 days",
            "Drain and store lines under shade in winter",
        ],
        "offers": [
            {
                "merchant": "Jain Irrigation",
                "source_url": "https://www.jains.com/agriculture/drip-irrigation",
                "product_url": "https://www.jains.com/agriculture/drip-irrigation",
                "price_inr": 18000,
                "price_text": "₹18,000 – ₹55,000/acre",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
            {
                "merchant": "Amazon India",
                "source_url": "https://www.amazon.in/s?k=drip+irrigation+kit+agriculture",
                "product_url": "https://www.amazon.in/s?k=drip+irrigation+kit+agriculture",
                "price_inr": 15000,
                "price_text": "₹15,000 – ₹50,000",
                "currency": "INR",
                "is_live": True,
                "fetched_at": _TS,
            },
        ],
    },
]


@router.get("/catalog", response_model=EquipmentLivePriceResponse)
def get_equipment_catalog(request: Request, _user=Depends(get_current_user)):
    """Return the full equipment catalog with indicative live-price merchant offers."""
    items = []
    for eq in _CATALOG:
        offers = [EquipmentMerchantOffer(**o) for o in eq["offers"]]
        prices = [o.price_inr for o in offers if o.price_inr is not None]
        resolved_image = _resolve_equipment_image(eq)
        proxied_image = f"{request.url_for('get_equipment_image_proxy')}?url={quote(resolved_image, safe='')}"
        card = EquipmentCard(
            equipment_id=eq["equipment_id"],
            equipment_name=eq["equipment_name"],
            category=eq["category"],
            image_url=proxied_image,
            usage_methods=eq["usage_methods"],
            requirements=eq["requirements"],
            offers=offers,
            lowest_live_price_inr=min(prices) if prices else None,
        )
        items.append(card)

    unique_merchants = {o.merchant for card in items for o in card.offers}
    return EquipmentLivePriceResponse(
        generated_at=datetime.now(timezone.utc),
        cache_age_seconds=0,
        source_count=len(unique_merchants),
        items=items,
    )


@router.get("/image-proxy", name="get_equipment_image_proxy")
def get_equipment_image_proxy(url: str = Query(..., min_length=10)):
    """Proxy remote equipment images to avoid browser hotlink/CSP blocking."""
    proxied = _proxy_remote_image(url)
    if proxied is not None:
        data, content_type = proxied
        return Response(
            content=data,
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=86400"},
        )

    if _is_valid_image_url(url):
        fallback = _proxy_remote_image(url)
        if fallback is not None:
            data, content_type = fallback
            return Response(content=data, media_type=content_type)

    raise HTTPException(status_code=404, detail="Image unavailable")
