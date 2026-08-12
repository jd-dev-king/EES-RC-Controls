# EES RC Controls

**Electrical Controls, RC Transient Analysis & Connected Digital Twin**

**Version 2.0.0**

EES RC Controls is an interactive electrical engineering and controls simulation within the **EES Industrial Universe**.

The project combines a standalone RC circuit transient-response simulator with an EES-connected industrial operating mode capable of receiving electrical context from **EES Power Grid Sun**.

It preserves the original RC engineering simulation while expanding the project into a connected controls and diagnostic layer for the broader EES digital-twin architecture.

---

## Overview

EES RC Controls models the transient behavior of resistor-capacitor (RC) circuits and provides interactive visualization of charging, discharging, time constants, voltage response, and control behavior.

Version 2.0.0 introduces a dual-mode architecture:

### Standalone / Home Mode

The RC simulator can operate independently as an interactive electrical engineering application.

This mode is designed for:

- RC circuit experimentation
- Charging and discharging analysis
- Time-constant visualization
- Electrical engineering demonstrations
- Controls education
- Independent portfolio demonstrations

### EES Industrial Mode

RC Controls can also operate as a downstream component of the EES electrical architecture.

When launched with Power Grid context, the simulator receives industrial operating context and presents RC behavior as part of a larger facility electrical system.

Example:

```text
?source=power-grid&scope=PHARMA
```

This allows the same RC simulation engine to function as an electrical-controls and transient-diagnostics component within the EES ecosystem.

---

# EES Architecture

```text
                    EES INDUSTRIAL UNIVERSE

                           POWER
                             │
                             ▼
                  ┌─────────────────────┐
                  │ EES Power Grid Sun  │
                  │                     │
                  │ Electrical Supply   │
                  │ Power Quality       │
                  │ Facility Loads      │
                  │ Grid Diagnostics    │
                  └──────────┬──────────┘
                             │
                  Electrical Context
                             │
                             ▼
                  ┌─────────────────────┐
                  │   EES RC Controls   │
                  │                     │
                  │ Transient Response  │
                  │ RC Analysis         │
                  │ Controls Behavior   │
                  │ Diagnostics         │
                  └──────────┬──────────┘
                             │
                             ▼
                     EES Digital Thread
```

Power Grid Sun represents the upstream electrical infrastructure layer.

RC Controls operates downstream, focusing on component-level electrical response, transient behavior, controls interaction, and diagnostic interpretation.

---

# Core Capabilities

## RC Transient Simulation

The simulator models fundamental resistor-capacitor circuit behavior.

For capacitor charging:

```text
V(t) = Vs × (1 - e^(-t/RC))
```

For capacitor discharging:

```text
V(t) = V0 × e^(-t/RC)
```

The circuit time constant is:

```text
τ = RC
```

At one time constant during charging, the capacitor reaches approximately:

```text
63.2%
```

of its final voltage.

---

## Interactive Controls

The application provides an interactive interface for modifying circuit and simulation conditions.

Depending on operating mode, users can explore:

- Resistance
- Capacitance
- Supply voltage
- Capacitor voltage
- Charging behavior
- Discharging behavior
- Time constant
- Transient response
- Electrical operating state

---

## Live Visualization

RC Controls provides visual feedback for electrical behavior rather than presenting only calculated values.

The digital-twin interface is designed to make transient response observable through interactive engineering visualization.

---

# Connected Industrial Context

Version 2.0.0 introduces EES industrial context.

RC Controls can be launched from or associated with **EES Power Grid Sun** using URL parameters.

Example:

```text
?source=power-grid&scope=PHARMA
```

The application can use this context to identify that the simulation is operating within an industrial electrical environment rather than as an isolated educational circuit.

This architecture allows RC Controls to remain independently deployable while still participating in the EES connected digital-twin environment.

---

# Operating Modes

| Mode | Purpose |
|---|---|
| Standalone | Independent RC circuit simulation |
| Home | Standalone/home electrical context |
| Power Grid | Connected EES electrical context |
| Pharma | Industrial pharmaceutical-facility context |

The application does not require the complete EES platform to perform its core RC calculations.

This separation allows the project to operate both as an independent engineering simulator and as a connected EES subsystem.

---

# Relationship to EES Power Grid Sun

EES Power Grid Sun and EES RC Controls represent different levels of the electrical system.

### EES Power Grid Sun

Focuses on:

- Electrical infrastructure
- Campus power distribution
- Facility loads
- Utility conditions
- Power quality
- Electrical diagnostics
- System-level monitoring

### EES RC Controls

Focuses on:

- Component response
- RC transient behavior
- Charging/discharging
- Time constants
- Controls response
- Electrical diagnostics
- Engineering analysis

Together they establish an upstream-to-downstream electrical digital thread:

