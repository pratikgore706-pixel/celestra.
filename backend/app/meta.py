"""Every API response is wrapped so the UI can show where data came from."""
from datetime import datetime, timezone
from typing import Any, Literal

Status = Literal["live", "cached", "computed", "demo"]


def envelope(data: Any, source: str, status: Status = "live", **extra: Any) -> dict:
    return {
        "data": data,
        "meta": {
            "source": source,
            "status": status,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            **extra,
        },
    }
