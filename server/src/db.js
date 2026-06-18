const fs = require('fs/promises');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const initialData = {
  patients: [],
  scans: [],
  notifications: []
};

class JSONDatabase {
  constructor() {
    this.data = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    try {
      // Ensure data folder exists
      await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
      
      try {
        const fileContent = await fs.readFile(DB_PATH, 'utf8');
        this.data = JSON.parse(fileContent);
      } catch (err) {
        // Create file if it doesn't exist
        this.data = { ...initialData };
        await this.save();
      }
      this.initialized = true;
    } catch (err) {
      console.error("Failed to initialize database:", err);
      this.data = { ...initialData };
    }
  }

  async save() {
    try {
      await fs.writeFile(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error("Failed to save database:", err);
    }
  }

  async getPatients() {
    await this.init();
    return this.data.patients;
  }

  async getPatientById(id) {
    await this.init();
    return this.data.patients.find(p => p.id === id);
  }

  async savePatient(patient) {
    await this.init();
    const index = this.data.patients.findIndex(p => p.id === patient.id);
    if (index !== -1) {
      this.data.patients[index] = { ...this.data.patients[index], ...patient };
    } else {
      this.data.patients.push(patient);
    }
    await this.save();
    return patient;
  }

  async getScans() {
    await this.init();
    return this.data.scans;
  }

  async getScanById(id) {
    await this.init();
    return this.data.scans.find(s => s.id === id);
  }

  async saveScan(scan) {
    await this.init();
    const index = this.data.scans.findIndex(s => s.id === scan.id);
    if (index !== -1) {
      this.data.scans[index] = { ...this.data.scans[index], ...scan };
    } else {
      this.data.scans.push(scan);
    }
    
    // Also update matching patient status
    const patientIndex = this.data.patients.findIndex(p => p.id === scan.patientId);
    if (patientIndex !== -1) {
      this.data.patients[patientIndex].status = scan.status;
      this.data.patients[patientIndex].riskScore = scan.riskScore;
      this.data.patients[patientIndex].heartRate = scan.fetalHeartRate;
      this.data.patients[patientIndex].fetalAge = scan.gestationalAgeEstimate;
    }
    
    await this.save();
    return scan;
  }

  async getNotifications() {
    await this.init();
    return this.data.notifications;
  }

  async saveNotification(notif) {
    await this.init();
    const index = this.data.notifications.findIndex(n => n.id === notif.id);
    if (index !== -1) {
      this.data.notifications[index] = { ...this.data.notifications[index], ...notif };
    } else {
      this.data.notifications.unshift(notif);
    }
    await this.save();
    return notif;
  }
}

module.exports = new JSONDatabase();
