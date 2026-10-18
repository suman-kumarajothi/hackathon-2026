# AI Hackathon — Smart IoT Lighting & Solar Management Platform (CMS)
## Research, Architecture Design & Proof-of-Concept (PoC)

An enterprise-grade, research-backed operations console and modular Proof-of-Concept (PoC) exploring AI-driven advancements in Smart City Lighting Central Management Systems (CMS) and Solar-Powered IoT Infrastructure.

---

## 📌 Executive Summary

Modern smart municipal and commercial lighting ecosystems are rapidly transitioning from isolated hardware fixtures into unified, data-intensive IoT networks. This platform delivers a comprehensive, production-grade management system designed with **macOS Tahoe / Golden Gate** visual aesthetics, strict role-based access control (RBAC), and telemetry-driven operational intelligence:

1. **Smart Scheduler:** AI-optimized diurnal dimming curves, astronomical sunrise/sunset triggers, and automated peak/curfew energy profiling.
2. **Solar Site Intelligence:** Siting assessment, GHI insolation models, tilt angle optimization, and LiFePO4 autonomy days calculation.
3. **Solar Health Intelligence:** Predictive maintenance with multivariate anomaly detection, 7–14 day failure window estimation, and battery cell mismatch tracking.
4. **Smart Diagnostics:** Telemetry-assisted diagnostic advisor with Siri-inspired assistant styling, contextual maintenance protocols, issue resolution, and customer support ticket dispatching.

---

## 🚀 Live Access & Single Public Origin Architecture

The application is deployed and accessible via a single public HTTPS origin using Cloudflare Quick Tunnel:

* **Public HTTPS URL:** `https://*.trycloudflare.com`
* **Local Web App:** `http://localhost:3000`
* **Local Backend API:** `http://localhost:8080/api/v1`
* **Actuator Health:** `http://localhost:8080/actuator/health`

### Security & Ingress Invariant
* Only **Port 3000** (Frontend & Vite Proxy) is exposed to the public tunnel.
* **Port 8080 (Backend)** and **Port 6379 (Redis)** are never exposed directly to external traffic.
* All `/api/*` and `/actuator/*` calls are transparently reverse-proxied internally by the frontend server.

---

## 👥 Strict Two-Account Policy & Role-Based Access Control (RBAC)

The platform strictly maintains **only two user accounts**, enforced at both frontend UI and backend API levels:

| Account | Group / Role | Username | Password | Permitted Views & Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | Administrator | `admin` | `admin123` | Full administrative access to all modules, User Management, Device Provisioning, System Settings, Issue Resolution, Support Dispatch |
| **Operator** | System Operator | `operator` | `operator123` | Strictly restricted to **Command Center (Dashboard)** and **Map View**. All other modules and backend APIs return HTTP 403 Forbidden |

### Backend RBAC Enforcement
The backend enforces role restrictions across all non-operator endpoints:
* `/api/v1/users*` → HTTP 403 Forbidden for Operator
* `/api/v1/schedules*` → HTTP 403 Forbidden for Operator
* `/api/v1/deployment/*` → HTTP 403 Forbidden for Operator
* `/api/v1/forecast/*` → HTTP 403 Forbidden for Operator
* `/api/v1/troubleshoot/*` → HTTP 403 Forbidden for Operator
* `/api/v1/devices/:id/resolve` → HTTP 403 Forbidden for Operator
* New user creation (`POST /api/v1/users`) and core user deletion are strictly blocked to preserve the two-account policy.

---

## 🎨 macOS Tahoe & Golden Gate-Inspired UI

1. **Brand Identity:**
   - **Platform Icon:** macOS Tips-inspired sunset squircle with Golden Gate / Tahoe beacon styling (`TahoeBrandIcon.jsx`), applied across the login screen, navigation header, and operational badges.
   - **AI Assistant Icon:** Siri-inspired fluid multi-chromatic animated orb (`SiriAssistantIcon.jsx`), integrated into Smart Diagnostics.
   - **Operational Shortcuts:** macOS-style colored backgrounds, rounded shapes (11px radius), subtle borders, and smooth hover lifts.
