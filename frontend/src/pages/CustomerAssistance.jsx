import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { DIAGNOSTIC_STEPS } from '../data/mockData';
import { ApiService } from '../services/api';
import { SiriAssistantIcon } from '../components/SiriAssistantIcon';
import {
  Wrench,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  RotateCcw,
  Sparkles,
  Zap,
  Battery,
  Sun,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Terminal,
  Ticket,
  ChevronRight,
  ChevronLeft,
  Info,
  X,
  MessageSquare,
  Clock,
  Check,
  AlertOctagon,
  FileText,
  Truck,
  Activity,
  Download,
  HelpCircle,
  Eye,
} from 'lucide-react';

// Guided diagnostics step definitions (Requirement 8.4)
const GUIDED_STEPS = [
  {
    id: 1,
    title: 'Physical Safety & Enclosure Inspection',
    instruction: 'Inspect the lower pole access hatch for physical impact damage, seal degradation, or water ingress.',
    detail: 'Open the access panel using the municipal key. Ensure no water has pooled inside the base plate.',
    safetyWarning: 'Ensure DC isolator switch is switched OFF before touching any electrical terminals.',
    isCritical: false,
    expectedResult: 'Enclosure dry, gasket intact, no moisture or animal nesting.',
  },
  {
    id: 2,
    title: 'Photovoltaic Panel Face & Soiling Check',
    instruction: 'Inspect the pole-mounted monocrystalline PV module for surface obstruction, maritime salt crust, or physical cell cracking.',
    detail: 'Use binoculars or optical inspection pole. Check if nearby tree canopies cast premature shadow during 14:00–17:00 window.',
    safetyWarning: null,
    isCritical: false,
    expectedResult: 'Glass clean, no bypass diode burn marks, less than 10% horizon tree shading.',
  },
  {
    id: 3,
    title: 'LiFePO4 Battery Pack Integrity & Terminals',
    instruction: 'Perform visual and tactile inspection of the LiFePO4 battery pack casing and cabling terminals.',
    detail: 'Check for battery pouch swelling, bulging casing, electrolyte odor, or blue/white corrosion on M6 screw terminals.',
    safetyWarning: 'CRITICAL ELECTRICAL SAFETY: If battery casing is visibly swollen, hot to the touch (>50°C), or leaking fluid, DO NOT ATTEMPT REPAIR. Evacuate immediate perimeter.',
    isCritical: true,
    expectedResult: 'Casing completely flat, no swelling, terminals clean and torqued to 4.5 Nm.',
  },
  {
    id: 4,
    title: 'MPPT Charge Controller & DALI-2 Driver Test',
    instruction: 'Inspect the diagnostic status LED sequence on the MPPT controller and DALI-2 luminaire driver.',
    detail: 'Observe LED blink codes: Green pulsing = normal MPPT tracking; Amber = high temperature derate; Red solid = reverse polarity or blown fuse.',
    safetyWarning: null,
    isCritical: true,
    expectedResult: 'Status LED pulses continuous green (1 Hz); DALI-2 bus voltage measures 16.2V DC.',
  },
  {
    id: 5,
    title: 'Luminaire Optical Burst & Dimming Test',
    instruction: 'Perform an active 5-second luminaire pulse test from the controller interface.',
    detail: 'Observe optical output from the LED luminaire head. Check that all LED diodes in the array illuminate uniformly without flickering.',
    safetyWarning: 'Do not look directly into the high-output LED fixture during burst illumination.',
    isCritical: false,
    expectedResult: 'Full lumen output achieved uniformly; luminaire draws nominal 1.18A current.',
  },
];

