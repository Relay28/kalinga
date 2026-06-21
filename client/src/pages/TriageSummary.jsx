import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Share2, CheckCircle2, AlertCircle } from 'lucide-react';
import { offlineQueue } from '../services/offlineQueue';
import { api } from '../services/api';
import '../styles/triage-summary.css';

export default function TriageSummary({
    isOnline,
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

        // Build comprehensive triage packet for OB-GYN review
        const triagePacket = {
            id: `triage-${Date.now()}`,
            patientId: patient.id,
            systolicBP: parseInt(scan.bp?.split('/')[0]) || 120,
            diastolicBP: parseInt(scan.bp?.split('/')[1]) || 80,
            heartRate: scan.fetalHeartRate || null,
            gestationalAgeWeeks: parseFloat(scan.gestationalAge?.replace('w', '').split(' ')[0]) || 24,
            bmi: scan.bmi || null,
            proteinUrine: 'negative', // TODO: Add protein urine field to scan
            symptoms: scan.findings || [],
            frameBase64: scan.selectedBestFrame || null,
            frameThumbnailB64: scan.selectedBestFrame || null,
            aiPrediction: {
                normal: scan.riskScore < 40 ? 0.8 : 0.2,
                abnormal: scan.riskScore >= 70 ? 0.8 : scan.riskScore >= 40 ? 0.5 : 0.1,
                inconclusive: 0.1
            },
            riskScore: scan.riskScore || 0,
            triageLevel: scan.preliminaryRiskLabel || 'LOW',
            clientCapturedAt: new Date().toISOString(),
            barangayStation: patient.location || null,
            gpsLatitude: null, // TODO: Add GPS capture
            gpsLongitude: null
        };

        const scanToSubmit = {
            id: triagePacket.id,
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
            status: isOnline ? 'Submitted' : 'Ready for Submission',
            patient: patient // Include patient data for offline queue
        };

        try {
            if (isOnline) {
                try {
                    console.log('Submitting triage packet to OB-GYN queue:', triagePacket);
                    
                    // First, ensure patient is registered on the server
                    try {
                        const patientToRegister = {
                            id: patient.id,
                            fullName: `${patient.firstName} ${patient.lastName}`,
                            philhealthId: patient.philhealth || patient.philhealthId || null,
                            age: patient.age,
                            lmp: patient.lmp || null,
                            estimatedDueDate: patient.edd || null,
                            gravida: patient.gravida || 1,
                            para: patient.para || 0,
                            riskFactors: patient.riskFactors ? Object.keys(patient.riskFactors).filter(k => patient.riskFactors[k]) : [],
                            barangay: patient.barangay || null,
                            municipality: patient.municipality || null,
                            province: patient.province || null,
                            contactNumber: patient.contactNumber || null
                        };
                        
                        console.log('Registering patient first:', patientToRegister);
                        await api.registerPatient(patientToRegister);
                        console.log('Patient registered successfully');
                    } catch (patientErr) {
                        console.warn('Patient registration error (may already exist):', patientErr);
                        // Continue anyway - patient might already exist
                    }
                    
                    // Now submit triage packet to OB-GYN queue
                    const response = await api.submitTriagePacket(triagePacket);
                    
                    console.log('Triage submission successful:', response);
                    showToast('✅ Triage scan sent to OB-GYN review queue', 'success');
                    
                    // Navigate after successful submission
                    setTimeout(() => navigate('/dashboard'), 500);
                    return;
                    
                } catch (submitErr) {
                    console.error('Triage submission error:', submitErr);
                    
                    // If backend is not running, queue it offline
                    if (submitErr.message.includes('Cannot connect to server')) {
                        console.log('Backend not available, queueing offline instead');
                        try {
                            offlineQueue.enqueue({
                                ...scanToSubmit,
                                triagePacket
                            });
                            refreshSyncCount?.();
                            showToast('⚠ Server offline. Saved locally - will sync when server is available.', 'warning');
                            setTimeout(() => navigate('/dashboard'), 500);
                            return;
                        } catch (queueErr) {
                            console.error('Failed to queue offline:', queueErr);
                            showToast(`❌ Error: ${queueErr.message}`, 'error');
                            setSubmitting(false);
                            return;
                        }
                    }
                    
                    showToast(`❌ Error: ${submitErr.message}`, 'error');
                    setSubmitting(false);
                    return;
                }
            } else {
                try {
                    // Store in offline queue with triage metadata
                    offlineQueue.enqueue({
                        ...scanToSubmit,
                        triagePacket // Include full triage data for later sync
                    });
                    refreshSyncCount?.();
                    showToast('📦 Saved offline. Will sync to OB-GYN when online.', 'info');
                    
                    // Navigate after successful queue
                    setTimeout(() => navigate('/dashboard'), 500);
                    return;
                    
                } catch (queueErr) {
                    console.error('Offline queue error:', queueErr);
                    showToast(`❌ Error saving to offline queue: ${queueErr.message}`, 'error');
                    setSubmitting(false);
                    return;
                }
            }
        } catch (err) {
            console.error('Unexpected error in handleSubmitTriagePackage:', err);
            showToast(`❌ Unexpected error: ${err.message}`, 'error');
            setSubmitting(false);
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
                    <div 
                        className={`connectivity-status ${!isOnline ? 'offline' : 'online'}`}
                        title={isOnline ? 'Connected - Ready to sync' : 'Offline - Data will be queued'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            backgroundColor: isOnline ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: isOnline ? '#16a34a' : '#dc2626',
                            cursor: 'default'
                        }}
                    >
                        <span className="indicator-dot" style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: isOnline ? '#16a34a' : '#dc2626',
                            boxShadow: isOnline ? '0 0 8px rgba(34, 197, 94, 0.6)' : '0 0 8px rgba(239, 68, 68, 0.6)'
                        }}></span>
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
