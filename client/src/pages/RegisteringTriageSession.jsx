import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import '../styles/triage-session.css';

export default function RegisteringTriageSession({ activePatient, isOnline, showToast }) {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [timeStr, setTimeStr] = useState('09:41');

    // Step 1: Patient Registered
    const [step1Complete, setStep1Complete] = useState(false);

    // Step 2: Preparing Triage
    const [step2Tasks, setStep2Tasks] = useState([
        { id: 'save', label: 'Saving Patient Record', done: false },
        { id: 'risk', label: 'Calculating Maternal Risk Factors', done: false },
        { id: 'triage', label: 'Creating Triage Package', done: false },
        { id: 'ultrasound', label: 'Initializing Ultrasound Session', done: false }
    ]);

    // Step 3: Probe Discovery
    const [step3Status, setStep3Status] = useState([
        { id: 'search', label: 'Looking for device...', done: false },
        { id: 'connection', label: 'Establishing secure connection...', done: false },
        { id: 'detected', label: 'Probe detected', done: false },
        { id: 'calibration', label: 'Calibration complete', done: false }
    ]);

    // Step 4: AI Calibration
    const [step4Modules, setStep4Modules] = useState([
        { id: 'vision', label: 'Computer Vision Guidance', done: false },
        { id: 'frame', label: 'Frame Selection Engine', done: false },
        { id: 'risk', label: 'Risk Assessment Model', done: false },
        { id: 'storage', label: 'Offline Storage Layer', done: false }
    ]);
    const [aiProgress, setAiProgress] = useState(0);

    // Step 5: Ready to Scan
    const [step5Complete, setStep5Complete] = useState(false);

    // Time tracker
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // STATE MACHINE FOR MULTI-STEP FLOW
    useEffect(() => {
        if (currentStep === 1) {
            // Show success for 1 second
            const timer = setTimeout(() => {
                setStep1Complete(true);
                setCurrentStep(2);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [currentStep]);

    // STEP 2: Preparing Triage (1-2 seconds)
    useEffect(() => {
        if (currentStep === 2) {
            const delays = [300, 600, 900, 1200];
            const timers = delays.map((delay, idx) =>
                setTimeout(() => {
                    setStep2Tasks(prev => {
                        const updated = [...prev];
                        updated[idx].done = true;
                        return updated;
                    });
                }, delay)
            );

            const nextStepTimer = setTimeout(() => {
                setCurrentStep(3);
            }, 1600);

            return () => {
                timers.forEach(t => clearTimeout(t));
                clearTimeout(nextStepTimer);
            };
        }
    }, [currentStep]);

    // STEP 3: Probe Discovery (2-3 seconds)
    useEffect(() => {
        if (currentStep === 3) {
            const delays = [400, 1000, 1600, 2200];
            const timers = delays.map((delay, idx) =>
                setTimeout(() => {
                    setStep3Status(prev => {
                        const updated = [...prev];
                        updated[idx].done = true;
                        return updated;
                    });
                }, delay)
            );

            const nextStepTimer = setTimeout(() => {
                setCurrentStep(4);
            }, 2800);

            return () => {
                timers.forEach(t => clearTimeout(t));
                clearTimeout(nextStepTimer);
            };
        }
    }, [currentStep]);

    // STEP 4: AI Calibration (1-2 seconds)
    useEffect(() => {
        if (currentStep === 4) {
            const delays = [200, 500, 800, 1100];
            const timers = delays.map((delay, idx) =>
                setTimeout(() => {
                    setStep4Modules(prev => {
                        const updated = [...prev];
                        updated[idx].done = true;
                        return updated;
                    });
                }, delay)
            );

            // Animate progress percentage
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 30;
                if (progress > 100) progress = 100;
                setAiProgress(Math.floor(progress));
                if (progress >= 100) clearInterval(progressInterval);
            }, 150);

            const nextStepTimer = setTimeout(() => {
                setCurrentStep(5);
            }, 1600);

            return () => {
                timers.forEach(t => clearTimeout(t));
                clearInterval(progressInterval);
                clearTimeout(nextStepTimer);
            };
        }
    }, [currentStep]);

    // STEP 5: Ready to Scan (show for 2 seconds, then navigate)
    useEffect(() => {
        if (currentStep === 5) {
            setTimeout(() => {
                setStep5Complete(true);
            }, 500);

            const navigationTimer = setTimeout(() => {
                navigate('/scan-simulator', {
                    state: { registeredPatient: activePatient }
                });
            }, 2500);

            return () => clearTimeout(navigationTimer);
        }
    }, [currentStep, navigate, activePatient]);

    const patientName = activePatient
        ? `${activePatient.firstName} ${activePatient.lastName}`
        : 'Patient';

    return (
        <div className="device-container">
            <div className="device-header-notch">
                <span>{timeStr}</span>
                <div className="notch-icons">
                    {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                </div>
            </div>
            <div className="app-viewport">
                <div className="triage-session-screen">

                    {/* STEP 1: Patient Registered */}
                    {currentStep === 1 && (
                        <div className="triage-step triage-step-1 fade-in">
                            <div className="step-content">
                                <div className="success-animation">
                                    <CheckCircle2 size={80} strokeWidth={1.5} />
                                </div>
                                <h1 className="step-title">Patient Registered</h1>
                                <div className="patient-card-minimal">
                                    <div className="patient-avatar">
                                        {patientName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="patient-info-minimal">
                                        <p className="patient-name">{patientName}</p>
                                        <p className="patient-id">
                                            {activePatient?.philhealth || 'ID: 7102-4481-9352'}
                                        </p>
                                        <p className="patient-location">
                                            {activePatient?.location || 'Langkas, Dalaguete, Cebu'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Preparing Triage Session */}
                    {currentStep === 2 && (
                        <div className="triage-step triage-step-2 fade-in">
                            <div className="step-content">
                                <div className="step-header">
                                    <div className="step-indicator">2</div>
                                    <h2 className="step-title">Preparing Triage Session</h2>
                                </div>
                                <div className="task-list">
                                    {step2Tasks.map((task, idx) => (
                                        <div key={task.id} className={`task-item ${task.done ? 'done' : ''}`}>
                                            <div className="task-check">
                                                {task.done && <CheckCircle2 size={20} />}
                                            </div>
                                            <div className="task-label">{task.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Probe Discovery */}
                    {currentStep === 3 && (
                        <div className="triage-step triage-step-3 fade-in">
                            <div className="step-content">
                                <div className="step-header">
                                    <div className="step-indicator">3</div>
                                    <h2 className="step-title">Searching for Connected Probe</h2>
                                </div>

                                <div className="probe-discovery">
                                    <div className="probe-animation">
                                        <div className="probe-illustration">
                                            <svg viewBox="0 0 100 100" className="probe-svg" style={{ width: '100%', height: '100%' }}>
                                                {/* Ultrasound Probe */}
                                                <rect x="35" y="10" width="30" height="60" rx="15" fill="none" stroke="#1bb2a4" strokeWidth="2.5" />
                                                <circle cx="50" cy="70" r="15" fill="none" stroke="#1bb2a4" strokeWidth="2.5" />
                                                {/* Scanning waves */}
                                                <circle cx="50" cy="70" r="20" fill="none" stroke="#1bb2a4" strokeWidth="1.2" opacity="0.6" className="wave wave-1" />
                                                <circle cx="50" cy="70" r="30" fill="none" stroke="#1bb2a4" strokeWidth="1.2" opacity="0.3" className="wave wave-2" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="status-list">
                                        {step3Status.map((status) => (
                                            <div key={status.id} className={`status-item ${status.done ? 'done' : ''}`}>
                                                <div className="status-indicator">
                                                    {status.done ? (
                                                        <CheckCircle2 size={18} />
                                                    ) : (
                                                        <div className="spinner-mini"></div>
                                                    )}
                                                </div>
                                                <div className="status-label">{status.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: AI Calibration */}
                    {currentStep === 4 && (
                        <div className="triage-step triage-step-4 fade-in">
                            <div className="step-content">
                                <div className="step-header">
                                    <div className="step-indicator">4</div>
                                    <h2 className="step-title">Kalinga AI Initializing</h2>
                                </div>

                                <div className="ai-calibration">
                                    <div className="modules-list">
                                        {step4Modules.map((module) => (
                                            <div key={module.id} className={`module-item ${module.done ? 'done' : ''}`}>
                                                <div className="module-check">
                                                    {module.done && <CheckCircle2 size={20} />}
                                                </div>
                                                <div className="module-label">{module.label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="progress-container">
                                        <div className="progress-bar-wrapper">
                                            <div className="progress-bar" style={{ width: `${aiProgress}%` }}></div>
                                        </div>
                                        <div className="progress-text">{aiProgress}%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 5: Ready to Scan */}
                    {currentStep === 5 && (
                        <div className={`triage-step triage-step-5 ${step5Complete ? 'success' : ''} fade-in`}>
                            <div className="step-content">
                                <div className="success-animation large">
                                    <div className="checkmark-icon">
                                        <CheckCircle2 size={100} strokeWidth={1} />
                                    </div>
                                </div>

                                <h1 className="step-title large">System Ready</h1>

                                <div className="ready-status-card">
                                    <div className="status-row">
                                        <span className="status-label">Patient:</span>
                                        <span className="status-value">{patientName}</span>
                                    </div>
                                    <div className="status-row">
                                        <span className="status-label">Mode:</span>
                                        <span className="status-value">Offline First</span>
                                    </div>
                                    <div className="status-row">
                                        <span className="status-label">Status:</span>
                                        <span className="status-value ready">Probe Connected</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
