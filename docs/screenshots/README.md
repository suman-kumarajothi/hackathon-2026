# Visual Verification & Screenshot Index

This directory contains visual verification screenshots captured across the CMS Smart IoT Lighting & Solar Management Platform, confirming all UI fixes, layout alignments, RBAC policies, theme compatibility, and responsive designs.

---

## ☀️ Light Mode Application Suite

Comprehensive visual record of every core application screen rendered in the clean macOS-inspired Light Theme.

| # | Screenshot | Screen / View | Route | Verified Features & Layout Standards |
|---|------------|---------------|-------|--------------------------------------|
| 01 | [01_light_login_screen.png](01_light_login_screen.png) | Login / Landing Page | `/login` | • Borderless CMS bulb icon (removed charcoal edge ring via concentric squircle scaling)<br>• Clean white login card with high-contrast inputs<br>• Tahoe brand badge and secure authentication controls |
| 02 | [02_light_dashboard.png](02_light_dashboard.png) | Fleet Dashboard | `/dashboard` | • Quick action navigation shortcuts matching Sidebar order: **Map, Smart Scheduler, Solar Deployment Intelligence, Health Intelligence, and Smart Diagnostics**<br>• Real-time fleet KPI widgets and solar yield telemetry |
| 03 | [03_light_map_view.png](03_light_map_view.png) | Map View | `/map` | • **OpenStreetMap** 100% open-source basemap exclusive configuration (all proprietary Esri/Carto providers and map layer dropdown removed)<br>• Fully compliant OpenStreetMap attribution displayed at bottom-right<br>• Vertical layout stack (Leaflet map canvas above full-width device inventory)<br>• Clean SVG lightbulb marker pins color-coded by online/maintenance status |
| 04 | [04_light_scheduler.png](04_light_scheduler.png) | Smart Scheduler | `/schedule` | • Uniform 18px horizontal content padding via `.panel-content` class applied beneath `.panel-header`<br>• Exact visual alignment across Deployment Scope & Target Zone, Central Emergency Override, and Eco Mode cards |
| 05 | [05_light_deployment.png](05_light_deployment.png) | Solar Deployment Intelligence | `/evaluator` | • Solar irradiation yield calculator and shadow loss simulation<br>• Autonomy days estimation and solar suitability index |
| 06 | [06_light_health.png](06_light_health.png) | Solar Health Intelligence | `/oracle` | • Multi-variable battery SoH forecasting and thermal degradation tracking<br>• Anomaly detection and proactive maintenance alerts |
| 07 | [07_light_diagnostics.png](07_light_diagnostics.png) | Smart Diagnostics | `/customer-assistance` | • Overlapping element fixes on MPPT Charge Controller Telemetry and diagnostic sweeps<br>• Siri Assistant audio/voice troubleshooting and automated support ticket dispatch |
| 08 | [08_light_settings.png](08_light_settings.png) | Settings & Security | `/settings` | • User Accounts & Operational Roles: **Displays only Name and Role (Admin or Operator)**, removing unnecessary `@adminYou` identifiers<br>• Perfectly optimized column widths fitting container 100% with zero horizontal scrolling<br>• Action buttons displayed as accessible, consistently sized, right-aligned icons (`Edit2` and `Trash2`) |
| 09 | [08_edit_user_password_modal.png](08_edit_user_password_modal.png) | Edit User Popup | `/settings` | • **Integrated Change Password inside Edit User Dialog**: seamlessly integrates Current Password, New Password, and Confirmation fields directly inside the popup, replacing the standalone card while preserving PBKDF2 encryption and validation. |

---

## 🌙 Dark Mode & Operational Verification

Visual verification under Dark Theme and operational state enforcement.

| # | Screenshot | Screen / View | Route | Verified Features |
|---|------------|---------------|-------|-------------------|
| 01 | [01_login_screen.png](01_login_screen.png) | Login View | `/login` | High-contrast readable input fields (`#111827` text / `#1f2937` caret on `#ffffff`), macOS Tahoe wallpaper. |
| 02 | [02_dashboard_fleet_telemetry.png](02_dashboard_fleet_telemetry.png) | Dashboard | `/dashboard` | Live telemetry charts, fleet table populated with Battery SoC %, Solar Yield (kWh), Voltage & Temperature. |
| 03 | [03_map_view.png](03_map_view.png) | Map View | `/map` | ESRI World Imagery basemap, vertically stacked device inventory, SVG marker pins. |
| 04 | [04_smart_scheduler.png](04_smart_scheduler.png) | Smart Scheduler | `/schedule` | `.panel-content` 18px margin alignment on all schedule parameter cards. |
| 05 | [05_smart_diagnostics.png](05_smart_diagnostics.png) | Smart Diagnostics | `/customer-assistance` | Fixed code tag overlapping on MPPT telemetry cards, interactive assistant chat and voice playback. |
| 06 | [06_settings_user_accounts_fixed.png](06_settings_user_accounts_fixed.png) | Settings (Security) | `/settings` | User accounts table containment, zero horizontal scrollbar leaks, icon action buttons. |
| 07 | [03_mobile_map_filter.png](03_mobile_map_filter.png) | Mobile Map Filter UI | `/map` (Mobile <= 768px) | • Optimized mobile filter UI displaying strictly **Device Search, Status, Region, and Zone**<br>• Filter panel width reduced by 50% on mobile viewports for simultaneous map context<br>• All filter sections stacked vertically in single column<br>• Balanced, properly aligned Reset and Done buttons with equal height in footer<br>• Secondary filters (Connectivity, Min SoC) hidden on mobile viewports |
| 08 | [03_desktop_map_filter.png](03_desktop_map_filter.png) | Desktop Map Filter UI | `/map` (Desktop) | • Full desktop filter panel (340px width) with drag grip handle and full filter suite<br>• 2-column grid row for Region and Zone; Connectivity and Min SoC slider retained<br>• Properly aligned Reset and Done buttons with space-between flex layout |

