import csv
import os
from datetime import datetime, timezone

import requests

from backend.db import SessionLocal
from backend.models_series import IndicatorSeriesPoint


INDICATOR_ID = "population_world_longrun"

# Dataset do OWID (population long-run)
OWID_URL = "https://ourworldindata.org/grapher/population.csv"


def year_to_date(y: str):
    # OWID tem anos negativos (ex: -10000). SQLite datetime não aceita.
    # Então ignoramos anos <= 0 (pré-história) por enquanto.
    yy = int(str(y).strip())
    if yy <= 0:
        return None
    return datetime(yy, 7, 1, tzinfo=timezone.utc)  # ✅ mid-year (1/jul)


def download_csv(path: str):
    print("Baixando OWID population longrun...")
    r = requests.get(OWID_URL, timeout=60)
    r.raise_for_status()
    with open(path, "wb") as f:
        f.write(r.content)
    print("OK: CSV baixado")


def run():
    tmp_path = os.path.join(os.getcwd(), "owid_population_longrun.csv")
    download_csv(tmp_path)

    db = SessionLocal()

    inserted = 0
    updated = 0
    skipped = 0

    try:
        with open(tmp_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            # Esperado: Entity, Code, Year, Population
            for row in reader:
                entity = (row.get("Entity") or "").strip()
                code = (row.get("Code") or "").strip()
                year = (row.get("Year") or "").strip()
                pop = row.get("Population")

                dt = year_to_date(year)
                if not dt:
                    skipped += 1
                    continue

                try:
                    value = float(pop) if pop not in (None, "", "NA") else None
                except:
                    value = None

                if value is None:
                    skipped += 1
                    continue

                # Upsert simples (por indicador + entity + date)
                existing = (
                    db.query(IndicatorSeriesPoint)
                    .filter(IndicatorSeriesPoint.indicator_id == INDICATOR_ID)
                    .filter(IndicatorSeriesPoint.entity == entity)
                    .filter(IndicatorSeriesPoint.date == dt)
                    .first()
                )

                if existing:
                    # ✅ atualiza e garante que code fica preenchido
                    existing.value = value
                    existing.code = code or existing.code
                    updated += 1
                else:
                    p = IndicatorSeriesPoint(
                        indicator_id=INDICATOR_ID,
                        entity=entity,
                        code=code or None,  # ✅ grava ISO3
                        date=dt,
                        value=value,
                    )
                    db.add(p)
                    inserted += 1

        db.commit()
    finally:
        db.close()

    print(f"Import finalizado ✅  inserted={inserted}  updated={updated}  skipped={skipped}")
    print("Agora teste: http://127.0.0.1:8000/population/top-live?limit=5")


if __name__ == "__main__":
    run()