/**
 * Unit tests for logger middleware sanitization
 * Tests that sensitive data (PhilHealth IDs, patient names) are redacted from logs
 */

const { sanitizeSensitiveData } = require('./logger');

// Test cases for sanitization
console.log('Testing sanitizeSensitiveData function...\n');

// Test 1: PhilHealth ID in object
const test1 = {
  id: '1234-567890-1',
  philhealthId: '9876-543210-9',
  firstName: 'Maria',
  lastName: 'Santos'
};
const result1 = sanitizeSensitiveData(test1);
console.log('Test 1 - PhilHealth ID and names in object:');
console.log('Input:', test1);
console.log('Output:', result1);
console.log('✓ PhilHealth IDs redacted:', result1.id === '[REDACTED]' && result1.philhealthId === '[REDACTED]');
console.log('✓ Names redacted:', result1.firstName === '[REDACTED]' && result1.lastName === '[REDACTED]');
console.log('');

// Test 2: PhilHealth ID in URL path
const test2 = '/api/patients/1234-567890-1/scans';
const result2 = sanitizeSensitiveData(test2);
console.log('Test 2 - PhilHealth ID in URL:');
console.log('Input:', test2);
console.log('Output:', result2);
console.log('✓ PhilHealth ID pattern replaced:', result2.includes('****-********-*'));
console.log('');

// Test 3: Nested object with sensitive data
const test3 = {
  scan: {
    patient: {
      id: '1234-567890-1',
      firstName: 'Elena',
      lastName: 'Garcia'
    },
    riskScore: 78
  }
};
const result3 = sanitizeSensitiveData(test3);
console.log('Test 3 - Nested object with sensitive data:');
console.log('Input:', JSON.stringify(test3, null, 2));
console.log('Output:', JSON.stringify(result3, null, 2));
console.log('✓ Nested names redacted:', result3.scan.patient.firstName === '[REDACTED]');
console.log('✓ Non-sensitive data preserved:', result3.scan.riskScore === 78);
console.log('');

// Test 4: Array with multiple PhilHealth IDs
const test4 = {
  patients: [
    { id: '1111-222222-3', name: 'Patient A' },
    { id: '4444-555555-6', name: 'Patient B' }
  ]
};
const result4 = sanitizeSensitiveData(test4);
console.log('Test 4 - Array with multiple records:');
console.log('Input:', JSON.stringify(test4, null, 2));
console.log('Output:', JSON.stringify(result4, null, 2));
console.log('✓ All IDs redacted:', result4.patients.every(p => p.id === '[REDACTED]'));
console.log('✓ All names redacted:', result4.patients.every(p => p.name === '[REDACTED]'));
console.log('');

// Test 5: String with embedded PhilHealth ID
const test5 = 'Patient 1234-567890-1 has been registered';
const result5 = sanitizeSensitiveData(test5);
console.log('Test 5 - String with embedded PhilHealth ID:');
console.log('Input:', test5);
console.log('Output:', result5);
console.log('✓ ID pattern replaced in string:', result5.includes('****-********-*'));
console.log('');

// Test 6: Non-sensitive data should pass through
const test6 = {
  bp: '120/80',
  weight: 65,
  height: 165,
  riskScore: 42
};
const result6 = sanitizeSensitiveData(test6);
console.log('Test 6 - Non-sensitive data preservation:');
console.log('Input:', test6);
console.log('Output:', result6);
console.log('✓ All values preserved:', 
  result6.bp === test6.bp && 
  result6.weight === test6.weight && 
  result6.height === test6.height &&
  result6.riskScore === test6.riskScore
);
console.log('');

console.log('All sanitization tests completed!');
