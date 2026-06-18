import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ showToast }) {
  const navigate = useNavigate();
  const [role, setRole] = useState('midwife'); // 'midwife' or 'specialist'
  const [username, setUsername] = useState('Ms. Midwife');
  const [password, setPassword] = useState('password');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (username.trim() === '') {
      showToast("Please enter a username", "warning");
      return;
    }
    showToast(`Welcome back, ${username}!`, "success");
    if (role === 'midwife') {
      navigate('/dashboard');
    } else {
      navigate('/specialist');
    }
  };

  return (
    <div className="device-container">
      <div className="viewport-screen" style={{
        justifyContent: 'center',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img 
            src="http://localhost:5000/Screens/KalingaAI_Logo.png" 
            alt="kalinga" 
            style={{ maxWidth: '140px', height: 'auto' }}
          />
        </div>

        {/* Role Switcher Selector */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          backgroundColor: 'var(--bg-light)',
          padding: '4px',
          borderRadius: '10px',
          marginBottom: '28px',
          border: '1px solid var(--border-color)'
        }}>
          <button
            type="button"
            onClick={() => {
              setRole('midwife');
              setUsername('Ms. Midwife');
            }}
            style={{
              padding: '10px 0',
              border: 'none',
              borderRadius: '8px',
              fontFamily: 'var(--font-display)',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              backgroundColor: role === 'midwife' ? 'var(--primary-teal)' : 'transparent',
              color: role === 'midwife' ? '#fff' : 'var(--text-medium)',
              transition: 'all 0.2s ease'
            }}
          >
            Midwife
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('specialist');
              setUsername('Dr. Duque');
            }}
            style={{
              padding: '10px 0',
              border: 'none',
              borderRadius: '8px',
              fontFamily: 'var(--font-display)',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              backgroundColor: role === 'specialist' ? 'var(--primary-teal)' : 'transparent',
              color: role === 'specialist' ? '#fff' : 'var(--text-medium)',
              transition: 'all 0.2s ease'
            }}
          >
            OB-GYN Specialist
          </button>
        </div>

        <form onSubmit={handleLoginSubmit}>
          <div className="form-group">
            <label htmlFor="login-username">Username / ID number</label>
            <input 
              type="text" 
              id="login-username" 
              className="form-input" 
              required 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input 
              type="password" 
              id="login-password" 
              className="form-input" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '32px'
          }}>
            <button type="button" className="btn-text">Register</button>
            <button type="submit" className="btn-blue">Login</button>
          </div>
        </form>
      </div>
    </div>
  );
}
