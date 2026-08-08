import os
import uuid
from datetime import datetime, timezone
from typing import Any

import psycopg
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict


app = FastAPI(
    title="EES RC Controls API",
    version="1.0.0",
    description="Canonical API for the EES RC Controls Digital Twin."
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://jd-dev-king.github.io",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DiagnosticResult(BaseModel):
    model_config = ConfigDict(extra="allow")

    timestamp: str | None = None
    source: str | None = None
    asset: str | None = None
    scenario: str | None = None
    entities: dict[str, Any] | None = None


def get_connection():
    return psycopg.connect(
        host=os.getenv("EES_DB_HOST", "localhost"),
        port=int(os.getenv("EES_DB_PORT", "5432")),
        dbname=os.getenv("EES_DB_NAME", "ees_data_platform"),
        user=os.getenv("EES_DB_USER", "jeremiahlupton"),
        password=os.getenv("EES_DB_PASSWORD", ""),
    )


def verify_api_key(x_api_key: str | None):
    expected = os.getenv("EES_RC_API_KEY", "")

    if expected and x_api_key != expected:
        raise HTTPException(
            status_code=401,
            detail="Invalid EES RC Controls API key."
        )


@app.get("/")
def root():
    return {
        "service": "EES RC Controls API",
        "status": "online",
        "version": "1.0.0"
    }


@app.get("/api/health")
def health():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        current_database(),
                        current_user,
                        NOW();
                    """
                )

                database, user, server_time = cur.fetchone()

        return {
            "status": "healthy",
            "service": "EES RC Controls API",
            "database": database,
            "database_user": user,
            "server_time": server_time,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Database unavailable: {exc}"
        )


@app.post("/api/v1/rc/results")
def save_rc_result(result: DiagnosticResult):

    payload = result.model_dump()

    entities = result.entities or {}

    diagnostic = str(
        entities.get("diagnostic", "UNKNOWN")
    )

    fault = str(
        entities.get("fault", "none")
    )

    anomaly_count = int(
        entities.get("anomaly_count", 0) or 0
    )

    health_percent = float(
        entities.get("health_percent", 100) or 100
    )

    # Determine registry severity from the simulated condition.
    if fault.lower() not in ("none", "", "normal"):
        severity = "high"

    elif health_percent < 50:
        severity = "critical"

    elif health_percent < 75 or anomaly_count >= 3:
        severity = "medium"

    elif anomaly_count > 0:
        severity = "low"

    else:
        severity = "info"

    asset_name = (
        result.asset
        or "Standalone RC Circuit"
    )

    message = (
        f"{asset_name}: "
        f"diagnostic={diagnostic}, "
        f"fault={fault}, "
        f"health={health_percent:.0f}%, "
        f"anomalies={anomaly_count}"
    )

    try:

        with get_connection() as conn:

            with conn.cursor() as cur:

                cur.execute(
                    """
                    INSERT INTO rc_controls.control_events (
                        event_type,
                        severity,
                        event_message,
                        source_system,
                        metadata
                    )
                    VALUES (
                        %s,
                        %s,
                        %s,
                        %s,
                        %s
                    )
                    RETURNING control_event_id;
                    """,
                    (
                        "diagnostic_result",
                        severity,
                        message,
                        result.source
                        or "EES RC Controls Digital Twin",
                        psycopg.types.json.Jsonb(
                            payload
                        ),
                    ),
                )

                control_event_id = (
                    cur.fetchone()[0]
                )

            conn.commit()

        return {
            "success": True,
            "control_event_id": str(
                control_event_id
            ),
            "severity": severity,
            "message":
                "RC Controls diagnostic result persisted."
        }

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Unable to persist RC Controls result: {exc}"
        )