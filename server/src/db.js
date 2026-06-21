const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');
const TEMP_PATH = path.join(__dirname, '..', 'data', 'db.json.tmp');

const initialData = {
  patients: [],
  scans: [],
  notifications: []
};

class JSONDatabase {
  constructor() {
    this.data = null;
    this.initialized = false;
    // In-memory cache for frequently accessed data
    this.cache = {
      patients: new Map(),
      scans: new Map(),
      notifications: new Map(),
      lastCacheUpdate: null
    };
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache validity
  }

  async init() {
    if (this.initialized) return;
    try {
      // Ensure data folder and backup folder exist
      await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      
      try {
        const fileContent = await fs.readFile(DB_PATH, 'utf8');
        this.data = JSON.parse(fileContent);
        this._validateDataStructure(this.data);
        this._populateCache();
      } catch (err) {
        // Create file if it doesn't exist or is corrupted
        console.warn("Database file not found or corrupted, creating new database:", err.message);
        this.data = { ...initialData };
        await this.save();
      }
      this.initialized = true;
    } catch (err) {
      console.error("Failed to initialize database:", err);
      this.data = { ...initialData };
    }
  }

  /**
   * Validate the structure of database data
   * @param {Object} data - The database data to validate
   * @throws {Error} If data structure is invalid
   */
  _validateDataStructure(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Database data must be an object');
    }
    if (!Array.isArray(data.patients)) {
      throw new Error('Database must have patients array');
    }
    if (!Array.isArray(data.scans)) {
      throw new Error('Database must have scans array');
    }
    if (!Array.isArray(data.notifications)) {
      throw new Error('Database must have notifications array');
    }
  }

  /**
   * Populate in-memory cache from database data
   */
  _populateCache() {
    this.cache.patients.clear();
    this.cache.scans.clear();
    this.cache.notifications.clear();

    this.data.patients.forEach(patient => {
      if (patient.id) {
        this.cache.patients.set(patient.id, patient);
      }
    });

    this.data.scans.forEach(scan => {
      if (scan.id) {
        this.cache.scans.set(scan.id, scan);
      }
    });

    this.data.notifications.forEach(notif => {
      if (notif.id) {
        this.cache.notifications.set(notif.id, notif);
      }
    });

    this.cache.lastCacheUpdate = Date.now();
  }

  /**
   * Check if cache is still valid
   * @returns {boolean} True if cache is valid
   */
  _isCacheValid() {
    if (!this.cache.lastCacheUpdate) return false;
    return (Date.now() - this.cache.lastCacheUpdate) < this.cacheTimeout;
  }

  /**
   * Invalidate cache
   */
  _invalidateCache() {
    this.cache.lastCacheUpdate = null;
  }

  /**
   * Create a backup of the current database file
   * @returns {Promise<string>} Path to the backup file
   */
  async _createBackup() {
    try {
      // Check if main database file exists
      if (!fsSync.existsSync(DB_PATH)) {
        console.log("No database file to backup");
        return null;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(BACKUP_DIR, `db-backup-${timestamp}.json`);
      
      await fs.copyFile(DB_PATH, backupPath);
      console.log(`Database backup created: ${backupPath}`);
      
      // Clean up old backups (keep last 10)
      await this._cleanupOldBackups();
      
      return backupPath;
    } catch (err) {
      console.error("Failed to create backup:", err);
      throw err;
    }
  }

  /**
   * Clean up old backup files, keeping only the most recent ones
   */
  async _cleanupOldBackups() {
    try {
      const files = await fs.readdir(BACKUP_DIR);
      const backupFiles = files
        .filter(f => f.startsWith('db-backup-') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(BACKUP_DIR, f),
          stat: fsSync.statSync(path.join(BACKUP_DIR, f))
        }))
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());

      // Keep only the 10 most recent backups
      const MAX_BACKUPS = 10;
      if (backupFiles.length > MAX_BACKUPS) {
        const filesToDelete = backupFiles.slice(MAX_BACKUPS);
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
          console.log(`Deleted old backup: ${file.name}`);
        }
      }
    } catch (err) {
      console.warn("Failed to cleanup old backups:", err);
    }
  }

  /**
   * Atomic file write to prevent corruption
   * Writes to temporary file first, then renames to actual file
   */
  async save() {
    try {
      // Validate data before saving
      this._validateDataStructure(this.data);
      
      // Create backup before writing
      await this._createBackup();
      
      // Write to temporary file first (atomic write pattern)
      const jsonData = JSON.stringify(this.data, null, 2);
      await fs.writeFile(TEMP_PATH, jsonData, 'utf8');
      
      // Verify the temporary file is valid JSON
      const verifyContent = await fs.readFile(TEMP_PATH, 'utf8');
      JSON.parse(verifyContent); // Will throw if invalid
      
      // Atomic rename (on most file systems, this is atomic)
      await fs.rename(TEMP_PATH, DB_PATH);
      
      // Refresh cache after successful save
      this._populateCache();
      
      console.log("Database saved successfully");
    } catch (err) {
      console.error("Failed to save database:", err);
      // Clean up temp file if it exists
      try {
        if (fsSync.existsSync(TEMP_PATH)) {
          await fs.unlink(TEMP_PATH);
        }
      } catch (cleanupErr) {
        console.warn("Failed to cleanup temp file:", cleanupErr);
      }
      throw err;
    }
  }

  /**
   * Validate patient data
   * @param {Object} patient - Patient data to validate
   * @returns {Object} Validated patient data
   * @throws {Error} If validation fails
   */
  _validatePatient(patient) {
    if (!patient || typeof patient !== 'object') {
      throw new Error('Patient must be an object');
    }
    if (!patient.id) {
      throw new Error('Patient must have an id');
    }
    if (!patient.firstName || typeof patient.firstName !== 'string') {
      throw new Error('Patient must have a valid firstName');
    }
    if (!patient.lastName || typeof patient.lastName !== 'string') {
      throw new Error('Patient must have a valid lastName');
    }
    return patient;
  }

  /**
   * Validate scan data
   * @param {Object} scan - Scan data to validate
   * @returns {Object} Validated scan data
   * @throws {Error} If validation fails
   */
  _validateScan(scan) {
    if (!scan || typeof scan !== 'object') {
      throw new Error('Scan must be an object');
    }
    if (!scan.id) {
      throw new Error('Scan must have an id');
    }
    if (!scan.patientId) {
      throw new Error('Scan must have a patientId');
    }
    return scan;
  }

  /**
   * Validate notification data
   * @param {Object} notif - Notification data to validate
   * @returns {Object} Validated notification data
   * @throws {Error} If validation fails
   */
  _validateNotification(notif) {
    if (!notif || typeof notif !== 'object') {
      throw new Error('Notification must be an object');
    }
    if (!notif.id) {
      throw new Error('Notification must have an id');
    }
    if (!notif.patientId) {
      throw new Error('Notification must have a patientId');
    }
    return notif;
  }

  async getPatients() {
    await this.init();
    
    // Use cache if valid
    if (this._isCacheValid() && this.cache.patients.size > 0) {
      return Array.from(this.cache.patients.values());
    }
    
    // Refresh cache from data
    this._populateCache();
    return this.data.patients;
  }

  async getPatientById(id) {
    await this.init();
    
    // Try cache first for single record lookup
    if (this._isCacheValid() && this.cache.patients.has(id)) {
      return this.cache.patients.get(id);
    }
    
    // Fallback to data lookup
    const patient = this.data.patients.find(p => p.id === id);
    
    // Update cache if found
    if (patient) {
      this.cache.patients.set(id, patient);
    }
    
    return patient;
  }

  async savePatient(patient) {
    await this.init();
    
    // Validate patient data before saving
    this._validatePatient(patient);
    
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
    
    // Use cache if valid
    if (this._isCacheValid() && this.cache.scans.size > 0) {
      return Array.from(this.cache.scans.values());
    }
    
    // Refresh cache from data
    this._populateCache();
    return this.data.scans;
  }

  async getScanById(id) {
    await this.init();
    
    // Try cache first
    if (this._isCacheValid() && this.cache.scans.has(id)) {
      return this.cache.scans.get(id);
    }
    
    // Fallback to data lookup
    const scan = this.data.scans.find(s => s.id === id);
    
    // Update cache if found
    if (scan) {
      this.cache.scans.set(id, scan);
    }
    
    return scan;
  }

  async saveScan(scan) {
    await this.init();
    
    // Validate scan data before saving
    this._validateScan(scan);
    
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
    
    // Use cache if valid
    if (this._isCacheValid() && this.cache.notifications.size > 0) {
      return Array.from(this.cache.notifications.values());
    }
    
    // Refresh cache from data
    this._populateCache();
    return this.data.notifications;
  }

  async saveNotification(notif) {
    await this.init();
    
    // Validate notification data before saving
    this._validateNotification(notif);
    
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
