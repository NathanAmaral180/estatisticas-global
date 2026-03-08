from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# seus módulos "core"
from core.indicators_registry import INDICATOR_REGISTRY
from core.sources_worldbank import fetch_worldbank_latest_value
from core.sources_bcb import fetch_bcb_sgs_latest_value
from core.cache import get_cache, set_cache

# seus módulos "backend"
from backend.db import engine, Base, SessionLocal
from backend.routes_history import router as history_router, resolve_indicator_history_payload

from core.entities_registry import ENTITIES_REGISTRY
from core.entity_templates import build_entity_page

ENTITIES_REGISTRY = [
    *ENTITIES_REGISTRY,
    {
        "kind": "home",
        "id": "main",
        "title": "Home",
    },
]


# =========================
# App + DB
# =========================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


HISTORY_MODEL_IDS = {
    str(ind.get("id"))
    for ind in INDICATOR_REGISTRY
    if ind.get("id") and str(ind.get("type", "")).strip().lower() == "model"
}
HISTORY_TRACKED_IDS = {"population_world", "co2_world_live", *HISTORY_MODEL_IDS}
HISTORY_MAX_POINTS = 720
HISTORY: Dict[str, List[Dict[str, Any]]] = {k: [] for k in HISTORY_TRACKED_IDS}


def _append_history(indicator_id: str, value: Any) -> None:
    if indicator_id not in HISTORY_TRACKED_IDS:
        return
    if not isinstance(value, (int, float)):
        return

    points = HISTORY.setdefault(indicator_id, [])
    points.append({"t": now_iso(), "value": float(value)})
    if len(points) > HISTORY_MAX_POINTS:
        del points[:-HISTORY_MAX_POINTS]


def _history_payload(indicator_id: str) -> Dict[str, Any]:
    points = HISTORY.get(indicator_id, [])
    return {
        "as_of": now_iso(),
        "id": indicator_id,
        "items": [{"x": p["t"], "y": p["value"]} for p in points],
    }


def _history_with_fallback(
    indicator_id: str,
    range_key: str = "all",
    limit: int = 2000,
    mode_key: str | None = None,
) -> Dict[str, Any]:
    mode_norm = (mode_key or "").strip().lower()

    if mode_norm != "long":
        payload = _history_payload(indicator_id)
        if payload.get("items"):
            return payload

    db = SessionLocal()
    try:
        resolved = resolve_indicator_history_payload(
            indicator_id=indicator_id,
            range=range_key,
            limit=limit,
            mode=mode_key,
            db=db,
        )
    finally:
        db.close()

    return {
        "as_of": now_iso(),
        "id": indicator_id,
        "items": resolved.get("items") or [],
    }


# =========================
# MODELOS: tempo de execução (apenas para contadores genéricos)
# =========================
# (mantemos isso porque você usa para outros modelos e TOP5)
START_TIME = datetime.now(timezone.utc)


# =========================
# População mundial (metodologia realista)
# =========================
# Ideia:
# - Base em uma data fixa (não muda ao reiniciar servidor)
# - Taxa líquida por segundo
#
# Ajuste esses números quando quiser:
WORLD_POP_BASE_DATE = datetime(2026, 1, 1, tzinfo=timezone.utc)
WORLD_POP_BASE_VALUE = 8_190_000_000  # estimativa aproximada para 2026-01-01
WORLD_NET_GROWTH_PER_YEAR = 70_000_000  # líquido (nascimentos - mortes), aprox.

_SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60
WORLD_GROWTH_PER_SECOND = WORLD_NET_GROWTH_PER_YEAR / _SECONDS_PER_YEAR


def calculate_world_population(now: datetime | None = None) -> int:
    if now is None:
        now = datetime.now(timezone.utc)
    seconds_passed = (now - WORLD_POP_BASE_DATE).total_seconds()
    value = WORLD_POP_BASE_VALUE + seconds_passed * WORLD_GROWTH_PER_SECOND
    return int(value)


