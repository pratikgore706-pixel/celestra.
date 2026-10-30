from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Alert(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    event_id: str = Field(index=True)
    kind: str
    title: str
    at: str  # ISO UTC time of the event
    lat: float | None = None
    lon: float | None = None
    created_at: str = Field(default_factory=_now)


class Observation(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    place_name: str = ""
    lat: float
    lon: float
    at: str = Field(default_factory=_now)
    event_type: str = "sky"          # moon | meteor | eclipse | iss | planet | launch | sky
    event_id: str | None = None
    event_title: str | None = None
    note: str = ""
    sky_score: float | None = None
    sky_verified: bool = False


class HonorTx(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    action: str = Field(index=True)
    ref: str = Field(index=True)      # unique together with action: one award per qualifying action
    points: int
    label: str = ""
    created_at: str = Field(default_factory=_now)
