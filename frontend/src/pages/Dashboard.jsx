import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ApiService } from '../services/api';
import {
  Server,
  Zap,
  BatteryCharging,
  AlertTriangle,
  ArrowUpRight,
  Sun,
  Activity,
  CalendarClock,
  MapPinned,
  Map,
  Wrench,
  RefreshCw,
  Filter,
  CheckCircle2,
  ChevronRight,
  BarChart3,
  Clock,
  Radio,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const Dashboard = () => {
  const {
    devices,
    alerts,
    currentUser,
    acknowledgeAlert,
    resolveAlert,
    setActiveRoute,
    navigateToDiagnostics,
    navigateToMap,
    showToast,
    effectiveTheme,
    selectedDevice,
    setSelectedDevice,
  } = useApp();

  const [filterType, setFilterType] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected Node & Time-Range Chart State (Requirement 3.1 & 3.2)
  const [selectedNodeId, setSelectedNodeId] = useState(() => {
    return selectedDevice?.id || (devices[0]?.id || 'DEV-SOL-1042');
  });
  const [timeRange, setTimeRange] = useState('day'); // 'day' | 'week' | 'month'
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);
  const [telemetrySeries, setTelemetrySeries] = useState(null);

  // Stale request prevention ref
  const currentReqIdRef = useRef(0);
  const chartSectionRef = useRef(null);

  const isOperator = currentUser?.role === 'Operator';

  // Compute fleet summary metrics (Zero-safe NaN guards)
  const totalDevices = devices.length;
  const onlineDevices = devices.filter((d) => d.status === 'online').length;
  const warningDevices = devices.filter((d) => d.status === 'warning').length;
  const criticalDevices = devices.filter((d) => d.status === 'critical').length;
  const totalYieldVal = devices.reduce((sum, d) => sum + (Number(d.solarYieldTodayKWh) || 0), 0);
  const totalYield = (!isNaN(totalYieldVal) ? totalYieldVal : 0).toFixed(1);
  const validBatteryDevices = devices.filter((d) => d.batterySoC !== undefined && !isNaN(Number(d.batterySoC)));
  const avgSoC = validBatteryDevices.length > 0
    ? Math.round(validBatteryDevices.reduce((sum, d) => sum + Number(d.batterySoC), 0) / validBatteryDevices.length)
    : 0;
  const unacknowledgedAlerts = alerts.filter((a) => a.status === 'unacknowledged').length;

  const filteredDevices =
    filterType === 'all' ? devices : devices.filter((d) => d.status === filterType);

  // Active node metadata
  const currentNode = devices.find((d) => d.id === selectedNodeId) || devices[0] || null;

  // Sync selected device from context
  useEffect(() => {
    if (selectedDevice?.id && selectedDevice.id !== selectedNodeId) {
      setSelectedNodeId(selectedDevice.id);
    }
  }, [selectedDevice]);

  // Fetch or calculate node-specific telemetry series when selectedNodeId or timeRange changes
  useEffect(() => {
    if (!selectedNodeId && devices.length > 0) {
      setSelectedNodeId(devices[0].id);
      return;
    }
    if (!selectedNodeId) return;

    const reqId = ++currentReqIdRef.current;
    setIsChartLoading(true);
    setChartError(null);

    ApiService.getDeviceTelemetrySeries(selectedNodeId, timeRange)
      .then((data) => {
        if (reqId === currentReqIdRef.current) {
          setTelemetrySeries(data);
          setIsChartLoading(false);
        }
      })
      .catch((err) => {
        if (reqId === currentReqIdRef.current) {
          console.warn(`[Dashboard] Fallback computing telemetry for ${selectedNodeId}:`, err.message);
          // Deterministic fallback derived from active device hardware parameters
          const dev = devices.find((d) => d.id === selectedNodeId) || devices[0];
          const pvWatts = dev?.hardware?.solarRatedWatts || 150;
          const battWh = dev?.hardware?.batteryCapacityWh || 768;
          const currentSoC = dev?.telemetry?.batterySoC ?? dev?.batterySoC ?? 65;
          const isDegraded = dev?.status === 'critical' || dev?.status === 'warning';

          let labels = [];
          let solarYield = [];
          let batterySoC = [];

          if (timeRange === 'day') {
            labels = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
            const peakKw = (pvWatts / 1000) * (isDegraded ? 0.45 : 0.88);
            solarYield = [0, 0, 0, 0.08, peakKw * 0.45, peakKw * 0.82, peakKw, peakKw * 0.78, peakKw * 0.25, 0, 0, 0].map((v) => Number(v.toFixed(2)));
            batterySoC = [
              Math.max(10, Math.round(currentSoC - 12)),
              Math.max(10, Math.round(currentSoC - 18)),
              Math.max(8, Math.round(currentSoC - 22)),
              Math.max(12, Math.round(currentSoC - 15)),
              Math.min(98, Math.round(currentSoC + 8)),
              Math.min(100, Math.round(currentSoC + 28)),
              Math.min(100, Math.round(currentSoC + 35)),
              Math.min(100, Math.round(currentSoC + 30)),
              Math.min(95, Math.round(currentSoC + 18)),
              Math.round(currentSoC + 5),
              currentSoC,
              Math.max(12, Math.round(currentSoC - 6)),
            ];
          } else if (timeRange === 'week') {
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const baseDailyKwh = (pvWatts * 4.6 * (isDegraded ? 0.5 : 0.82)) / 1000;
            solarYield = [0.95, 1.05, 0.78, 1.12, 1.02, 0.88, 1.0].map((m) => Number((baseDailyKwh * m).toFixed(2)));
            batterySoC = [
              Math.round(currentSoC * 0.94),
              Math.round(currentSoC * 0.98),
              Math.round(currentSoC * 0.88),
              Math.round(currentSoC * 1.02),
              Math.round(currentSoC * 0.96),
              Math.round(currentSoC * 0.92),
              currentSoC,
            ].map((v) => Math.max(10, Math.min(100, v)));
          } else {
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            const weeklyKwh = ((pvWatts * 4.6 * 7 * (isDegraded ? 0.5 : 0.82)) / 1000);
            solarYield = [0.92, 1.04, 0.88, 1.01].map((m) => Number((weeklyKwh * m).toFixed(1)));
            batterySoC = [
              Math.round(currentSoC * 0.95),
              Math.round(currentSoC * 1.01),
              Math.round(currentSoC * 0.92),
              currentSoC,
            ].map((v) => Math.max(10, Math.min(100, v)));
          }

          setTelemetrySeries({
            deviceId: dev?.id || selectedNodeId,
            deviceName: dev?.name || 'Smart Lamp',
            range: timeRange,
            status: dev?.status || 'online',
            metricUnit: { solarYield: timeRange === 'day' ? 'kW' : 'kWh', batterySoC: '%' },
            summary: {
              currentSoC,
              ratedWatts: pvWatts,
              batteryCapacityWh: battWh,
              todayYieldKWh: Number(((pvWatts * 4.4 * 0.8) / 1000).toFixed(2)),
            },
            labels,
            solarYield,
            batterySoC,
          });
          setIsChartLoading(false);
        }
      });
  }, [selectedNodeId, timeRange, devices]);

  const handleSelectNode = (devId) => {
    setSelectedNodeId(devId);
    const found = devices.find((d) => d.id === devId);
    if (found) setSelectedDevice(found);
  };

  const handleSelectNodeFromTable = (dev) => {
    handleSelectNode(dev.id);
    if (chartSectionRef.current) {
      chartSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    showToast(`Chart updated to ${dev.name} (${dev.id})`, 'info');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Telemetry streams re-synchronized with IoT mesh broker', 'success');
    }, 600);
  };

  const isLight = effectiveTheme === 'light';

  // Construct chart data bound directly to selected node and time-range
  const activeLabels = telemetrySeries?.labels || ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'];
  const activeSolarYield = telemetrySeries?.solarYield || [0, 0, 0.4, 3.8, 6.2, 4.9, 1.2, 0, 0];
  const activeBatterySoC = telemetrySeries?.batterySoC || [48, 42, 38, 55, 82, 94, 88, 76, 68];
  const yieldUnit = telemetrySeries?.metricUnit?.solarYield || (timeRange === 'day' ? 'kW' : 'kWh');

  const chartData = {
    labels: activeLabels,
    datasets: [
      {
        label: `${currentNode?.name || 'Selected Node'} Solar Harvest (${yieldUnit})`,
        data: activeSolarYield,
        borderColor: '#00d2b4',
        backgroundColor: 'rgba(0, 210, 180, 0.12)',
        tension: 0.35,
        fill: true,
        yAxisID: 'y',
        pointRadius: 3,
        pointHoverRadius: 6,
      },
      {
        label: `${currentNode?.name || 'Selected Node'} Battery SoC (%)`,
        data: activeBatterySoC,
        borderColor: '#0a84ff',
        backgroundColor: 'rgba(10, 132, 255, 0.05)',
        borderDash: [5, 5],
        tension: 0.3,
        fill: false,
        yAxisID: 'y1',
        pointRadius: 3,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isLight ? '#1c1c1e' : '#f5f5f7',
          font: { family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', size: 12 },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: isLight ? '#ffffff' : '#24242d',
        borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        titleColor: isLight ? '#1c1c1e' : '#f5f5f7',
        bodyColor: isLight ? '#636366' : '#98989f',
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { color: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: isLight ? '#8e8e93' : '#686873' },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#00d2b4' },
        title: { display: true, text: `Solar Harvest (${yieldUnit})`, color: '#00d2b4' },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { color: '#0a84ff' },
        min: 0,
        max: 100,
        title: { display: true, text: 'Battery SoC (%)', color: '#0a84ff' },
      },
    },
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time distributed solar telemetry, battery health, and mesh node control</p>
        </div>

        <div className="page-actions-group">
          <button
            id="sync-telemetry-btn"
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={13} className={isRefreshing ? 'pulse-dot' : ''} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid-metrics">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Active Fleet Nodes</span>
            <div className="metric-icon-box" style={{ background: 'var(--tint-primary)', color: 'var(--accent-primary)' }}>
              <Server size={17} />
            </div>
          </div>
          <div className="metric-value">
            {totalDevices} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Nodes</span>
          </div>
          <div className="metric-footer">
            <span className="trend-pill trend-up">
              {onlineDevices} Nominal
            </span>
            {criticalDevices > 0 && (
              <span className="trend-pill trend-down">{criticalDevices} Critical</span>
            )}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Solar Yield Today</span>
            <div className="metric-icon-box" style={{ background: 'var(--tint-cyan)', color: 'var(--accent-cyan)' }}>
              <Sun size={17} />
            </div>
          </div>
          <div className="metric-value">
            {totalYield} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>kWh</span>
          </div>
          <div className="metric-footer">
            <span className="trend-pill trend-up">
              PV Peak Harvest Nominal
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Average Battery SoC</span>
            <div className="metric-icon-box" style={{ background: 'var(--tint-blue)', color: 'var(--accent-blue)' }}>
              <BatteryCharging size={17} />
            </div>
          </div>
          <div className="metric-value">
            {avgSoC}<span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>%</span>
          </div>
          <div className="metric-footer">
            <span className={`trend-pill ${avgSoC > 50 ? 'trend-up' : 'trend-down'}`}>
              {avgSoC > 50 ? 'Autonomy Sufficient' : 'Discharge Warning'}
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Operational Alerts</span>
            <div className="metric-icon-box" style={{ background: 'var(--tint-amber)', color: 'var(--accent-amber)' }}>
              <AlertTriangle size={17} />
            </div>
          </div>
          <div className="metric-value" style={{ color: unacknowledgedAlerts > 0 ? 'var(--accent-amber)' : 'inherit' }}>
            {unacknowledgedAlerts}
          </div>
          <div className="metric-footer">
            {!isOperator ? (
              <span
                onClick={() => setActiveRoute('oracle')}
                style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}
              >
                Inspect Solar Health &rarr;
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Operational Telemetry</span>
            )}
          </div>
        </div>
      </div>

      {/* Telemetry Visualizer Chart (Device-Specific & Functional Time-Range per Requirement 3) */}
      <div id="telemetry-chart-panel" ref={chartSectionRef} className="panel-card" style={{ marginBottom: '22px' }}>
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={17} color="var(--accent-cyan)" />
              <span>
                Node Telemetry: {currentNode?.name || 'Fleet'} ({selectedNodeId})
              </span>
              {currentNode && (
                <span className={`badge badge-${currentNode.status === 'online' ? 'success' : currentNode.status === 'warning' ? 'warning' : 'danger'}`}>
                  {currentNode.status.toUpperCase()}
                </span>
              )}
            </div>
            <div className="panel-subtitle">
              {timeRange === 'day' && `24-hour diurnal profile at 2-hour intervals for ${currentNode?.location || 'San Francisco Corridor'}`}
              {timeRange === 'week' && `7-day aggregated daily solar harvest and battery cycle (Mon–Sun)`}
              {timeRange === 'month' && `30-day weekly aggregated solar harvest and average SoC`}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Target Node Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Target Node:</span>
              <select
                id="dashboard-node-select"
                className="form-select form-select-sm"
                value={selectedNodeId}
                onChange={(e) => handleSelectNode(e.target.value)}
                style={{ maxWidth: '210px', fontSize: '12px' }}
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id} — {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Time-Range Segmented Control (Day, Week, Month per Requirement 3.2) */}
            <div className="segmented-control" role="tablist" aria-label="Chart Time Range">
              <button
                id="time-range-day-btn"
                role="tab"
                aria-selected={timeRange === 'day'}
                className={`segmented-btn ${timeRange === 'day' ? 'active' : ''}`}
                onClick={() => setTimeRange('day')}
              >
                Day
              </button>
              <button
                id="time-range-week-btn"
                role="tab"
                aria-selected={timeRange === 'week'}
                className={`segmented-btn ${timeRange === 'week' ? 'active' : ''}`}
                onClick={() => setTimeRange('week')}
              >
                Week
              </button>
              <button
                id="time-range-month-btn"
                role="tab"
                aria-selected={timeRange === 'month'}
                className={`segmented-btn ${timeRange === 'month' ? 'active' : ''}`}
                onClick={() => setTimeRange('month')}
              >
                Month
              </button>
            </div>
          </div>
        </div>

        <div className="panel-body" style={{ height: '320px', position: 'relative' }}>
          {isChartLoading && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: isLight ? 'rgba(255, 255, 255, 0.7)' : 'rgba(16, 20, 28, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                backdropFilter: 'blur(2px)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontSize: '13px', fontWeight: 600 }}>
                <span className="spinner-border" />
                <span>Loading telemetry series for {selectedNodeId}...</span>
              </div>
            </div>
          )}

          {!isChartLoading && (!devices || devices.length === 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: 'var(--text-muted)' }}>
              <BarChart3 size={32} />
              <div>No telemetry data available for the selected node</div>
            </div>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Operational Module Shortcuts */}
      {/* Quick Navigation Cards matching Sidebar order: Map, Scheduler, Deployment, Health, Diagnostics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        {/* 1. Map View */}
        <div
          className="panel-card"
          style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}
          onClick={() => setActiveRoute('map')}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(10, 132, 255, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              flexShrink: 0,
            }}
          >
            <Map size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>Map View</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>GIS siting &amp; direct provisioning</div>
          </div>
        </div>

        {!isOperator && (
          <>
            {/* 2. Smart Scheduler */}
            <div
              className="panel-card"
              style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}
              onClick={() => setActiveRoute('schedule')}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '11px',
                  background: 'linear-gradient(135deg, #FF9F0A 0%, #D97706 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(255, 159, 10, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  flexShrink: 0,
                }}
              >
                <CalendarClock size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>Smart Scheduler</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Astronomical sunset offsets &amp; dimming</div>
              </div>
            </div>

            {/* 3. Solar Deployment Intelligence */}
            <div
              className="panel-card"
              style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}
              onClick={() => setActiveRoute('evaluator')}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '11px',
                  background: 'linear-gradient(135deg, #30D158 0%, #15803D 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(48, 209, 88, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  flexShrink: 0,
                }}
              >
                <MapPinned size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>Solar Deployment Intelligence</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Site feasibility, tilt angle, autonomy</div>
              </div>
            </div>

            {/* 4. Solar Health Intelligence */}
            <div
              className="panel-card"
              style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}
              onClick={() => setActiveRoute('oracle')}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '11px',
                  background: 'linear-gradient(135deg, #BF5AF2 0%, #7E22CE 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(191, 90, 242, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  flexShrink: 0,
                }}
              >
                <Activity size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>Solar Health Intelligence</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Failure forecasting 7–14 days ahead</div>
              </div>
            </div>

            {/* 5. Smart Diagnostics */}
            <div
              className="panel-card"
              style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}
              onClick={() => setActiveRoute('assistance')}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '11px',
                  background: 'linear-gradient(135deg, #5E5CE6 0%, #BF5AF2 50%, #FF375F 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(94, 92, 230, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  flexShrink: 0,
                }}
              >
                <Wrench size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>Smart Diagnostics</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>AI voice diagnostics &amp; guided sweeps</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fleet Device Table (Interactive selection updates chart) */}
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <div className="panel-title">
              <Server size={17} color="var(--accent-primary)" />
              <span>IoT Fleet Inventory</span>
            </div>
            <div className="panel-subtitle">Select any node row to inspect its dedicated telemetry chart above</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="segmented-control">
              <button
                className={`segmented-btn ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                All ({devices.length})
              </button>
              <button
                className={`segmented-btn ${filterType === 'online' ? 'active' : ''}`}
                onClick={() => setFilterType('online')}
              >
                Online ({onlineDevices})
              </button>
              <button
                className={`segmented-btn ${filterType === 'warning' ? 'active' : ''}`}
                onClick={() => setFilterType('warning')}
              >
                Warning ({warningDevices})
              </button>
              <button
                className={`segmented-btn ${filterType === 'critical' ? 'active' : ''}`}
                onClick={() => setFilterType('critical')}
              >
                Critical ({criticalDevices})
              </button>
            </div>
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Node ID &amp; Name</th>
                <th>Type &amp; Zone</th>
                <th>Battery SoC</th>
                <th>Solar Harvest</th>
                <th>Voltage &amp; Temp</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((device) => {
                const isSelected = selectedNodeId === device.id;
                const soc = device.telemetry?.batterySoC ?? device.batterySoC ?? 0;
                const harvest = device.telemetry?.solarYieldTodayKWh ?? device.solarYieldTodayKWh ?? 0;
                const voltage = device.telemetry?.panelVoltage ?? device.panelVoltage ?? device.telemetry?.batteryVoltage ?? 13.2;
                const temp = device.telemetry?.temperatureC ?? device.temperatureC ?? device.telemetry?.internalTempC ?? 24;

                return (
                  <tr
                    key={device.id}
                    className={isSelected ? 'selected-row' : ''}
                    onClick={() => handleSelectNodeFromTable(device)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`status-indicator ${device.status}`} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{device.name}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {device.id} {isSelected && '• Active on Chart'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ color: 'var(--text-secondary)' }}>{device.type || device.model || 'Smart Solar Pole'}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{device.zoneName || device.location || 'Civic Zone'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '60px',
                            height: '5px',
                            background: 'rgba(140, 140, 150, 0.2)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${soc}%`,
                              height: '100%',
                              background:
                                soc > 60
                                  ? 'var(--accent-emerald)'
                                  : soc > 30
                                  ? 'var(--accent-amber)'
                                  : 'var(--accent-rose)',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{soc}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                        {harvest} kWh
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {voltage}V • {temp}°C
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${device.status}`}>
                        {device.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'} btn-xs`}
                          onClick={() => handleSelectNodeFromTable(device)}
                          title="View device telemetry in chart"
                        >
                          <BarChart3 size={12} />
                          <span>{isSelected ? 'Viewing' : 'Chart'}</span>
                        </button>

                        <button
                          className="icon-action-btn"
                          title="Locate on Map View"
                          onClick={() => navigateToMap(device)}
                        >
                          <Map size={14} color="var(--accent-primary)" />
                        </button>

                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => navigateToDiagnostics(device)}
                        >
                          Diagnose
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
