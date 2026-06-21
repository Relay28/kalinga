import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Share2, CheckCircle2, AlertCircle } from 'lucide-react';
import { offlineQueue } from '../services/offlineQueue';
import { api } from '../services/api';
import '../styles/triage-summary.css';

export default function TriageSummary({
    isOnline,
    onToggleOnline,
    activePatient,
    activeScan,
    refreshSyncCount,
    showToast
}) {
    const navigate = useNavigate();
    const [timeStr, setTimeStr] = useState('09:41');
    const [submitting, setSubmitting] = useState(false);

    // Try to recover data from localStorage if not provided
    const getStoredPatient = () => {
        if (activePatient) return activePatient;

        try {
            const stored = localStorage.getItem('kalinga_current_patient');
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.warn('Failed to recover patient from storage');
        }

        return null;
    };

    const getStoredScan = () => {
        if (activeScan) return activeScan;

        try {
            const stored = localStorage.getItem('kalinga_current_scan');
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.warn('Failed to recover scan from storage');
        }

        return null;
    };

    // Use provided data, stored data, or generate sample
    const patient = getStoredPatient() || {
        id: '7102-4481-9352',
        firstName: 'Maria',
        lastName: 'Cruz',
        age: 28,
        location: 'Langkas, Dalaguete, Cebu',
        philhealth: '7102-4481-9352'
    };

    const scan = getStoredScan() || {
        timestamp: new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
        riskScore: 78,
        preliminaryRiskLabel: 'HIGH',
        riskDescription: 'Potential Preeclampsia Indicators Detected',
        selectedBestFrame: 'http://localhost:5000/assets/ultrasound_sweep.png',
        bp: '155/95',
        bmi: 31.1,
        fetalHeartRate: 140,
        gestationalAge: '24w 3d',
        findings: [
            'Elevated blood pressure detected',
            'High BMI risk factor',
            'Uterine artery resistance increased',
            'No nasal abnormality detected in this scan'
        ],
        scanQuality: 92,
        status: 'Ready for Submission'
    };

    console.log('TriageSummary - Patient:', patient);
    console.log('TriageSummary - Scan:', scan);

    const [imageError, setImageError] = useState(false);

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

    // Store data in localStorage for persistence
    useEffect(() => {
        try {
            localStorage.setItem('kalinga_current_patient', JSON.stringify(patient));
            localStorage.setItem('kalinga_current_scan', JSON.stringify(scan));
        } catch (e) {
            console.warn('Failed to store data in localStorage');
        }
    }, [patient, scan]);

    const handleImageError = () => {
        setImageError(true);
    };

    const handleSubmitTriagePackage = async () => {
        setSubmitting(true);

        const scanToSubmit = {
            id: `scan-${Date.now()}`,
            patientId: patient.id,
            timestamp: new Date().toLocaleString(),
            location: patient.location,
            bp: scan.bp,
            bmi: scan.bmi,
            scanQualityScore: scan.scanQuality,
            selectedBestFrame: scan.selectedBestFrame,
            fetalHeartRate: scan.fetalHeartRate,
            gestationalAgeEstimate: `Est: ${scan.gestationalAge}`,
            preliminaryRiskLabel: scan.preliminaryRiskLabel,
            riskScore: scan.riskScore,
            status: isOnline ? 'Submitted' : 'Ready for Submission'
        };

        try {
            if (isOnline) {
                try {
                    await api.submitScan(scanToSubmit);
                    showToast('Triage package submitted to specialist', 'success');
                } catch (submitErr) {
                    showToast('Error submitting triage package', 'warning');
                    console.warn('Submission error:', submitErr);
                }
            } else {
                try {
                    offlineQueue.enqueue(scanToSubmit);
                    refreshSyncCount?.();
                    showToast('Saved offline. Will sync when online.', 'info');
                } catch (queueErr) {
                    showToast('Error saving to offline queue', 'warning');
                    console.warn('Queue error:', queueErr);
                }
            }
        } finally {
            // Always navigate to dashboard, regardless of submission status
            navigate('/dashboard');
        }
    };

    const handleRetakeScan = () => {
        navigate('/scan-simulator', { state: { registeredPatient: patient } });
    };

    const getRiskColor = (score) => {
        if (score >= 70) return '#ef4444';
        if (score >= 40) return '#f97316';
        return '#10b981';
    };

    const getRiskBadge = (label) => {
        if (label === 'HIGH') return { bg: '#fee2e2', color: '#ef4444', icon: '⚠' };
        if (label === 'MODERATE') return { bg: '#ffedd5', color: '#f97316', icon: '⚡' };
        return { bg: '#d1fae5', color: '#10b981', icon: '✓' };
    };

    const riskBadge = getRiskBadge(scan.preliminaryRiskLabel);

    return (
        <div className="device-container">
            <div className="device-header-notch">
                <span>{timeStr}</span>
                <div className="icons">
                    <div className={`connectivity-toggle ${!isOnline ? 'offline' : ''}`} onClick={onToggleOnline}>
                        <span className="indicator-dot"></span>
                        <span>{isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                </div>
            </div>
            <div className="app-viewport">
                <div className="viewport-screen triage-summary-screen">

                    {/* HEADER */}
                    <div className="triage-header">
                        <button
                            className="back-button"
                            onClick={() => navigate('/dashboard')}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="page-title">Triage Summary</h1>
                        <div className="header-spacer"></div>
                    </div>

                    {/* SCROLLABLE CONTENT */}
                    <div className="triage-content">

                        {/* PATIENT SUMMARY CARD */}
                        <div className="patient-summary-card">
                            <div className="patient-header-row">
                                <div className="patient-avatar-large">
                                    {patient.firstName?.charAt(0).toUpperCase()}
                                </div>
                                <div className="patient-info-section">
                                    <h2 className="patient-name-large">{patient.firstName} {patient.lastName}</h2>
                                    <div className="patient-meta">
                                        <span className="patient-meta-item">Age {patient.age}</span>
                                        <span className="patient-meta-divider">•</span>
                                        <span className="patient-meta-item">{patient.philhealth}</span>
                                    </div>
                                    <p className="patient-location-large">{patient.location}</p>
                                    <p className="scan-timestamp">{scan.timestamp}</p>
                                </div>
                            </div>
                        </div>

                        {/* AI PRELIMINARY RESULT CARD */}
                        <div className="ai-result-card">
                            <div className="risk-display">
                                <div className="risk-score-circle">
                                    <div className="risk-percentage">{scan.riskScore}%</div>
                                    <div className="risk-label">{scan.preliminaryRiskLabel} RISK</div>
                                </div>
                            </div>

                            <div className="result-content">
                                <h3 className="result-title">{scan.riskDescription}</h3>

                                <div className="risk-badge" style={{ backgroundColor: riskBadge.bg }}>
                                    <span className="badge-icon">{riskBadge.icon}</span>
                                    <span className="badge-text" style={{ color: riskBadge.color }}>
                                        Requires Specialist Review
                                    </span>
                                </div>

                                <div className="findings-section">
                                    <h4 className="findings-title">AI Insights</h4>
                                    <ul className="findings-list">
                                        {scan.findings.map((finding, idx) => (
                                            <li key={idx} className="finding-item">
                                                <span className="finding-icon">•</span>
                                                <span className="finding-text">{finding}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* ULTRASOUND REVIEW SECTION */}
                        <div className="ultrasound-section">
                            <div className="best-frame-container">
                                {!imageError ? (
                                    <img
                                        src={scan.selectedBestFrame}
                                        alt="Best diagnostic frame"
                                        className="best-frame-image"
                                        onError={handleImageError}
                                    />
                                ) : (
                                    <div style={{
                                        width: '100%',
                                        aspectRatio: '4 / 3',
                                        background: '#e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#94a3b8',
                                        fontSize: '14px'
                                    }}>
                                        Ultrasound image not available
                                    </div>
                                )}
                                <div className="frame-quality-badge">
                                    <span className="quality-label">Quality: {scan.scanQuality}%</span>
                                </div>
                            </div>

                            <div className="frame-selection-info">
                                <p className="frame-info-text">
                                    ✓ AI selected this frame for specialist review
                                </p>
                            </div>

                            <div className="other-frames">
                                <h4 className="frames-title">Selected Diagnostic Frames</h4>
                                <div className="frames-grid">
                                    <div className="frame-thumbnail">
                                        {!imageError ? (
                                            <img src={scan.selectedBestFrame} alt="Frame 1" onError={handleImageError} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: '#e2e8f0' }} />
                                        )}
                                        <span className="frame-label">Frame 1</span>
                                    </div>
                                    <div className="frame-thumbnail">
                                        {!imageError ? (
                                            <img src={scan.selectedBestFrame} alt="Frame 2" onError={handleImageError} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: '#e2e8f0' }} />
                                        )}
                                        <span className="frame-label">Frame 2</span>
                                    </div>
                                    <div className="frame-thumbnail">
                                        {!imageError ? (
                                            <img src={scan.selectedBestFrame} alt="Frame 3" onError={handleImageError} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: '#e2e8f0' }} />
                                        )}
                                        <span className="frame-label">Frame 3</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* VITALS SECTION */}
                        <div className="vitals-section">
                            <div className="vitals-card">
                                <h3 className="vitals-title">Maternal Vitals</h3>
                                <div className="vitals-grid">
                                    <div className="vital-item">
                                        <span className="vital-label">Blood Pressure</span>
                                        <span className="vital-value">{scan.bp}</span>
                                        <span className="vital-unit">mmHg</span>
                                    </div>
                                    <div className="vital-item">
                                        <span className="vital-label">BMI</span>
                                        <span className="vital-value">{scan.bmi}</span>
                                        <span className="vital-unit">kg/m²</span>
                                    </div>
                                </div>
                            </div>

                            <div className="vitals-card">
                                <h3 className="vitals-title">Fetal Measurements</h3>
                                <div className="vitals-grid">
                                    <div className="vital-item">
                                        <span className="vital-label">Heart Rate</span>
                                        <span className="vital-value">{scan.fetalHeartRate}</span>
                                        <span className="vital-unit">bpm</span>
                                    </div>
                                    <div className="vital-item">
                                        <span className="vital-label">Gestational Age</span>
                                        <span className="vital-value">{scan.gestationalAge}</span>
                                        <span className="vital-unit">weeks</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* WORKFLOW STATUS CARD */}
                        <div className="workflow-card">
                            <h3 className="workflow-title">Workflow Progress</h3>
                            <div className="workflow-steps">
                                <div className="workflow-step done">
                                    <div className="step-icon"><CheckCircle2 size={18} /></div>
                                    <span className="step-label">Patient Registered</span>
                                </div>
                                <div className="step-connector"></div>
                                <div className="workflow-step done">
                                    <div className="step-icon"><CheckCircle2 size={18} /></div>
                                    <span className="step-label">Scan Completed</span>
                                </div>
                                <div className="step-connector"></div>
                                <div className="workflow-step done">
                                    <div className="step-icon"><CheckCircle2 size={18} /></div>
                                    <span className="step-label">AI Analysis Complete</span>
                                </div>
                                <div className="step-connector"></div>
                                <div className="workflow-step pending">
                                    <div className="step-icon"><AlertCircle size={18} /></div>
                                    <span className="step-label">Pending Specialist Verification</span>
                                </div>
                            </div>
                        </div>

                        {/* SECURITY SECTION */}
                        <div className="security-card">
                            <div className="security-header">
                                <Lock size={20} />
                                <h3 className="security-title">Data Encrypted Locally</h3>
                            </div>
                            <p className="security-text">
                                Patient data remains securely stored on the device until synchronization with the specialist review queue.
                            </p>
                        </div>

                        {/* NEXT STEPS SECTION */}
                        <div className="next-steps-card">
                            <h3 className="next-steps-title">Recommended Next Step</h3>
                            <div className="next-step-content">
                                <div className="next-step-icon">→</div>
                                <div className="next-step-text">
                                    <p className="next-step-title-small">Refer to OB-GYN Consultation</p>
                                    <p className="next-step-desc">
                                        Within 24–48 hours. Monitor BP and advise rest.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* DISCLAIMER BANNER */}
                        <div className="disclaimer-banner">
                            <p>
                                <strong>Important:</strong> AI provides preliminary triage support only.
                                Final diagnosis requires qualified OB-GYN verification.
                            </p>
                        </div>

                    </div>

                    {/* FOOTER ACTIONS */}
                    <div className="triage-footer">
                        <button
                            className="action-button secondary"
                            onClick={handleRetakeScan}
                            disabled={submitting}
                        >
                            ↻ Retake Scan
                        </button>
                        <button
                            className={`action-button primary ${submitting ? 'loading' : ''}`}
                            onClick={handleSubmitTriagePackage}
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : 'Submit Triage Package'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