# =========================
# Modelo "ao vivo" (genérico)
# =========================
def calculate_value_model(indicator: Dict[str, Any]) -> int:
    seconds_passed = (datetime.now(timezone.utc) - START_TIME).total_seconds()
    base_value = float(indicator.get("base_value", 0) or 0)
    growth = float(indicator.get("growth_per_second", 0) or 0)
    return int(base_value + seconds_passed * growth)


# =========================
# Payload builder
# =========================
def build_indicator_payload(indicator: Dict[str, Any]) -> Dict[str, Any]:
    t = (indicator.get("type") or "model").strip().lower()

    # --------------------
    # World Bank (cache)
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
                "category": indicator.get("category"),
                "unit": indicator.get("unit"),
                "value": None,
                "source": "World Bank",
                "as_of": now_iso(),
                "note": "Sem dado disponível no momento",
            }
            set_cache(cache_key, payload, ttl_seconds=60 * 30)
            return payload

        payload = {
            "id": indicator["id"],
            "title": indicator["title"],
            "category": indicator.get("category"),
            "unit": indicator.get("unit"),
            "value": wb["value"],
            "source": f'World Bank ({wb["year"]})',
            "as_of": wb["as_of"],
        }
        set_cache(cache_key, payload, ttl_seconds=60 * 60 * 6)
        return payload

    # --------------------
    # BCB SGS (cache)
    # --------------------
    if t == "bcb_sgs_latest":
        series_id = int(indicator["series_id"])
        cache_key = f"bcb:{series_id}"
        cached = get_cache(cache_key)
        if cached:
            return cached

        bcb = fetch_bcb_sgs_latest_value(series_id)

        if not bcb or bcb.get("value") is None:
            payload = {
                "id": indicator["id"],
                "title": indicator["title"],
                "category": indicator.get("category"),
                "unit": indicator.get("unit"),
                "value": None,
                "source": "Banco Central (SGS)",
                "as_of": now_iso(),
                "note": "Sem dado disponível no momento",
            }
            set_cache(cache_key, payload, ttl_seconds=60 * 10)
            return payload

        payload = {
            "id": indicator["id"],
            "title": indicator["title"],
            "category": indicator.get("category"),
            "unit": indicator.get("unit"),
            "value": bcb["value"],
            "source": f'Banco Central (SGS) ({bcb["date"]})',
            "as_of": bcb["as_of"],
        }
        set_cache(cache_key, payload, ttl_seconds=60 * 30)
        return payload

    # --------------------
    # CO2 ao vivo (modelo)
    # --------------------
    if t == "co2_model":
        seconds_passed = (datetime.now(timezone.utc) - START_TIME).total_seconds()
        base_value = float(indicator.get("base_value", 0) or 0)
        growth = float(indicator.get("growth_per_second", 1173.0) or 1173.0)
        value = int(base_value + seconds_passed * growth)
        return {
            "id": indicator["id"],
            "title": indicator["title"],
            "category": indicator.get("category"),
            "unit": indicator.get("unit", "toneladas"),
            "value": value,
            "source": indicator.get("source", "Modelo (estimativa)"),
            "as_of": now_iso(),
            "note": indicator.get("note"),
        }

    # --------------------
    # Modelo padrão (contador)
    # --------------------
    return {
        "id": indicator["id"],
        "title": indicator["title"],
        "category": indicator.get("category"),
        "unit": indicator.get("unit"),
        "value": calculate_value_model(indicator),
        "source": indicator.get("source", "Modelo"),
        "as_of": now_iso(),
        "note": indicator.get("note"),
    }


# =========================
# Endpoints base
# =========================
@app.get("/health")
def health():
    return {"ok": True, "as_of": now_iso()}


@app.get("/indicators")
def get_indicators():
    items: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []

    for ind in INDICATOR_REGISTRY:
        try:
            items.append(build_indicator_payload(ind))
        except Exception as e:
            errors.append(
                {
                    "id": ind.get("id"),
                    "title": ind.get("title"),
                    "error": str(e),
                }
            )

    return {
        "as_of": now_iso(),
        "count": len(items),
        "items": items,
        "errors_count": len(errors),
        "errors": errors[:10],
    }


