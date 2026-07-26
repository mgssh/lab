import os
from typing import List

from fastapi import Depends, FastAPI
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db, init_db
from models import Attempt

app = FastAPI(title="Math Trainer API")


@app.on_event("startup")
def on_startup():
    init_db()


class AttemptIn(BaseModel):
    phase: str
    operation: str
    correct: bool
    time_ms: int


class StatsOut(BaseModel):
    operation: str
    total: int
    avg_time_ms: float
    error_rate: float


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(func.now())
    return {"status": "ok"}


@app.post("/attempts")
def create_attempt(attempt: AttemptIn, db: Session = Depends(get_db)):
    row = Attempt(
        phase=attempt.phase,
        operation=attempt.operation,
        correct=1 if attempt.correct else 0,
        time_ms=attempt.time_ms,
    )
    db.add(row)
    db.commit()
    return {"id": row.id}


@app.get("/stats", response_model=List[StatsOut])
def get_stats(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Attempt.operation,
            func.count(Attempt.id).label("total"),
            func.avg(Attempt.time_ms).label("avg_time_ms"),
            (1 - func.avg(Attempt.correct)).label("error_rate"),
        )
        .group_by(Attempt.operation)
        .all()
    )
    return [
        StatsOut(
            operation=r.operation,
            total=r.total,
            avg_time_ms=float(r.avg_time_ms or 0),
            error_rate=float(r.error_rate or 0),
        )
        for r in rows
    ]
