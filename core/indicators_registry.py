INDICATOR_REGISTRY = [

    # =========================================
    # POPULACAO MUNDIAL (LIVE - HIBRIDO)
    # =========================================
    {
        "id": "population_world",
        "title": "População mundial atual",
        "kind": "indicator",
        "type": "model",
        "category": "Demografia",
        "unit": "pessoas",
        "source": "Modelo híbrido (base oficial + projeção automática)",
        "description": "Estimativa em tempo real da população mundial.",
        "history_enabled": False,
        "ranking_enabled": False,
        "default_focus": "overview",
        "home_priority": 0,
        "world_priority": 0,

        # base: população mundial (estimativa ONU/OWID) — coloque aqui o último valor que você quer usar como base
        "base_value": 8280000000,  # <-- pode ajustar depois

        # taxa média líquida (nascimentos - mortes) por segundo
        # exemplo: ~2.6 pessoas/s dá ~82 milhões/ano (ordem realista)
        "growth_per_second": 2.6,
    },
    # =========================================
    # POPULACAO MUNDIAL (SERIE HISTORICA)
    # =========================================
    {
        "id": "population_world_longrun",
        "title": "População mundial (long-run)",
        "kind": "indicator",
        "type": "series",
        "category": "Demografia",
        "unit": "pessoas",
        "source": "Our World in Data / ONU",
        "description": "Série histórica de longo prazo da população mundial.",
        "history_enabled": True,
        "ranking_enabled": False,
        "default_focus": "overview",
        "home_priority": 0,
        "world_priority": 0,
    },

    # =========================================
    # 🇧🇷 SELIC
    # =========================================
    {
        "id": "selic_bcb_daily",
        "title": "Taxa Selic",
        "kind": "indicator",
        "type": "bcb_sgs_latest",
        "category": "Economia Brasil",
        "unit": "%",
        "source": "internal",
        "description": "Último valor disponível da taxa Selic.",
        "history_enabled": True,
        "ranking_enabled": False,
        "default_focus": "overview",
        "home_priority": 0,
        "world_priority": 0,
        "series_id": 432,
    },

    # =========================================
    # 🇧🇷 IPCA
    # =========================================
    {
        "id": "ipca_bcb_monthly",
        "title": "IPCA (inflação mensal)",
        "kind": "indicator",
        "type": "bcb_sgs_latest",
        "category": "Economia Brasil",
        "unit": "%",
        "source": "internal",
        "description": "Último valor mensal disponível do IPCA.",
        "history_enabled": True,
        "ranking_enabled": False,
        "default_focus": "overview",
        "home_priority": 0,
        "world_priority": 0,
        "series_id": 433,
    },

    # =========================================
    # 💵 USD/BRL
    # =========================================
    {
        "id": "usd_brl_bcb",
        "title": "Dólar (USD/BRL)",
        "kind": "indicator",
        "type": "bcb_sgs_latest",
        "category": "Economia Brasil",
        "unit": "R$",
        "source": "internal",
        "description": "Último valor disponível da cotação USD/BRL.",
        "history_enabled": True,
        "ranking_enabled": False,
        "default_focus": "overview",
        "home_priority": 0,
        "world_priority": 0,
        "series_id": 1,
    },

    # =========================================
    # 🌎 PIB MUNDIAL (World Bank)
    # =========================================
    {
        "id": "gdp_world_current_usd",
        "title": "PIB mundial (US$ corrente)",
        "kind": "indicator",
        "type": "worldbank_latest",
        "category": "Economia Global",
        "unit": "US$",
        "source": "internal",
        "description": "Último valor anual disponível do PIB mundial em US$ corrente.",
        "history_enabled": True,
        "ranking_enabled": False,
        "default_focus": "overview",
        "home_priority": 0,
        "world_priority": 0,
        "country_code": "WLD",
        "indicator_code": "NY.GDP.MKTP.CD",
    },

    # =========================================
    # 🇧🇷 PIB BRASIL (World Bank)
    # =========================================
    {
        "id": "gdp_brazil_current_usd",
        "title": "PIB Brasil (US$ corrente)",
        "kind": "indicator",
        "type": "worldbank_latest",
        "category": "Economia Brasil",
        "unit": "US$",
        "source": "internal",
        "description": "Último valor anual disponível do PIB do Brasil em US$ corrente.",
        "history_enabled": True,
        "ranking_enabled": False,
        "default_focus": "overview",
        "home_priority": 0,
        "world_priority": 0,
        "country_code": "BR",
        "indicator_code": "NY.GDP.MKTP.CD",
    },

    {
        "id": "population_brazil_worldbank",
        "title": "População do Brasil (World Bank)",
        "kind": "indicator",
        "type": "worldbank_latest",
        "category": "Demografia",
        "unit": "pessoas",
        "source": "World Bank",
        "description": "Último valor anual disponível da população do Brasil.",
        "history_enabled": True,
        "ranking_enabled": False,
        "default_focus": "overview",
        "home_priority": 0,
        "world_priority": 0,
        "country_code": "BR",
        "indicator_code": "SP.POP.TOTL",
    },

    {
        "id": "co2_world_live",
        "title": "Emissão de CO₂ (mundo, ao vivo)",
        "kind": "indicator",
        "type": "co2_model",
        "category": "Clima",
        "unit": "toneladas",
        "source": "Modelo (estimativa)",
        "description": "Estimativa em tempo real da emissão global de CO₂.",
        "history_enabled": False,
        "ranking_enabled": False,
        "default_focus": "overview",
        "home_priority": 0,
        "world_priority": 0,
        "base_value": 0,
        "growth_per_second": 1173.0,
    },
]
