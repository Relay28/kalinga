import React, { useState, useEffect, useRef } from 'react';
import { 
  UserPlus, 
  Search, 
  Camera, 
  Database, 
  Wifi,
  WifiOff, 
  RefreshCw, 
  ArrowRight,
  Users,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

import { v4 as uuidv4 } from 'uuid';
import { 
  savePatient, 
  saveTriagePacket, 
  getAllPatients, 
  getPendingSyncPackets,
  clearAllLocalData,
  type Patient,
  type TriagePacket
} from '../utils/db';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface MidwifePortalProps {
  isOnline: boolean;
  onSyncTrigger: () => Promise<void>;
}

export default function MidwifePortal({ isOnline, onSyncTrigger }: MidwifePortalProps) {
  // Navigation: 'patients' | 'intake' | 'upload' | 'sync' | 'results'
  const [activeTab, setActiveTab] = useState<'patients' | 'intake' | 'upload' | 'sync' | 'results'>('patients');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Roster selected patient for immediate scan
  const [activePatient, setActivePatient] = useState<Patient | null>(null);

  // Intake Form states
  const [fullName, setFullName] = useState('');
  const [philhealthId, setPhilhealthId] = useState('');
  const [age, setAge] = useState(25);
  const [lmp, setLmp] = useState('');
  const [estimatedDueDate, setEstimatedDueDate] = useState('');
  const [gravida, setGravida] = useState(1);
  const [para, setPara] = useState(0);
  const [systolicBP, setSystolicBP] = useState(120);
  const [diastolicBP, setDiastolicBP] = useState(80);
  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState(24);
  const [weightKg, setWeightKg] = useState(60);
  const [heightCm, setHeightCm] = useState(155);
  const [proteinUrine, setProteinUrine] = useState<'negative' | 'trace' | '+1' | '+2' | '+3' | '+4'>('negative');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [barangay, setBarangay] = useState('Guinsaugon');
  const contactNumber = '';

  // Upload/Camera States
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Results state
  const [scanResult, setScanResult] = useState<TriagePacket | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load patient list and sync stats
  const loadData = async () => {
    try {
      // If we are online, trigger sync to pull remote registered patients
      if (isOnline) {
        try {
          await onSyncTrigger();
        } catch (syncErr) {
          console.error('[Kalinga] Sync run failed in loadData:', syncErr);
        }
      }

      const allPatients = await getAllPatients();
      const pending = await getPendingSyncPackets();
      setPatients(allPatients);
      setPendingSyncCount(pending.length);
    } catch (err) {
      console.error('Failed to load local DB data:', err);
    }
  };

  // Check if we need a one-time database reset to clean up mock/stale data
  useEffect(() => {
    const dbResetKey = 'kalinga_db_reset_v1';
    if (!localStorage.getItem(dbResetKey)) {
      const reset = async () => {
        try {
          await clearAllLocalData();
          localStorage.setItem(dbResetKey, 'true');
          console.log('[Kalinga] Mock/stale local data cleared successfully.');
          loadData();
        } catch (err) {
          console.error('[Kalinga] Failed to clear local mock data:', err);
        }
      };
      reset();
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Auto-calculate EDD from LMP
  useEffect(() => {
    if (lmp) {
      const lmpDate = new Date(lmp);
      const eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
      setEstimatedDueDate(eddDate.toISOString().split('T')[0]);
    }
  }, [lmp]);

  // Auto-trigger sync on launch / return to roster
  useEffect(() => {
    if (activeTab === 'patients' && isOnline && pendingSyncCount > 0) {
      handleManualSync();
    }
  }, [activeTab, isOnline, pendingSyncCount]);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await onSyncTrigger();
      await loadData();
    } catch (err) {
      console.error('Manual sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) return;

    const newPatient: Patient = {
      id: uuidv4(),
      fullName,
      philhealthId: philhealthId || null,
      age,
      lmp: lmp || null,
      estimatedDueDate: estimatedDueDate || null,
      gravida,
      para,
      riskFactors: symptoms,
      barangay,
      municipality: 'Saint Bernard',
      province: 'Southern Leyte',
      contactNumber: contactNumber || null,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    await savePatient(newPatient);

    if (isOnline) {
      try {
        const token = localStorage.getItem('kalinga_auth_token') || 'mock-jwt-token';
        const res = await fetch(`${API_URL}/api/patients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify([newPatient])
        });
        if (res.ok) {
          newPatient.syncStatus = 'synced';
          await savePatient(newPatient);
        }
      } catch (err) {
        console.error('Failed to immediately sync registered patient:', err);
      }
    }

    setActivePatient(newPatient);
    setSelectedImage(null);
    setUploadError(null);
    setActiveTab('upload');
  };

  // Process selected file (Base64 conversion)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Invalid file type. Please upload an image.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedImage(event.target.result as string);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveResult = async () => {
    if (!scanResult) return;
    await saveTriagePacket(scanResult);
    
    // Clear states
    setSelectedImage(null);
    setActivePatient(null);
    setScanResult(null);
    
    // Refresh and go back to roster
    await loadData();
    setActiveTab('patients');
  };

  const executeInferenceAndTriage = async () => {
    if (!activePatient || !selectedImage) return;
    setIsProcessing(true);

    const heightM = heightCm / 100;
    const calculatedBmi = weightKg / (heightM * heightM);
    const roundedBmi = parseFloat(calculatedBmi.toFixed(1));

    // Fetch coordinates
    let gpsLat = 10.1172; 
    let gpsLng = 125.0411;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          gpsLat = position.coords.latitude;
          gpsLng = position.coords.longitude;
        },
        (err) => console.log('Geolocation disabled/denied:', err)
      );
    }

    // Packet to save locally (IndexedDB)
    const packet: TriagePacket = {
      id: uuidv4(),
      patientId: activePatient.id,
      systolicBP,
      diastolicBP,
      heartRate: 72,
      gestationalAgeWeeks,
      bmi: roundedBmi,
      proteinUrine,
      symptoms,
      frameBase64: selectedImage,
      frameThumbnailB64: selectedImage,
      aiPrediction: null, // Computed server-side upon sync
      aiInferenceTimeMs: null,
      riskScore: null,
      triageLevel: null,
      clientCapturedAt: new Date().toISOString(),
      barangayStation: `Barangay ${barangay} Health Center`,
      gpsLatitude: gpsLat,
      gpsLongitude: gpsLng,
      syncStatus: 'pending'
    };

    setScanResult(packet);
    setIsProcessing(false);
    setActiveTab('results');
  };

  const filteredPatients = patients.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mobile-app-wrapper">
      {/* Premium Dark Glassmorphic Phone Screen Mockup */}
      <div className="phone-screen">
        
        {/* Status Bar Mockup */}
        <div className="phone-status-bar">
          <span className="status-bar-time">09:41 AM</span>
          <div className="status-bar-icons">
            {isOnline ? <Wifi size={14} className="text-teal" /> : <WifiOff size={14} className="text-orange" />}
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>5G</span>
            <span style={{ fontSize: '0.75rem' }}>🔋 100%</span>
          </div>
        </div>

        {/* Screen Header */}
        <div className="phone-header">
          <div className="header-brand">
            <span className="brand-dot"></span>
            <h2>Kalinga Mobile</h2>
          </div>
          <div className="header-sync-status">
            {pendingSyncCount > 0 ? (
              <span className="sync-badge-alert" onClick={() => setActiveTab('sync')}>
                <Clock size={12} /> {pendingSyncCount} cached
              </span>
            ) : (
              <span className="sync-badge-clean">
                <CheckCircle size={12} /> Sync'd
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Screen Content */}
        <div className="phone-content">
          
          {/* TAB 1: PATIENTS LIST (ROSTER) */}
          {activeTab === 'patients' && (
            <div className="screen-section fade-in">
              <div className="section-title-wrapper">
                <h3>Maternal Roster</h3>
                <button className="add-fab" onClick={() => {
                  setActivePatient(null);
                  setActiveTab('intake');
                }}>
                  <UserPlus size={18} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="Search registered patients..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <Search size={16} className="search-icon" />
              </div>

              {/* Patients Cards List */}
              <div className="patient-list-container">
                {filteredPatients.length === 0 ? (
                  <div className="empty-state">
                    <Database size={40} className="text-muted" style={{ marginBottom: '10px' }} />
                    <p>No patient records in local cache.</p>
                    <button className="btn btn-primary" style={{ marginTop: '12px', width: 'auto' }} onClick={() => setActiveTab('intake')}>
                      Add Patient
                    </button>
                  </div>
                ) : (
                  filteredPatients.map(p => (
                    <div key={p.id} className={`patient-card ${activePatient?.id === p.id ? 'active' : ''}`} onClick={() => setActivePatient(p)}>
                      <div className="patient-card-header">
                        <h4>{p.fullName}</h4>
                        <span className="patient-age">{p.age} y/o</span>
                      </div>
                      <div className="patient-card-body">
                        <p><span>ID:</span> {p.philhealthId || 'No PhilHealth'}</p>
                        <p><span>Gravida/Para:</span> G{p.gravida} P{p.para}</p>
                        <p><span>EDD:</span> {p.estimatedDueDate ? new Date(p.estimatedDueDate).toLocaleDateString() : 'LMP Pending'}</p>
                      </div>
                      
                      {activePatient?.id === p.id && (
                        <div className="patient-card-action">
                          <button className="btn btn-primary btn-sm" onClick={() => {
                            setSelectedImage(null);
                            setUploadError(null);
                            setActiveTab('upload');
                          }}>
                            <Camera size={14} /> Upload Ultrasound Photo
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: REGISTER NEW INTAKE */}
          {activeTab === 'intake' && (
            <div className="screen-section fade-in">
              <h3>Patient Intake & Vitals</h3>
              <form onSubmit={handleRegisterPatient} className="mobile-form">
                
                <div className="input-group-mobile">
                  <label>Full Name *</label>
                  <input required type="text" placeholder="Maria Dela Cruz" value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>

                <div className="input-group-mobile">
                  <label>PhilHealth ID</label>
                  <input type="text" placeholder="12-digit number" value={philhealthId} onChange={e => setPhilhealthId(e.target.value)} />
                </div>

                <div className="row-inputs">
                  <div className="input-group-mobile">
                    <label>Age (y/o) *</label>
                    <input required type="number" min={12} max={60} value={age} onChange={e => setAge(parseInt(e.target.value) || 25)} />
                  </div>
                  <div className="input-group-mobile">
                    <label>Gestational Age (Wks) *</label>
                    <input required type="number" min={4} max={44} value={gestationalAgeWeeks} onChange={e => setGestationalAgeWeeks(parseInt(e.target.value) || 24)} />
                  </div>
                </div>

                <div className="input-group-mobile">
                  <label>Last Menstrual Period (LMP)</label>
                  <input type="date" value={lmp} onChange={e => setLmp(e.target.value)} />
                </div>

                <div className="row-inputs">
                  <div className="input-group-mobile">
                    <label>Gravida</label>
                    <input type="number" min={1} value={gravida} onChange={e => setGravida(parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="input-group-mobile">
                    <label>Para</label>
                    <input type="number" min={0} value={para} onChange={e => setPara(parseInt(e.target.value) || 0)} />
                  </div>
                </div>

                <div className="row-inputs">
                  <div className="input-group-mobile">
                    <label>Systolic BP *</label>
                    <input required type="number" min={60} max={300} value={systolicBP} onChange={e => setSystolicBP(parseInt(e.target.value) || 120)} />
                  </div>
                  <div className="input-group-mobile">
                    <label>Diastolic BP *</label>
                    <input required type="number" min={30} max={200} value={diastolicBP} onChange={e => setDiastolicBP(parseInt(e.target.value) || 80)} />
                  </div>
                </div>

                <div className="row-inputs">
                  <div className="input-group-mobile">
                    <label>Weight (kg)</label>
                    <input type="number" min={30} max={200} value={weightKg} onChange={e => setWeightKg(parseInt(e.target.value) || 60)} />
                  </div>
                  <div className="input-group-mobile">
                    <label>Height (cm)</label>
                    <input type="number" min={100} max={220} value={heightCm} onChange={e => setHeightCm(parseInt(e.target.value) || 155)} />
                  </div>
                </div>

                <div className="input-group-mobile">
                  <label>Urine Protein *</label>
                  <select value={proteinUrine} onChange={e => setProteinUrine(e.target.value as any)}>
                    <option value="negative">Negative</option>
                    <option value="trace">Trace</option>
                    <option value="+1">+1</option>
                    <option value="+2">+2</option>
                    <option value="+3">+3</option>
                    <option value="+4">+4</option>
                  </select>
                </div>

                <div className="input-group-mobile">
                  <label>Barangay Station *</label>
                  <input required type="text" value={barangay} onChange={e => setBarangay(e.target.value)} />
                </div>

                <div className="input-group-mobile">
                  <label>Symptoms / Active Indicators</label>
                  <div className="checkbox-grid">
                    <label className="checkbox-label">
                      <input type="checkbox" checked={symptoms.includes('headache')} onChange={e => {
                        if (e.target.checked) setSymptoms([...symptoms, 'headache']);
                        else setSymptoms(symptoms.filter(s => s !== 'headache'));
                      }} /> Severe Headache
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" checked={symptoms.includes('edema')} onChange={e => {
                        if (e.target.checked) setSymptoms([...symptoms, 'edema']);
                        else setSymptoms(symptoms.filter(s => s !== 'edema'));
                      }} /> Severe Edema (Swelling)
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" checked={symptoms.includes('visual_disturbances')} onChange={e => {
                        if (e.target.checked) setSymptoms([...symptoms, 'visual_disturbances']);
                        else setSymptoms(symptoms.filter(s => s !== 'visual_disturbances'));
                      }} /> Visual Disturbances
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" checked={symptoms.includes('epigastric_pain')} onChange={e => {
                        if (e.target.checked) setSymptoms([...symptoms, 'epigastric_pain']);
                        else setSymptoms(symptoms.filter(s => s !== 'epigastric_pain'));
                      }} /> Upper Abdomen Pain
                    </label>
                  </div>
                </div>

                <div className="consent-box-mobile">
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    NPC Advisory 2024.12.19 Consent
                  </h4>
                  <label className="checkbox-label" style={{ fontSize: '0.75rem', alignItems: 'flex-start' }}>
                    <input required type="checkbox" />
                    <span>Informed verbal consent obtained from patient in their local dialect.</span>
                  </label>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                  Proceed to Photo Upload <ArrowRight size={16} />
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: UPLOAD & SNAP SCAN PHOTO */}
          {activeTab === 'upload' && (
            <div className="screen-section fade-in">
              <h3>Upload Ultrasound</h3>
              
              {!activePatient ? (
                <div className="empty-state">
                  <Database size={40} className="text-muted" style={{ marginBottom: '10px' }} />
                  <p>Please select a patient first from the Maternal Roster tab.</p>
                  <button className="btn btn-secondary" style={{ marginTop: '10px' }} onClick={() => setActiveTab('patients')}>
                    Open Roster
                  </button>
                </div>
              ) : (
                <div className="upload-workspace">
                  <div className="active-patient-header">
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>PATIENT INTAKE ACTIVE</p>
                    <h4>{activePatient.fullName}</h4>
                    <p style={{ fontSize: '0.85rem' }}>BP: {systolicBP}/{diastolicBP} mmHg | GA: {gestationalAgeWeeks} Weeks</p>
                  </div>

                  {/* Hidden Inputs for File Picker and Native Camera Snapping */}
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }} 
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    ref={cameraInputRef} 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }} 
                  />

                  {selectedImage ? (
                    <div className="scan-preview-box">
                      <div className="preview-container">
                        <img src={selectedImage} alt="Ultrasound preview" />
                        <div className="overlay-guidance">
                          <span>Ultrasound Frame Ready</span>
                        </div>
                      </div>
                      
                      <div className="preview-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedImage(null)}>
                          Remove
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={executeInferenceAndTriage} disabled={isProcessing}>
                          {isProcessing ? 'Processing...' : 'Run Triage Assessment'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="upload-button-wrapper">
                      {uploadError && <p className="error-text">⚠️ {uploadError}</p>}
                      
                      <div className="upload-buttons-container">
                        <button className="upload-btn-card camera-card" onClick={() => cameraInputRef.current?.click()}>
                          <Camera size={32} className="card-icon" />
                          <span>Snap Photo</span>
                          <p>Use phone camera to photograph scan printout</p>
                        </button>

                        <button className="upload-btn-card gallery-card" onClick={() => fileInputRef.current?.click()}>
                          <Upload size={32} className="card-icon" />
                          <span>Upload File</span>
                          <p>Choose existing image file from gallery</p>
                        </button>
                      </div>
                      
                      <div className="disclaimer-mini">
                        <AlertCircle size={12} />
                        <span>Ensure the picture is clear, focused, and taken in well-lit conditions. Avoid capturing borders/shadows.</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TRIAGE RESULTS SUMMARY */}
          {activeTab === 'results' && scanResult && activePatient && (
            <div className="screen-section fade-in">
              <h3 style={{ textAlign: 'center', color: 'var(--color-primary)' }}>Assessment Saved</h3>
              
              <div className="results-success-banner">
                <CheckCircle size={32} className="text-teal" style={{ marginBottom: '8px' }} />
                <h4>Local Cache Saved</h4>
                <p>The patient record and ultrasound scan photo have been saved to local IndexedDB.</p>
              </div>

              <div className="details-card-mobile">
                <div className="details-header">
                  <span>PATIENT ASSESSED</span>
                  <strong>{activePatient.fullName}</strong>
                </div>

                <div className="vitals-row">
                  <div className="vital-item">
                    <span>Blood Pressure</span>
                    <strong>{scanResult.systolicBP}/{scanResult.diastolicBP} mmHg</strong>
                  </div>
                  <div className="vital-item">
                    <span>Gestational Age</span>
                    <strong>{scanResult.gestationalAgeWeeks} Wks</strong>
                  </div>
                </div>

                <div className="vitals-row" style={{ marginTop: '10px' }}>
                  <div className="vital-item">
                    <span>Urine Protein</span>
                    <strong>{scanResult.proteinUrine}</strong>
                  </div>
                  <div className="vital-item">
                    <span>Maternal BMI</span>
                    <strong>{scanResult.bmi}</strong>
                  </div>
                </div>

                {scanResult.frameBase64 && (
                  <div className="report-image-preview">
                    <span>ULTRASOUND PHOTO</span>
                    <img src={scanResult.frameBase64} alt="ultrasound photo" />
                  </div>
                )}
              </div>

              <div className="sync-tip-box">
                <Database size={16} />
                <span>This record will sync to the OB-GYN verification queue as soon as internet connection is detected.</span>
              </div>

              <button className="btn btn-primary" onClick={handleSaveResult} style={{ marginTop: '16px' }}>
                Done, Back to Roster
              </button>
            </div>
          )}

          {/* TAB 4: OFFLINE SYNC LEDGER */}
          {activeTab === 'sync' && (
            <div className="screen-section fade-in">
              <h3>Sync Dashboard</h3>
              
              <div className="sync-overview-card">
                <div className="sync-gauge">
                  <Database size={24} className={isSyncing ? "text-teal animate-spin" : "text-teal"} />
                  <div className="sync-numbers">
                    <strong>{pendingSyncCount} Records</strong>
                    <span>Pending Cloud Sync</span>
                  </div>
                </div>
                
                <button 
                  className="btn btn-primary" 
                  onClick={handleManualSync} 
                  disabled={isSyncing || pendingSyncCount === 0}
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                  {isSyncing ? "Syncing..." : "Sync Database Now"}
                </button>
              </div>

              <div className="connection-status-box">
                {isOnline ? (
                  <div className="online-box">
                    <Wifi size={16} className="text-low" />
                    <span>Device is <strong>Online</strong>. Sync engine is active.</span>
                  </div>
                ) : (
                  <div className="offline-box">
                    <WifiOff size={16} className="text-orange" />
                    <span>Device is <strong>Offline</strong>. Data will remain cached.</span>
                  </div>
                )}
              </div>

              <div className="cached-items-list">
                <h4>Queue Details</h4>
                {pendingSyncCount === 0 ? (
                  <p className="no-items-text">No pending items in queue. Database is fully synced.</p>
                ) : (
                  <p className="no-items-text">{pendingSyncCount} triage packet(s) ready to push to specialist verification portal.</p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Screen Bottom Tabs Bar Mockup */}
        <div className="phone-tabs-bar">
          <button className={`tab-item ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>
            <Users size={18} />
            <span>Roster</span>
          </button>
          
          <button className={`tab-item ${activeTab === 'intake' ? 'active' : ''}`} onClick={() => setActiveTab('intake')}>
            <UserPlus size={18} />
            <span>Register</span>
          </button>

          <button className={`tab-item ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>
            <Camera size={18} />
            <span>Upload</span>
          </button>

          <button className={`tab-item ${activeTab === 'sync' ? 'active' : ''}`} onClick={() => setActiveTab('sync')}>
            <Database size={18} />
            <span>Sync</span>
          </button>
        </div>

      </div>
    </div>
  );
}
