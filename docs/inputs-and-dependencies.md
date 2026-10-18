# Inputs, Dependencies & Information Boundaries

This document delineates between **independent research items** (which proceed immediately using verified industry standards) and **dependent decisions** that strictly require application, customer, or device context from the user.

---

## 🎯 Information Categorization Framework

To honor the core hackathon guideline—*“Never invent existing capabilities, never fabricate customer requirements or site conditions, state assumptions explicitly”*—all project dimensions are categorized as follows:

| Type | Definition | Policy |
| :--- | :--- | :--- |
| **Independent (Verified Research)** | Standard protocols, physical laws, meteorological APIs, standard failure modes, and industry architectures. | Formulated immediately via verified sources; fully cited. |
| **Simulated (PoC Benchmarks)** | Realistic dummy telemetry, synthetic profiles, and default coefficients. | Clearly labeled as `[SIMULATED]` in code and docs. |
| **User-Dependent (Pending Input)** | Actual CMS UI steps, proprietary API endpoints, specific customer sites, hardware bill of materials (BOM), and company SOPs. | Outlined with clear defaults; finalized only upon user input. |

---

## 📊 Challenge-by-Challenge Inputs Matrix

### Problem 01: Dimming Schedule Configuration Enhancement
* **Independent Research:**
  * TALQ Consortium version 2.x standard for schedule generation (`ControlProgram`, `Calendar`, `AstroClock` triggers).
  * DALI-2 / Zhaga Book 18 dimming curves (logarithmic vs linear 0–100%).
  * Energy baseline models: $E_{\text{baseline}} = P_{\text{rated}} \times \text{hours}_{\text{on}}$, Energy Savings % under step-down profiles (e.g. 100% dusk–22:00, 50% 22:00–04:00, 70% 04:00–dawn).
* **Pending User Context & Targeted Questions:**
  1. *Workflow & Screenshots:* What are the exact steps or screens in the current CMS workflow that users find cumbersome (e.g., manual coordinate entry, individual luminaire binding, multi-stage approval)?
  2. *Target Protocol / Schema:* Does the CMS expect a specific schedule payload (e.g., TALQ JSON, proprietary REST payload, or cron-like time triggers)?
  3. *Group / Zone Hierarchies:* Are schedules pushed per-pole, per-feeder, or by geo-zone tags?

---

### Problem 02: Solar Device Deployment Assessment
* **Independent Research:**
  * NASA POWER API (`ALLSKY_SFC_SW_DWN` Global Horizontal Irradiance, temperature, diffuse radiation).
  * NREL PVWatts V8 calculation methodology (system capacity, tilt angle, azimuth, system losses).
  * Autonomy day calculation: $A_{\text{days}} = \frac{C_{\text{battery}} \times V \times \text{DoD}}{E_{\text{daily\_load}}}$.
  * Solar peak sun hours (PSH) variation across geographical coordinates.
* **Pending User Context & Targeted Questions:**
  1. *Device Hardware Profile:* What are the typical target devices (e.g., all-in-one solar streetlights, solar CCTV cameras, standalone IoT gateways)? What are their standard panel wattages ($W_p$), battery capacity ($Ah$ / $Wh$), and daily power consumption ($Wh$)?
  2. *Site Constraints:* What specific customer site inputs or pain points are prioritized (e.g., urban shading from buildings/trees, seasonal winter deficits, dust/soiling)?
  3. *User Persona:* Is the tool intended for sales engineers during pre-sale quoting, or for field installation contractors on-site?

---

### Problem 03: Solar Device Issue Prediction
* **Independent Research:**
  * Lithium Iron Phosphate ($\text{LiFePO}_4$) and Lead-Acid battery degradation mechanics: internal resistance rise, capacity fade, thermal stress acceleration (Arrhenius law).
  * Solar panel degradation & soiling: drop in short-circuit current ($I_{sc}$) under high irradiance; MPPT tracking faults.
  * Multivariate anomaly detection methods: Isolation Forest, Exponential Moving Average (EMA) delta, reconstruction loss.
* **Pending User Context & Targeted Questions:**
  1. *Telemetry Fields:* What telemetry attributes are transmitted by existing solar devices and at what interval (e.g., battery voltage, solar panel voltage, load current, battery temperature, ambient lux, charging status)?
  2. *Historical Failure Patterns:* What are the most common real-world field failures experienced (e.g., sudden battery deep-discharge, degraded panel output from dust, loose wiring, premature LED driver failure)?
  3. *Connectivity Constraints:* Are devices continuously connected via cellular/NB-IoT, or intermittent via LoRaWAN/mesh with burst telemetry?

---

### Problem 04: Self-Service Troubleshooting
* **Independent Research:**
  * Decision tree architectures for hardware diagnostics (power path verification, communication verification, sensor calibration).
  * Retrieval-Augmented Generation (RAG) for equipment operating manuals and field symptom resolution.
  * Automated diagnostic verification loops (prompting customer to check physical status, then polling backend API to verify sensor response).
* **Pending User Context & Targeted Questions:**
  1. *Customer Persona & Knowledge Level:* Are users end-customers/facility managers (non-technical) or junior field technicians?
  2. *Top Support Tickets:* What are the top 3–5 recurring support requests received by the help desk?
  3. *Interactive Device Commands:* Can the system execute real-time diagnostic commands on the device (e.g., "force lamp test on for 30s", "ping gateway", "fetch instant telemetry"), or is it read-only?

---

## 🚀 Execution Strategy & Safety Gates

```text
[Phase 1: Research & Foundational Docs]  <-- CURRENT STAGE
    ├── Independent Literature & Industry Standard Analysis (Complete)
    ├── Challenge Documentation (problem-01.md to 04.md)
    └── Architecture & Persistence Trade-offs Specification
           │
           ▼
[Safety Gate: User Feedback & Input Review]
    └── Review user-provided screenshots, workflows, and device specs
           │
           ▼
[Phase 2: PoC Scaffolding & Shared Landing Experience]
    ├── React Frontend setup (Landing page + module routing + design tokens)
    └── Spring Boot Backend setup (Basic Auth + modular API endpoints + Redis/In-Memory store)
           │
           ▼
[Phase 3: Module PoC Implementation]
    └── Implement M1 -> M2 -> M3 -> M4 based on confirmed data contracts
```
