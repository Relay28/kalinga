import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Splash from './pages/Splash';
import Login from './pages/Login';
import MidwifeDashboard from './pages/MidwifeDashboard';
import PatientRegistration from './pages/PatientRegistration';
import RegisteringTriageSession from './pages/RegisteringTriageSession';
import ScanSimulator from './pages/ScanSimulator';
import TriageSummary from './pages/TriageSummary';
import ScanConfirmation from './pages/ScanConfirmation';
import PatientDetails from './pages/PatientDetails';
import Notifications from './pages/Notifications';
import SpecialistDashboard from './pages/SpecialistDashboard';
import { api } from './services/api';
import { offlineQueue } from './services/offlineQueue';
import storage from './services/storage';

export default function App() {
  const [isOnline, setIsOnline] = useState(true);
  const [activePatient, setActivePatient] = useState(null);
  const [activeScan, setActiveScan] = useState(null);
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  // Load sync queue status
  useEffect(() => {
    const queue = offlineQueue.getQueue();
    setSyncQueueCount(queue.length);
  }, []);

  // Poll for notifications when online
  useEffect(() => {
    let interval;
    if (isOnline) {
      const fetchNotifs = async () => {
        try {
          const list = await api.getNotifications();
          const unread = list.filter(n => n.status === 'unread').length;
          setUnreadNotifsCount(unread);
        } catch (err) {
          console.warn("Failed to fetch notification count:", err);
        }
      };
      fetchNotifs();
      interval = setInterval(fetchNotifs, 8000);
    }
    return () => clearInterval(interval);
  }, [isOnline]);

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'info' });
    }, 3500);
  };

  const handleToggleOnline = () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    if (nextState) {
      showToast("Online Mode Active - Ready to sync", "success");
      // Read queue and alert if items exist
      const q = offlineQueue.getQueue();
      if (q.length > 0) {
        showToast(`Connection restored. ${q.length} scans pending sync.`, 'info');
      }
    } else {
      showToast("Offline Mode Active - Scans will lock on-device", "warning");
    }
  };

  const refreshSyncCount = () => {
    setSyncQueueCount(offlineQueue.getQueue().length);
  };

  return (
    <BrowserRouter>
      {/* Toast Alert overlay */}
      {toast.show && (
        <div className="custom-toast" style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--text-dark)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: '500',
          boxShadow: 'var(--shadow-lg)',
          zIndex: '9999',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderLeft: `4px solid ${toast.type === 'success' ? 'var(--green-normal)' :
              toast.type === 'warning' ? 'var(--orange-alert)' :
                toast.type === 'scanner' ? 'var(--primary-blue)' : 'var(--primary-teal)'
            }`,
          animation: 'screenFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {toast.message}
        </div>
      )}

      <Routes>
        {/* Golden Triage Midwife Flow Routes */}
        <Route path="/" element={<Splash />} />

        <Route path="/login" element={
          <Login showToast={showToast} />
        } />

        <Route path="/dashboard" element={
          <MidwifeDashboard
            isOnline={isOnline}
            onToggleOnline={handleToggleOnline}
            syncQueueCount={syncQueueCount}
            refreshSyncCount={refreshSyncCount}
            unreadNotifsCount={unreadNotifsCount}
            setActivePatient={setActivePatient}
            showToast={showToast}
          />
        } />

        <Route path="/register" element={
          <PatientRegistration
            isOnline={isOnline}
            onToggleOnline={handleToggleOnline}
            setActivePatient={setActivePatient}
            showToast={showToast}
          />
        } />

        <Route path="/triage-session" element={
          <RegisteringTriageSession
            activePatient={activePatient}
            isOnline={isOnline}
            showToast={showToast}
          />
        } />

        <Route path="/scan-simulator" element={
          <ScanSimulator
            isOnline={isOnline}
            onToggleOnline={handleToggleOnline}
            activePatient={activePatient}
            setActiveScan={setActiveScan}
            showToast={showToast}
          />
        } />

        <Route path="/scan" element={
          <ScanSimulator
            isOnline={isOnline}
            onToggleOnline={handleToggleOnline}
            activePatient={activePatient}
            setActiveScan={setActiveScan}
            showToast={showToast}
          />
        } />

        <Route path="/triage-summary" element={
          <TriageSummary
            isOnline={isOnline}
            onToggleOnline={handleToggleOnline}
            activePatient={activePatient}
            activeScan={activeScan}
            refreshSyncCount={refreshSyncCount}
            showToast={showToast}
          />
        } />

        <Route path="/confirm" element={
          <TriageSummary
            isOnline={isOnline}
            onToggleOnline={handleToggleOnline}
            activePatient={activePatient}
            activeScan={activeScan}
            refreshSyncCount={refreshSyncCount}
            showToast={showToast}
          />
        } />

        <Route path="/patient/:id" element={
          <PatientDetails
            isOnline={isOnline}
            onToggleOnline={handleToggleOnline}
            showToast={showToast}
          />
        } />

        <Route path="/notifications" element={
          <Notifications
            isOnline={isOnline}
            onToggleOnline={handleToggleOnline}
            showToast={showToast}
          />
        } />

        {/* Specialist Desktop Route */}
        <Route path="/specialist" element={
          <SpecialistDashboard showToast={showToast} />
        } />

        {/* Catch-all redirection */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
