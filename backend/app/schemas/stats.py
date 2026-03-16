from pydantic import BaseModel


class PriceStats(BaseModel):
    count: int
    min: float
    max: float
    mean: float
    median: float
    p10: float
    p25: float
    p75: float
    p90: float
