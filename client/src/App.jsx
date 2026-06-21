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
import StorageSettings from './pages/StorageSettings';
import { api } from './services/api';
import { offlineQueue } from './services/offlineQueue';
import storage from './services/storage';

export default function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activePatient, setActivePatient] = useState(null);
  const [activeScan, setActiveScan] = useState(null);
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  // Network connectivity detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast("✓ You're back online - Ready to sync", "success");
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast("⚠ You're offline - Data will be queued for later sync", "warning");
    };

    // Add event listeners for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
            activePatient={activePatient}
            setActiveScan={setActiveScan}
            showToast={showToast}
          />
        } />

        <Route path="/scan" element={
          <ScanSimulator
            isOnline={isOnline}
            activePatient={activePatient}
            setActiveScan={setActiveScan}
            showToast={showToast}
          />
        } />

        <Route path="/triage-summary" element={
          <TriageSummary
            isOnline={isOnline}
            activePatient={activePatient}
            activeScan={activeScan}
            refreshSyncCount={refreshSyncCount}
            showToast={showToast}
          />
        } />

        <Route path="/confirm" element={
          <TriageSummary
            isOnline={isOnline}
            activePatient={activePatient}
            activeScan={activeScan}
            refreshSyncCount={refreshSyncCount}
            showToast={showToast}
          />
        } />

        <Route path="/patient/:id" element={
          <PatientDetails
            isOnline={isOnline}
            showToast={showToast}
          />
        } />

        <Route path="/notifications" element={
          <Notifications
            isOnline={isOnline}
            showToast={showToast}
          />
        } />

        <Route path="/storage-settings" element={
          <StorageSettings
            showToast={showToast}
          />
        } />

        {/* Specialist Desktop Route */}
        <Route path="/specialist" element={
          <SpecialistDashboard showToast={showToast} isOnline={isOnline} />
        } />

        {/* Catch-all redirection */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
