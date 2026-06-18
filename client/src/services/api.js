const API_BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
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

  async getNotifications() {
    return request('/notifications');
  },

  async markNotificationRead(id) {
    return request(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
  }
};