@app.get("/indicator/{indicator_id}")
def get_indicator(indicator_id: str):
    for ind in INDICATOR_REGISTRY:
        if ind.get("id") == indicator_id:
            payload = build_indicator_payload(ind)
            _append_history(indicator_id, payload.get("value"))
            return payload
    raise HTTPException(status_code=404, detail="Indicador não encontrado")


@app.get("/indicator/population_world/history")
def get_population_world_history(mode: str | None = Query(None, pattern="^(recent|long)$")):
    ind = next((x for x in INDICATOR_REGISTRY if x.get("id") == "population_world"), None)
    if ind:
        payload = build_indicator_payload(ind)
        _append_history("population_world", payload.get("value"))
    return _history_with_fallback("population_world", range_key="all", limit=5000, mode_key=mode)


@app.get("/indicator/co2_world_live/history")
def get_co2_world_live_history(mode: str | None = Query(None, pattern="^(recent|long)$")):
    ind = next((x for x in INDICATOR_REGISTRY if x.get("id") == "co2_world_live"), None)
    if ind:
        payload = build_indicator_payload(ind)
        _append_history("co2_world_live", payload.get("value"))
    return _history_with_fallback("co2_world_live", range_key="30d", limit=1200, mode_key=mode)


def _register_model_history_routes() -> None:
    for model_id in sorted(HISTORY_MODEL_IDS):
        if model_id in {"population_world", "co2_world_live"}:
            continue

        def _handler(mode: str | None = Query(None, pattern="^(recent|long)$"), mid: str = model_id):
            ind = next((x for x in INDICATOR_REGISTRY if x.get("id") == mid), None)
            if ind:
                payload = build_indicator_payload(ind)
                _append_history(mid, payload.get("value"))
            return _history_with_fallback(mid, range_key="all", limit=5000, mode_key=mode)

        app.get(f"/indicator/{model_id}/history")(_handler)


_register_model_history_routes()


# =========================
# População: endpoint ao vivo (usado no frontend)
# =========================
@app.get("/population/live")
def population_live(entity: str = "World"):
    # População mundial realista (independente do START_TIME)
    if entity.lower() in ("world", "mundo"):
        return {
            "entity": "World",
            "value": calculate_world_population(),
            "source": "Modelo: base fixa + taxa anual (aprox.)",
            "as_of": now_iso(),
        }

    # Se no futuro quiser entidades, por enquanto retornamos 404 para não mentir
    raise HTTPException(status_code=404, detail="Entidade não suportada ainda")


# =========================
# População: Top 5 países (AO VIVO) — sem DB
# =========================
TOP5 = [
    {"id": "india", "entity": "India", "code": "IND", "base_value": 1_472_000_000, "growth_per_second": 0.75},
    {"id": "china", "entity": "China", "code": "CHN", "base_value": 1_416_000_000, "growth_per_second": 0.05},
    {"id": "united-states", "entity": "United States", "code": "USA", "base_value": 348_600_000, "growth_per_second": 0.22},
    {"id": "indonesia", "entity": "Indonesia", "code": "IDN", "base_value": 287_500_000, "growth_per_second": 0.10},
    {"id": "pakistan", "entity": "Pakistan", "code": "PAK", "base_value": 257_650_000, "growth_per_second": 0.20},
]


@app.get("/population/top-live")
def population_top_live(limit: int = 5):
    limit = max(1, min(int(limit), 20))
    seconds_passed = (datetime.now(timezone.utc) - START_TIME).total_seconds()

    items = []
    for it in TOP5[:limit]:
        value = int(float(it["base_value"]) + seconds_passed * float(it["growth_per_second"]))
        items.append(
            {
                "id": it["id"],
                "entity": it["entity"],
                "code": it["code"],
                "value": value,
                "as_of": now_iso(),
            }
        )

    items.sort(key=lambda x: x["value"], reverse=True)
    return {"as_of": now_iso(), "count": len(items), "items": items}


# =========================
# População: vitais (world-live) — usado no frontend
# =========================
DEFAULT_BIRTHS_PER_SECOND = 4.3
DEFAULT_DEATHS_PER_SECOND = 2.0


def _utc_day_start(dt: datetime) -> datetime:
    return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)


