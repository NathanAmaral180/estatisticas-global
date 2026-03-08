import csv
import io
import requests
from datetime import datetime, timezone

OWID_CO2_URL = "https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv"

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def fetch_owid_co2_latest(entity: str = "World"):
    """
    Retorna o último ano disponível de emissões de CO2 (toneladas) para a entidade.
    Usa coluna: co2 (milhões de toneladas) ou co2_including_luc? vamos usar co2 (MtCO2).
    Converte para toneladas.
    """
    r = requests.get(OWID_CO2_URL, timeout=30)
    r.raise_for_status()

    f = io.StringIO(r.text)
    reader = csv.DictReader(f)

    rows = []
    for row in reader:
        if row.get("country") == entity:
            year = row.get("year")
            co2_mt = row.get("co2")  # MtCO2
            if year and co2_mt and co2_mt != "":
                try:
                    rows.append((int(year), float(co2_mt)))
                except:
                    pass

    if not rows:
        return None

    rows.sort(key=lambda x: x[0])
    year, co2_mt = rows[-1]

    return {
        "year": year,
        "value_tonnes": co2_mt * 1_000_000,  # Mt -> toneladas
        "as_of": now_iso(),
        "source": "Our World in Data (OWID)",
    }