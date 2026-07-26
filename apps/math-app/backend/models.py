from sqlalchemy import Column, Integer, String, Float, DateTime, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True)
    phase = Column(String, nullable=False)       # ex: "tabuada", "decomposicao"
    operation = Column(String, nullable=False)    # ex: "multiplicacao", "porcentagem"
    correct = Column(Integer, nullable=False)     # 1 ou 0
    time_ms = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