```text
Utility / Electrical Supply
          │
          ▼
 EES Power Grid Sun
          │
          ▼
 Electrical Conditions
          │
          ▼
   EES RC Controls
          │
          ▼
 Transient / Controls Analysis
```

---

# EES Connected Digital Twins

RC Controls is designed as an independently deployable member of the EES Connected Digital Twins architecture.

The broader EES ecosystem can connect operational domains including:

```text
EES Power Grid Sun
        │
        ▼
EES RC Controls
        │
        ├───────────────┐
        │               │
        ▼               ▼
Pharma Process      Manufacturing
Digital Twin        Intelligence
        │               │
        └───────┬───────┘
                ▼
       EES Universal Data Moon
                │
                ▼
      Enterprise Intelligence
```

Each system maintains a defined operational responsibility while contributing to a larger digital thread.

---

# Project Structure

The web implementation is organized around the RC Controls application.

```text
EES-RC-Controls/
│
├── docs/
│   ├── index.html
│   ├── style.css
│   │
│   ├── scripts/
│   │   └── main.js
│   │
│   └── assets/
│
├── README.md
├── LICENSE
└── .gitignore
```

Additional files may be present depending on the engineering and deployment configuration.

---

# Running Locally

Clone the repository:

```bash
git clone https://github.com/jd-dev-king/EES-RC-Controls.git
cd EES-RC-Controls
```

Start a local static server from the web application directory:

```bash
cd docs
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080/
```

---

## Test Standalone Mode

```text
http://localhost:8080/
```

---

## Test Home Context

```text
http://localhost:8080/?source=home
```

---

## Test EES Power Grid / Pharma Context

```text
http://localhost:8080/?source=power-grid&scope=PHARMA
```

This mode demonstrates the RC Controls interface operating with industrial context supplied by the EES architecture.

---

# JavaScript Validation

Before deployment, the primary JavaScript module can be checked with Node:

```bash
node --check docs/scripts/main.js
```

A successful syntax check returns without a JavaScript syntax error.

---

# Deployment

The RC Controls web application is designed for static deployment.

Supported deployment targets include:

- GitHub Pages
- Vercel
- Local HTTP server
- EES integrated deployments

The standalone application does not require the entire EES platform to be running.

Connected deployments can provide additional operating context from other EES systems.

---

# GitHub Pages

The `docs/` directory can be used as the GitHub Pages publishing source.

Repository:

https://github.com/jd-dev-king/EES-RC-Controls

After GitHub Pages is enabled, the public project demonstration can be hosted from the repository's Pages deployment.

---

# Version 2.0.0

Version 2.0.0 represents the transition from the original standalone RC transient-response project into **EES RC Controls**.

Major changes include:

- Preserved standalone RC simulation
- Preserved home operating context
- Added EES industrial operating context
- Added Power Grid Sun integration architecture
- Added Pharma facility context
- Expanded electrical diagnostic positioning
- Established RC Controls as an EES connected digital twin
- Prepared the project for integration with the wider EES digital thread

---

# Engineering Purpose

EES RC Controls demonstrates how a fundamental engineering model can evolve into a component of a larger industrial digital architecture.

Instead of replacing the original RC simulation, the EES architecture extends it.

The result is a project capable of demonstrating both:

**Fundamental engineering analysis**

and

**Connected industrial systems engineering**

within the same application.

---

# EES Universe

EES RC Controls is part of the broader **EES Industrial Universe**, an interconnected portfolio of engineering, manufacturing, automation, data, controls, and digital-twin systems.

Within that architecture:

```text
Power Grid Sun
      ↓
RC Controls
      ↓
Connected Operational Systems
      ↓
Universal Data Moon
      ↓
Enterprise Intelligence
```

---

## Release

**EES RC Controls v2.0.0**

Electrical Controls • RC Transient Analysis • Digital Twin • Power Grid Integration • Industrial Diagnostics

---

## Author
Jeremiah Lupton

Enterprise Execution Suite / EES Universe

---

## License

This project is provided under the MIT License. See `LICENSE` for details.
## Universal Data Moon integration (v1.0.1)

RC Controls now forwards operational data to the Universal Data Moon without changing the existing Power Grid Sun → RC Controls integration.

- `POST /api/v1/rc/results` persists the canonical RC diagnostic in PostgreSQL, then forwards a Data Moon diagnostic event and an alert when the result is abnormal.
- `POST /api/v1/rc/telemetry` forwards the industrial gateway metrics to Data Moon telemetry ingestion and emits an alert when the snapshot is abnormal.
- Data Moon forwarding is downstream/non-blocking: a Data Moon outage does not prevent RC Controls from retaining its canonical PostgreSQL diagnostic result.
- The browser never receives the Data Moon ingest secret. `DATA_MOON_INGEST_API_KEY` remains server-side in the RC Controls backend environment.

Required backend environment variables are documented in `backend/.env.example`.
