import fs from 'fs';
import path from 'path';

export interface StoredUser {
  id: string;
  phone: string;
  name: string;
  ageGroup: string;
  createdAt: string;
  trustScore: number;
}

export interface StoredFeedback {
  id: string;
  journeyId?: string;
  safetyRating: number;
  lightingAdequate: boolean;
  detourWorthIt: boolean;
  notes?: string;
  createdAt: string;
}

export interface StoredIncidentData {
  id: string;
  userId: string;
  userPhone?: string;
  lat: number;
  lng: number;
  category: string;
  description?: string;
  severityAuto?: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  geoCellKey: string;
}

interface OtpRecord {
  phone: string;
  otp: string;
  expiresAt: number;
  attempts: number;
}

interface SendRateRecord {
  timestamps: number[];
}

interface DataStoreSchema {
  users: Record<string, StoredUser>;
  feedbacks: StoredFeedback[];
  incidents: StoredIncidentData[];
  otpSessions: Record<string, OtpRecord>;
  sendRateLimits: Record<string, SendRateRecord>;
}

export class PersistenceService {
  private static instance: PersistenceService;
  private storeFilePath: string;
  private store: DataStoreSchema;

  private constructor() {
    const dataDir = path.resolve(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.storeFilePath = path.join(dataDir, 'store.json');
    this.store = this.loadStore();
  }

  public static getInstance(): PersistenceService {
    if (!PersistenceService.instance) {
      PersistenceService.instance = new PersistenceService();
    }
    return PersistenceService.instance;
  }

  private loadStore(): DataStoreSchema {
    if (fs.existsSync(this.storeFilePath)) {
      try {
        const raw = fs.readFileSync(this.storeFilePath, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.warn('[PersistenceService] Warning loading store.json, reinitializing empty store');
      }
    }

    // Default Seed Data
    const defaultStore: DataStoreSchema = {
      users: {
        'user_demo_kolkata': {
          id: 'user_demo_kolkata',
          phone: '+919876543210',
          name: 'Ananya Sen',
          ageGroup: 'adult',
          createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
          trustScore: 0.85
        }
      },
      feedbacks: [],
      incidents: [
        // Verified Kolkata Curated Ground-Truth Safety Reports
        {
          id: 'inc_kol_1',
          userId: 'user_demo_kolkata',
          userPhone: '+919876543210',
          lat: 22.5530,
          lng: 88.3510,
          category: 'poor_lighting',
          description: 'Dark alleyway section behind Park Street post 9:30 PM with unmaintained municipal sodium lamps.',
          severityAuto: 'medium',
          status: 'verified',
          createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
          geoCellKey: '22.553_88.351'
        },
        {
          id: 'inc_kol_2',
          userId: 'user_demo_kolkata',
          userPhone: '+919876543210',
          lat: 22.5205,
          lng: 88.3650,
          category: 'unsafe_area',
          description: 'Ballygunge circular road crossing lacks footpaths and police kiosk unattended after 10 PM.',
          severityAuto: 'medium',
          status: 'verified',
          createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
          geoCellKey: '22.521_88.365'
        },
        // Delhi Seed Hazards
        {
          id: 'inc_delhi_1',
          userId: 'user_demo_delhi',
          userPhone: '+919876543219',
          lat: 28.6300,
          lng: 77.2180,
          category: 'poor_lighting',
          description: 'Streetlamps non-functional along inner ring road near Janpath subway post 9 PM.',
          severityAuto: 'medium',
          status: 'verified',
          createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
          geoCellKey: '28.630_77.218'
        },
        {
          id: 'inc_delhi_2',
          userId: 'user_demo_delhi',
          userPhone: '+919876543219',
          lat: 28.6850,
          lng: 77.2120,
          category: 'poor_lighting',
          description: 'Dark stretch with unlit lamps along North Campus ridge boundary road behind Miranda House.',
          severityAuto: 'medium',
          status: 'verified',
          createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
          geoCellKey: '28.685_77.212'
        },
        {
          id: 'inc_delhi_3',
          userId: 'user_demo_delhi',
          userPhone: '+919876543219',
          lat: 28.6650,
          lng: 77.2270,
          category: 'unsafe_area',
          description: 'Pedestrian subway near Kashmere Gate ISBT lacks security personnel after 8:30 PM.',
          severityAuto: 'high',
          status: 'verified',
          createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
          geoCellKey: '28.665_77.227'
        },
        {
          id: 'inc_delhi_4',
          userId: 'user_demo_delhi',
          userPhone: '+919876543219',
          lat: 28.5470,
          lng: 77.1940,
          category: 'harassment',
          description: 'Groups loitering with aggressive catcalling along unlit parking exit lane of Hauz Khas Village.',
          severityAuto: 'critical',
          status: 'verified',
          createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          geoCellKey: '28.547_77.194'
        }
      ],
      otpSessions: {},
      sendRateLimits: {}
    };

    this.saveStore(defaultStore);
    return defaultStore;
  }

  /**
   * DISK WRITE & CONCURRENCY POSTURE:
   * Synchronous file write with direct path target.
   * CAVEAT: Operates under a single-process/single-writer assumption. For clustered,
   * multi-worker, or multi-instance deployments, migration to PostgreSQL with ACID 
   * transactions is strictly mandatory.
   */
  private saveStore(storeToSave?: DataStoreSchema): void {
    try {
      const data = storeToSave || this.store;
      fs.writeFileSync(this.storeFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[PersistenceService] Failed to persist store to disk:', err);
    }
  }

  public resetForTesting(): void {
    const dataDir = path.resolve(__dirname, '../../data');
    this.storeFilePath = path.join(dataDir, 'store.json');
    if (fs.existsSync(this.storeFilePath)) {
      try { fs.unlinkSync(this.storeFilePath); } catch (_) {}
    }
    this.store = this.loadStore();
  }

  // --- Walk Feedback Methods ---
  public recordFeedback(feedback: Omit<StoredFeedback, 'id' | 'createdAt'>): StoredFeedback {
    const record: StoredFeedback = {
      id: `fbk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...feedback,
      createdAt: new Date().toISOString()
    };
    this.store.feedbacks.push(record);
    this.saveStore();
    return record;
  }

  public getFeedbacks(): StoredFeedback[] {
    return this.store.feedbacks;
  }

  // --- Incident Reports Methods ---
  public getIncidents(): StoredIncidentData[] {
    return this.store.incidents;
  }

  public saveIncident(incident: StoredIncidentData): void {
    const idx = this.store.incidents.findIndex(i => i.id === incident.id);
    if (idx >= 0) {
      this.store.incidents[idx] = incident;
    } else {
      this.store.incidents.push(incident);
    }
    this.saveStore();
  }

  // --- User Methods ---
  public getUser(userId: string): StoredUser | undefined {
    return this.store.users[userId];
  }

  public getUserByPhone(phone: string): StoredUser | undefined {
    return Object.values(this.store.users).find(u => u.phone === phone);
  }

  public findOrCreateUserByPhone(phone: string, name: string = 'SAHELI Sister'): StoredUser {
    const existing = this.getUserByPhone(phone);
    if (existing) return existing;

    const newUser: StoredUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      phone,
      name,
      ageGroup: 'adult',
      createdAt: new Date().toISOString(),
      trustScore: 0.5 // initial baseline trust score for new phone-verified account
    };

    this.store.users[newUser.id] = newUser;
    this.saveStore();
    return newUser;
  }

  // --- Phone OTP & Rate Limiting ---
  /**
   * Rate limits OTP sends per phone number: max 3 sends per hour
   */
  public checkAndRecordOtpSendRate(phone: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    let record = this.store.sendRateLimits[phone];
    if (!record) {
      record = { timestamps: [] };
      this.store.sendRateLimits[phone] = record;
    }

    // Purge timestamps older than 1 hour
    record.timestamps = record.timestamps.filter(ts => ts > oneHourAgo);

    if (record.timestamps.length >= 3) {
      return { allowed: false, remaining: 0 };
    }

    record.timestamps.push(now);
    this.saveStore();
    return { allowed: true, remaining: 3 - record.timestamps.length };
  }

  public saveOtp(phone: string, otp: string, ttlSeconds: number = 300): void {
    this.store.otpSessions[phone] = {
      phone,
      otp,
      expiresAt: Date.now() + ttlSeconds * 1000,
      attempts: 0
    };
    this.saveStore();
  }

  public verifyOtp(phone: string, inputOtp: string): { valid: boolean; reason?: string } {
    const session = this.store.otpSessions[phone];
    if (!session) {
      return { valid: false, reason: 'No OTP requested for this phone number.' };
    }

    if (Date.now() > session.expiresAt) {
      delete this.store.otpSessions[phone];
      this.saveStore();
      return { valid: false, reason: 'OTP expired. Please request a new one.' };
    }

    if (session.attempts >= 5) {
      delete this.store.otpSessions[phone];
      this.saveStore();
      return { valid: false, reason: 'Max incorrect attempts exceeded. Please request a new OTP.' };
    }

    if (session.otp !== inputOtp) {
      session.attempts++;
      if (session.attempts >= 5) {
        delete this.store.otpSessions[phone];
        this.saveStore();
        return { valid: false, reason: 'Max incorrect attempts exceeded. Please request a new OTP.' };
      }
      this.saveStore();
      return { valid: false, reason: `Incorrect OTP code. (${5 - session.attempts} attempts remaining)` };
    }

    // OTP is valid: consume it immediately
    delete this.store.otpSessions[phone];
    this.saveStore();
    return { valid: true };
  }
}
