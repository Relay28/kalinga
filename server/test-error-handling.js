/**
 * Manual Test Script for API Error Handling
 * Tests the standardized error response format and validation
 */

const baseUrl = 'http://localhost:5000/api';

async function testErrorHandling() {
  console.log('=== Testing API Error Handling ===\n');

  // Test 1: Missing required field (422 Unprocessable Entity)
  console.log('Test 1: Create patient without required fields');
  try {
    const response = await fetch(`${baseUrl}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'John' }) // Missing id, lastName, dob
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('✅ Should return 422 with validation details\n');
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message, '\n');
  }

  // Test 2: Invalid data format (422 Unprocessable Entity)
  console.log('Test 2: Create patient with invalid blood pressure format');
  try {
    const response = await fetch(`${baseUrl}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-123',
        firstName: 'John',
        lastName: 'Doe',
        dob: '1990-01-01',
        bp: 'invalid-format' // Should be systolic/diastolic
      })
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('✅ Should return 422 with BP format error\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message, '\n');
  }

  // Test 3: Not found resource (404)
  console.log('Test 3: Get non-existent scan');
  try {
    const response = await fetch(`${baseUrl}/scans/nonexistent-id`);
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('✅ Should return 404 with standardized error format\n');
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message, '\n');
  }

  // Test 4: Invalid route (404)
  console.log('Test 4: Access non-existent endpoint');
  try {
    const response = await fetch(`${baseUrl}/nonexistent-endpoint`);
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('✅ Should return 404 with route not found message\n');
  } catch (error) {
    console.error('❌ Test 4 failed:', error.message, '\n');
  }

  // Test 5: Create scan with invalid patient reference (404)
  console.log('Test 5: Create scan with non-existent patient');
  try {
    const response = await fetch(`${baseUrl}/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'scan-test-123',
        patientId: 'nonexistent-patient-id',
        riskScore: 50
      })
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('✅ Should return 404 with patient not found error\n');
  } catch (error) {
    console.error('❌ Test 5 failed:', error.message, '\n');
  }

  // Test 6: Valid patient creation (201)
  console.log('Test 6: Create valid patient');
  try {
    const response = await fetch(`${baseUrl}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-patient-001',
        firstName: 'Maria',
        lastName: 'Test',
        dob: '1995-03-15',
        bp: '120/80',
        weight: 65,
        height: 165
      })
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('✅ Should return 201 with patient data\n');
  } catch (error) {
    console.error('❌ Test 6 failed:', error.message, '\n');
  }

  // Test 7: Specialist verdict with missing required field (422)
  console.log('Test 7: Submit verdict without required field');
  try {
    const response = await fetch(`${baseUrl}/scans/some-scan-id/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: 'Some notes' // Missing required verdict field
      })
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('✅ Should return 422 with verdict required error\n');
  } catch (error) {
    console.error('❌ Test 7 failed:', error.message, '\n');
  }

  // Test 8: Specialist verdict with invalid value (422)
  console.log('Test 8: Submit verdict with invalid value');
  try {
    const response = await fetch(`${baseUrl}/scans/some-scan-id/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verdict: 'Invalid Verdict Type' // Should be one of: Normal, High Risk, Urgent Referral
      })
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('✅ Should return 422 with valid values error\n');
  } catch (error) {
    console.error('❌ Test 8 failed:', error.message, '\n');
  }

  console.log('=== All tests completed ===');
}

// Run tests
testErrorHandling().catch(console.error);
