from fastapi import APIRouter
from datetime import datetime, timezone
import math

from core.sources_worldbank import fetch_worldbank_latest_value
from core.cache import get_cache, set_cache

router = APIRouter(prefix="/co2", tags=["co2"])


def now_utc():
    return datetime.now(timezone.utc)


def seconds_in_year(year: int) -> int:
    # ano bissexto
    is_leap = (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)
    return 366 * 24 * 3600 if is_leap else 365 * 24 * 3600


@router.get("/live")
def co2_world_live():
    """
    Retorna estimativa 'ao vivo' de CO2 emitido no ano atual,
    usando o último dado anual disponível do World Bank para calibrar a taxa.
    """
    cache_key = "co2:world_live"
    cached = get_cache(cache_key)
    if cached:
        return cached

    # World Bank: CO2 emissions (kt) - código EN.ATM.CO2E.KT
    wb = fetch_worldbank_latest_value("WLD", "EN.ATM.CO2E.KT")

    if not wb or wb.get("value") is None:
        payload = {
            "as_of": now_utc().isoformat(),
            "source": "World Bank",
            "year": None,
            "annual_kt": None,
            "annual_tonnes": None,
            "per_second_tonnes": None,
            "this_year_tonnes": None,
            "note": "Sem dado disponível no momento",
        }
        set_cache(cache_key, payload, ttl_seconds=60 * 10)
        return payload

    annual_kt = float(wb["value"])
    annual_tonnes = annual_kt * 1000.0  # kt -> toneladas

    # taxa baseada no ano do dado (ex.: 2022), mas usada como aproximação para o presente
    year_data = int(wb["year"])
    per_sec = annual_tonnes / seconds_in_year(year_data)

    now = now_utc()
    year_now = now.year
    start_year = datetime(year_now, 1, 1, tzinfo=timezone.utc)
    elapsed = (now - start_year).total_seconds()
    elapsed = max(0.0, elapsed)

    this_year_tonnes = per_sec * elapsed

    payload = {
        "as_of": now.isoformat(),
        "source": f'World Bank ({wb["year"]})',
        "year": year_data,
        "annual_kt": annual_kt,
        "annual_tonnes": annual_tonnes,
        "per_second_tonnes": per_sec,
        "this_year_tonnes": this_year_tonnes,
        "note": "Estimado ao vivo usando taxa anual do último ano disponível",
    }

    # cache curto (ao vivo)
    set_cache(cache_key, payload, ttl_seconds=2)
    return payload