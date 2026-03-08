from __future__ import annotations
from typing import Any, Dict, List

from core.indicators_registry import INDICATOR_REGISTRY

VALID_INDICATOR_IDS = {
    str(ind.get("id"))
    for ind in INDICATOR_REGISTRY
    if ind.get("id")
}

TOPIC_CATEGORY_TERMS = {
    "population": ("demografia",),
    "climate": ("clima",),
    "economy": ("economia",),
}

TOPIC_FALLBACK_TERMS = {
    "population": ("population", "popula"),
    "climate": ("climate", "clima", "co2"),
    "economy": ("economy", "economia", "gdp", "pib", "selic", "ipca", "usd_brl"),
}

COUNTRY_GROUPS_BY_SECTION: Dict[str, Dict[str, List[Dict[str, Any]]]] = {
    "brazil": {
        "climate": [
            {
                "type": "group",
                "id": "oil",
                "title": "Petroleo",
                "blocks": [
                    {
                        "type": "indicator_grid",
                        "items": [
                            {
                                "indicator_id": "co2_world_live",
                                "title": "Emissao de CO2 (referencia global)",
                                "href": "/i/co2_world_live?focus=climate&group=oil",
                            }
                        ],
                    }
                ],
            },
            {
                "type": "group",
                "id": "electricity",
                "title": "Eletricidade",
                "blocks": [
                    {
                        "type": "indicator_grid",
                        "items": [
                            {
                                "indicator_id": "gdp_brazil_current_usd",
                                "title": "PIB do Brasil",
                                "href": "/i/gdp_brazil_current_usd?focus=climate&group=electricity",
                            }
                        ],
                    }
                ],
            },
        ],
    },
    "russia": {
        "climate": [
            {
                "type": "group",
                "id": "oil",
                "title": "Petroleo",
                "blocks": [
                    {
                        "type": "indicator_grid",
                        "items": [
                            {
                                "indicator_id": "co2_world_live",
                                "title": "Emissao de CO2 (referencia global)",
                                "href": "/i/co2_world_live?focus=climate&group=oil",
                            }
                        ],
                    }
                ],
            },
            {
                "type": "group",
                "id": "natural_gas",
                "title": "Gas natural",
                "blocks": [
                    {
                        "type": "indicator_grid",
                        "items": [
                            {
                                "indicator_id": "gdp_world_current_usd",
                                "title": "PIB mundial",
                                "href": "/i/gdp_world_current_usd?focus=climate&group=natural_gas",
                            }
                        ],
                    }
                ],
            },
        ],
    },
}

COUNTRY_ID_ALIASES = {
    "brasil": "brazil",
}


def _topic_indicator_items(topic_id: str, limit: int = 8) -> List[Dict[str, str]]:
    topic_key = (topic_id or "").strip().lower()
    if topic_key not in TOPIC_CATEGORY_TERMS:
        return []

    def build_item(indicator: Dict[str, Any]) -> Dict[str, str] | None:
        indicator_id = indicator.get("id")
        if not isinstance(indicator_id, str) or not indicator_id.strip():
            return None
        if indicator_id not in VALID_INDICATOR_IDS:
            return None

        title = indicator.get("title") if isinstance(indicator.get("title"), str) else indicator_id
        return {
            "indicator_id": indicator_id,
            "title": title,
            "href": f"/i/{indicator_id}?focus=overview",
        }

    items: List[Dict[str, str]] = []
    category_terms = TOPIC_CATEGORY_TERMS[topic_key]
    for indicator in INDICATOR_REGISTRY:
        category = str(indicator.get("category") or "").strip().lower()
        if not any(term in category for term in category_terms):
            continue
        item = build_item(indicator)
        if not item:
            continue
        items.append(item)
        if len(items) >= limit:
            return items

    fallback_terms = TOPIC_FALLBACK_TERMS[topic_key]
    for indicator in INDICATOR_REGISTRY:
        haystack = " ".join(
            [
                str(indicator.get("id") or "").lower(),
                str(indicator.get("title") or "").lower(),
            ]
        )
        if not any(term in haystack for term in fallback_terms):
            continue
        item = build_item(indicator)
        if not item:
            continue
        if any(existing["indicator_id"] == item["indicator_id"] for existing in items):
            continue
        items.append(item)
        if len(items) >= limit:
            break

    return items


