import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SOLAR_ORACLE_PREDICTIONS } from '../data/mockData';
import {
  SunMedium,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Wrench,
  ShieldAlert,
  Sparkles,
  Activity,
  FileText,
  X,
  Map,
  Info,
  Truck,
  Cpu,
  Layers,
  Zap,
  BatteryCharging,
  Clock,
  ShieldCheck,
  AlertOctagon,
  Eye,
  HelpCircle,
} from 'lucide-react';
import { Line } from 'react-chartjs-2';

// 4 Operational Action Tiers as specified in Requirement 7.3
const ACTION_TIERS = {
  CONTINUE_MONITORING: {
    label: 'Continue Monitoring',
    color: 'var(--accent-green, #22c55e)',
    bg: 'var(--tint-green, rgba(34, 197, 94, 0.1))',
    icon: Eye,
    urgency: 'Low / Routine',
    description: 'Telemetry parameters within nominal boundaries. Automated telemetry polls continue on standard 60-second cycle.',
  },
  SCHEDULE_PREVENTIVE: {
    label: 'Schedule Preventive Maintenance',
    color: 'var(--accent-primary, #0ea5e9)',
    bg: 'var(--tint-primary, rgba(14, 165, 233, 0.1))',
    icon: Clock,
    urgency: 'Medium (Next 14-30 Days)',
    description: 'Gradual degradation detected in auxiliary subsystem. Schedule for next planned district maintenance run.',
  },
  ARRANGE_INSPECTION: {
    label: 'Arrange On-Site Inspection',
    color: 'var(--accent-amber, #f59e0b)',
    bg: 'var(--tint-amber, rgba(245, 158, 11, 0.1))',
    icon: Wrench,
    urgency: 'High (Within 48-72h)',
    description: 'Parametric anomaly observed in energy conversion or battery balance. Physical visual and multimeter check required.',
  },
  DISPATCH_SERVICE_TRUCK: {
    label: 'Dispatch Emergency Service Truck',
    color: 'var(--accent-rose, #ef4444)',
    bg: 'var(--tint-rose, rgba(239, 68, 68, 0.1))',
    icon: Truck,
    urgency: 'Critical (Immediate Dispatch)',
    description: 'Hardware failure imminent or ongoing. High risk of civic blackout. Priority field crew rollout recommended with confirmation.',
  },
};

