from sqlalchemy import Column, Integer, String, Float, DateTime, Index
from backend.db import Base

class IndicatorSeriesPoint(Base):
    __tablename__ = "indicator_series_points"

    id = Column(Integer, primary_key=True, index=True)

    indicator_id = Column(String, index=True, nullable=False)

    # ✅ OWID
    entity = Column(String, index=True, nullable=True)
    code = Column(String, index=True, nullable=True)  # ✅ ISO3 (BRA, USA, IND...)

    # guardamos como datetime (ano)
    date = Column(DateTime, index=True, nullable=False)

    value = Column(Float, nullable=False)

    __table_args__ = (
        Index("ix_series_indicator_entity_date", "indicator_id", "entity", "date"),
        Index("ix_series_indicator_code_date", "indicator_id", "code", "date"),
    )