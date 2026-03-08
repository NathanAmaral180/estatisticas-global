from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.db import SessionLocal
from backend.models_series import IndicatorSeriesPoint

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/indicator/{indicator_id}/series")
def indicator_series(
    indicator_id: str,
    entity: str = Query("World"),
    range: str = Query("all", pattern="^(all|1y|30d|7d|24h)$"),
    db: Session = Depends(get_db),
):
    start_date = None
    if range != "all":
        days = {"24h": 1, "7d": 7, "30d": 30, "1y": 365}[range]
        start_date = date.today() - timedelta(days=days)

    q = db.query(IndicatorSeriesPoint).filter(
        IndicatorSeriesPoint.indicator_id == indicator_id,
        IndicatorSeriesPoint.entity == entity,
    )

    if start_date:
        q = q.filter(IndicatorSeriesPoint.date >= start_date)

    rows = q.order_by(IndicatorSeriesPoint.date.asc()).all()

    return {
        "indicator_id": indicator_id,
        "entity": entity,
        "range": range,
        "count": len(rows),
        "points": [{"ts": r.date.isoformat(), "value": r.value} for r in rows],
    }