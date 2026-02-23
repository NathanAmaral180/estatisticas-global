import requests
from datetime import datetime, timezone

def fetch_worldbank_latest_value(country_code: str, indicator_code: str):
    """
    Retorna o valor mais recente disponível (não-nulo) do World Bank.
    Ex.: country_code="BR", indicator_code="SP.POP.TOTL"
    """
    url = (
        f"https://api.worldbank.org/v2/country/{country_code}/indicator/{indicator_code}"
        f"?format=json&per_page=60"
    )

    r = requests.get(url, timeout=15)
    r.raise_for_status()
    data = r.json()

    # formato: [metadata, [rows...]]
    rows = data[1] if isinstance(data, list) and len(data) > 1 else []
    for row in rows:
        val = row.get("value")
        if val is not None:
            return {
                "value": int(val),
                "year": row.get("date"),
                "source": "World Bank",
                "as_of": datetime.now(timezone.utc).isoformat(),
            }

    return None