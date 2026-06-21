import React, { useState } from 'react';
import { Plus, Save, AlertCircle, Check } from 'lucide-react';
import { FormField, Button, Card, Badge } from '../components';

/**
 * ComponentShowcase Page
 * 
 * Demonstrates the reusable component library
 * Access at: /showcase (for development/testing)
 */
export default function ComponentShowcase() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert('Form submitted!');
    }, 2000);
  };

  return (
    <div className="device-container">
      <div className="device-header-notch">
        <span>10:30</span>
        <div className="icons">
          <Badge variant="success" dot />
          <span style={{ fontSize: '10px', fontWeight: '600' }}>Online</span>
        </div>
      </div>

      <div className="app-viewport">
        <div className="viewport-screen">
          <h1 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '24px', 
            fontWeight: '800',
            marginBottom: '8px',
            color: 'var(--primary-teal)'
          }}>
            Component Library
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-medium)', marginBottom: '24px' }}>
            Reusable UI components for the Kalinga AI system
          </p>

          {/* Buttons Section */}
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '700', 
            marginBottom: '16px',
            fontFamily: 'var(--font-display)'
          }}>
            Buttons
          </h2>

          <Card variant="outlined" padding="medium" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button variant="primary" icon={<Plus size={16} />}>
                  Primary
                </Button>
                <Button variant="secondary">
                  Secondary
                </Button>
                <Button variant="teal" icon={<Save size={16} />}>
                  Teal
                </Button>
                <Button variant="danger" icon={<AlertCircle size={16} />}>
                  Danger
                </Button>
                <Button variant="success" icon={<Check size={16} />}>
                  Success
                </Button>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button variant="primary" size="small">
                  Small
                </Button>
                <Button variant="primary" size="medium">
                  Medium
                </Button>
                <Button variant="primary" size="large">
                  Large
                </Button>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button variant="primary" disabled>
                  Disabled
                </Button>
                <Button variant="primary" loading>
                  Loading
                </Button>
              </div>

              <Button variant="primary" fullWidth>
                Full Width Button
              </Button>
            </div>
          </Card>

          {/* Badges Section */}
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '700', 
            marginBottom: '16px',
            fontFamily: 'var(--font-display)'
          }}>
            Badges
          </h2>

          <Card variant="outlined" padding="medium" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge variant="success">Active</Badge>
                <Badge variant="warning" icon="⚠">Warning</Badge>
                <Badge variant="danger" icon="!">High Risk</Badge>
                <Badge variant="teal">Normal</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="primary">Submitted</Badge>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge variant="success" size="small">Small</Badge>
                <Badge variant="success" size="medium">Medium</Badge>
                <Badge variant="success" size="large">Large</Badge>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span>Count badges:</span>
                <Badge variant="danger" count={5} />
                <Badge variant="primary" count={23} />
                <Badge variant="success" count={150} />
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span>Dot indicators:</span>
                <Badge variant="success" dot />
                <Badge variant="warning" dot />
                <Badge variant="danger" dot />
              </div>
            </div>
          </Card>

          {/* Cards Section */}
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '700', 
            marginBottom: '16px',
            fontFamily: 'var(--font-display)'
          }}>
            Cards
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <Card variant="default" title="Default Card" subtitle="With title and subtitle">
              <p style={{ fontSize: '13px', color: 'var(--text-medium)' }}>
                This is a default card with shadow and border.
              </p>
            </Card>

            <Card variant="outlined" title="Outlined Card">
              <p style={{ fontSize: '13px', color: 'var(--text-medium)' }}>
                This is an outlined card with thicker border.
              </p>
            </Card>

            <Card variant="elevated" title="Elevated Card" padding="large">
              <p style={{ fontSize: '13px', color: 'var(--text-medium)' }}>
                This is an elevated card with larger shadow.
              </p>
            </Card>

            <Card 
              variant="teal" 
              title="Teal Alert Card" 
              headerAction={<Badge variant="teal" size="small">New</Badge>}
            >
              <p style={{ fontSize: '13px' }}>
                This is a teal-themed card with header action.
              </p>
            </Card>

            <Card variant="warning" title="Warning Card">
              <p style={{ fontSize: '13px' }}>
                This card indicates a warning state.
              </p>
            </Card>

            <Card variant="danger" title="Danger Card">
              <p style={{ fontSize: '13px' }}>
                This card indicates a critical state.
              </p>
            </Card>

            <Card 
              variant="success" 
              title="Success Card"
              footer={
                <Button variant="success" size="small" fullWidth>
                  Continue
                </Button>
              }
            >
              <p style={{ fontSize: '13px' }}>
                This card indicates success with a footer action.
              </p>
            </Card>
          </div>

          {/* Form Fields Section */}
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '700', 
            marginBottom: '16px',
            fontFamily: 'var(--font-display)'
          }}>
            Form Fields
          </h2>

          <Card variant="outlined" padding="medium" style={{ marginBottom: '24px' }}>
            <form onSubmit={handleSubmit}>
              <FormField
                label="Full Name"
                value={name}
                onChange={setName}
                fieldName="name"
                placeholder="Enter your name"
                isValid={name.length > 2}
              />

              <FormField
                label="Email Address"
                value={email}
                onChange={setEmail}
                fieldName="email"
                type="email"
                placeholder="you@example.com"
                error={email && !email.includes('@') ? 'Invalid email format' : ''}
                isValid={email.includes('@') && email.includes('.')}
              />

              <FormField
                label="Phone Number"
                value={phone}
                onChange={setPhone}
                fieldName="phone"
                type="tel"
                placeholder="09XX-XXX-XXXX"
                subLabel="Philippine mobile format"
                required={false}
              />

              <FormField
                label="Account ID"
                value="ACC-12345"
                onChange={() => {}}
                fieldName="accountId"
                readOnly
                required={false}
              />

              <Button 
                type="submit" 
                variant="primary" 
                fullWidth 
                loading={loading}
                style={{ marginTop: '8px' }}
              >
                Submit Form
              </Button>
            </form>
          </Card>

          {/* Clickable Card Example */}
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '700', 
            marginBottom: '16px',
            fontFamily: 'var(--font-display)'
          }}>
            Interactive Cards
          </h2>

          <Card 
            variant="outlined" 
            title="Clickable Patient Card"
            subtitle="Click to view details"
            onClick={() => alert('Card clicked!')}
            style={{ marginBottom: '100px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-teal-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                color: 'var(--primary-teal)'
              }}>
                MC
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px' }}>Maria Cruz</div>
                <div style={{ fontSize: '12px', color: 'var(--text-medium)' }}>ID: 7102-4481-9352</div>
                <Badge variant="warning" size="small" style={{ marginTop: '4px' }}>
                  Pending Review
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
