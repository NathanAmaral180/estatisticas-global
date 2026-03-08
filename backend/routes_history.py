from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
import requests
from typing import Any, Dict, List

from backend.db import SessionLocal
from backend.models import IndicatorHistory
from backend.models_series import IndicatorSeriesPoint
from core.indicators_registry import INDICATOR_REGISTRY
from core.cache import get_cache, set_cache

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

RANGE_MAP = {
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
    "30d": timedelta(days=30),
    "1y": timedelta(days=365),
}

INDICATOR_BY_ID: Dict[str, Dict[str, Any]] = {
    str(ind.get("id")): ind
    for ind in INDICATOR_REGISTRY
    if ind.get("id")
}
SERIES_FALLBACK_BY_ID = {
    "population_world": "population_world_longrun",
}


def _to_iso_z(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def _as_points(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [{"ts": p["x"], "value": p["y"]} for p in items]


def _recent_history_from_db(
    db: Session,
    indicator_id: str,
    range: str,
    limit: int,
) -> List[Dict[str, Any]]:
    start = None if range == "all" else datetime.utcnow() - RANGE_MAP[range]

    q = db.query(IndicatorHistory).filter(IndicatorHistory.indicator_id == indicator_id)
    if start:
        q = q.filter(IndicatorHistory.ts >= start)

    rows = q.order_by(IndicatorHistory.ts.desc()).limit(limit).all()
    rows = list(reversed(rows))
    return [{"x": _to_iso_z(r.ts), "y": float(r.value)} for r in rows]


def _series_history_from_db(
    db: Session,
    indicator_id: str,
    range: str,
    limit: int,
) -> List[Dict[str, Any]]:
    # Serie historica: prioriza uma entidade "World" quando existir, para nao misturar paises.
    has_world = (
        db.query(IndicatorSeriesPoint.id)
        .filter(
            IndicatorSeriesPoint.indicator_id == indicator_id,
            func.lower(IndicatorSeriesPoint.entity) == "world",
        )
        .first()
        is not None
    )

    q = db.query(IndicatorSeriesPoint).filter(IndicatorSeriesPoint.indicator_id == indicator_id)
    if has_world:
        q = q.filter(func.lower(IndicatorSeriesPoint.entity) == "world")

    rows = q.order_by(IndicatorSeriesPoint.date.desc()).limit(limit).all()
    rows = list(reversed(rows))

    if not rows:
        return []

    # Para series longas, ignoramos range curto default (ex.: 7d) e retornamos serie util.
    # Se o cliente pedir range=all, o comportamento e identico.

    return [{"x": _to_iso_z(r.date), "y": float(r.value)} for r in rows]


def _worldbank_history(
    indicator_def: Dict[str, Any],
    limit: int,
) -> List[Dict[str, Any]]:
    country_code = indicator_def.get("country_code")
    indicator_code = indicator_def.get("indicator_code")
    if not country_code or not indicator_code:
        return []

    cache_key = f"wb-history:{country_code}:{indicator_code}:{limit}"
    cached = get_cache(cache_key)
    if isinstance(cached, list):
        return cached

    url = (
        f"https://api.worldbank.org/v2/country/{country_code}/indicator/{indicator_code}"
        f"?format=json&per_page=20000"
    )

    try:
        res = requests.get(url, timeout=20)
        res.raise_for_status()
        payload = res.json()
    except Exception:
        return []

    rows = payload[1] if isinstance(payload, list) and len(payload) > 1 and isinstance(payload[1], list) else []

    points: List[Dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        year_raw = row.get("date")
        value_raw = row.get("value")
        if value_raw is None:
            continue
        try:
            year = int(str(year_raw))
            value = float(value_raw)
        except Exception:
            continue
        if year <= 0:
            continue
        points.append({"x": f"{year}-01-01T00:00:00Z", "y": value})

    points.sort(key=lambda p: p["x"])
    if limit > 0 and len(points) > limit:
        points = points[-limit:]

    set_cache(cache_key, points, ttl_seconds=60 * 60 * 6)
    return points


def resolve_indicator_history_payload(
    indicator_id: str,
    range: str,
    limit: int,
    mode: str | None,
    db: Session,
) -> Dict[str, Any]:
    indicator_def = INDICATOR_BY_ID.get(indicator_id)
    indicator_type = str(indicator_def.get("type", "")).strip().lower() if indicator_def else ""

    def _recent() -> Dict[str, Any] | None:
        items = _recent_history_from_db(db=db, indicator_id=indicator_id, range=range, limit=limit)
        if items:
            return {
                "indicator_id": indicator_id,
                "range": range,
                "count": len(items),
                "items": items,
                "points": _as_points(items),
                "mode": "recent",
            }
        return None

    def _long() -> Dict[str, Any] | None:
        alt_id = SERIES_FALLBACK_BY_ID.get(indicator_id)
        if alt_id:
            items = _series_history_from_db(db=db, indicator_id=alt_id, range=range, limit=limit)
            if items:
                return {
                    "indicator_id": indicator_id,
                    "range": range,
                    "count": len(items),
                    "items": items,
                    "points": _as_points(items),
                    "mode": f"series_fallback:{alt_id}",
                }

        if indicator_type == "series":
            items = _series_history_from_db(db=db, indicator_id=indicator_id, range=range, limit=limit)
            if items:
                return {
                    "indicator_id": indicator_id,
                    "range": range,
                    "count": len(items),
                    "items": items,
                    "points": _as_points(items),
                    "mode": "series",
                }

        if indicator_type == "worldbank_latest" and indicator_def:
            items = _worldbank_history(indicator_def=indicator_def, limit=limit)
            if items:
                return {
                    "indicator_id": indicator_id,
                    "range": range,
                    "count": len(items),
                    "items": items,
                    "points": _as_points(items),
                    "mode": "worldbank",
                }
        return None

    mode_norm = (mode or "").strip().lower()
    if mode_norm == "long":
        resolved = _long() or _recent()
    else:
        resolved = _recent() or _long()

    if resolved:
        return resolved

    return {
        "indicator_id": indicator_id,
        "range": range,
        "count": 0,
        "items": [],
        "points": [],
        "mode": "empty",
    }


@router.get("/indicator/{indicator_id}/history")
def indicator_history(
    indicator_id: str,
    range: str = Query("7d", pattern="^(24h|7d|30d|1y|all)$"),
    mode: str | None = Query(None, pattern="^(recent|long)$"),
    limit: int = Query(800, ge=10, le=5000),
    db: Session = Depends(get_db),
):
    return resolve_indicator_history_payload(indicator_id=indicator_id, range=range, limit=limit, mode=mode, db=db)

@router.get("/indicator/{indicator_id}/series")
def indicator_series(
    indicator_id: str,
    range: str = Query("all", pattern="^(24h|7d|30d|1y|all)$"),
    mode: str | None = Query(None, pattern="^(recent|long)$"),
    limit: int = Query(800, ge=10, le=5000),
    db: Session = Depends(get_db),
):
    # reaproveita a mesma lógica do history
    return indicator_history(indicator_id=indicator_id, range=range, mode=mode, limit=limit, db=db)