2. **Theme Support & Contrast:**
   - **Dark Theme:** Muted slate surfaces (`#0b0f17`, `#111827`, `#1e293b`), subtle borders, and refined contrast.
   - **Light Theme:** Cool-grey and soft-blue surfaces (`#f8fafc`, `#f1f5f9`), distinct card boundaries, and accessible contrast ratios.

---

## 🗂️ Application Modules & Updated Terminology

| Corrected Module Name | Previous Name | Route | Functional Scope |
| :--- | :--- | :--- | :--- |
| **Command Center** | IoT Fleet Command Center | `dashboard` | Fleet health KPIs, diurnal power curves, zero-safe metric cards (`totalYield` and `avgSoC` fallback to 0 instead of NaN), Smart Scheduler shortcut |
| **Map View** | Interactive Map View | `map` | Leaflet GIS map with draggable filter panel, instant filter updating, Asset Status legend, mobile-optimized map exploration |
| **Smart Scheduler** | Scheduler / Manage Schedules | `schedule` | Region- and zone-aware scheduling, astronomical sunset/sunrise offsets, multi-window dimming profiles |
| **Solar Site Intelligence** | Deployment Evaluator | `evaluator` | Solar siting assessment, GHI insolation models, tilt angle optimization, LiFePO4 autonomy days calculation |
| **Solar Health Intelligence** | Issue Forecaster | `oracle` | Multivariate predictive maintenance, 7–14 day failure window estimation (AI Risk badge moved inside module) |
| **Smart Diagnostics** | Troubleshooter | `assistance` | Contextual diagnostic interface with Siri assistant styling, suggested maintenance protocol, issue resolution, support ticket dispatching |
| **Settings & Preferences** | Settings | `settings` | Topbar profile routes directly to **Users & Access** preferences; bottom-left gear opens platform General settings |

---

## 🗺️ Map View Architecture & Configuration

* **Exclusive OpenStreetMap Basemap:** Exclusively utilizes **OpenStreetMap** standard tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) adhering strictly to the OpenStreetMap Tile Usage Policy. All proprietary providers (Esri, Carto) and the map-provider dropdown selector have been completely removed.
* **OpenStreetMap Attribution:** Displays compliant `© OpenStreetMap contributors` attribution embedded at bottom-right of the Leaflet viewport.
* **Vertical Layout Stacking:** Stacks the responsive Leaflet map canvas directly on top, followed by the full-width Registered Smart Lamps Inventory table below (`.map-layout-vertical`), maximizing horizontal scanning room and geospatial viewports.
* **SVG Status Marker Pins:** Dynamic circular pin markers featuring custom SVG lightbulb icons color-coded by real-time operational status (green for online, red for fault, orange for alert, and grey for offline).
* **Draggable Filter Panel:** The floating filter popover is draggable via pointer events across both desktop and tablet views.
* **Instant Filter Updates:** Every filter selection (region, zone, operational status, connectivity, battery SoC) immediately updates map markers, device counts, and listings without requiring an explicit submit button.
* **Mobile-Optimized Layout:** In mobile viewports (`<= 768px`), the device grid table collapses cleanly to prioritize map interaction.

---

## ⚙️ Settings, Roles & Streamlined User Accounts Table

* **User Accounts & Operational Roles:** Streamlined to display **only each user's Name and Role (Admin or Operator)**, completely removing unnecessary identifiers such as `@adminYou` and extraneous columns.
* **Zero Horizontal Scrolling:** Optimized column widths (`52% Name`, `28% Role`, `20% Actions`) fit within the container with `overflow-x: hidden`, eliminating horizontal scrollbars across all screen widths.
* **Accessible Icon-Only Actions:** Action column renders accessible, right-aligned, consistently sized icon buttons (`<Edit2 size={13} />` for credential editing and `<Trash2 size={13} />` for account removal).
* **Integrated Password Management in Edit User Popup:** The self-service account password change has been moved out of the standalone page panel directly into the **Edit User** modal dialog. It cleanly incorporates current password verification (for self-service), new password validation (minimum 8 characters), and confirmation matching with real-time feedback.
* **Borderless CMS Bulb Icon & Favicons:** The core asset (`tips-bulb.png` and `favicon.png`) is processed with native alpha transparency to eliminate the dark/black border everywhere across the application—including browser tab favicons, landing page, login page, and map markers.
* **Harmonized Quick Action Navigation:** Dashboard module shortcuts mirror the Sidebar order exactly:
  1. Map View
  2. Smart Scheduler
  3. Solar Deployment Intelligence
  4. Solar Health Intelligence
  5. Smart Diagnostics