@app.get("/vitals/world-live")
def vitals_world_live():
    births_s = float(DEFAULT_BIRTHS_PER_SECOND)
    deaths_s = float(DEFAULT_DEATHS_PER_SECOND)
    net_s = births_s - deaths_s

    now = datetime.now(timezone.utc)
    day_start = _utc_day_start(now)
    seconds_today = max(0.0, (now - day_start).total_seconds())

    def per(v_per_s: float, seconds: float) -> int:
        return int(v_per_s * seconds)

    births_today = per(births_s, seconds_today)
    deaths_today = per(deaths_s, seconds_today)
    net_today = births_today - deaths_today

    return {
        "as_of": now_iso(),
        "timezone_day_boundary": "UTC",
        "births": {
            "today": births_today,
            "units": {
                "per_second": births_s,
                "per_minute": births_s * 60.0,
                "per_hour": births_s * 3600.0,
                "per_year": births_s * 365.0 * 86400.0,
            },
        },
        "deaths": {
            "today": deaths_today,
            "units": {
                "per_second": deaths_s,
                "per_minute": deaths_s * 60.0,
                "per_hour": deaths_s * 3600.0,
                "per_year": deaths_s * 365.0 * 86400.0,
            },
        },
        "net_change": {
            "today": net_today,
            "units": {
                "per_second": net_s,
                "per_minute": net_s * 60.0,
                "per_hour": net_s * 3600.0,
                "per_year": net_s * 365.0 * 86400.0,
            },
        },
        # placeholders simples pra UI não quebrar
        "rates": {
            "birth_rate_per_1000": {"value": 0.0, "year": None},
            "death_rate_per_1000": {"value": 0.0, "year": None},
        },
    }


# =========================
# (mantive seu endpoint /population/rates também, se você ainda usa em algum lugar)
# =========================
@app.get("/population/rates")
def population_rates():
    births_s = float(DEFAULT_BIRTHS_PER_SECOND)
    deaths_s = float(DEFAULT_DEATHS_PER_SECOND)
    net_s = births_s - deaths_s

    def per(v: float, seconds: float) -> int:
        return int(v * seconds)

    return {
        "as_of": now_iso(),
        "births_per_second": births_s,
        "deaths_per_second": deaths_s,
        "net_per_second": net_s,
        "today": {
            "births": per(births_s, 86400),
            "deaths": per(deaths_s, 86400),
            "net": per(net_s, 86400),
        },
        "year": {
            "births": per(births_s, 365 * 86400),
            "deaths": per(deaths_s, 365 * 86400),
            "net": per(net_s, 365 * 86400),
        },
    }

@app.get("/entity/{kind}/{entity_id}")
def get_entity(kind: str, entity_id: str):
    kind = (kind or "").strip().lower()
    indicator_def = None

    if kind == "indicator":
        indicator_def = next((x for x in INDICATOR_REGISTRY if x.get("id") == entity_id), None)

    e = next(
        (x for x in ENTITIES_REGISTRY if x.get("kind") == kind and x.get("id") == entity_id),
        None,
    )

    # ? Fallback: permitir indicadores como entidades
    if not e and kind == "indicator":
        if indicator_def:
            e = {"kind": "indicator", "id": entity_id}

    if not e:
        raise HTTPException(status_code=404, detail="Entidade não encontrada")

    expanded = build_entity_page(e)

    if kind == "indicator":
        if not indicator_def:
            raise HTTPException(status_code=404, detail="Indicador não encontrado")

        payload = build_indicator_payload(indicator_def)
        expanded = {
            **expanded,
            "title": payload.get("title", expanded.get("title")),
            "value": payload.get("value"),
            "unit": payload.get("unit"),
            "source": payload.get("source"),
            "as_of": payload.get("as_of"),
        }

    return {"as_of": now_iso(), "entity": expanded}

@app.get("/entities")
def list_entities(kind: str | None = None):
    items = ENTITIES_REGISTRY
    if kind:
        k = kind.strip().lower()
        items = [e for e in items if (e.get("kind") or "").lower() == k]

    return {
        "as_of": now_iso(),
        "count": len(items),
        "items": [{"id": e["id"], "title": e["title"], "kind": e.get("kind")} for e in items],
    }


app.include_router(history_router)


