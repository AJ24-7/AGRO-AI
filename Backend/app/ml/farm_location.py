"""Helpers for farm location intelligence and crop recommendations."""
from __future__ import annotations

import json
import math
from typing import Any, Iterable
from urllib import parse, request


EARTH_RADIUS_M = 6_371_008.8


def _normalize_points(boundary_points: Iterable[Any] | None) -> list[dict[str, float]]:
    points: list[dict[str, float]] = []
    for point in boundary_points or []:
        if isinstance(point, dict):
            lat = point.get("lat", point.get("latitude"))
            lng = point.get("lng", point.get("longitude"))
        else:
            lat = getattr(point, "lat", None)
            lng = getattr(point, "lng", None)
        if lat is None or lng is None:
            continue
        points.append({"lat": float(lat), "lng": float(lng)})
    return points


def _polygon_area_acres(points: list[dict[str, float]]) -> float | None:
    if len(points) < 3:
        return None

    avg_lat = sum(point["lat"] for point in points) / len(points)
    ref_lat = math.radians(avg_lat)
    x_values = [math.radians(point["lng"]) * math.cos(ref_lat) * EARTH_RADIUS_M for point in points]
    y_values = [math.radians(point["lat"]) * EARTH_RADIUS_M for point in points]

    area_sq_m = 0.0
    for index in range(len(points)):
        next_index = (index + 1) % len(points)
        area_sq_m += x_values[index] * y_values[next_index] - x_values[next_index] * y_values[index]

    return round(abs(area_sq_m) / 2.0 / 4046.8564224, 2)


def _request_json(url: str) -> dict[str, Any]:
    req = request.Request(url, headers={"User-Agent": "AgroPilotAI/1.0"})
    with request.urlopen(req, timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))


def _reverse_geocode(latitude: float, longitude: float) -> dict[str, str | None]:
    query = parse.urlencode({
        "format": "jsonv2",
        "lat": latitude,
        "lon": longitude,
        "zoom": 10,
        "addressdetails": 1,
    })
    try:
        data = _request_json(f"https://nominatim.openstreetmap.org/reverse?{query}")
        address = data.get("address", {})
        return {
            "country": address.get("country"),
            "state": address.get("state") or address.get("region") or address.get("province") or address.get("county"),
            "location_label": data.get("display_name"),
        }
    except Exception:
        return {"country": None, "state": None, "location_label": None}


def _weather_description(code: int | None) -> str:
    mapping = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Light rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Light snow",
        73: "Moderate snow",
        75: "Heavy snow",
        80: "Rain showers",
        81: "Heavy showers",
        82: "Violent showers",
        95: "Thunderstorm",
    }
    return mapping.get(code or -1, "Unknown weather")


def _fetch_weather(latitude: float, longitude: float) -> dict[str, float | int | str | None]:
    params = parse.urlencode({
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,precipitation,weather_code,wind_speed_10m",
        "temperature_unit": "celsius",
        "wind_speed_unit": "kmh",
    })
    try:
        data = _request_json(f"https://api.open-meteo.com/v1/forecast?{params}")
        current = data.get("current", {})
        weather_code = current.get("weather_code")
        temperature_c = current.get("temperature_2m")
        precipitation_mm = current.get("precipitation")
        wind_speed_kph = current.get("wind_speed_10m")
        summary = _weather_description(weather_code)
        if temperature_c is not None and precipitation_mm is not None:
            summary = f"{summary} · {temperature_c:.1f}°C · {precipitation_mm:.1f} mm rain"
        return {
            "weather_code": weather_code,
            "temperature_c": temperature_c,
            "precipitation_mm": precipitation_mm,
            "wind_speed_kph": wind_speed_kph,
            "weather_summary": summary,
        }
    except Exception:
        return {
            "weather_code": None,
            "temperature_c": None,
            "precipitation_mm": None,
            "wind_speed_kph": None,
            "weather_summary": None,
        }


def _add_suggestion(items: list[dict[str, str]], seen: set[str], crop: str, reason: str):
    key = crop.lower()
    if key in seen:
        return
    seen.add(key)
    items.append({"crop": crop, "reason": reason})


