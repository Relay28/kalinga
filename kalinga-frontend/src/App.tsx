import { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Database
} from 'lucide-react';
import MidwifePortal from './components/MidwifePortal';
import SpecialistPortal from './components/SpecialistPortal';
import { syncOfflineData } from './utils/sync';

// Kalinga Turquoise silhouette logo as a inline component or SVG import
import LogoSrc from './assets/Logo.png';

export default function App() {
  const [role, setRole] = useState<'midwife' | 'obgyn'>('midwife');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncLog, setSyncLog] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerAutoSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check
    if (navigator.onLine) {
      triggerAutoSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerAutoSync = async () => {
    setSyncStatus('syncing');
    try {
      const result = await syncOfflineData();
      if (result.syncedCount > 0) {
        setSyncStatus('synced');
        setSyncLog(`Successfully synced ${result.syncedCount} offline record(s) to cloud database.`);
        setTimeout(() => setSyncStatus('idle'), 5000);
      } else if (result.error) {
        setSyncStatus('error');
        setSyncLog(result.error);
      } else {
        setSyncStatus('idle');
      }
    } catch (err) {
      setSyncStatus('error');
      setSyncLog('Automatic database sync failed.');
    }
  };

  const handleSyncTrigger = async () => {
    await triggerAutoSync();
  };

  return (
    <div className="app-container">
      
      {/* Top Navbar Header */}
      <header className="navbar no-print">
        <div className="nav-brand">
          <img src={LogoSrc} alt="Kalinga Logo" className="nav-logo" />
          <h1 className="nav-title">Kalinga <span>AI</span></h1>
        </div>

        {/* Connectivity status badge */}
        <div className="nav-controls">
          <div className="role-selector" style={{ display: 'flex', gap: '8px', background: '#161b22', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <button 
              onClick={() => setRole('midwife')} 
              style={{
                background: role === 'midwife' ? 'var(--color-primary-glow)' : 'transparent',
                borderColor: role === 'midwife' ? 'var(--color-primary)' : 'transparent',
                borderWidth: '1px',
                borderStyle: 'solid',
                color: role === 'midwife' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
            >
              👩‍⚕️ Midwife
            </button>
            <button 
              onClick={() => setRole('obgyn')}
              style={{
                background: role === 'obgyn' ? 'var(--color-accent-glow)' : 'transparent',
                borderColor: role === 'obgyn' ? 'var(--color-accent)' : 'transparent',
                borderWidth: '1px',
                borderStyle: 'solid',
                color: role === 'obgyn' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
            >
              🩺 OB-GYN
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {syncStatus === 'syncing' ? (
              <span className="badge badge-syncing">
                <Database size={12} className="animate-spin" /> Syncing...
              </span>
            ) : isOnline ? (
              <span className="badge badge-online">
                <Wifi size={12} /> Connected
              </span>
            ) : (
              <span className="badge badge-offline">
                <WifiOff size={12} /> Offline Mode
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Sync Ledger Alert Logs */}
      {syncStatus === 'synced' && syncLog && (
        <div className="no-print" style={{ background: 'rgba(34, 197, 94, 0.15)', borderBottom: '1px solid var(--color-low)', color: 'var(--color-low)', padding: '10px 24px', fontSize: '0.85rem', textAlign: 'center' }}>
          ✅ {syncLog}
        </div>
      )}

      {syncStatus === 'error' && syncLog && (
        <div className="no-print" style={{ background: 'rgba(239, 68, 68, 0.15)', borderBottom: '1px solid var(--color-high)', color: 'var(--color-high)', padding: '10px 24px', fontSize: '0.85rem', textAlign: 'center' }}>
          ⚠️ Sync Warning: {syncLog}
        </div>
      )}

      {/* Offline Status Warning Card */}
      {!isOnline && (
        <div className="no-print" style={{ background: 'rgba(234, 179, 8, 0.12)', borderBottom: '1px solid var(--color-mod)', color: 'var(--color-mod)', padding: '10px 24px', fontSize: '0.85rem', textAlign: 'center' }}>
          ⚠️ Offline mode active. Patient records and ultrasound sweeps will be saved locally in IndexedDB cache and auto-sync when connection is restored.
        </div>
      )}

      {/* RENDER ACTIVE ROLE PORTAL */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {role === 'midwife' ? (
          <MidwifePortal isOnline={isOnline} onSyncTrigger={handleSyncTrigger} />
        ) : (
          <SpecialistPortal />
        )}
      </main>

      {/* Footer Branding */}
      <footer className="no-print" style={{ textAlign: 'center', padding: '20px', fontSize: '0.75rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>
        <p>Kalinga AI © 2026 Cebu Institute of Technology University | Team Panic! at the Workplace</p>
        <p style={{ marginTop: '4px' }}>NPC Advisory 2024.12.19 & DPA of 2012 Compliant Framework | HIPAA Alignment</p>
      </footer>

    </div>
  );
}
