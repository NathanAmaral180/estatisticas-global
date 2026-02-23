from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from core.indicators_registry import INDICATOR_REGISTRY
from core.sources_worldbank import fetch_worldbank_latest_value
from core.sources_bcb import fetch_bcb_sgs_latest_value
from core.cache import get_cache, set_cache

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

START_TIME = datetime.now(timezone.utc)

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def calculate_value_model(indicator):
    seconds_passed = (datetime.now(timezone.utc) - START_TIME).total_seconds()
    base_value = indicator.get("base_value", 0)
    growth = indicator.get("growth_per_second", 0)
    return int(base_value + seconds_passed * growth)

def build_indicator_payload(indicator):
    t = indicator.get("type", "model")

    # --------------------
    # World Bank (com cache)
    # --------------------
    if t == "worldbank_latest":
        cache_key = f'wb:{indicator["country_code"]}:{indicator["indicator_code"]}'
        cached = get_cache(cache_key)
        if cached:
            return cached

        wb = fetch_worldbank_latest_value(
            indicator["country_code"],
            indicator["indicator_code"],
        )

        if not wb:
            payload = {
                "id": indicator["id"],
                "title": indicator["title"],
                "category": indicator["category"],
                "unit": indicator["unit"],
                "value": None,
                "source": "World Bank",
                "as_of": now_iso(),
                "note": "Sem dado disponível no momento",
            }
            set_cache(cache_key, payload, ttl_seconds=60 * 30)  # 30 min
            return payload

        payload = {
            "id": indicator["id"],
            "title": indicator["title"],
            "category": indicator["category"],
            "unit": indicator["unit"],
            "value": wb["value"],
            "source": f'World Bank ({wb["year"]})',
            "as_of": wb["as_of"],
        }
        set_cache(cache_key, payload, ttl_seconds=60 * 60 * 6)  # 6h
        return payload

    # --------------------
    # BCB SGS (com cache)
    # --------------------
    if t == "bcb_sgs_latest":
        series_id = int(indicator["series_id"])
        cache_key = f"bcb:{series_id}"
        cached = get_cache(cache_key)
        if cached:
            return cached

        bcb = fetch_bcb_sgs_latest_value(series_id)

        if not bcb or bcb["value"] is None:
            payload = {
                "id": indicator["id"],
                "title": indicator["title"],
                "category": indicator["category"],
                "unit": indicator["unit"],
                "value": None,
                "source": "Banco Central (SGS)",
                "as_of": now_iso(),
                "note": "Sem dado disponível no momento",
            }
            set_cache(cache_key, payload, ttl_seconds=60 * 10)  # 10 min
            return payload

        payload = {
            "id": indicator["id"],
            "title": indicator["title"],
            "category": indicator["category"],
            "unit": indicator["unit"],
            "value": bcb["value"],
            "source": f'Banco Central (SGS) ({bcb["date"]})',
            "as_of": bcb["as_of"],
        }
        set_cache(cache_key, payload, ttl_seconds=60 * 30)  # 30 min
        return payload

    # --------------------
    # Modelo dinâmico (contador)
    # --------------------
    return {
        "id": indicator["id"],
        "title": indicator["title"],
        "category": indicator["category"],
        "unit": indicator["unit"],
        "value": calculate_value_model(indicator),
        "source": indicator.get("source", "Modelo"),
        "as_of": now_iso(),
    }

@app.get("/")
def home():
    return {"status": "API funcionando"}

@app.get("/indicators")
def get_indicators():
    items = [build_indicator_payload(ind) for ind in INDICATOR_REGISTRY]
    return {"as_of": now_iso(), "count": len(items), "items": items}

@app.get("/indicators/{indicator_id}")
def get_indicator(indicator_id: str):
    for ind in INDICATOR_REGISTRY:
        if ind["id"] == indicator_id:
            return build_indicator_payload(ind)
    return {"error": "Indicador não encontrado"}