def _normalize_indicator_grid_sections(sections: Any) -> Any:
    if not isinstance(sections, list):
        return sections

    def normalize_section_id(value: Any) -> str:
        if not isinstance(value, str):
            return ""
        normalized = (
            value.strip()
            .lower()
            .replace(" ", "_")
            .replace("-", "_")
        )
        return normalized

    has_supported_blocks = False
    for section in sections:
        if not isinstance(section, dict):
            continue
        blocks = section.get("blocks")
        if not isinstance(blocks, list):
            continue
        if any(
            isinstance(block, dict) and block.get("type") in {"indicator_grid", "group"}
            for block in blocks
        ):
            has_supported_blocks = True
            break

    if not has_supported_blocks:
        return sections

    def normalize_blocks(blocks: List[Any]) -> List[Any]:
        normalized_blocks: List[Any] = []

        for block in blocks:
            if not isinstance(block, dict):
                normalized_blocks.append(block)
                continue

            block_type = block.get("type")
            if block_type == "indicator_grid":
                raw_items = block.get("items")
                items = raw_items if isinstance(raw_items, list) else []
                normalized_items: List[Dict[str, str]] = []

                for item in items:
                    if not isinstance(item, dict):
                        continue
                    indicator_id = item.get("indicator_id")
                    if not isinstance(indicator_id, str) or not indicator_id.strip():
                        continue

                    normalized_item: Dict[str, str] = {"indicator_id": indicator_id}
                    title = item.get("title")
                    href = item.get("href")

                    if isinstance(title, str):
                        normalized_item["title"] = title
                    if isinstance(href, str):
                        normalized_item["href"] = href

                    normalized_items.append(normalized_item)

                normalized_blocks.append({**block, "items": normalized_items})
                continue

            if block_type == "group":
                title = block.get("title")
                nested_blocks = block.get("blocks")
                if isinstance(title, str) and isinstance(nested_blocks, list):
                    group_id = block.get("id")
                    normalized_group: Dict[str, Any] = {
                        **block,
                        "type": "group",
                        "title": title,
                        "blocks": normalize_blocks(nested_blocks),
                    }
                    if isinstance(group_id, str) and group_id.strip():
                        normalized_group["id"] = group_id
                    normalized_blocks.append(
                        normalized_group
                    )
                else:
                    normalized_blocks.append(block)
                continue

            normalized_blocks.append(block)

        return normalized_blocks

    normalized_sections: List[Any] = []
    for section in sections:
        if not isinstance(section, dict):
            normalized_sections.append(section)
            continue

        section_id = normalize_section_id(section.get("id"))
        if not section_id:
            section_id = normalize_section_id(section.get("title"))
        normalized_section: Dict[str, Any] = {**section}
        if section_id:
            normalized_section["id"] = section_id

        blocks = section.get("blocks")
        if not isinstance(blocks, list):
            normalized_sections.append(normalized_section)
            continue

        normalized_sections.append({**normalized_section, "blocks": normalize_blocks(blocks)})

    return normalized_sections


