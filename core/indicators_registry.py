from datetime import datetime

def now():
    return datetime.utcnow().isoformat()

INDICATOR_REGISTRY = [
    {
        "id": "population_world",
        "title": "População Mundial",
        "category": "Demografia",
        "unit": "pessoas",
        "base_value": 8090123221,
        "growth_per_second": 2.5,
        "source": "Modelo (inicial)",
    },
    {
        "id": "co2_today",
        "title": "CO₂ emitido hoje",
        "category": "Clima",
        "unit": "toneladas",
        "base_value": 24586324,
        "growth_per_second": 8.2,
        "source": "Modelo (inicial)",
    },
    {
        "id": "population_brazil_worldbank",
        "title": "População do Brasil (World Bank)",
        "category": "Demografia",
        "unit": "pessoas",
        "source": "World Bank",
        "type": "worldbank_latest",
        "country_code": "BR",
        "indicator_code": "SP.POP.TOTL",
    },
        # ----------------
    # ECONOMIA (World Bank - Mundo)
    # ----------------
    {
        "id": "gdp_world_current_usd",
        "title": "PIB mundial (US$ corrente)",
        "category": "Economia",
        "unit": "US$",
        "source": "World Bank",
        "type": "worldbank_latest",
        "country_code": "WLD",
        "indicator_code": "NY.GDP.MKTP.CD",
    },
    {
        "id": "inflation_world_cpi_yoy",
        "title": "Inflação mundial (CPI, % a.a.)",
        "category": "Economia",
        "unit": "% a.a.",
        "source": "World Bank",
        "type": "worldbank_latest",
        "country_code": "WLD",
        "indicator_code": "FP.CPI.TOTL.ZG",
    },
    {
        "id": "unemployment_world_percent",
        "title": "Desemprego mundial (% da força de trabalho)",
        "category": "Economia",
        "unit": "%",
        "source": "World Bank",
        "type": "worldbank_latest",
        "country_code": "WLD",
        "indicator_code": "SL.UEM.TOTL.ZS",
    },

    # ----------------
    # BRASIL (World Bank - anual)
    # ----------------
    {
        "id": "gdp_brazil_current_usd",
        "title": "PIB do Brasil (US$ corrente)",
        "category": "Brasil",
        "unit": "US$",
        "source": "World Bank",
        "type": "worldbank_latest",
        "country_code": "BR",
        "indicator_code": "NY.GDP.MKTP.CD",
    },
    {
        "id": "population_brazil_worldbank",
        "title": "População do Brasil (World Bank)",
        "category": "Brasil",
        "unit": "pessoas",
        "source": "World Bank",
        "type": "worldbank_latest",
        "country_code": "BR",
        "indicator_code": "SP.POP.TOTL",
    },

    # ----------------
    # BRASIL (BCB SGS - mais frequente)
    # ----------------
    {
        "id": "selic_bcb_daily",
        "title": "Taxa Selic (ao dia, % a.a.)",
        "category": "Brasil",
        "unit": "% a.a.",
        "source": "Banco Central (SGS)",
        "type": "bcb_sgs_latest",
        "series_id": 11,  # SELIC
    },
    {
        "id": "ipca_bcb_monthly",
        "title": "IPCA (variação mensal, %)",
        "category": "Brasil",
        "unit": "% no mês",
        "source": "Banco Central (SGS)",
        "type": "bcb_sgs_latest",
        "series_id": 433,  # IPCA
    },
    {
        "id": "usd_brl_bcb",
        "title": "Dólar comercial (venda) R$/US$",
        "category": "Brasil",
        "unit": "R$/US$",
        "source": "Banco Central (SGS)",
        "type": "bcb_sgs_latest",
        "series_id": 1,  # Câmbio USD venda (SGS clássico)
    },

    # ----------------
    # ENERGIA (World Bank)
    # ----------------
    {
        "id": "electricity_use_kwh_per_capita_world",
        "title": "Uso de eletricidade per capita (kWh/ano)",
        "category": "Energia",
        "unit": "kWh per capita/ano",
        "source": "World Bank",
        "type": "worldbank_latest",
        "country_code": "WLD",
        "indicator_code": "EG.USE.ELEC.KH.PC",
    },
    {
        "id": "electricity_access_world_percent",
        "title": "Acesso à eletricidade (% da população)",
        "category": "Energia",
        "unit": "%",
        "source": "World Bank",
        "type": "worldbank_latest",
        "country_code": "WLD",
        "indicator_code": "EG.ELC.ACCS.ZS",
    },
    {
        "id": "renewable_energy_consumption_world_percent",
        "title": "Energia renovável no consumo final (%)",
        "category": "Energia",
        "unit": "%",
        "source": "World Bank",
        "type": "worldbank_latest",
        "country_code": "WLD",
        "indicator_code": "EG.FEC.RNEW.ZS",
    },
]