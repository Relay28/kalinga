import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Camera } from 'lucide-react';
import { api } from '../services/api';
import { calculateRiskLocally } from '../services/aiService';

export default function PatientRegistration({ isOnline, onToggleOnline, setActivePatient, showToast }) {
  const navigate = useNavigate();
  const [timeStr, setTimeStr] = useState('09:41');
  const [isScanningID, setIsScanningID] = useState(false);

  // Form states
  const [philhealth, setPhilhealth] = useState('');
  const [mobile, setMobile] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [bp, setBp] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bmi, setBmi] = useState('');
  const [lmp, setLmp] = useState('');
  const [history, setHistory] = useState('');
  const [location, setLocation] = useState('Langkas, Dalaguete, Cebu');

  // Risk Factors checkboxes
  const [hypertension, setHypertension] = useState(false);
  const [familyHistory, setFamilyHistory] = useState(false);
  const [firstPregnancy, setFirstPregnancy] = useState(false);
  const [multipleGestation, setMultipleGestation] = useState(false);
  const [diabetes, setDiabetes] = useState(false);
  const [prevCsection, setPrevCsection] = useState(false);
  const [painBleeding, setPainBleeding] = useState(false);

  // Time stamp
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute BMI
  useEffect(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100; // cm to m
    if (w > 0 && h > 0) {
      setBmi((w / (h * h)).toFixed(1));
    } else {
      setBmi('');
    }
  }, [weight, height]);

  // ID Scanner Simulator
  const handleIdScannerSim = () => {
    setIsScanningID(true);
    showToast("Initializing PhilHealth OCR Scanner...", "scanner");
    setTimeout(() => {
      setIsScanningID(false);
      setPhilhealth("7102-4481-9352");
      setFirstName("Maria");
      setMiddleName("Santos");
      setLastName("Cruz");
      setDob("1998-05-12");
      setMobile("0917-123-4567");
      setBp("155/95");
      setBloodType("O+");
      setWeight("79.5");
      setHeight("160");
      setLmp("2025-12-30");
      setHistory("G2 P1");
      setLocation("Langkas, Dalaguete, Cebu");
      setHypertension(true);
      setFamilyHistory(true);
      setFirstPregnancy(false);
      setMultipleGestation(false);
      setDiabetes(false);
      setPrevCsection(false);
      setPainBleeding(false);
      showToast("PhilHealth OCR & Sample Data loaded successfully!", "success");
    }, 2200);
  };

  const handleProfilePicSim = () => {
    showToast("Opening device camera...", "scanner");
    setTimeout(() => {
      showToast("Profile thumbnail captured.", "success");
    }, 1200);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const age = dob ? (new Date().getFullYear() - new Date(dob).getFullYear()) : 27;
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(' at', '');

    const patient = {
      id: philhealth || `ID-${Math.floor(1000 + Math.random() * 9000)}`,
      firstName,
      middleName,
      lastName,
      dob,
      age,
      mobile,
      bp,
      weight: parseFloat(weight),
      height: parseFloat(height),
      bmi,
      lmp,
      history: history || 'G1 P0',
      location,
      midwifeId: 'MW-7729-01',
      timestamp,
      riskFactors: {
        hypertension,
        family: familyHistory,
        firstpreg: firstPregnancy,
        multiple: multipleGestation,
        diabetes,
        csection: prevCsection,
        pain: painBleeding
      },
      status: 'Ready to Scan',
      riskScore: calculateRiskLocally(bp, bmi, age, {
        hypertension,
        family: familyHistory,
        firstpreg: firstPregnancy,
        multiple: multipleGestation,
        diabetes,
        csection: prevCsection,
        pain: painBleeding
      }),
      heartRate: null,
      fetalAge: null,
      review: null
    };

    setActivePatient(patient);

    // Store in localStorage for persistence
    try {
      localStorage.setItem('kalinga_current_patient', JSON.stringify(patient));
    } catch (e) {
      console.warn('Failed to store patient data');
    }

    // Save patient on backend database if online, else cache locally
    if (isOnline) {
      try {
        await api.registerPatient(patient);
        showToast(`Registered patient ${firstName} on server.`, "success");
      } catch (err) {
        console.warn("API patient save failed, saving locally:", err);
        savePatientLocally(patient);
      }
    } else {
      savePatientLocally(patient);
    }

    setTimeout(() => {
      navigate('/triage-session');
    }, 1200);
  };

  const savePatientLocally = (p) => {
    const list = JSON.parse(localStorage.getItem('kalinga_patients') || '[]');
    const filtered = list.filter(item => item.id !== p.id);
    filtered.unshift(p);
    localStorage.setItem('kalinga_patients', JSON.stringify(filtered));
    showToast(`Saved ${p.firstName} to local device database.`, "success");
  };

  return (
    <div className="device-container">
      <div className="device-header-notch">
        <span>{timeStr}</span>
        <div className="icons">
          <div className={`connectivity-toggle ${!isOnline ? 'offline' : ''}`} onClick={onToggleOnline}>
            <span className="indicator-dot"></span>
            <span>{isOnline ? 'Online Mode' : 'Offline Mode'}</span>
          </div>
        </div>
      </div>

      <div className="app-viewport">
        {isScanningID && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#fff',
            fontFamily: 'var(--font-display)',
            padding: '24px'
          }}>
            <div style={{
              position: 'relative',
              width: '280px',
              height: '180px',
              border: '2px solid var(--primary-teal)',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              boxShadow: '0 0 20px rgba(27, 178, 164, 0.3)'
            }}>
              {/* Corner brackets */}
              <div style={{ position: 'absolute', top: 10, left: 10, width: 20, height: 20, borderTop: '3px solid #fff', borderLeft: '3px solid #fff' }} />
              <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderTop: '3px solid #fff', borderRight: '3px solid #fff' }} />
              <div style={{ position: 'absolute', bottom: 10, left: 10, width: 20, height: 20, borderBottom: '3px solid #fff', borderLeft: '3px solid #fff' }} />
              <div style={{ position: 'absolute', bottom: 10, right: 10, width: 20, height: 20, borderBottom: '3px solid #fff', borderRight: '3px solid #fff' }} />

              {/* Simulated Card Content */}
              <div style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', gap: '8px', width: '80%' }}>
                <div style={{ height: '14px', width: '55%', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '2px' }} />
                <div style={{ height: '8px', width: '90%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px' }} />
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '4px' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ height: '8px', width: '80%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px' }} />
                    <div style={{ height: '8px', width: '50%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px' }} />
                  </div>
                </div>
              </div>

              {/* Laser sweep line */}
              <div style={{
                position: 'absolute',
                left: 0,
                width: '100%',
                height: '3px',
                backgroundColor: 'var(--primary-teal)',
                boxShadow: '0 0 15px var(--primary-teal), 0 0 5px var(--primary-teal)',
                animation: 'radarScan 2s infinite linear',
                pointerEvents: 'none'
              }} />
            </div>
            <div style={{ marginTop: '24px', fontSize: '13px', fontWeight: '700', color: 'var(--primary-teal)', letterSpacing: '1px' }}>
              ALIGN PHILHEALTH ID CARD
            </div>
            <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              OCR scanning active...
            </div>
          </div>
        )}
        <div className="viewport-screen">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} style={{ marginRight: '6px' }} />
            Return
          </button>

          <form onSubmit={handleFormSubmit} style={{ marginTop: '14px' }}>
            <div className="form-group">
              <label>PhilHealth Number</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="xxxx-xxxx-xxxx"
                value={philhealth}
                onChange={e => setPhilhealth(e.target.value)}
              />
              <div className="scan-profile-actions" style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={handleIdScannerSim}>
                  <CreditCard size={12} style={{ marginRight: '4px' }} /> Id Scanner
                </button>
                <button type="button" onClick={handleProfilePicSim}>
                  <Camera size={12} style={{ marginRight: '4px' }} /> Profile Picture
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Mobile Number</label>
              <input
                type="tel"
                className="form-input"
                required
                placeholder="09xxxxxxxxx"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
              />
            </div>

            <div className="separator" />

            <div className="form-group">
              <label>First Name</label>
              <input type="text" className="form-input" required value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Middle Name</label>
              <input type="text" className="form-input" value={middleName} onChange={e => setMiddleName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input type="text" className="form-input" required value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" className="form-input" required value={dob} onChange={e => setDob(e.target.value)} />
            </div>

            <div className="separator" />

            <div className="form-row">
              <div className="form-group">
                <label>BP (Systolic/Diastolic)</label>
                <input type="text" className="form-input" required placeholder="120/80" value={bp} onChange={e => setBp(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Blood type</label>
                <input type="text" className="form-input" required placeholder="O+" value={bloodType} onChange={e => setBloodType(e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Weight (kg)</label>
                <input type="number" className="form-input" required step="0.1" value={weight} onChange={e => setWeight(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Height (cm)</label>
                <input type="number" className="form-input" required step="0.1" value={height} onChange={e => setHeight(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>BMI (Body Mass Index)</label>
              <input type="text" className="form-input" readOnly placeholder="Auto-calculated" value={bmi} />
            </div>

            <div className="separator" />

            <div className="form-row">
              <div className="form-group">
                <label>Last Period (LMP)</label>
                <input type="date" className="form-input" required value={lmp} onChange={e => setLmp(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Pregnancy History (G/P)</label>
                <input type="text" className="form-input" required placeholder="G1 P0" value={history} onChange={e => setHistory(e.target.value)} />
              </div>
            </div>

            <div className="separator" />

            <div className="checklist-container">
              <label className="checkbox-group">
                <input type="checkbox" checked={hypertension} onChange={e => setHypertension(e.target.checked)} />
                <span className="custom-checkbox"></span>
                <span className="checkbox-text">
                  Chronic Hypertension?
                  <span class="checkbox-sub">high BP before getting pregnant</span>
                </span>
              </label>

              <label className="checkbox-group">
                <input type="checkbox" checked={familyHistory} onChange={e => setFamilyHistory(e.target.checked)} />
                <span className="custom-checkbox"></span>
                <span className="checkbox-text">
                  Family History
                  <span class="checkbox-sub">Did her mother or sister have preeclampsia</span>
                </span>
              </label>

              <label className="checkbox-group">
                <input type="checkbox" checked={firstPregnancy} onChange={e => setFirstPregnancy(e.target.checked)} />
                <span className="custom-checkbox"></span>
                <span class="checkbox-text">First Pregnancy?</span>
              </label>

              <label className="checkbox-group">
                <input type="checkbox" checked={multipleGestation} onChange={e => setMultipleGestation(e.target.checked)} />
                <span className="custom-checkbox"></span>
                <span class="checkbox-text">Multiple Gestation</span>
              </label>

              <label className="checkbox-group">
                <input type="checkbox" checked={diabetes} onChange={e => setDiabetes(e.target.checked)} />
                <span className="custom-checkbox"></span>
                <span class="checkbox-text">Diabetes?</span>
              </label>

              <label className="checkbox-group">
                <input type="checkbox" checked={prevCsection} onChange={e => setPrevCsection(e.target.checked)} />
                <span className="custom-checkbox"></span>
                <span class="checkbox-text">
                  Previous C-Section?
                  <span class="checkbox-sub">Critical for identifying Placenta Previa risks</span>
                </span>
              </label>

              <label className="checkbox-group">
                <input type="checkbox" checked={painBleeding} onChange={e => setPainBleeding(e.target.checked)} />
                <span className="custom-checkbox"></span>
                <span class="checkbox-text">Current Pain/Bleeding?</span>
              </label>
            </div>

            <div className="separator" />

            <div className="form-group">
              <label>Location</label>
              <input type="text" className="form-input" required value={location} onChange={e => setLocation(e.target.value)} />
            </div>

            <div className="form-row" style={{ marginBottom: '24px' }}>
              <div className="form-group">
                <label>Midwife ID</label>
                <input type="text" className="form-input" readOnly value="MW-7729-01" />
              </div>
              <div className="form-group">
                <label>Timestamp</label>
                <input type="text" className="form-input" readOnly value={timeStr} />
              </div>
            </div>

            <button type="submit" className="btn-blue" style={{ width: '100%', marginBottom: '24px' }}>
              Register
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
