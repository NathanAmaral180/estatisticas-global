from __future__ import annotations

from typing import Any, Dict, List

from core.countries_min import COUNTRIES
from core.indicators_registry import INDICATOR_REGISTRY


def build_world_entities() -> List[Dict[str, Any]]:
    return [{"id": "world", "title": "Mundo", "kind": "world"}]


def build_topic_entities() -> List[Dict[str, Any]]:
    return [
        {"id": "population", "title": "População", "kind": "topic"},
        {"id": "climate", "title": "Clima", "kind": "topic"},
        {"id": "economy", "title": "Economia", "kind": "topic"},
        {
            "id": "energy",
            "title": "Energia",
            "kind": "topic",
            "sections": [
                {
                    "id": "world",
                    "title": "Mundo",
                    "blocks": [
                        {
                            "type": "indicator_grid",
                            "compact_nav": True,
                            "items": [
                                {
                                    "indicator_id": "topic_energy_world",
                                    "title": "Ver mundo",
                                    "href": "/world?focus=energy",
                                }
                            ],
                        }
                    ],
                },
                {
                    "id": "countries",
                    "title": "Paises",
                    "blocks": [
                        {
                            "type": "indicator_grid",
                            "compact_nav": True,
                            "items": [
                                {
                                    "indicator_id": "topic_energy_brazil",
                                    "title": "Brasil",
                                    "href": "/c/brazil?focus=energy",
                                },
                                {
                                    "indicator_id": "topic_energy_russia",
                                    "title": "Russia",
                                    "href": "/c/russia?focus=energy",
                                },
                            ],
                        }
                    ],
                },
            ],
        },
    ]


def build_country_entities() -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for country in COUNTRIES:
        items.append(
            {
                "id": country["id"],
                "title": country["title"],
                "kind": "country",
                "iso3": country["iso3"],
            }
        )
    return items


def build_indicator_entities() -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for indicator in INDICATOR_REGISTRY:
        indicator_id = (indicator.get("id") or "").strip()
        if not indicator_id:
            continue

        items.append(
            {
                "id": indicator_id,
                "title": indicator.get("title") or indicator_id,
                "kind": "indicator",
                # metadados opcionais para filtro/listagem
                "category": indicator.get("category"),
                "unit": indicator.get("unit"),
                "indicator_type": indicator.get("type"),
            }
        )
    return items


ENTITIES_REGISTRY = [
    *build_world_entities(),
    *build_topic_entities(),
    *build_country_entities(),
    *build_indicator_entities(),
]
