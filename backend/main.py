import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any

import psycopg
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict


app = FastAPI(
    title="EES RC Controls API",
    version="1.0.1",
    description="Canonical API for the EES RC Controls Digital Twin with Universal Data Moon forwarding.",
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
    assetId: str | None = None
    scenario: str | None = None
    entities: dict[str, Any] | None = None


class TelemetrySnapshot(BaseModel):
    model_config = ConfigDict(extra="allow")

    timestamp: str | None = None
    source: str | None = None
    asset: str | None = None
    assetId: str | None = None
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
    expected = os.getenv("EES_RC_API_KEY", "").strip()
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid EES RC Controls API key.")


def _data_moon_config() -> tuple[str, str, str]:
    base_url = os.getenv("DATA_MOON_BASE_URL", "http://127.0.0.1:8000").strip().rstrip("/")
    ingest_key = os.getenv("DATA_MOON_INGEST_API_KEY", "").strip()
    system_key = os.getenv("DATA_MOON_SYSTEM_KEY", "ees-rc-controls").strip()
    return base_url, ingest_key, system_key


def _post_data_moon(endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
    base_url, ingest_key, _ = _data_moon_config()
    if not ingest_key:
        return {
            "status": "disabled",
            "forwarded": False,
            "endpoint": endpoint,
            "error": "DATA_MOON_INGEST_API_KEY is not configured.",
        }

    request = urllib.request.Request(
        f"{base_url}{endpoint}",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-EES-Ingest-Key": ingest_key,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            body = response.read().decode("utf-8")
            parsed = json.loads(body) if body else {}
            return {
                "status": "ok",
                "forwarded": True,
                "endpoint": endpoint,
                "http_status": response.status,
                "response": parsed,
            }
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return {
            "status": "unavailable",
            "forwarded": False,
            "endpoint": endpoint,
            "http_status": exc.code,
            "error": body,
        }
    except Exception as exc:
        return {
            "status": "unavailable",
            "forwarded": False,
            "endpoint": endpoint,
            "error": str(exc),
        }


def _base_ingest_payload(payload: dict[str, Any], asset_name: str, asset_id: str | None) -> dict[str, Any]:
    _, _, system_key = _data_moon_config()
    return {
        "system_key": system_key,
        "asset_id": asset_id or asset_name,
        "timestamp": payload.get("timestamp") or datetime.now(timezone.utc).isoformat(),
        "source": payload.get("source") or "EES RC Controls Digital Twin",
        "environment": os.getenv("EES_ENVIRONMENT", "development"),
        "tags": {
            "domain": "rc_controls",
            "scenario": payload.get("scenario") or "unspecified",
        },
    }


def _severity_from_entities(entities: dict[str, Any]) -> str:
    fault = str(entities.get("fault", "none"))
    anomaly_count = int(entities.get("anomaly_count", 0) or 0)
    health_percent = float(entities.get("health_percent", entities.get("health", 100)) or 100)

    if health_percent < 50:
        return "critical"
    if fault.lower() not in ("none", "", "normal"):
        return "high"
    if health_percent < 75 or anomaly_count >= 3:
        return "medium"
    if anomaly_count > 0:
        return "low"
    return "info"


def _normalized_entities(payload: dict[str, Any]) -> dict[str, Any]:
    entities = dict(payload.get("entities") or {})
    # The browser diagnostic currently sends a flat payload. Preserve compatibility
    # while also supporting the nested gateway payload.
    flat_map = {
        "result": "diagnostic",
        "diagnostic": "diagnostic",
        "reason": "reason",
        "health": "health_percent",
        "health_percent": "health_percent",
        "fault": "fault",
        "anomaly_count": "anomaly_count",
        "calculatedTau": "calculated_tau_s",
        "measuredTau": "measured_tau_s",
        "deviation": "deviation",
    }
    for source_key, target_key in flat_map.items():
        if source_key in payload and target_key not in entities:
            entities[target_key] = payload[source_key]
    return entities


def _forward_telemetry(payload: dict[str, Any], entities: dict[str, Any], asset_name: str, asset_id: str | None) -> list[dict[str, Any]]:
    base = _base_ingest_payload(payload, asset_name, asset_id)
    severity = _severity_from_entities(entities)
    metrics = {
        "instant_power_w": "W",
        "current_a": "A",
        "voltage_v": "V",
        "control_circuit_power_w": "W",
        "session_energy_kwh": "kWh",
        "peak_power_w": "W",
        "health_percent": "%",
        "anomaly_count": "count",
    }
    results = []
    for metric, unit in metrics.items():
        if metric not in entities:
            continue
        event = {
            **base,
            "metric": metric,
            "value": entities[metric],
            "unit": unit,
            "severity": severity,
        }
        results.append(_post_data_moon("/api/ingest/telemetry", event))
    return results


def _forward_diagnostic(payload: dict[str, Any], entities: dict[str, Any], asset_name: str, asset_id: str | None) -> dict[str, Any]:
    base = _base_ingest_payload(payload, asset_name, asset_id)
    diagnostic = str(entities.get("diagnostic", "UNKNOWN"))
    event = {
        **base,
        "diagnostic_type": "rc_circuit_diagnostic",
        "status": diagnostic.lower(),
        "payload": {
            **entities,
            "asset": asset_name,
            "scenario": payload.get("scenario"),
        },
    }
    return _post_data_moon("/api/ingest/diagnostics", event)


def _forward_alert(payload: dict[str, Any], entities: dict[str, Any], asset_name: str, asset_id: str | None) -> dict[str, Any] | None:
    severity = _severity_from_entities(entities)
    fault = str(entities.get("fault", "none"))
    anomaly_count = int(entities.get("anomaly_count", 0) or 0)
    if severity == "info" and fault.lower() in ("none", "", "normal") and anomaly_count == 0:
        return None

    base = _base_ingest_payload(payload, asset_name, asset_id)
    message = (
        f"{asset_name}: fault={fault}, "
        f"health={entities.get('health_percent', 100)}%, anomalies={anomaly_count}"
    )
    event = {
        **base,
        "severity": severity,
        "message": message,
        "alert_code": "RC_CONTROL_ANOMALY" if fault.lower() in ("none", "", "normal") else "RC_CONTROL_FAULT",
        "status": "open",
    }
    return _post_data_moon("/api/ingest/alerts", event)


@app.get("/")
def root():
    return {"service": "EES RC Controls API", "status": "online", "version": "1.0.1"}


@app.get("/api/health")
def health():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT current_database(), current_user, NOW();")
                database, user, server_time = cur.fetchone()
        base_url, ingest_key, system_key = _data_moon_config()
        return {
            "status": "healthy",
            "service": "EES RC Controls API",
            "version": "1.0.1",
            "database": database,
            "database_user": user,
            "server_time": server_time,
            "data_moon": {
                "configured": bool(ingest_key),
                "base_url": base_url,
                "system_key": system_key,
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}")


@app.post("/api/v1/rc/results")
def save_rc_result(result: DiagnosticResult, x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    verify_api_key(x_api_key)
    payload = result.model_dump(exclude_none=True)
    # Include extra fields accepted by Pydantic's extra=allow.
    payload.update(result.model_extra or {})
    entities = _normalized_entities(payload)
    diagnostic = str(entities.get("diagnostic", "UNKNOWN"))
    fault = str(entities.get("fault", "none"))
    anomaly_count = int(entities.get("anomaly_count", 0) or 0)
    health_percent = float(entities.get("health_percent", 100) or 100)
    severity = _severity_from_entities(entities)
    asset_name = result.asset or "Standalone RC Circuit"
    asset_id = result.assetId or payload.get("asset_id")
    message = (
        f"{asset_name}: diagnostic={diagnostic}, fault={fault}, "
        f"health={health_percent:.0f}%, anomalies={anomaly_count}"
    )

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO rc_controls.control_events (
                        event_type, severity, event_message, source_system, metadata
                    ) VALUES (%s, %s, %s, %s, %s)
                    RETURNING control_event_id;
                    """,
                    (
                        "diagnostic_result",
                        severity,
                        message,
                        result.source or "EES RC Controls Digital Twin",
                        psycopg.types.json.Jsonb(payload),
                    ),
                )
                control_event_id = cur.fetchone()[0]
            conn.commit()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to persist RC Controls result: {exc}")

    # Data Moon is deliberately downstream/non-blocking. Local canonical persistence
    # remains successful even if the shared ingest service is temporarily unavailable.
    data_moon = {
        "diagnostic": _forward_diagnostic(payload, entities, asset_name, asset_id),
        "alert": _forward_alert(payload, entities, asset_name, asset_id),
        "telemetry": _forward_telemetry(payload, entities, asset_name, asset_id),
    }

    return {
        "success": True,
        "control_event_id": str(control_event_id),
        "severity": severity,
        "message": "RC Controls diagnostic result persisted.",
        "data_moon": data_moon,
    }


@app.post("/api/v1/rc/telemetry")
def save_rc_telemetry(snapshot: TelemetrySnapshot, x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    verify_api_key(x_api_key)
    payload = snapshot.model_dump(exclude_none=True)
    payload.update(snapshot.model_extra or {})
    entities = _normalized_entities(payload)
    asset_name = snapshot.asset or "Standalone RC Circuit"
    asset_id = snapshot.assetId or payload.get("asset_id")

    telemetry = _forward_telemetry(payload, entities, asset_name, asset_id)
    alert = _forward_alert(payload, entities, asset_name, asset_id)

    return {
        "success": True,
        "forwarded_metrics": sum(1 for item in telemetry if item.get("forwarded")),
        "data_moon": {"telemetry": telemetry, "alert": alert},
    }
