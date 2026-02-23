import requests
from datetime import datetime, timezone

def fetch_bcb_sgs_latest_value(series_id: int):
    """
    Busca o último valor disponível de uma série do SGS/BCB.
    """

    url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{series_id}/dados/ultimos/1?formato=json"

    r = requests.get(url, timeout=15)
    r.raise_for_status()
    rows = r.json()

    if not rows:
        return None

    last = rows[0]  # já vem só o último

    raw_val = last.get("valor")
    date_str = last.get("data")

    try:
        value = float(raw_val.replace(",", "."))
    except Exception:
        value = None

    return {
        "value": value,
        "date": date_str,
        "source": "Banco Central (SGS)",
        "as_of": datetime.now(timezone.utc).isoformat(),
    }