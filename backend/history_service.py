from datetime import datetime
from sqlalchemy.orm import Session
from backend.models import IndicatorHistory

def snapshot_indicators(db: Session, items: list[dict], ts: datetime | None = None):
    ts = ts or datetime.utcnow()

    rows = []
    for it in items:
        indicator_id = it.get("id")
        value = it.get("value")
        if not indicator_id:
            continue

        try:
            v = float(value)
        except Exception:
            continue

        rows.append(IndicatorHistory(indicator_id=indicator_id, ts=ts, value=v))

    if rows:
        db.bulk_save_objects(rows)
        db.commit()