def world_template(entity: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        {
            "id": "demography",
            "title": "Demografia",
            "blocks": [
                {
                    "type": "indicator_grid",
                    "title": "Indicadores de demografia",
                    "items": [
                        {
                            "indicator_id": "population_world",
                            "title": "População mundial",
                            "href": "/i/population_world?focus=overview",
                        },
                        {
                            "indicator_id": "population_world_longrun",
                            "title": "População mundial (longo prazo)",
                            "href": "/i/population_world_longrun?focus=overview",
                        },
                    ],
                }
            ],
        },
        {
            "id": "climate",
            "title": "Energia",
            "blocks": [
                {
                    "type": "indicator_grid",
                    "title": "Indicadores de energia",
                    "items": [
                        {
                            "indicator_id": "co2_world_live",
                            "title": "Emissões de CO₂",
                            "href": "/i/co2_world_live?focus=overview",
                        }
                    ],
                },
                {
                    "type": "group",
                    "id": "oil",
                    "title": "Petr\u00f3leo",
                    "blocks": [
                        {
                            "type": "indicator_grid",
                            "items": [
                                {
                                    "indicator_id": "co2_world_live",
                                    "title": "Emissões de CO₂",
                                    "href": "/i/co2_world_live?focus=overview",
                                }
                            ],
                        }
                    ],
                },
                {
                    "type": "group",
                    "id": "natural_gas",
                    "title": "G\u00e1s natural",
                    "blocks": [
                        {
                            "type": "indicator_grid",
                            "items": [
                                {
                                    "indicator_id": "co2_world_live",
                                    "title": "Emissões de CO₂",
                                    "href": "/i/co2_world_live?focus=overview",
                                }
                            ],
                        }
                    ],
                }
            ],
        },
        {
            "id": "economy",
            "title": "Economia",
            "blocks": [
                {
                    "type": "indicator_grid",
                    "title": "Indicadores de economia",
                    "items": [
                        {
                            "indicator_id": "gdp_world_current_usd",
                            "title": "PIB mundial",
                            "href": "/i/gdp_world_current_usd?focus=overview",
                        }
                    ],
                }
            ],
        },
    ]

def home_template(entity: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        {
            "id": "overview",
            "title": "Visao geral",
            "blocks": [
                {
                    "type": "indicator_grid",
                    "title": "Tópicos",
                    "compact_nav": True,
                    "items": [
                        {
                            "indicator_id": "population_world",
                            "title": "👥 População",
                            "href": "/topic/population",
                        },
                        {
                            "indicator_id": "co2_world_live",
                            "title": "🌍 Clima",
                            "href": "/topic/climate",
                        },
                        {
                            "indicator_id": "gdp_world_current_usd",
                            "title": "💰 Economia",
                            "href": "/topic/economy",
                        },
                        {
                            "indicator_id": "topic_energy",
                            "title": "⚡ Energia",
                            "href": "/topic/energy",
                        },
                        {
                            "indicator_id": "topic_world",
                            "title": "🌐 Mundo",
                            "href": "/world",
                        },
                        {
                            "indicator_id": "topic_countries",
                            "title": "🗺️ Países",
                            "href": "/c/brazil",
                        },
                    ],
                },
                {
                    "type": "indicator_grid",
                    "title": "Indicadores em destaque",
                    "items": [
                        {
                            "indicator_id": "population_world",
                            "title": "População mundial",
                            "href": "/world?focus=population",
                        },
                        {
                            "indicator_id": "co2_world_live",
                            "title": "Emissão de CO₂",
                            "href": "/world?focus=climate",
                        },
                        {
                            "indicator_id": "gdp_world_current_usd",
                            "title": "PIB mundial",
                            "href": "/world?focus=economy",
                        },
                        {
                            "indicator_id": "population_brazil_worldbank",
                            "title": "População do Brasil",
                            "href": "/c/brazil?focus=population",
                        },
                    ],
                },
            ],
        },
    ]