export const SolarOracle = () => {
  const { selectedDevice, navigateToMap, navigateToDiagnostics, showToast, effectiveTheme } = useApp();

  const [selectedPrediction, setSelectedPrediction] = useState(() => {
    if (selectedDevice) {
      const match = SOLAR_ORACLE_PREDICTIONS.find((p) => p.deviceId === selectedDevice.id);
      if (match) return match;
      return {
        deviceId: selectedDevice.id,
        deviceName: selectedDevice.name,
        riskScore: selectedDevice.status === 'critical' ? 92 : selectedDevice.status === 'warning' ? 68 : 15,
        riskLevel: selectedDevice.status === 'critical' ? 'Critical Risk' : selectedDevice.status === 'warning' ? 'Moderate Risk' : 'Healthy / Nominal',
        predictedFailureWindow: selectedDevice.status === 'critical' ? '2-4 Days' : 'No Risk Expected',
        predictedLossKWh: selectedDevice.status === 'critical' ? '14.2 kWh / mo' : '0.0 kWh',
        contributingFactors: [
          { factor: 'Photovoltaic Irradiance Factor', weight: '60%', impact: 'Moderate', detail: 'Telemetry consistent with expected insolation curve' },
          { factor: 'LiFePO4 Internal Impedance', weight: '40%', impact: 'Moderate', detail: 'Voltage tracking within manufacturer cell boundaries' },
        ],
        healthTrend: [92, 90, 88, 86, 85, 84, 82],
        recommendation: selectedDevice.status === 'critical' ? 'Schedule field technician for battery cell inspection.' : 'Operating normally.',
      };
    }
    return SOLAR_ORACLE_PREDICTIONS[0];
  });

  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [technicianNote, setTechnicianNote] = useState('');
  const [priorityLevel, setPriorityLevel] = useState('Critical (Immediate Dispatch)');
  const [activeTab, setActiveTab] = useState('components'); // 'components' | 'predictive' | 'dispatch'

  const isLight = effectiveTheme === 'light';

  // Determine operational recommendation tier based on risk score (Requirement 7.3)
  const currentActionTierKey = useMemo(() => {
    const score = selectedPrediction.riskScore;
    if (score >= 80) return 'DISPATCH_SERVICE_TRUCK';
    if (score >= 50) return 'ARRANGE_INSPECTION';
    if (score >= 25) return 'SCHEDULE_PREVENTIVE';
    return 'CONTINUE_MONITORING';
  }, [selectedPrediction.riskScore]);

  const currentActionTier = ACTION_TIERS[currentActionTierKey];
  const ActionIcon = currentActionTier.icon;

  // Component-Level Health Assessment Data (Requirement 7.1)
  const componentHealthList = useMemo(() => {
    const isCrit = selectedPrediction.riskScore >= 75;
    const isWarn = selectedPrediction.riskScore >= 45 && !isCrit;

    return [
      {
        id: 'comp_pv',
        name: 'PV Modules & String Array',
        healthScore: isCrit ? 62 : isWarn ? 78 : 96,
        status: isCrit ? 'warning' : 'healthy',
        metrics: [
          { label: 'Voc Deviation', val: isCrit ? '-18.4% (Degraded)' : '-2.1% (Nominal)' },
          { label: 'Soiling Loss', val: '4.2% Estimated' },
          { label: 'Hot-spot Thermal Delta', val: isCrit ? '+14.2°C anomaly' : 'Nominal' },
        ],
        instrumented: true,
        faultCodes: isCrit ? ['E-PV-HOTSPOT-01'] : [],
        recommendation: isCrit ? 'Clean module face and check bypass diode D2 on junction box.' : 'Routine visual check.',
      },
      {
        id: 'comp_mppt',
        name: 'MPPT Charge Controller / Inverter',
        healthScore: isCrit ? 58 : 94,
        status: isCrit ? 'critical' : 'healthy',
        metrics: [
          { label: 'Tracking Efficiency', val: isCrit ? '86.2% (Derated)' : '98.6% (Optimal)' },
          { label: 'Heatsink Temp', val: isCrit ? '68.5°C (Elevated)' : '42.0°C' },
          { label: 'Capacitor Ripple', val: isCrit ? '142 mV (Warning)' : '28 mV' },
        ],
        instrumented: true,
        faultCodes: isCrit ? ['F-MPPT-OVERTEMP', 'E-RIPPLE-HIGH'] : [],
        recommendation: isCrit ? 'Immediate thermal paste replacement and firmware calibration.' : 'Operating nominal.',
      },
      {
        id: 'comp_battery',
        name: 'LiFePO4 Storage & BMS',
        healthScore: isCrit ? 44 : isWarn ? 64 : 98,
        status: isCrit ? 'critical' : isWarn ? 'warning' : 'healthy',
        metrics: [
          { label: 'Cell Balance Delta', val: isCrit ? '118 mV (Severe)' : isWarn ? '52 mV' : '12 mV' },
          { label: 'State of Health (SoH)', val: isCrit ? '71%' : isWarn ? '84%' : '97%' },
          { label: 'Cycle Count', val: '482 of 3,500' },
        ],
        instrumented: true,
        faultCodes: isCrit ? ['BMS-CELL-IMBALANCE-CRIT'] : isWarn ? ['BMS-CELL-DRIFT'] : [],
        recommendation: isCrit ? 'Replace pouch cell #3 and rebalance pack with service bench.' : isWarn ? 'Perform extended top-balancing charge.' : 'Nominal.',
      },
      {
        id: 'comp_electrical',
        name: 'Combiner Box & DC Cabling',
        healthScore: isWarn ? 72 : 92,
        status: isWarn ? 'warning' : 'healthy',
        metrics: [
          { label: 'Loop Impedance', val: isWarn ? '0.48 Ω (Elevated)' : '0.12 Ω' },
          { label: 'Ground Fault Isolation', val: '> 50 MΩ' },
        ],
        instrumented: true,
        faultCodes: [],
        recommendation: isWarn ? 'Re-torque terminal lugs to 2.8 Nm specification.' : 'Nominal.',
      },
      {
        id: 'comp_cooling',
        name: 'Pole Ventilation & Convection Filter',
        healthScore: 82,
        status: 'healthy',
        metrics: [
          { label: 'Internal Air Velocity', val: 'Uninstrumented (Passive Chimney)' },
          { label: 'Screen Clogging Risk', val: 'Moderate (Autumn foliage)' },
        ],
        instrumented: false, // Explicitly identified as missing sensor (Requirement 7.1)
        faultCodes: [],
        recommendation: 'Check intake screen during next scheduled field run.',
      },
      {
        id: 'comp_sensors',
        name: 'Optical Pyranometer & Ambient Temp',
        healthScore: 95,
        status: 'healthy',
        metrics: [
          { label: 'Sensor Calibration Drift', val: '< 0.8% / year' },
          { label: 'Signal Quality (RSSI)', val: '-68 dBm (Strong)' },
        ],
        instrumented: true,
        faultCodes: [],
        recommendation: 'Next factory recalibration due in 14 months.',
      },
    ];
  }, [selectedPrediction.riskScore]);

  // Degradation projection line chart
  const degradationChartData = {
    labels: ['T-6d', 'T-5d', 'T-4d', 'T-3d', 'T-2d', 'T-1d', 'Today', 'T+3d (Pred)', 'T+7d (Pred)', 'T+14d (Pred)'],
    datasets: [
      {
        label: 'Health Metric Trend (%)',
        data: [...(selectedPrediction.healthTrend || [90, 88, 86, 84, 82, 80, 78]), 56, 42, 28],
        borderColor: selectedPrediction.riskScore > 70 ? '#ff453a' : selectedPrediction.riskScore > 40 ? '#ff9f0a' : '#30d158',
        backgroundColor: 'rgba(255, 69, 58, 0.08)',
        fill: true,
        tension: 0.35,
      },
      {
        label: 'Failure Cutoff Threshold (40%)',
        data: [40, 40, 40, 40, 40, 40, 40, 40, 40, 40],
        borderColor: isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)',
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: isLight ? '#1c1c1e' : '#f5f5f7',
          font: { family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', size: 12 },
        },
      },
      tooltip: {
        backgroundColor: isLight ? '#ffffff' : '#24242d',
        borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        titleColor: isLight ? '#1c1c1e' : '#f5f5f7',
        bodyColor: isLight ? '#636366' : '#98989f',
      },
    },
    scales: {
      x: {
        grid: { color: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: isLight ? '#8e8e93' : '#686873' },
      },
      y: {
        grid: { color: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: isLight ? '#8e8e93' : '#686873' },
        min: 10,
        max: 105,
      },
    },
  };

  const handleDispatchWorkOrder = (e) => {
    e.preventDefault();
    setIsWorkOrderModalOpen(false);
    showToast(
      `Service truck rollout dispatched to Field Ops for ${selectedPrediction.deviceName} [Priority: ${priorityLevel}]`,
      'success'
    );
  };

  return (
    <div className="solar-health-intelligence-page" style={{ paddingBottom: '40px' }}>
      <div className="page-header">
        <div className="page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h1 className="page-title">Solar Health Intelligence</h1>
            <span className="badge badge-purple" style={{ fontSize: '11px' }}>
              Predictive Diagnostics &amp; Fleet Reliability
            </span>
            <span className="badge badge-info" style={{ fontSize: '11px' }}>
              Component-Level Health &bull; Work Order Dispatch
            </span>
          </div>
          <p className="page-subtitle">
            Multivariate anomaly detection forecasts subsystem failures 7–14 days ahead with tiered operational recommendations and technician dispatch
          </p>
        </div>

        <div className="page-actions-group">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              const dev = { id: selectedPrediction.deviceId, name: selectedPrediction.deviceName };
              navigateToMap(dev);
            }}
          >
            <Map size={14} />
            <span>Inspect on Map View</span>
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsWorkOrderModalOpen(true)}
          >
            <Truck size={14} />
            <span>Dispatch Service Truck</span>
          </button>
        </div>
      </div>

      {/* Model Notice */}
      <div className="simulation-notice-badge" style={{ marginBottom: '20px' }}>
        <Info size={14} style={{ flexShrink: 0 }} />
        <span>
          <strong>Operational Safeguards &amp; Model Evidence:</strong> Degradation slopes and failure risk are evaluated against physical sensor thresholds. Truck dispatch requires authorized operational sign-off and documented failure codes to prevent unverified rollout costs.
        </span>
      </div>

      {/* Target Device Selection Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {SOLAR_ORACLE_PREDICTIONS.map((p) => {
          const isSelected = selectedPrediction.deviceId === p.deviceId;
          return (
            <div
              key={p.deviceId}
              className="panel-card"
              onClick={() => setSelectedPrediction(p)}
              style={{
                padding: '14px 18px',
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-card)',
                background: isSelected ? 'var(--tint-primary)' : 'var(--bg-card)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {p.deviceId}
                </span>
                <span
                  className="status-badge"
                  style={{
                    background:
                      p.riskScore > 70
                        ? 'var(--tint-rose)'
                        : p.riskScore > 40
                        ? 'var(--tint-amber)'
                        : 'var(--tint-emerald)',
                    color:
                      p.riskScore > 70
                        ? 'var(--accent-rose)'
                        : p.riskScore > 40
                        ? 'var(--accent-amber)'
                        : 'var(--accent-emerald)',
                    fontSize: '11px',
                  }}
                >
                  {p.riskLevel}
                </span>
              </div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginTop: '4px' }}>
                {p.deviceName}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Failure Horizon: <strong>{p.predictedFailureWindow}</strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Operational Recommendation Banner (Requirement 7.3) */}
      <div
        className="panel-card"
        style={{
          marginBottom: '24px',
          background: currentActionTier.bg,
          border: `1px solid ${currentActionTier.color}50`,
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: currentActionTier.color,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ActionIcon size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Action Tier: {currentActionTier.label}
                </span>
                <span
                  className="badge"
                  style={{
                    background: currentActionTier.color,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '11px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    padding: '3px 8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {currentActionTier.urgency}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>
                {currentActionTier.description}
              </p>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                <strong>Evidence Basis:</strong> {selectedPrediction.recommendation} Risk Index: <strong>{selectedPrediction.riskScore}/100</strong>.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentActionTierKey === 'DISPATCH_SERVICE_TRUCK' && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setIsWorkOrderModalOpen(true)}
              >
                <Truck size={14} />
                <span>Confirm Truck Rollout</span>
              </button>
            )}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                const dev = { id: selectedPrediction.deviceId, name: selectedPrediction.deviceName };
                navigateToDiagnostics(dev);
              }}
            >
              <Wrench size={14} />
              <span>Run Smart Diagnostics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation for Component Breakdown & Trajectory */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
        <button
          className={`btn ${activeTab === 'components' ? 'btn-primary' : 'btn-outline'} btn-sm`}
          onClick={() => setActiveTab('components')}
        >
          <Cpu size={14} />
          <span>Component-Level Assessment</span>
        </button>

        <button
          className={`btn ${activeTab === 'predictive' ? 'btn-primary' : 'btn-outline'} btn-sm`}
          onClick={() => setActiveTab('predictive')}
        >
          <TrendingDown size={14} />
          <span>Degradation Trajectory &amp; SHAP</span>
        </button>
      </div>

      {activeTab === 'components' && (
        /* Component-Level Health Assessment Grid (Requirement 7.1 & 7.2) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {componentHealthList.map((comp) => {
            const isWarn = comp.status === 'warning';
            const isCrit = comp.status === 'critical';
            return (
              <div
                key={comp.id}
                className="panel-card"
                style={{
                  padding: '16px',
                  borderLeft: `4px solid ${isCrit ? 'var(--accent-rose)' : isWarn ? 'var(--accent-amber)' : 'var(--accent-green)'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '14.5px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                      {comp.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Health Index:</span>
                      <strong style={{ fontSize: '13px', color: isCrit ? 'var(--accent-rose)' : isWarn ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
                        {comp.healthScore}%
                      </strong>
                      {!comp.instrumented && (
                        <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                          Passive / Uninstrumented
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`badge badge-${isCrit ? 'danger' : isWarn ? 'warning' : 'success'}`}
                    style={{ fontSize: '10.5px' }}
                  >
                    {isCrit ? 'Fault Imminent' : isWarn ? 'Degraded' : 'Nominal'}
                  </span>
                </div>

                {/* Subsystem Metrics */}
                <div
                  style={{
                    margin: '12px 0',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    fontSize: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {comp.metrics.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{m.label}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.val}</span>
                    </div>
                  ))}
                </div>

                {/* Active Fault Codes */}
                {comp.faultCodes.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {comp.faultCodes.map((code) => (
                      <span key={code} className="badge badge-danger font-mono" style={{ fontSize: '10px' }}>
                        {code}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actionable Maintenance Recommendation & Delay Consequence */}
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  <strong>Recommended Action:</strong> {comp.recommendation}
                  {isCrit && (
                    <div style={{ color: 'var(--accent-rose)', marginTop: '4px', fontWeight: 500 }}>
                      ⚠ Consequence of delay: Night blackout hazard and irreversible cell damage.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'predictive' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Left Column: Degradation Curve & Trajectory */}
          <div className="panel-card">
            <div className="panel-header">
              <div>
                <div className="panel-title">
                  <TrendingDown size={18} color="var(--accent-rose)" />
                  <span>Degradation Trajectory vs Outage Cutoff</span>
                </div>
                <div className="panel-subtitle">
                  Historical telemetry and forecasted state progression for {selectedPrediction.deviceName}
                </div>
              </div>
            </div>

            <div className="panel-body" style={{ height: '300px' }}>
              <Line data={degradationChartData} options={chartOptions} />
            </div>
          </div>

          {/* Right Column: Contributing Anomaly Factors Breakdown */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title">
                <ShieldAlert size={18} color="var(--accent-amber)" />
                <span>Contributing Telemetry Factors</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SHAP Attribution</span>
            </div>

            <div className="panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {selectedPrediction.contributingFactors.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-surface)',
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                        {f.factor}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color:
                            f.impact === 'High'
                              ? 'var(--accent-rose)'
                              : f.impact === 'Moderate'
                              ? 'var(--accent-amber)'
                              : 'var(--accent-emerald)',
                        }}
                      >
                        {f.weight} Impact
                      </span>
                    </div>

                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                      {f.detail}
                    </p>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: '20px',
                  padding: '14px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Estimated Avoided Outage Cost</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '2px' }}>
                  $420 USD / node
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Avoids emergency night patrol and truck roll dispatch penalty.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Truck & Work Order Dispatch Modal (Requirement 7.3) */}
      {isWorkOrderModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsWorkOrderModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18} color="var(--accent-rose)" />
                <span>Confirm Service Truck Rollout</span>
              </div>
              <button
                onClick={() => setIsWorkOrderModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDispatchWorkOrder}>
              <div className="modal-body">
                <div
                  style={{
                    background: 'var(--tint-rose)',
                    border: '1px solid var(--accent-rose)40',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    marginBottom: '16px',
                    fontSize: '12.5px',
                    color: 'var(--text-primary)',
                  }}
                >
                  <strong>Operational Safeguard Check:</strong> You are dispatching a physical service truck to{' '}
                  <strong>{selectedPrediction.deviceName}</strong> ({selectedPrediction.deviceId}). Please verify hardware fault codes and required tools before dispatching field crews.
                </div>

                <div className="form-group">
                  <label className="form-label">Target Field Node</label>
                  <input
                    type="text"
                    className="form-input"
                    value={`${selectedPrediction.deviceName} (${selectedPrediction.deviceId})`}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Dispatch Priority &amp; SLA</label>
                  <select
                    className="form-select"
                    value={priorityLevel}
                    onChange={(e) => setPriorityLevel(e.target.value)}
                  >
                    <option value="Critical (Immediate Dispatch)">Critical (Immediate Dispatch) — Active dark blackout risk</option>
                    <option value="High (Within 12h)">High (Within 12h) — Preventive swap before night</option>
                    <option value="Standard Scheduled (Next 48h)">Standard Scheduled (Next 48h) — Routine maintenance</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Field Technician Dispatch Instructions</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="Enter specific instructions for field crew..."
                    defaultValue={`Recommended action: ${selectedPrediction.recommendation}. Bring replacement LiFePO4 pack, thermal paste, and MC4 connector crimp kit.`}
                    onChange={(e) => setTechnicianNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsWorkOrderModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Authorize &amp; Rollout Service Truck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolarOracle;
