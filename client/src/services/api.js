const API_BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock-jwt-token', // Add mock token for development
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    // Check if it's a network error
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Cannot connect to server. Please check if the backend is running on http://localhost:5000');
    }
    throw error;
  }
}

export const api = {
  async getHealth() {
    return request('/health');
  },

  async getPatients() {
    return request('/patients');
  },

  async registerPatient(patient) {
    return request('/patients', {
      method: 'POST',
      body: patient
    });
  },

  async updatePatient(id, patient) {
    return request(`/patients/${id}`, {
      method: 'PATCH',
      body: patient
    });
  },

  async getScans() {
    return request('/scans');
  },

  async saveScan(scan) {
    return request('/scans', {
      method: 'POST',
      body: scan
    });
  },

  async getPendingScans() {
    return request('/scans/pending');
  },

  async getScanById(id) {
    return request(`/scans/${id}`);
  },

  async verifyScan(id, reviewData) {
    return request(`/scans/${id}/verify`, {
      method: 'PATCH',
      body: reviewData
    });
  },

  async classifyScan(patientData) {
    return request('/ai/classify', {
      method: 'POST',
      body: patientData
    });
  },

  async submitTriagePacket(triageData) {
    return request('/triage', {
      method: 'POST',
      body: triageData
    });
  },

  async getTriageQueue(filters = {}) {
    const params = new URLSearchParams(filters);
    return request(`/triage/queue?${params}`);
  },

  async submitVerdict(triageId, verdictData) {
    return request(`/triage/${triageId}/verdict`, {
      method: 'PUT',
      body: verdictData
    });
  },

  async getTriageById(id) {
    return request(`/triage/${id}`);
  },

  async getTriageReport(id) {
    return request(`/triage/${id}/report`);
  },

  async getNotifications() {
    return request('/notifications');
  },

  async markNotificationRead(id) {
    return request(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
  }
};
