import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Camera, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { calculateRiskLocally } from '../services/aiService';
import { calculateBMI } from '../utils/bmiCalculator';
import { announceToScreenReader, setPageTitle } from '../utils/accessibility';

export default function PatientRegistration({ isOnline, setActivePatient, showToast }) {
  const navigate = useNavigate();
  const [timeStr, setTimeStr] = useState('09:41');
  const [isScanningID, setIsScanningID] = useState(false);
  const [currentDemoPatientIndex, setCurrentDemoPatientIndex] = useState(0);

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

  // Validation states
  const [validationErrors, setValidationErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
  
  // Debounce timers
  const debounceTimers = useRef({});

  // Risk Factors checkboxes
  const [hypertension, setHypertension] = useState(false);
  const [familyHistory, setFamilyHistory] = useState(false);
  const [firstPregnancy, setFirstPregnancy] = useState(false);
  const [multipleGestation, setMultipleGestation] = useState(false);
  const [diabetes, setDiabetes] = useState(false);
  const [prevCsection, setPrevCsection] = useState(false);
  const [painBleeding, setPainBleeding] = useState(false);

  // Validation functions
  const validatePhilHealth = (value) => {
    if (!value) return 'PhilHealth number is required';
    // Format: XX-XXXXXXXXX-X (2 digits, dash, 9 digits, dash, 1 digit)
    const philhealthRegex = /^\d{2}-\d{9}-\d{1}$/;
    if (!philhealthRegex.test(value)) {
      return 'Invalid format. Use: XX-XXXXXXXXX-X';
    }
    return null;
  };

  const validateMobile = (value) => {
    if (!value) return 'Mobile number is required';
    // Philippine mobile format: 09XX-XXX-XXXX or 09XXXXXXXXX
    const mobileRegex = /^(09\d{2}-?\d{3}-?\d{4})$/;
    if (!mobileRegex.test(value.replace(/-/g, ''))) {
      return 'Invalid mobile number format';
    }
    return null;
  };

  const validateRequired = (value, fieldName) => {
    if (!value || value.toString().trim() === '') {
      return `${fieldName} is required`;
    }
    return null;
  };

  const validateBloodPressure = (value) => {
    if (!value) return 'Blood pressure is required';
    const bpRegex = /^\d{2,3}\/\d{2,3}$/;
    if (!bpRegex.test(value)) {
      return 'Format: systolic/diastolic (e.g., 120/80)';
    }
    const [systolic, diastolic] = value.split('/').map(Number);
    if (systolic < 70 || systolic > 250) {
      return 'Systolic must be between 70-250';
    }
    if (diastolic < 40 || diastolic > 150) {
      return 'Diastolic must be between 40-150';
    }
    return null;
  };

  const validateWeight = (value) => {
    if (!value) return 'Weight is required';
    const w = parseFloat(value);
    if (isNaN(w) || w < 30 || w > 200) {
      return 'Weight must be between 30-200 kg';
    }
    return null;
  };

  const validateHeight = (value) => {
    if (!value) return 'Height is required';
    const h = parseFloat(value);
    if (isNaN(h) || h < 100 || h > 250) {
      return 'Height must be between 100-250 cm';
    }
    return null;
  };

  const validateDate = (value, fieldName) => {
    if (!value) return `${fieldName} is required`;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return null;
  };

  // Debounced validation
  const validateFieldDebounced = useCallback((fieldName, value, validator) => {
    // Mark field as touched
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));

    // Clear existing timer
    if (debounceTimers.current[fieldName]) {
      clearTimeout(debounceTimers.current[fieldName]);
    }

    // Set new timer
    debounceTimers.current[fieldName] = setTimeout(() => {
      const error = validator(value);
      setValidationErrors(prev => ({
        ...prev,
        [fieldName]: error
      }));
    }, 300);
  }, []);

  // Validate all fields
  const validateAllFields = useCallback(() => {
    const errors = {
      philhealth: validatePhilHealth(philhealth),
      mobile: validateMobile(mobile),
      firstName: validateRequired(firstName, 'First name'),
      lastName: validateRequired(lastName, 'Last name'),
      dob: validateDate(dob, 'Date of birth'),
      bp: validateBloodPressure(bp),
      bloodType: validateRequired(bloodType, 'Blood type'),
      weight: validateWeight(weight),
      height: validateHeight(height),
      lmp: validateDate(lmp, 'Last menstrual period'),
      history: validateRequired(history, 'Pregnancy history'),
      location: validateRequired(location, 'Location')
    };

    const hasErrors = Object.values(errors).some(error => error !== null);
    setIsFormValid(!hasErrors);
    
    return errors;
  }, [philhealth, mobile, firstName, lastName, dob, bp, bloodType, weight, height, lmp, history, location]);

  // Validate on field changes
  useEffect(() => {
    validateAllFields();
  }, [philhealth, mobile, firstName, lastName, dob, bp, bloodType, weight, height, lmp, history, location, validateAllFields]);

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

  // Set page title for accessibility
  useEffect(() => {
    setPageTitle('Patient Registration');
  }, []);

  // Compute BMI and interpretation - Triggers on weight or height change
  useEffect(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (w > 0 && h > 0) {
      const calculatedBMI = calculateBMI(w, h);
      setBmi(calculatedBMI.toString());
    } else {
      setBmi('');
    }
  }, [weight, height]);

  // Get BMI interpretation
  const getBMIInterpretation = () => {
    const bmiValue = parseFloat(bmi);
    if (!bmiValue || isNaN(bmiValue)) return null;

    if (bmiValue < 18.5) {
      return {
        category: 'Underweight',
        className: 'underweight',
        icon: '⚠️',
        guidance: 'May increase risk of complications. Monitor nutritional status.'
      };
    } else if (bmiValue >= 18.5 && bmiValue <= 24.9) {
      return {
        category: 'Normal Weight',
        className: 'normal',
        icon: '✓',
        guidance: 'Healthy weight range for pregnancy.'
      };
    } else if (bmiValue >= 25 && bmiValue <= 29.9) {
      return {
        category: 'Overweight',
        className: 'overweight',
        icon: '⚠️',
        guidance: 'Increased preeclampsia risk (+4 points). Monitor closely.'
      };
    } else { // >= 30
      return {
        category: 'Obese',
        className: 'obese',
        icon: '⚠️',
        guidance: 'High preeclampsia risk (+8 points). Requires close monitoring.'
      };
    }
  };

  // Demo patients for ID scanner rotation
  const demoPatients = [
    {
      name: 'Maria Santos Cruz',
      philhealth: '71-024481935-2',
      firstName: 'Maria',
      middleName: 'Santos',
      lastName: 'Cruz',
      dob: '1998-05-12',
      mobile: '0917-482-9382',
      bp: '155/95',
      bloodType: 'O+',
      weight: '79.5',
      height: '160',
      lmp: '2025-12-30',
      history: 'G2 P1',
      location: 'Langkas, Dalaguete, Cebu',
      hypertension: true,
      familyHistory: true,
      firstPregnancy: false,
      multipleGestation: false,
      diabetes: false,
      prevCsection: false,
      painBleeding: false
    },
    {
      name: 'Ana Reyes',
      philhealth: '12-345678910-1',
      firstName: 'Ana',
      middleName: '',
      lastName: 'Reyes',
      dob: '1995-08-20',
      mobile: '0918-273-6452',
      bp: '135/85',
      bloodType: 'A+',
      weight: '62.0',
      height: '158',
      lmp: '2026-01-15',
      history: 'G1 P0',
      location: 'Langkas, Dalaguete, Cebu',
      hypertension: false,
      familyHistory: false,
      firstPregnancy: true,
      multipleGestation: false,
      diabetes: false,
      prevCsection: false,
      painBleeding: false
    },
    {
      name: 'Elena Garcia',
      philhealth: '11-098765432-1',
      firstName: 'Elena',
      middleName: '',
      lastName: 'Garcia',
      dob: '1992-11-04',
      mobile: '0905-645-3728',
      bp: '110/70',
      bloodType: 'B+',
      weight: '54.0',
      height: '152',
      lmp: '2026-02-10',
      history: 'G3 P2',
      location: 'Langkas, Dalaguete, Cebu',
      hypertension: false,
      familyHistory: false,
      firstPregnancy: false,
      multipleGestation: false,
      diabetes: false,
      prevCsection: true,
      painBleeding: false
    }
  ];

  // ID Scanner Simulator - with visual animation and rotation through demo patients
  const handleIdScannerSim = () => {
    setIsScanningID(true);
    showToast("Initializing PhilHealth OCR Scanner...", "scanner");
    
    // Visual scanning animation duration: 2-3 seconds
    setTimeout(() => {
      setIsScanningID(false);
      
      // Rotate through demo patients
      const patient = demoPatients[currentDemoPatientIndex];
      setCurrentDemoPatientIndex((currentDemoPatientIndex + 1) % demoPatients.length);
      
      // Auto-fill all fields
      setPhilhealth(patient.philhealth);
      setFirstName(patient.firstName);
      setMiddleName(patient.middleName);
      setLastName(patient.lastName);
      setDob(patient.dob);
      setMobile(patient.mobile);
      setBp(patient.bp);
      setBloodType(patient.bloodType);
      setWeight(patient.weight);
      setHeight(patient.height);
      setLmp(patient.lmp);
      setHistory(patient.history);
      setLocation(patient.location);
      setHypertension(patient.hypertension);
      setFamilyHistory(patient.familyHistory);
      setFirstPregnancy(patient.firstPregnancy);
      setMultipleGestation(patient.multipleGestation);
      setDiabetes(patient.diabetes);
      setPrevCsection(patient.prevCsection);
      setPainBleeding(patient.painBleeding);
      
      // Display success toast after auto-fill completes
      showToast(`Successfully loaded: ${patient.name}`, "success");
    }, 2500); // 2.5 seconds scanning animation
  };

  const handleProfilePicSim = () => {
    showToast("Opening device camera...", "scanner");
    setTimeout(() => {
      showToast("Profile thumbnail captured.", "success");
    }, 1200);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields and mark as touched
    const errors = validateAllFields();
    const allFieldsTouched = {
      philhealth: true,
      mobile: true,
      firstName: true,
      lastName: true,
      dob: true,
      bp: true,
      bloodType: true,
      weight: true,
      height: true,
      lmp: true,
      history: true,
      location: true
    };
    setTouchedFields(allFieldsTouched);
    setValidationErrors(errors);

    // Check if form is valid
    if (!isFormValid || Object.values(errors).some(error => error !== null)) {
      showToast("Please fix all validation errors before submitting", "error");
      return;
    }

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

  // Helper to render form input with validation
  const renderFormInput = (label, value, onChange, fieldName, validator, options = {}) => {
    const error = touchedFields[fieldName] && validationErrors[fieldName];
    const isValid = touchedFields[fieldName] && !validationErrors[fieldName] && value;
    const { type = 'text', placeholder = '', required = true, readOnly = false, step } = options;

    return (
      <div className="form-group">
        <label>{label} {required && <span style={{ color: 'var(--red-alert)' }}>*</span>}</label>
        <div style={{ position: 'relative' }}>
          <input
            type={type}
            className={`form-input ${error ? 'form-input-error' : ''} ${isValid ? 'form-input-valid' : ''}`}
            required={required}
            placeholder={placeholder}
            value={value}
            readOnly={readOnly}
            step={step}
            onChange={(e) => {
              onChange(e.target.value);
              if (validator && !readOnly) {
                validateFieldDebounced(fieldName, e.target.value, validator);
              }
            }}
            onBlur={() => {
              if (!readOnly) {
                setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
              }
            }}
          />
          {isValid && (
            <CheckCircle2 
              size={18} 
              style={{ 
                position: 'absolute', 
                right: '8px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--green-normal)',
                pointerEvents: 'none'
              }} 
            />
          )}
        </div>
        {error && (
          <div className="validation-error">
            {error}
          </div>
        )}
      </div>
    );
  };

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
            {renderFormInput(
              'PhilHealth Number',
              philhealth,
              setPhilhealth,
              'philhealth',
              validatePhilHealth,
              { placeholder: 'XX-XXXXXXXXX-X' }
            )}
            <div className="scan-profile-actions" style={{ display: 'flex', gap: '12px', marginTop: '-12px', marginBottom: '20px' }}>
              <button type="button" onClick={handleIdScannerSim}>
                <CreditCard size={12} style={{ marginRight: '4px' }} /> Id Scanner
              </button>
              <button type="button" onClick={handleProfilePicSim}>
                <Camera size={12} style={{ marginRight: '4px' }} /> Profile Picture
              </button>
            </div>

            {renderFormInput(
              'Mobile Number',
              mobile,
              setMobile,
              'mobile',
              validateMobile,
              { type: 'tel', placeholder: '09XX-XXX-XXXX' }
            )}

            <div className="separator" />

            {renderFormInput(
              'First Name',
              firstName,
              setFirstName,
              'firstName',
              (v) => validateRequired(v, 'First name')
            )}
            {renderFormInput(
              'Middle Name',
              middleName,
              setMiddleName,
              'middleName',
              null,
              { required: false }
            )}
            {renderFormInput(
              'Last Name',
              lastName,
              setLastName,
              'lastName',
              (v) => validateRequired(v, 'Last name')
            )}
            {renderFormInput(
              'Date of Birth',
              dob,
              setDob,
              'dob',
              (v) => validateDate(v, 'Date of birth'),
              { type: 'date' }
            )}

            <div className="separator" />

            <div className="form-row">
              {renderFormInput(
                'BP (Systolic/Diastolic)',
                bp,
                setBp,
                'bp',
                validateBloodPressure,
                { placeholder: '120/80' }
              )}
              {renderFormInput(
                'Blood type',
                bloodType,
                setBloodType,
                'bloodType',
                (v) => validateRequired(v, 'Blood type'),
                { placeholder: 'O+' }
              )}
            </div>

            <div className="form-row">
              {renderFormInput(
                'Weight (kg)',
                weight,
                setWeight,
                'weight',
                validateWeight,
                { type: 'number', step: '0.1' }
              )}
              {renderFormInput(
                'Height (cm)',
                height,
                setHeight,
                'height',
                validateHeight,
                { type: 'number', step: '0.1' }
              )}
            </div>

            {renderFormInput(
              'BMI (Body Mass Index)',
              bmi,
              () => {},
              'bmi',
              null,
              { readOnly: true, placeholder: 'Auto-calculated', required: false }
            )}

            {/* BMI Interpretation */}
            {bmi && (() => {
              const interpretation = getBMIInterpretation();
              if (!interpretation) return null;
              
              return (
                <div className={`bmi-interpretation ${interpretation.className}`}>
                  <span className="bmi-icon">{interpretation.icon}</span>
                  <div className="bmi-text">
                    <span className="bmi-category">{interpretation.category}</span>
                    <span className="bmi-guidance">{interpretation.guidance}</span>
                  </div>
                </div>
              );
            })()}

            <div className="separator" />

            <div className="form-row">
              {renderFormInput(
                'Last Period (LMP)',
                lmp,
                setLmp,
                'lmp',
                (v) => validateDate(v, 'Last menstrual period'),
                { type: 'date' }
              )}
              {renderFormInput(
                'Pregnancy History (G/P)',
                history,
                setHistory,
                'history',
                (v) => validateRequired(v, 'Pregnancy history'),
                { placeholder: 'G1 P0' }
              )}
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

            {renderFormInput(
              'Location',
              location,
              setLocation,
              'location',
              (v) => validateRequired(v, 'Location')
            )}

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

            <button 
              type="submit" 
              className="btn-blue" 
              style={{ 
                width: '100%', 
                marginBottom: '24px',
                opacity: isFormValid ? 1 : 0.6,
                cursor: isFormValid ? 'pointer' : 'not-allowed'
              }}
              disabled={!isFormValid}
            >
              {isFormValid ? 'Register Patient' : 'Complete All Required Fields'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