---

## 🩺 Smart Diagnostics & Resolution Workflows

* **Contextual Diagnosis:** Displays active device context with explicit visual indicators:
  - `[Measured Telemetry]`: Live sensor telemetry (battery voltage, panel temperature).
  - `[Simulated Demonstration Telemetry]`: Synthetic test telemetry for dark-pole scenarios.
  - `[Predicted Risk]`: Statistical risk levels and estimated failure windows.
* **Suggested Maintenance Protocol:** Actionable steps tailored to the active failure cause (e.g., LVD lockout, cell impedance mismatch, panel soiling).
* **Mark Issue as Resolved:** Modal dialog allowing operators/admins to record maintenance notes, restore device status to `online`, clear active alerts, and persist state via `POST /api/v1/devices/:id/resolve`.
* **Raise Support Ticket:** Modal dialog allowing dispatch of Tier 2/3 field tickets with priority selection, diagnostic telemetry snapshots, and backend persistence via `POST /api/v1/troubleshoot/ticket`.

---

## 🧪 Comprehensive Automated Verification Test Suite

The platform includes an automated end-to-end verification test suite:

```bash
node backend/tests/api_verification_test.js
```

### Test Suite Results (57 / 57 Passed)
* ✅ **Actuator & Persistence Health (4 tests):** HTTP 200 health check, service UP, persistence driver UP, registered canonical devices indexed.
* ✅ **Authentication & Credentials (5 tests):** 401 on invalid credentials, admin login success, administrator role check, operator login success, operator role check.
* ✅ **Strict Two-Account Policy (5 tests):** Admin user list, strictly 2 accounts exist, accounts are strictly "admin" and "operator", additional account creation returns 403, core account deletion returns 403.
* ✅ **Operator RBAC Enforcement (18 tests):** Operator blocked from `/api/v1/users`, `/api/v1/schedules`, `/api/v1/deployment/evaluate`, `/api/v1/forecast/devices` (HTTP 403); Operator permitted to access Smart Diagnostics `/api/v1/troubleshoot/chat`, submit support tickets, view `/api/v1/devices` fleet telemetry across day/week/month ranges, and execute device relocation.
* ✅ **Geographic Regions & Zones (4 tests):** District queries, zone queries, Bayfront zones returned.
* ✅ **Smart Lamp Inventory & Telemetry Integrity (4 tests):** Device fleet retrieval, active pole verification, telemetry object structure, valid battery SoC number handling.
* ✅ **Smart Diagnostics AI & Support Workflow (4 tests):** Low Voltage Disconnect rule evaluation, telemetry fact categorization, voice synthesis transcription.
* ✅ **Diagnostic Resolution & Support Tickets (5 tests):** Issue resolution transitions status to `online`, active alert cleared, support ticket created with `TICK-` ID and status `open`.
* ✅ **Schedule Creation, Deletion & RBAC (8 tests):** Schedule creation, validation, operator deletion rejection (403), admin schedule deletion (200).

---

## 📸 Visual Verification & Documentation

Visual records of the entire application across Light Mode and Dark Mode are indexed in [`docs/screenshots/README.md`](docs/screenshots/README.md):
* **Light Mode Suite:** `01_light_login_screen.png` through `08_light_settings.png`
* **Dark Mode Suite:** `01_login_screen.png` through `06_settings_user_accounts_fixed.png`

---

## 🛠️ Startup & Local Development

### Unified Startup Script (Recommended)
```bash
./start.sh
```
Launches the backend service on port 8080, frontend Vite server on port 3000, establishes the Cloudflare Quick Tunnel, and displays the public URL. Press `Ctrl+C` to cleanly terminate all processes.

### Production Build Verification
```bash
cd frontend && npm run build
```
Compiles Vite production assets into `frontend/dist/`.