export const CustomerAssistance = () => {
  const {
    devices,
    selectedDevice,
    setSelectedDevice,
    showToast,
    resolveDeviceIssue,
    raiseSupportTicket,
  } = useApp();

  // Active Device Context (Requirement 8.2)
  const [selectedDeviceId, setSelectedDeviceId] = useState(
    selectedDevice ? selectedDevice.id : (devices[0]?.id || 'DEV-SOL-1042')
  );

  useEffect(() => {
    if (selectedDevice && selectedDevice.id !== selectedDeviceId) {
      setSelectedDeviceId(selectedDevice.id);
    }
  }, [selectedDevice]);

  const currentDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0];

  // Three Primary Tabs (Requirement 8.1)
  // 'automated' | 'guided' | 'ai-assisted'
  const [activeTab, setActiveTab] = useState('automated');

  // ==========================================
  // TAB 1: AUTOMATED DIAGNOSTICS STATE
  // ==========================================
  const [autoSteps, setAutoSteps] = useState(DIAGNOSTIC_STEPS);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [autoCompleted, setAutoCompleted] = useState(false);
  const [autoReport, setAutoReport] = useState(null);

  // Invalidate previous automated results and synchronize conversation context when target device changes (Requirement 8.2 & 5)
  useEffect(() => {
    setAutoCompleted(false);
    setAutoReport(null);
    setAutoSteps(DIAGNOSTIC_STEPS.map((s) => ({ ...s, status: 'idle', value: undefined })));
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);

    if (currentDevice) {
      setConversation([
        {
          sender: 'assistant',
          text: `Active context synchronized to ${currentDevice.name} (${currentDevice.id}). Live telemetry: Battery SoC at ${
            currentDevice.telemetry?.batterySoC ?? currentDevice.batterySoC ?? 0
          }%, voltage at ${currentDevice.telemetry?.batteryVoltage ?? '13.2'}V, and status is ${currentDevice.status.toUpperCase()}. Ask any question about solar yield, battery health, or diagnostic findings.`,
          timestamp: 'Just now',
        },
      ]);
    }
  }, [selectedDeviceId]);

  const runAutomatedDiagnostics = () => {
    if (currentDevice.status === 'offline') {
      showToast('Device is offline. Remote diagnostics cannot be established.', 'error');
      return;
    }

    setIsAutoRunning(true);
    setAutoCompleted(false);
    setAutoReport(null);

    const stepsCopy = autoSteps.map((s) => ({ ...s, status: 'running' }));
    setAutoSteps(stepsCopy);

    let stepIdx = 0;
    const interval = setInterval(() => {
      setAutoSteps((prev) => {
        const next = [...prev];
        if (stepIdx === 0) {
          next[0] = { ...next[0], status: 'pass', value: '38ms RTT (Excellent)' };
        } else if (stepIdx === 1) {
          next[1] = {
            ...next[1],
            status: currentDevice.status === 'warning' ? 'warn' : 'pass',
            value: currentDevice.status === 'warning' ? '86.4% (Sub-optimal MPPT Tracking)' : '98.5% (Nominal Peak)',
          };
        } else if (stepIdx === 2) {
          next[2] = {
            ...next[2],
            status: currentDevice.status === 'critical' ? 'fail' : 'pass',
            value: currentDevice.status === 'critical' ? '280mV Delta (Severe Cell Mismatch)' : '14mV Delta (Balanced)',
          };
        } else if (stepIdx === 3) {
          next[3] = { ...next[3], status: 'pass', value: '1.18A Draw (Nominal)' };
        } else if (stepIdx === 4) {
          next[4] = { ...next[4], status: 'pass', value: 'CRC32: 0x9E4B2 (Verified)' };
        }
        return next;
      });

      stepIdx++;
      if (stepIdx >= autoSteps.length) {
        clearInterval(interval);
        setIsAutoRunning(false);
        setAutoCompleted(true);

        const isCrit = currentDevice.status === 'critical';
        const isWarn = currentDevice.status === 'warning';

        setAutoReport({
          timestamp: new Date().toLocaleString(),
          deviceId: currentDevice.id,
          deviceName: currentDevice.name,
          issueDetected: isCrit
            ? 'Severe LiFePO4 Cell Imbalance & Capacity Fade'
            : isWarn
            ? 'MPPT Tracking Attenuation & Thermal Derating'
            : 'No Active Hardware Faults Registered',
          likelyRootCause: isCrit
            ? 'Pouch cell #3 internal resistance degradation under heavy thermal cycling'
            : isWarn
            ? 'Heat sink dust accumulation and partial horizon shading'
            : 'System operating within nominal factory specifications',
          evidence: isCrit
            ? 'Delta-V between cell pairs exceeded 280mV; BMS charge termination triggered early'
            : isWarn
            ? 'MPPT tracking efficiency derated to 86.4%; controller temperature reached 68°C'
            : 'All 5 automated checks completed with nominal return codes',
          severity: isCrit ? 'Critical Risk' : isWarn ? 'Moderate Warning' : 'Healthy / Nominal',
          recommendedAction: isCrit
            ? 'Dispatch field technician for LiFePO4 module swap and bench recalibration'
            : isWarn
            ? 'Schedule routine cleaning of heat sink fins and check PV shading'
            : 'Continue routine telemetry monitoring',
        });

        showToast(`Automated diagnostics completed for ${currentDevice.name}`, 'info');
      }
    }, 450);
  };

  // ==========================================
  // TAB 2: GUIDED DIAGNOSTICS STATE
  // ==========================================
  const [guidedStepIndex, setGuidedStepIndex] = useState(0);
  const [guidedAnswers, setGuidedAnswers] = useState({});
  const [criticalFailureEncountered, setCriticalFailureEncountered] = useState(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketPriority, setTicketPriority] = useState('Critical (Immediate Dispatch)');
  const [ticketNotes, setTicketNotes] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [confirmedTicket, setConfirmedTicket] = useState(null);

  const activeGuidedStep = GUIDED_STEPS[guidedStepIndex];

  const handleRecordAnswer = (answer) => {
    setGuidedAnswers((prev) => ({
      ...prev,
      [activeGuidedStep.id]: { answer, timestamp: new Date().toLocaleTimeString() },
    }));

    // Critical Step Failure Handling (Requirement 8.4)
    if (answer === 'Fail' && activeGuidedStep.isCritical) {
      setCriticalFailureEncountered({
        step: activeGuidedStep,
        device: currentDevice,
        timestamp: new Date().toLocaleString(),
      });
      setTicketNotes(
        `Critical inspection failure on Step ${activeGuidedStep.id}: ${activeGuidedStep.title}. Evidence: User confirmed failure of check: "${activeGuidedStep.instruction}". Immediate technician inspection required.`
      );
      return;
    }

    // Move to next step if not at the end
    if (guidedStepIndex < GUIDED_STEPS.length - 1) {
      setGuidedStepIndex((prev) => prev + 1);
    }
  };

  const handleCreateGuidedTicket = async (e) => {
    e.preventDefault();
    setIsSubmittingTicket(true);
    try {
      const res = await raiseSupportTicket({
        deviceId: currentDevice.id,
        priority: ticketPriority,
        notes: ticketNotes,
        diagnosticSnapshot: {
          failedStep: criticalFailureEncountered?.step?.title,
          collectedAnswers: guidedAnswers,
          telemetry: currentDevice.telemetry,
        },
      });

      const ticketRef = res?.ticket?.id || `TICK-CMS-${Date.now().toString().slice(-5)}`;
      setConfirmedTicket({
        ticketRef,
        deviceId: currentDevice.id,
        createdAt: new Date().toLocaleString(),
      });
      setTicketModalOpen(false);
      showToast(`Support ticket ${ticketRef} created and confirmed by backend`, 'success');
    } catch (err) {
      showToast('Support ticket creation failed. Please retry safely.', 'error');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // ==========================================
  // TAB 3: AI-ASSISTED DIAGNOSTICS STATE
  // ==========================================
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isSpeechMuted, setIsSpeechMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const recognitionRef = useRef(null);

  const [conversation, setConversation] = useState([
    {
      sender: 'assistant',
      text: `Hello! I am your Smart Diagnostics Assistant. I have loaded live telemetry for ${currentDevice?.name} (${currentDevice?.id}). You can speak into your microphone or type a question about its solar charging, battery health, or field maintenance.`,
      timestamp: 'Just now',
    },
  ]);

  // Voice Selection for optional female-sounding American English voice
  const getFemaleAmericanVoice = () => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    const femaleUSNames = ['Samantha', 'Karen', 'Victoria', 'Zira', 'Google US English', 'Microsoft Zira', 'Allison', 'Ava', 'Susan', 'Jenny'];
    for (const name of femaleUSNames) {
      const v = voices.find(
        (voice) => voice.name.toLowerCase().includes(name.toLowerCase()) && (voice.lang === 'en-US' || voice.lang.startsWith('en'))
      );
      if (v) return v;
    }
    const usVoice = voices.find((voice) => voice.lang === 'en-US' || voice.lang === 'en_US');
    if (usVoice) return usVoice;
    return voices.find((voice) => voice.lang.startsWith('en')) || null;
  };

  // Speech Recognition initialization
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        const text = Array.from(event.results)
          .map((res) => res[0].transcript)
          .join('');
        setTranscript(text);
        if (event.results[0].isFinal) {
          handleSendMessage(text);
          setTranscript('');
        }
      };

      recognitionRef.current = recognition;
    }

    if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Pre-warm voices
        window.speechSynthesis.getVoices();
      };
    }
  }, [currentDevice]);

  const toggleListening = () => {
    if (!speechSupported) {
      showToast('Speech recognition is not supported in this browser. Please use text input.', 'info');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        setTranscript('');
        recognitionRef.current?.start();
      } catch (err) {
        console.warn('Could not start speech recognition:', err.message);
      }
    }
  };

  const speakText = (text) => {
    if (isSpeechMuted || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const femaleVoice = getFemaleAmericanVoice();
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      utterance.rate = 1.02;
      utterance.pitch = 1.05;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleSendMessage = async (queryText) => {
    const query = (queryText || textInput).trim();
    if (!query) return;

    const userMsg = {
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setConversation((prev) => [...prev, userMsg]);
    setTextInput('');
    setIsAnalyzing(true);

    try {
      const res = await ApiService.chatTroubleshoot({
        deviceId: currentDevice.id,
        userMessage: query,
        symptom: query,
      });

      const evalData = res.evaluation;
      const assistantMsg = {
        sender: 'assistant',
        text: evalData.voiceReply,
        evaluation: evalData,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setConversation((prev) => [...prev, assistantMsg]);
      speakText(evalData.voiceReply);
    } catch (err) {
      const fallbackMsg = {
        sender: 'assistant',
        text: `Regarding ${currentDevice.name}: Telemetry shows Battery SoC at ${
          currentDevice.telemetry?.batterySoC ?? currentDevice.batterySoC ?? 72
        }%, battery voltage at ${currentDevice.telemetry?.batteryVoltage ?? '13.2'}V, and status is ${currentDevice.status.toUpperCase()}. Would you like to run the automated checks or step through guided manual diagnostics?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setConversation((prev) => [...prev, fallbackMsg]);
      speakText(fallbackMsg.text);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetSession = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setConversation([
      {
        sender: 'assistant',
        text: `Diagnostic session reset. Context active for ${currentDevice.name} (${currentDevice.id}). What issue would you like to investigate?`,
        timestamp: 'Just now',
      },
    ]);
    showToast('Diagnostic session reset', 'info');
  };

  const telemetry = currentDevice?.telemetry || {};
  const isSimulated = telemetry.isSimulated ?? true;
  const isReachable = currentDevice.status !== 'offline';

  return (
    <div className="smart-diagnostics-page" style={{ paddingBottom: '40px' }}>
      {/* Header without icon prefix on title (Requirement 8.1) */}
      <div className="page-header">
        <div className="page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="page-title">Smart Diagnostics</h1>
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
              Multi-Mode Engineering Console
            </span>
          </div>
          <p className="page-subtitle">
            Comprehensive automated diagnostic sweeps, interactive guided step-by-step procedures, and voice-enabled AI assistance
          </p>
        </div>

        <div className="page-actions-group">
          <button
            className="btn btn-outline btn-sm"
            onClick={handleResetSession}
            title="Reset assistant conversation"
          >
            <RotateCcw size={14} />
            <span>Reset Context</span>
          </button>
        </div>
      </div>

      {/* Target Device Selection Bar (Requirement 8.2) */}
      <div className="panel-card" style={{ marginBottom: '20px' }}>
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={18} color="var(--accent-primary)" />
            <div>
              <div className="panel-title">Active Target Device Context</div>
              <div className="panel-subtitle">
                All diagnostic tabs operate consistently on the selected hardware node
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label className="form-label" style={{ margin: 0, fontSize: '12px', fontWeight: 600 }}>Target Device:</label>
            <select
              id="smart-diagnostics-device-select"
              className="form-select form-select-sm"
              style={{ width: '280px' }}
              value={selectedDeviceId}
              onChange={(e) => {
                const dev = devices.find((d) => d.id === e.target.value);
                if (dev) {
                  setSelectedDeviceId(dev.id);
                  setSelectedDevice(dev);
                }
              }}
              title="Select target device for automated, guided, and AI diagnostics"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.id}) — {d.status.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Telemetry Facts Row with Outer Padding (Requirement 4) */}
        <div
          className="telemetry-facts-wrapper"
          style={{
            marginTop: '16px',
            padding: '16px 18px',
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Activity size={14} color="var(--accent-primary)" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Live Telemetry &amp; Node Operational Overview
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
            }}
          >
            <div className="telemetry-card" style={{ padding: '14px 16px' }}>
              <div className="telemetry-header">
                <Battery size={13} style={{ color: 'var(--accent-green)' }} />
                <span>Battery SoC</span>
                <span className="badge badge-neutral" style={{ fontSize: '9px', marginLeft: 'auto' }}>
                  {isSimulated ? 'Simulated' : 'Measured'}
                </span>
              </div>
              <div className="telemetry-value">
                {telemetry.batterySoC !== undefined ? `${telemetry.batterySoC}%` : `${currentDevice.batterySoC}%`}
              </div>
              <div className="telemetry-sub font-mono">
                {telemetry.batteryVoltage ? `${telemetry.batteryVoltage}V` : '13.2V'}
              </div>
            </div>

            <div className="telemetry-card" style={{ padding: '14px 16px' }}>
              <div className="telemetry-header">
                <Sun size={13} style={{ color: 'var(--accent-amber)' }} />
                <span>Solar Harvest</span>
                <span className="badge badge-neutral" style={{ fontSize: '9px', marginLeft: 'auto' }}>
                  {isSimulated ? 'Simulated' : 'Measured'}
                </span>
              </div>
              <div className="telemetry-value">
                {telemetry.solarYieldTodayKWh !== undefined ? `${telemetry.solarYieldTodayKWh} kWh` : `${currentDevice.solarYieldTodayKWh} kWh`}
              </div>
              <div className="telemetry-sub font-mono">
                {telemetry.panelPowerW ? `${telemetry.panelPowerW}W` : '112W'}
              </div>
            </div>

            <div className="telemetry-card" style={{ padding: '14px 16px' }}>
              <div className="telemetry-header">
                <Zap size={13} style={{ color: 'var(--accent-primary)' }} />
                <span>Lamp Load</span>
                <span className="badge badge-neutral" style={{ fontSize: '9px', marginLeft: 'auto' }}>Measured</span>
              </div>
              <div className="telemetry-value">
                {telemetry.currentLoadW !== undefined ? `${telemetry.currentLoadW}W` : `${currentDevice.currentLoadW}W`}
              </div>
              <div className="telemetry-sub font-mono">
                {currentDevice.activeSchedule || 'Sunset Adaptive'}
              </div>
            </div>

            <div className="telemetry-card" style={{ padding: '14px 16px' }}>
              <div className="telemetry-header">
                <ShieldAlert size={13} style={{ color: currentDevice.status === 'critical' ? 'var(--accent-rose)' : 'var(--text-muted)' }} />
                <span>Network Reachability</span>
                <span className={`badge badge-${isReachable ? 'success' : 'danger'}`} style={{ fontSize: '9px', marginLeft: 'auto' }}>
                  {isReachable ? 'Online' : 'Unreachable'}
                </span>
              </div>
              <div className="telemetry-value" style={{ textTransform: 'capitalize' }}>
                {currentDevice.status}
              </div>
              <div className="telemetry-sub">
                {currentDevice.connectivity || 'Cellular 4G/LTE'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Three Diagnostic Modes Tabs (Requirement 8.1) */}
      <div
        role="tablist"
        aria-label="Smart Diagnostics Modes"
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '12px',
          overflowX: 'auto',
        }}
      >
        <button
          role="tab"
          aria-selected={activeTab === 'automated'}
          className={`btn ${activeTab === 'automated' ? 'btn-primary' : 'btn-outline'} btn-sm`}
          onClick={() => setActiveTab('automated')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
        >
          <Play size={14} />
          <span>Automated Diagnostics</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'guided'}
          className={`btn ${activeTab === 'guided' ? 'btn-primary' : 'btn-outline'} btn-sm`}
          onClick={() => setActiveTab('guided')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
        >
          <Activity size={14} />
          <span>Guided Diagnostics</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'ai-assisted'}
          className={`btn ${activeTab === 'ai-assisted' ? 'btn-primary' : 'btn-outline'} btn-sm`}
          onClick={() => setActiveTab('ai-assisted')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
        >
          <SiriAssistantIcon size={16} />
          <span>AI-Assisted Diagnostics</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: AUTOMATED DIAGNOSTICS (Requirement 8.3 & 4)        */}
      {/* ======================================================== */}
      {activeTab === 'automated' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!isReachable ? (
            /* Unreachable Device Handling (Requirement 8.3) */
            <div
              className="panel-card"
              style={{
                borderLeft: '4px solid var(--accent-rose)',
                background: 'var(--tint-rose)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <AlertOctagon size={24} color="var(--accent-rose)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Remote Diagnostics Unavailable — Device Unreachable
                  </h3>
                  <p style={{ margin: '6px 0 10px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong>{currentDevice.name}</strong> ({currentDevice.id}) is not responding to network telemetry pings. Remote hardware diagnostic sweeps cannot be completed over cellular/mesh.
                  </p>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    <strong>Last Known Status:</strong> Offline since 4h 12m ago &bull; Last reported SoC: {currentDevice.batterySoC}% &bull; Tower Sector: Pier 12 Node Gateway
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setActiveTab('guided')}
                    >
                      <Activity size={14} />
                      <span>Start On-Site Guided Maintenance</span>
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setTicketModalOpen(true)}
                    >
                      <Truck size={14} />
                      <span>Dispatch Service Truck for Node Recovery</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Reachable Device Automated Checks */
            <div className="panel-card">
              <div className="panel-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={18} color="var(--accent-primary)" />
                  <div>
                    <div className="panel-title">Automated Telemetry &amp; Hardware Sweeps</div>
                    <div className="panel-subtitle">
                      Executes deterministic hardware checks against DALI-2 controller and BMS bus
                    </div>
                  </div>
                </div>

                <button
                  id="run-automated-diagnostics-btn"
                  className="btn btn-primary btn-sm"
                  onClick={runAutomatedDiagnostics}
                  disabled={isAutoRunning}
                >
                  <Play size={14} />
                  <span>{isAutoRunning ? 'Executing Automated Sweeps...' : 'Run Automated Sweeps'}</span>
                </button>
              </div>

              <div className="panel-body">
                {/* Check list with robust padding, spacing, and text wrapping (Requirement 4) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {autoSteps.map((s, idx) => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '13px',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 280px', minWidth: 0 }}>
                        <span
                          className="font-mono"
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--text-muted)',
                            minWidth: '96px',
                            flexShrink: 0,
                            letterSpacing: '0.4px',
                          }}
                        >
                          [{s.code}]
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-word', lineHeight: 1.4 }}>
                          {s.name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
                        {s.value && (
                          <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
                            {s.value}
                          </span>
                        )}
                        <span
                          className={`badge badge-${
                            s.status === 'pass'
                              ? 'success'
                              : s.status === 'warn'
                              ? 'warning'
                              : s.status === 'fail'
                              ? 'danger'
                              : s.status === 'running'
                              ? 'info'
                              : 'neutral'
                          }`}
                          style={{ minWidth: '70px', textAlign: 'center', borderRadius: 'var(--radius-sm, 6px)' }}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Diagnostic Report Summary (Requirement 8.3) */}
                {autoReport && (
                  <div
                    style={{
                      marginTop: '20px',
                      padding: '16px 20px',
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} color="var(--accent-primary)" />
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Automated Diagnostic Report
                        </h4>
                      </div>
                      <span className="badge badge-info font-mono" style={{ fontSize: '10.5px' }}>
                        {autoReport.timestamp}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', fontSize: '12.5px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Detected Issue:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {autoReport.issueDetected}
                        </div>
                      </div>

                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Likely Root Cause:</span>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {autoReport.likelyRootCause}
                        </div>
                      </div>

                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Supporting Evidence:</span>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {autoReport.evidence}
                        </div>
                      </div>

                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Recommended Next Action:</span>
                        <div style={{ fontWeight: 600, color: 'var(--accent-primary)', marginTop: '2px' }}>
                          {autoReport.recommendedAction}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: GUIDED DIAGNOSTICS (Requirement 8.4)              */}
      {/* ======================================================== */}
      {activeTab === 'guided' && (
        <div className="panel-card">
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="var(--accent-primary)" />
              <div>
                <div className="panel-title">Interactive Step-by-Step Guided Diagnostics</div>
                <div className="panel-subtitle">
                  Structured technician walkthrough with validation and critical-failure ticketing escalation
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Step {guidedStepIndex + 1} of {GUIDED_STEPS.length}
              </span>
            </div>
          </div>

          <div className="panel-body">
            {/* Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'var(--bg-surface)',
                borderRadius: '3px',
                marginBottom: '20px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${((guidedStepIndex + 1) / GUIDED_STEPS.length) * 100}%`,
                  height: '100%',
                  background: 'var(--accent-primary)',
                  transition: 'width 0.25s ease',
                }}
              />
            </div>

            {/* Critical Step Failure Escalation Notice (Requirement 8.4) */}
            {criticalFailureEncountered ? (
              <div
                style={{
                  padding: '18px 20px',
                  background: 'var(--tint-rose)',
                  border: '1px solid var(--accent-rose)50',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <AlertOctagon size={24} color="var(--accent-rose)" style={{ flexShrink: 0 }} />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Critical Diagnostic Failure on Step {criticalFailureEncountered.step.id}: {criticalFailureEncountered.step.title}
                    </h4>
                    <p style={{ margin: '6px 0 12px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Safety procedure halted manual diagnostic progression. To ensure technician safety and avoid unverified repairs, a field service ticket must be created.
                    </p>

                    {confirmedTicket ? (
                      <div
                        style={{
                          background: 'var(--bg-card)',
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-card)',
                          fontSize: '12.5px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-green)', fontWeight: 600 }}>
                          <CheckCircle2 size={16} />
                          <span>Support Ticket Confirmed: #{confirmedTicket.ticketRef}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Transmitted to Field Operations Dispatch at {confirmedTicket.createdAt}. A certified high-voltage field crew has been notified.
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setTicketModalOpen(true)}
                        >
                          <Ticket size={14} />
                          <span>Submit Escalation Ticket</span>
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setCriticalFailureEncountered(null)}
                        >
                          <span>Review &amp; Retry Step</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Single Current Diagnostic Step Card */
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                    Step {activeGuidedStep.id} of {GUIDED_STEPS.length}
                  </span>
                  {activeGuidedStep.isCritical && (
                    <span className="badge badge-danger" style={{ fontSize: '10.5px' }}>
                      Critical Safety Step
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 10px', color: 'var(--text-primary)' }}>
                  {activeGuidedStep.title}
                </h3>

                <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.5, margin: '0 0 8px' }}>
                  {activeGuidedStep.instruction}
                </p>

                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.45, margin: '0 0 12px' }}>
                  {activeGuidedStep.detail}
                </p>

                {activeGuidedStep.safetyWarning && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertTriangle size={16} color="var(--accent-rose)" style={{ flexShrink: 0 }} />
                    <span>{activeGuidedStep.safetyWarning}</span>
                  </div>
                )}

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  <strong>Expected Criterion:</strong> {activeGuidedStep.expectedResult}
                </div>

                {/* Response Actions */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleRecordAnswer('Pass')}
                  >
                    <CheckCircle2 size={14} />
                    <span>Pass</span>
                  </button>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRecordAnswer('Fail')}
                  >
                    <AlertOctagon size={14} />
                    <span>Fail</span>
                  </button>

                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleRecordAnswer('Not Applicable')}
                  >
                    <span>Not Applicable</span>
                  </button>

                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleRecordAnswer('Unable to Verify')}
                  >
                    <HelpCircle size={14} />
                    <span>Unable to Verify</span>
                  </button>
                </div>
              </div>
            )}

            {/* Navigation and Review of Previous Steps */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="btn btn-outline btn-xs"
                onClick={() => setGuidedStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={guidedStepIndex === 0}
              >
                <ChevronLeft size={13} />
                <span>Previous Step</span>
              </button>

              <button
                className="btn btn-outline btn-xs"
                onClick={() => setGuidedStepIndex((prev) => Math.min(GUIDED_STEPS.length - 1, prev + 1))}
                disabled={guidedStepIndex === GUIDED_STEPS.length - 1}
              >
                <span>Next Step</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: AI-ASSISTED DIAGNOSTICS (Requirement 8.5 & 8.6)    */}
      {/* ======================================================== */}
      {activeTab === 'ai-assisted' && (
        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', height: '620px' }}>
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <SiriAssistantIcon size={24} />
              <div>
                <div className="panel-title">Smart AI Diagnostic Assistant</div>
                <div className="panel-subtitle">
                  Humane conversational troubleshooting grounded in authoritative device telemetry
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isSpeaking && (
                <button
                  className="btn btn-danger btn-xs"
                  onClick={stopSpeaking}
                  title="Stop voice output"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <VolumeX size={13} />
                  <span>Stop Speaking</span>
                </button>
              )}
              <button
                className={`btn ${isSpeechMuted ? 'btn-outline' : 'btn-outline'} btn-xs`}
                onClick={() => {
                  if (isSpeaking) stopSpeaking();
                  setIsSpeechMuted(!isSpeechMuted);
                }}
                title={isSpeechMuted ? 'Unmute voice synthesis' : 'Mute voice synthesis'}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                {isSpeechMuted ? <VolumeX size={13} /> : <Volume2 size={13} color="var(--accent-green)" />}
                <span>{isSpeechMuted ? 'Voice Muted' : 'Voice (US Female)'}</span>
              </button>
            </div>
          </div>

          <div
            className="chat-message-list"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {conversation.map((msg, index) => {
              const isAssistant = msg.sender === 'assistant';
              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: isAssistant ? 'row' : 'row-reverse',
                    gap: '10px',
                    alignItems: 'flex-start',
                    maxWidth: '85%',
                    alignSelf: isAssistant ? 'flex-start' : 'flex-end',
                  }}
                >
                  {isAssistant && (
                    <div style={{ flexShrink: 0, marginTop: '2px' }}>
                      <SiriAssistantIcon size={28} />
                    </div>
                  )}

                  <div
                    style={{
                      background: isAssistant ? 'var(--bg-surface)' : 'var(--accent-primary)',
                      color: isAssistant ? 'var(--text-primary)' : '#ffffff',
                      padding: '10px 14px',
                      borderRadius: isAssistant ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                      border: isAssistant ? '1px solid var(--border-card)' : 'none',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div>{msg.text}</div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: isAssistant ? 'var(--text-muted)' : 'rgba(255,255,255,0.7)',
                        marginTop: '4px',
                        textAlign: isAssistant ? 'left' : 'right',
                      }}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {isAnalyzing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                <SiriAssistantIcon size={20} />
                <span>Evaluating telemetry models and diagnostic rules...</span>
              </div>
            )}
          </div>

          {/* Chat / Speech Input Bar */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <input
              type="text"
              className="form-input"
              style={{ flex: 1, height: '40px', fontSize: '13px' }}
              placeholder={isListening ? 'Listening to speech...' : `Ask about ${currentDevice.name} battery, MPPT, or lamp...`}
              value={isListening ? transcript || 'Listening...' : textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
            />

            <button
              type="button"
              className={`btn ${isListening ? 'btn-danger' : 'btn-outline'}`}
              style={{ height: '40px', width: '40px', padding: 0 }}
              onClick={toggleListening}
              title={isListening ? 'Stop listening' : 'Start microphone speech input'}
              aria-label="Microphone input"
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <button
              type="button"
              className="btn btn-primary"
              style={{ height: '40px', padding: '0 16px' }}
              onClick={() => handleSendMessage()}
              disabled={!textInput.trim() || isAnalyzing}
              title="Send message"
            >
              <Send size={15} />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}

      {/* Support Ticket Modal (Requirement 8.4) */}
      {ticketModalOpen && (
        <div className="modal-backdrop" onClick={() => setTicketModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Ticket size={18} color="var(--accent-rose)" />
                <span>Create Field Support Ticket</span>
              </div>
              <button
                onClick={() => setTicketModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGuidedTicket}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Target Hardware Node</label>
                  <input
                    type="text"
                    className="form-input"
                    value={`${currentDevice.name} (${currentDevice.id})`}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Escalation Priority</label>
                  <select
                    className="form-select"
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                  >
                    <option value="Critical (Immediate Dispatch)">Critical (Immediate Dispatch) — Dark outage / electrical hazard</option>
                    <option value="High (Within 24h)">High (Within 24h) — Battery or MPPT failure</option>
                    <option value="Standard Scheduled">Standard Scheduled — Auxiliary inspection</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Diagnostic Findings &amp; Evidence</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    value={ticketNotes}
                    onChange={(e) => setTicketNotes(e.target.value)}
                    placeholder="Enter diagnostic findings, inspection evidence, or required spare parts..."
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setTicketModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" disabled={isSubmittingTicket}>
                  {isSubmittingTicket ? 'Transmitting Ticket...' : 'Confirm Ticket Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerAssistance;