def _recommend_crops(country: str | None, state: str | None, temperature_c: float | None, precipitation_mm: float | None) -> list[dict[str, str]]:
    suggestions: list[dict[str, str]] = []
    seen: set[str] = set()
    state_key = (state or "").strip().lower()
    country_key = (country or "").strip().lower()

    india_state_picks = {
        "punjab": [("Wheat", "Strong fit for the cooler north-west climate."), ("Rice", "Works well where irrigation is available."), ("Mustard", "Common in rabi rotations across the region."), ("Maize", "Useful as a diversified summer crop."), ("Cotton", "Fits warmer pockets and crop rotation." )],
        "haryana": [("Wheat", "Stable choice for the northern plains."), ("Rice", "Useful in irrigated zones."), ("Mustard", "Good fit for the winter season."), ("Bajra", "Handles dry spells well."), ("Cotton", "Can work in warmer districts." )],
        "uttar pradesh": [("Rice", "Strong option for humid eastern belts."), ("Wheat", "Reliable winter crop."), ("Sugarcane", "Long-duration crop suited to the state."), ("Potato", "Strong market crop in cool seasons."), ("Pulses", "Good rotation crop for soil health." )],
        "maharashtra": [("Cotton", "Common in warm, semi-arid regions."), ("Soybean", "Works well during monsoon season."), ("Sugarcane", "Strong fit in irrigated belts."), ("Pigeon Pea", "Useful in rainfed systems."), ("Jowar", "Handles dry weather well." )],
        "karnataka": [("Ragi", "Excellent for drier and warmer areas."), ("Maize", "Versatile across many districts."), ("Bengal Gram", "Fits rabi rotations."), ("Banana", "Works in irrigated pockets."), ("Groundnut", "Strong warm-season option." )],
        "tamil nadu": [("Rice", "Key crop for irrigated and coastal zones."), ("Sugarcane", "Performs well in warm conditions."), ("Groundnut", "Reliable in drier belts."), ("Banana", "Strong horticulture option."), ("Millets", "Useful where water is limited." )],
        "andhra pradesh": [("Rice", "Well suited to irrigated delta regions."), ("Cotton", "Fits warmer inland districts."), ("Groundnut", "Strong warm-season crop."), ("Chilli", "High-value option for warmer belts."), ("Maize", "Broadly adaptable." )],
        "west bengal": [("Rice", "Matches the humid delta climate."), ("Jute", "A classic state crop for humid areas."), ("Potato", "Strong cool-season choice."), ("Mustard", "Useful in winter rotations."), ("Pulses", "Supports soil balance." )],
        "gujarat": [("Cotton", "Very common in warm, dry districts."), ("Groundnut", "A strong fit for sandy soils and heat."), ("Cumin", "Works well in arid belts."), ("Wheat", "Useful in cooler irrigated zones."), ("Bajra", "Handles heat and dryness." )],
    }

    if state_key in india_state_picks:
        for crop, reason in india_state_picks[state_key]:
            _add_suggestion(suggestions, seen, crop, reason)

    if "india" in country_key:
        if temperature_c is not None and temperature_c >= 28:
            _add_suggestion(suggestions, seen, "Rice", "Warm, humid weather supports paddy systems.")
            _add_suggestion(suggestions, seen, "Sugarcane", "Long, warm seasons support cane growth.")
        if temperature_c is not None and temperature_c <= 22:
            _add_suggestion(suggestions, seen, "Wheat", "Cooler temperatures favour wheat and rabi crops.")
            _add_suggestion(suggestions, seen, "Mustard", "Performs well in cooler conditions.")
        if precipitation_mm is not None and precipitation_mm >= 1.0:
            _add_suggestion(suggestions, seen, "Maize", "Moderate rain supports adaptable cereal production.")
        if precipitation_mm is not None and precipitation_mm < 1.0:
            _add_suggestion(suggestions, seen, "Bajra", "Dry conditions favour hardy millets.")
            _add_suggestion(suggestions, seen, "Groundnut", "Handles warmer, drier weather well.")
    else:
        if temperature_c is not None and temperature_c >= 25:
            _add_suggestion(suggestions, seen, "Maize", "Warm conditions support flexible cereal production.")
            _add_suggestion(suggestions, seen, "Soybean", "Warm seasons support legume growth.")
        if temperature_c is not None and temperature_c <= 18:
            _add_suggestion(suggestions, seen, "Wheat", "Cooler weather supports temperate grains.")
            _add_suggestion(suggestions, seen, "Barley", "Works well in cooler climates.")
        if precipitation_mm is not None and precipitation_mm >= 1.0:
            _add_suggestion(suggestions, seen, "Rice", "Higher moisture supports water-loving crops.")
        if precipitation_mm is not None and precipitation_mm < 1.0:
            _add_suggestion(suggestions, seen, "Sorghum", "Dry weather favours drought-tolerant crops.")

    if not suggestions:
        for crop, reason in [("Rice", "Reliable option in mixed farm climates."), ("Wheat", "Balanced rotation crop."), ("Maize", "Adaptable across many farm conditions."), ("Pulses", "Helps diversify farm rotations.")]:
            _add_suggestion(suggestions, seen, crop, reason)

    return suggestions[:5]


def build_farm_location_profile(latitude: float, longitude: float, boundary_points: Iterable[Any] | None = None) -> dict[str, Any]:
    normalized_points = _normalize_points(boundary_points)
    area = _polygon_area_acres(normalized_points)

    center_lat = latitude
    center_lng = longitude
    if normalized_points:
        center_lat = sum(point["lat"] for point in normalized_points) / len(normalized_points)
        center_lng = sum(point["lng"] for point in normalized_points) / len(normalized_points)

    location = _reverse_geocode(center_lat, center_lng)
    weather = _fetch_weather(center_lat, center_lng)

    country = location.get("country")
    state = location.get("state")
    location_label = location.get("location_label")
    weather_summary = weather.get("weather_summary")

    return {
        "latitude": latitude,
        "longitude": longitude,
        "boundary_points": normalized_points or None,
        "calculated_area": area,
        "country": country,
        "state": state,
        "location_label": location_label,
        "weather_summary": weather_summary,
        "weather_code": weather.get("weather_code"),
        "temperature_c": weather.get("temperature_c"),
        "precipitation_mm": weather.get("precipitation_mm"),
        "wind_speed_kph": weather.get("wind_speed_kph"),
        "recommended_crops": _recommend_crops(country, state, weather.get("temperature_c"), weather.get("precipitation_mm")),
    }