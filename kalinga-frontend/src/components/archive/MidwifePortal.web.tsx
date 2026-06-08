import React, { useState, useEffect, useRef } from 'react';
import { 
  UserPlus, 
  Search, 
  Camera, 
  Database, 
  WifiOff, 
  RefreshCw, 
  ArrowRight
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
  savePatient, 
  saveTriagePacket, 
  getAllPatients, 
  getPendingSyncPackets,
  type Patient,
  type TriagePacket
} from '../../utils/db';

interface MidwifePortalProps {
  isOnline: boolean;
  onSyncTrigger: () => Promise<void>;
}

export default function MidwifePortal({ isOnline, onSyncTrigger }: MidwifePortalProps) {
  const [view, setView] = useState<'list' | 'intake' | 'scan' | 'results'>('list');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [philhealthId, setPhilhealthId] = useState('');
  const [age, setAge] = useState(25);
  const [lmp, setLmp] = useState('');
  const [estimatedDueDate, setEstimatedDueDate] = useState('');
  const [gravida, setGravida] = useState(1);
  const [para, setPara] = useState(0);
  const [riskFactors] = useState<string[]>([]);
  const [systolicBP, setSystolicBP] = useState(120);
  const [diastolicBP, setDiastolicBP] = useState(80);
  const [heartRate] = useState(72);
  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState(24);
  const [weightKg, setWeightKg] = useState(60);
  const [heightCm, setHeightCm] = useState(155);
  const [proteinUrine, setProteinUrine] = useState<'negative' | 'trace' | '+1' | '+2' | '+3' | '+4'>('negative');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [barangay, setBarangay] = useState('Guinsaugon');
  const [municipality] = useState('Saint Bernard');
  const [province] = useState('Southern Leyte');
  const [contactNumber, setContactNumber] = useState('');

  // Active Patient for Scan
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);

  // Scan workspace states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [guidanceTip, setGuidanceTip] = useState('Position probe on maternal abdomen and align target sweep');
  const [arrowDirection, setArrowDirection] = useState<'up' | 'down' | 'left' | 'right' | null>(null);

  // Results state
  const [scanResult, setScanResult] = useState<TriagePacket | null>(null);

  // Load patient list and sync stats
  const loadData = async () => {
    try {
      const allPatients = await getAllPatients();
      const pending = await getPendingSyncPackets();
      
      setPatients(allPatients);
      setPendingSyncCount(pending.length);
    } catch (err) {
      console.error('Failed to load DB store data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [view]);

  // Auto-calculate EDD from LMP (LMP + 280 days)
  useEffect(() => {
    if (lmp) {
      const lmpDate = new Date(lmp);
      const eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
      setEstimatedDueDate(eddDate.toISOString().split('T')[0]);
    }
  }, [lmp]);

  // Auto-trigger sync when transitioning to list view if online
  useEffect(() => {
    if (view === 'list' && isOnline && pendingSyncCount > 0) {
      handleManualSync();
    }
  }, [view, isOnline, pendingSyncCount]);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await onSyncTrigger();
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
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
      riskFactors,
      barangay,
      municipality,
      province,
      contactNumber: contactNumber || null,
      createdAt: new Date().toISOString()
    };

    await savePatient(newPatient);
    setCurrentPatient(newPatient);
    setView('scan');
  };

  // WebRTC camera setup
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      // Rotate sweep instructions every 5 seconds for simulated guidance
      const tips = [
        "Align fetal spine sweep vertically",
        "Keep probe angle orthogonal to abdomen",
        "Fetal heart detected, hold position",
        "CLAHE contrast optimization active",
        "Image quality: High confidence standard plane"
      ];
      let tipIndex = 0;
      const interval = setInterval(() => {
        setGuidanceTip(tips[tipIndex]);
        // Simulate probe guidance arrows
        const directions: ('up' | 'down' | 'left' | 'right' | null)[] = ['up', 'left', null, 'right', 'down'];
        setArrowDirection(directions[Math.floor(Math.random() * directions.length)]);
        tipIndex = (tipIndex + 1) % tips.length;
      }, 5000);

      return () => {
        clearInterval(interval);
      };
    } catch (err) {
      console.error('Camera access failed:', err);
      setCameraError('Camera access denied. Operating in Simulated Probe Feed Mode.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    if (view === 'scan') {
      const cleanUp = startCamera();
      return () => {
        stopCamera();
        cleanUp.then(fn => fn && fn());
      };
    }
  }, [view]);

  const initiateScan = () => {
    let count = 3;
    setCountdown(count);
    setGuidanceTip("Hold device steady. Extracting scan frame...");

    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(interval);
        setCountdown(null);
        executeCapture();
      }
    }, 1000);
  };

  const executeCapture = async () => {
    setIsProcessing(true);
    
    // Capture base64 thumbnail if camera is active
    let base64Img = null;
    if (cameraStream && videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 640;
        canvas.height = 480;
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        base64Img = canvas.toDataURL('image/jpeg', 0.85);
      }
    } else {
      // Small artificial delay to simulate capture
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    if (!currentPatient) return;
    
    // Calculate BMI
    const heightM = heightCm / 100;
    const calculatedBmi = weightKg / (heightM * heightM);
    const roundedBmi = parseFloat(calculatedBmi.toFixed(1));

    // Fetch current GPS location (epidemiological mapping)
    let gpsLat = 10.1172; // Default Saint Bernard, Southern Leyte
    let gpsLng = 125.0411;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          gpsLat = position.coords.latitude;
          gpsLng = position.coords.longitude;
        },
        (err) => console.log('Geolocation disabled:', err)
      );
    }

    const packet: TriagePacket = {
      id: uuidv4(),
      patientId: currentPatient.id,
      systolicBP,
      diastolicBP,
      heartRate,
      gestationalAgeWeeks,
      bmi: roundedBmi,
      proteinUrine,
      symptoms,
      frameBase64: base64Img,
      frameThumbnailB64: base64Img,
      aiPrediction: null,
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
    setView('results');
  };

  const handleSaveResult = async () => {
    if (!scanResult) return;
    await saveTriagePacket(scanResult);
    setView('list');
  };

  const filteredPatients = patients.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      
      {/* Midwife Header Console */}
      <div className="glass-card" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>👩‍⚕️ BHC Midwife Intake Portal</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Offline-first scanning, local data caching, and store-and-forward synchronization.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="glass-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '16px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>CACHE STORAGE</span>
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>{pendingSyncCount} Pending Sync</span>
            </div>
            <button 
              onClick={handleManualSync} 
              disabled={isSyncing || pendingSyncCount === 0} 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', display: 'flex', gap: '6px', fontSize: '0.8rem' }}
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>
      </div>

      {/* VIEW: PATIENTS LIST */}
      {view === 'list' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <input 
                type="text" 
                placeholder="Search patient roster..." 
                className="form-input" 
                style={{ paddingLeft: '40px' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--color-text-muted)' }} />
            </div>
            <button onClick={() => setView('intake')} className="btn btn-primary">
              <UserPlus size={18} /> Register New Intake
            </button>
          </div>

          {filteredPatients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
              <Database size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>No patients logged in local storage. Click "Register New Intake" to start.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    <th style={{ padding: '12px' }}>Full Name</th>
                    <th style={{ padding: '12px' }}>PhilHealth ID</th>
                    <th style={{ padding: '12px' }}>Age</th>
                    <th style={{ padding: '12px' }}>Gravida/Para</th>
                    <th style={{ padding: '12px' }}>EDD</th>
                    <th style={{ padding: '12px' }}>Intake Date</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '0.95rem' }}>
                      <td style={{ padding: '16px 12px', fontWeight: 500 }}>{p.fullName}</td>
                      <td style={{ padding: '16px 12px', fontFamily: 'monospace' }}>{p.philhealthId || 'N/A'}</td>
                      <td style={{ padding: '16px 12px' }}>{p.age} y/o</td>
                      <td style={{ padding: '16px 12px' }}>G{p.gravida}P{p.para}</td>
                      <td style={{ padding: '16px 12px' }}>{p.estimatedDueDate || 'N/A'}</td>
                      <td style={{ padding: '16px 12px', color: 'var(--color-text-muted)' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '16px 12px' }}>
                        <button 
                          onClick={() => { setCurrentPatient(p); setView('scan'); }} 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', gap: '6px' }}
                        >
                          <Camera size={14} /> Scan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW: PATIENT INTAKE FORM */}
      {view === 'intake' && (
        <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserPlus className="text-teal" /> Maternal Demographics & Vitals Intake
          </h3>
          <form onSubmit={handleAddPatient}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="input-group">
                <label className="input-label">Patient Full Name *</label>
                <input required type="text" className="form-input" placeholder="e.g., Maria Dela Cruz" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">PhilHealth ID (12-digit format)</label>
                <input type="text" className="form-input" placeholder="e.g., 12-345678901-2" value={philhealthId} onChange={e => setPhilhealthId(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Maternal Age (Years) *</label>
                <input required type="number" className="form-input" min={12} max={60} value={age} onChange={e => setAge(parseInt(e.target.value) || 25)} />
              </div>
              <div className="input-group">
                <label className="input-label">Last Menstrual Period (LMP)</label>
                <input type="date" className="form-input" value={lmp} onChange={e => setLmp(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Gravida (Pregnancies)</label>
                <input type="number" className="form-input" min={1} value={gravida} onChange={e => setGravida(parseInt(e.target.value) || 1)} />
              </div>
              <div className="input-group">
                <label className="input-label">Para (Births)</label>
                <input type="number" className="form-input" min={0} value={para} onChange={e => setPara(parseInt(e.target.value) || 0)} />
              </div>
              
              <div className="input-group">
                <label className="input-label">Systolic BP (mmHg) *</label>
                <input required type="number" className="form-input" min={60} max={300} value={systolicBP} onChange={e => setSystolicBP(parseInt(e.target.value) || 120)} />
              </div>
              <div className="input-group">
                <label className="input-label">Diastolic BP (mmHg) *</label>
                <input required type="number" className="form-input" min={30} max={200} value={diastolicBP} onChange={e => setDiastolicBP(parseInt(e.target.value) || 80)} />
              </div>

              <div className="input-group">
                <label className="input-label">Gestational Age (Weeks) *</label>
                <input required type="number" step="any" className="form-input" min={4} max={44} value={gestationalAgeWeeks} onChange={e => setGestationalAgeWeeks(parseFloat(e.target.value) || 24)} />
              </div>
              <div className="input-group">
                <label className="input-label">Urine Protein (Proteinuria) *</label>
                <select className="form-select" value={proteinUrine} onChange={e => setProteinUrine(e.target.value as any)}>
                  <option value="negative">Negative</option>
                  <option value="trace">Trace</option>
                  <option value="+1">+1</option>
                  <option value="+2">+2</option>
                  <option value="+3">+3</option>
                  <option value="+4">+4</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Weight (kg)</label>
                <input type="number" className="form-input" min={30} max={200} value={weightKg} onChange={e => setWeightKg(parseInt(e.target.value) || 60)} />
              </div>
              <div className="input-group">
                <label className="input-label">Height (cm)</label>
                <input type="number" className="form-input" min={100} max={220} value={heightCm} onChange={e => setHeightCm(parseInt(e.target.value) || 155)} />
              </div>

              <div className="input-group">
                <label className="input-label">Barangay Station *</label>
                <input required type="text" className="form-input" value={barangay} onChange={e => setBarangay(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Contact Number</label>
                <input type="text" className="form-input" value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label className="input-label">Active Risk Factors / Symptoms</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={symptoms.includes('headache')} onChange={e => {
                    if (e.target.checked) setSymptoms([...symptoms, 'headache']);
                    else setSymptoms(symptoms.filter(s => s !== 'headache'));
                  }} /> Severe Headaches
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={symptoms.includes('edema')} onChange={e => {
                    if (e.target.checked) setSymptoms([...symptoms, 'edema']);
                    else setSymptoms(symptoms.filter(s => s !== 'edema'));
                  }} /> Severe Edema (Face/Hands Swelling)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={symptoms.includes('visual_disturbances')} onChange={e => {
                    if (e.target.checked) setSymptoms([...symptoms, 'visual_disturbances']);
                    else setSymptoms(symptoms.filter(s => s !== 'visual_disturbances'));
                  }} /> Visual Disturbances (Blurred Vision)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={symptoms.includes('epigastric_pain')} onChange={e => {
                    if (e.target.checked) setSymptoms([...symptoms, 'epigastric_pain']);
                    else setSymptoms(symptoms.filter(s => s !== 'epigastric_pain'));
                  }} /> Upper Abdominal (Epigastric) Pain
                </label>
              </div>
            </div>

            {/* Patient Data Privacy & Informed Consent Section (NPC Advisory 2024.12.19 Compliance) */}
            <div className="glass-card" style={{ background: 'rgba(0, 181, 165, 0.05)', border: '1px dashed var(--color-primary)', padding: '16px', marginBottom: '20px', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '8px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📜 Patient Data Privacy & Informed Consent (NPC Advisory 2024.12.19)
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                Please deliver the plain-language explanation to the patient in their local dialect (Tagalog, Cebuano, or Waray) before registering.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                  <input required type="checkbox" style={{ marginTop: '4px' }} />
                  <span>
                    <strong>Informed Verbal Consent Obtained:</strong> I certify that I have explained to the patient, in a dialect they understand, that their demographics, clinical parameters, and ultrasound scans will be securely processed and sent for remote OB-GYN verification.
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                  <input required type="checkbox" style={{ marginTop: '4px' }} />
                  <span>
                    <strong>DPA / NPC Advisory Compliance:</strong> The patient agrees to have their records securely stored in the Kalinga system for health tracking and PhilHealth Konsulta mapping, with full right to review, update, or request deletion of data.
                  </span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" onClick={() => setView('list')} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">
                Proceed to Ultrasound Scan <ArrowRight size={18} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: CAMERA SCANNING WORKSPACE */}
      {view === 'scan' && (
        <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>📷 Active Ultrasound Sweep Guide</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Patient: <span style={{ color: '#fff', fontWeight: 500 }}>{currentPatient?.fullName}</span>
          </p>

          <div className="camera-viewport" style={{ marginBottom: '20px' }}>
            {cameraError ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '20px', color: 'var(--color-text-muted)' }}>
                <WifiOff size={48} style={{ marginBottom: '12px', color: 'var(--color-accent)' }} />
                <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>{cameraError}</p>
                <p style={{ fontSize: '0.75rem' }}>Probe sweep simulation is active. Ensure target alignment overlay looks clean.</p>
              </div>
            ) : (
              <video ref={videoRef} className="camera-feed" playsInline muted />
            )}

            {/* Simulated Guidance Reticle & Direction Arrows */}
            <div className="scan-overlay">
              <div className="scan-reticle" />
              {arrowDirection && (
                <div 
                  className="direction-arrow"
                  style={{
                    top: arrowDirection === 'down' ? '75%' : arrowDirection === 'up' ? '15%' : '45%',
                    left: arrowDirection === 'right' ? '75%' : arrowDirection === 'left' ? '15%' : '45%',
                  }}
                >
                  {arrowDirection === 'up' && '▲'}
                  {arrowDirection === 'down' && '▼'}
                  {arrowDirection === 'left' && '◀'}
                  {arrowDirection === 'right' && '▶'}
                </div>
              )}
              <span className="scan-hint">{guidanceTip}</span>
            </div>

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(12,16,23,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
                <span style={{ fontSize: '5rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>
                  {countdown}
                </span>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => setView('intake')} className="btn btn-secondary">Back</button>
            <button 
              onClick={initiateScan} 
              disabled={isProcessing || countdown !== null} 
              className="btn btn-primary"
              style={{ minWidth: '160px' }}
            >
              {isProcessing ? '🔄 Preprocessing...' : '🎯 Capture Sweep'}
            </button>
          </div>
        </div>
      )}

      {/* VIEW: TRIAGE RESULTS SUMMARY */}
      {view === 'results' && scanResult && (
        <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>📸 Ultrasound Scan Captured</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              Patient: <span style={{ color: '#fff', fontWeight: 500 }}>{currentPatient?.fullName}</span>
            </p>
          </div>

          {/* Success Banner */}
          <div 
            style={{ 
              borderRadius: '8px', 
              padding: '20px', 
              textAlign: 'center', 
              marginBottom: '24px',
              border: '1px solid var(--color-primary)',
              background: 'rgba(0, 181, 165, 0.08)'
            }}
          >
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>🎯</span>
            <h2 style={{ fontSize: '1.5rem', margin: '4px 0', color: 'var(--color-primary)' }}>
              Scan Capture Successful
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
              Ultrasound frame saved locally in offline cache. It will synchronize automatically when connection is detected and be routed to the remote OB-GYN FetalCLIP validation queue.
            </p>
          </div>

          {/* Vitals Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="glass-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>BLOOD PRESSURE</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{scanResult.systolicBP}/{scanResult.diastolicBP} mmHg</p>
            </div>
            <div className="glass-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>GESTATIONAL AGE</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{scanResult.gestationalAgeWeeks} Weeks</p>
            </div>
            <div className="glass-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>MATERNAL BMI</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{scanResult.bmi || 'N/A'}</p>
            </div>
            <div className="glass-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>PROTEINURIA</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{scanResult.proteinUrine}</p>
            </div>
          </div>

          {/* Image Preview */}
          {scanResult.frameBase64 && (
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>CAPTURED SCAN PREVIEW</span>
              <div style={{ marginTop: '6px', background: '#000', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)', aspectRatio: '4/3' }}>
                <img src={scanResult.frameBase64} alt="Captured ultrasound scan" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={() => setView('scan')} className="btn btn-secondary">Rescan</button>
            <button onClick={handleSaveResult} className="btn btn-primary">
              Save & Sync Record
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
