from sqlalchemy import Column, String, Float, DateTime, Integer, Index
from backend.db import Base

class IndicatorHistory(Base):
    __tablename__ = "indicator_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    indicator_id = Column(String, nullable=False, index=True)
    ts = Column(DateTime, nullable=False, index=True)
    value = Column(Float, nullable=False)

    __table_args__ = (
        Index("ix_history_indicator_ts", "indicator_id", "ts"),
    )