def country_template(entity: Dict[str, Any]) -> List[Dict[str, Any]]:
    pop_indicator_id = entity.get("population_indicator_id") or f"population_{entity['id']}_worldbank"
    gdp_indicator_id = entity.get("gdp_indicator_id") or f"gdp_{entity['id']}_current_usd"
    country_id = str(entity.get("id") or "").strip().lower()

    grid_items: List[Dict[str, str]] = []
    seen: set[str] = set()

    def _add_grid_item(indicator_id: Any, title: str) -> None:
        if not isinstance(indicator_id, str) or not indicator_id.strip():
            return
        if indicator_id not in VALID_INDICATOR_IDS:
            return
        if indicator_id in seen:
            return
        seen.add(indicator_id)
        grid_items.append(
            {
                "indicator_id": indicator_id,
                "title": title,
                "href": f"/i/{indicator_id}?focus=overview",
            }
        )

    _add_grid_item(pop_indicator_id, "População")
    _add_grid_item(gdp_indicator_id, "PIB (USD)")

    if country_id in {"brazil", "brasil"}:
        _add_grid_item("population_brazil_worldbank", "População do Brasil")
        _add_grid_item("gdp_brazil_current_usd", "PIB do Brasil")
        _add_grid_item("selic_bcb_daily", "Taxa Selic")
        _add_grid_item("ipca_bcb_monthly", "IPCA")
        _add_grid_item("usd_brl_bcb", "Dólar (USD/BRL)")

    overview_blocks: List[Dict[str, Any]] = [
        {
            "type": "hero_indicator",
            "indicator_id": pop_indicator_id,
            "source": {"kind": "indicator", "id": pop_indicator_id},
        },
        {
            "type": "hero_indicator",
            "indicator_id": gdp_indicator_id,
            "source": {"kind": "indicator", "id": gdp_indicator_id},
        },
    ]

    if grid_items:
        overview_blocks.append(
            {
                "type": "indicator_grid",
                "title": "Indicadores em destaque",
                "items": grid_items,
            }
        )

    country_groups_key = COUNTRY_ID_ALIASES.get(country_id, country_id)
    country_groups_by_section = COUNTRY_GROUPS_BY_SECTION.get(country_groups_key, {})
    climate_blocks: List[Dict[str, Any]] = country_groups_by_section.get("climate", [])

    return [
        {
            "id": "overview",
            "title": "Visão geral",
            "blocks": overview_blocks,
        },
        {"id": "population", "title": "Demografia", "blocks": []},
        {"id": "economy", "title": "Economia", "blocks": []},
        {"id": "climate", "title": "Energia & Clima", "blocks": climate_blocks},
    ]


def topic_template(entity: Dict[str, Any]) -> List[Dict[str, Any]]:
    topic_id = str(entity.get("id") or "").strip().lower()
    topic_title = str(entity.get("title") or topic_id or "Tópico")
    grid_items = _topic_indicator_items(topic_id)

    overview_blocks: List[Dict[str, Any]] = []
    if grid_items:
        overview_blocks.append(
            {
                "type": "indicator_grid",
                "title": "Indicadores em destaque",
                "items": grid_items,
            }
        )
        overview_blocks.append(
            {
                "type": "history_chart",
                "indicator_id": grid_items[0]["indicator_id"],
            }
        )

    return [
        {
            "id": "overview",
            "title": "Visão geral",
            "blocks": overview_blocks,
        },
        {
            "id": "world",
            "title": "Mundo",
            "blocks": [
                {
                    "type": "indicator_grid",
                    "compact_nav": True,
                    "items": [
                        {
                            "indicator_id": f"topic_{topic_id}_world",
                            "title": "Ver mundo",
                            "href": "/world",
                        }
                    ],
                }
            ],
        },
        {
            "id": "countries",
            "title": "Países",
            "blocks": [
                {
                    "type": "indicator_grid",
                    "compact_nav": True,
                    "items": [
                        {
                            "indicator_id": f"topic_{topic_id}_brazil",
                            "title": "Brasil",
                            "href": "/c/brazil",
                        },
                        {
                            "indicator_id": f"topic_{topic_id}_russia",
                            "title": "Rússia",
                            "href": "/c/russia",
                        },
                    ],
                }
            ],
        },
    ]


def indicator_template(entity: Dict[str, Any]) -> List[Dict[str, Any]]:
    indicator_id = entity.get("id")

    return [
        {
            "id": "overview",
            "title": "Visão geral",
            "blocks": [
                {
                    "type": "hero_indicator",
                    "indicator_id": indicator_id,
                    "source": {"kind": "indicator", "id": indicator_id},
                },
                {
                    "type": "history_chart",
                    "source": {"kind": "indicator", "id": indicator_id},
                },
            ],
        }
    ]


TEMPLATE_BY_KIND = {
    "home": home_template,
    "world": world_template,
    "country": country_template,
    "topic": topic_template,
    "indicator": indicator_template,
}


def build_entity_page(entity: Dict[str, Any]) -> Dict[str, Any]:
    k = (entity.get("kind") or "").strip().lower()
    fn = TEMPLATE_BY_KIND.get(k)

    sections = entity.get("sections")
    if sections:
        return {**entity, "sections": _normalize_indicator_grid_sections(sections)}

    if not fn:
        return {**entity, "sections": []}

    return {**entity, "sections": _normalize_indicator_grid_sections(fn(entity))}
