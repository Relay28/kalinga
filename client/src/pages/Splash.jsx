import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [loadText, setLoadText] = useState('Initializing KalingaAI...');

  useEffect(() => {
    // Increment progress bar
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 4;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress < 30) {
      setLoadText('Initializing FetalCLIP models...');
    } else if (progress < 60) {
      setLoadText('Loading preeclampsia matrices...');
    } else if (progress < 90) {
      setLoadText('Connecting secure storage vault...');
    } else {
      setLoadText('Systems ready.');
    }
    
    if (progress >= 100) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, navigate]);

  return (
    <div className="device-container">
      <div className="viewport-screen" style={{
        backgroundColor: '#0f172a', // Sleek dark slate bootup
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        padding: '40px'
      }}>
        {/* Brand logo */}
        <img 
          src="http://localhost:5000/Screens/KalingaAI_Logo.png" 
          alt="kalinga" 
          style={{ maxWidth: '160px', height: 'auto', marginBottom: '40px', filter: 'brightness(0) invert(1)' }}
        />
        
        {/* Progress bar container */}
        <div style={{
          width: '100%',
          maxWidth: '240px',
          height: '4px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '16px'
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            backgroundColor: 'var(--primary-teal)',
            transition: 'width 0.1s linear',
            boxShadow: '0 0 8px var(--primary-teal)'
          }} />
        </div>

        {/* Dynamic status text */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '11px',
          fontWeight: '500',
          color: 'var(--text-muted)',
          letterSpacing: '0.5px',
          height: '15px'
        }}>
          {loadText}
        </div>
      </div>
    </div>
  );
}
