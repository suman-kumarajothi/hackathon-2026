// =============================================================================
// CMS IoT Management Platform — Unified Backend Service
// =============================================================================
// Structured Redis Key-Namespace Storage with File-Backed Persistent Fallback
// Endpoints:
//   - Authentication & Users: /api/v1/auth/*, /api/v1/users/*
//   - Geographic Hierarchy:   /api/v1/regions, /api/v1/regions/:id/zones
//   - Smart Lamp Inventory:   /api/v1/devices (GET, POST, PUT, GET :id)
//   - Problem 1: Scheduling:  /api/v1/schedules/*
//   - Problem 2: Siting:      /api/v1/deployment/*
//   - Problem 3: Forecast:    /api/v1/forecast/*
//   - Problem 4: Diagnostics: /api/v1/troubleshoot/* (Rules Engine + Voice Chat)
//   - Healthcheck:            /actuator/health, /api/health
// =============================================================================

const http = require('http');
const url = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.SERVER_PORT || process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

// -----------------------------------------------------------------------------
// Security: Password Hashing & Verification (PBKDF2 SHA-512)
// -----------------------------------------------------------------------------
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  try {
    const calculated = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hash, 'hex'));
  } catch (err) {
    return false;
  }
}

// -----------------------------------------------------------------------------
// Structured Key-Namespace Data Store (Redis Key Pattern Model)
// -----------------------------------------------------------------------------
// Keys:
//   smartlamp:meta:version
//   smartlamp:device:{deviceId}
//   smartlamp:devices:all                (Set)
//   smartlamp:region:{regionId}
//   smartlamp:zone:{zoneId}
//   smartlamp:region:{regionId}:zones    (Set)
//   smartlamp:zone:{zoneId}:devices      (Set)
//   smartlamp:schedule:{scheduleId}
//   smartlamp:device:{deviceId}:schedules(Set)
//   smartlamp:telemetry:{deviceId}:latest
//   smartlamp:telemetry:{deviceId}:history (List, bounded)
//   smartlamp:user:{userId}
//   smartlamp:users:by-username:{norm}   (Hash/Index)
//   smartlamp:diagnostic:session:{sessId}
// -----------------------------------------------------------------------------

class StructuredStore {
  constructor() {
    this.storage = new Map();
    this.sets = new Map();
    this.lists = new Map();
    this.activeSessions = new Map(); // token -> session
    this.isLoaded = false;
  }

  init() {
    if (fs.existsSync(STORE_FILE)) {
      try {
        const raw = fs.readFileSync(STORE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.storage) {
          for (const [k, v] of Object.entries(parsed.storage)) this.storage.set(k, v);
          for (const [k, v] of Object.entries(parsed.sets || {})) this.sets.set(k, new Set(v));
          for (const [k, v] of Object.entries(parsed.lists || {})) this.lists.set(k, v);
          this.isLoaded = true;
          console.log(`[Store] Loaded ${this.storage.size} keys from persistent file ${STORE_FILE}`);
          return;
        }
      } catch (err) {
        console.warn('[Store] Could not read existing store.json, re-seeding:', err.message);
      }
    }
    this.seedCanonicalData();
  }

  save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const dump = {
        meta: {
          schemaVersion: '1.2.0',
          platform: 'CMS-Smart-IoT-Operations',
          updatedAt: new Date().toISOString(),
        },
        storage: Object.fromEntries(this.storage),
        sets: Object.fromEntries(
          Array.from(this.sets.entries()).map(([k, s]) => [k, Array.from(s)])
        ),
        lists: Object.fromEntries(this.lists),
      };
      const tempPath = `${STORE_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(dump, null, 2), 'utf8');
      fs.renameSync(tempPath, STORE_FILE);
    } catch (err) {
      console.error('[Store] Failed to persist data to disk:', err.message);
    }
  }

  // Redis-like primitive commands
  set(key, value) {
    this.storage.set(key, value);
    this.save();
  }

  get(key) {
    return this.storage.get(key) || null;
  }

  del(key) {
    const existed = this.storage.delete(key);
    this.sets.delete(key);
    this.lists.delete(key);
    this.save();
    return existed;
  }

  sadd(setKey, member) {
    if (!this.sets.has(setKey)) this.sets.set(setKey, new Set());
    this.sets.get(setKey).add(member);
    this.save();
  }

  srem(setKey, member) {
    if (this.sets.has(setKey)) {
      this.sets.get(setKey).delete(member);
      this.save();
    }
  }

  smembers(setKey) {
    if (!this.sets.has(setKey)) return [];
    return Array.from(this.sets.get(setKey));
  }

  lpush(listKey, item, maxLen = 50) {
    if (!this.lists.has(listKey)) this.lists.set(listKey, []);
    const list = this.lists.get(listKey);
    list.unshift(item);
    if (list.length > maxLen) list.length = maxLen;
    this.save();
  }

  lrange(listKey) {
    return this.lists.get(listKey) || [];
  }

  seedCanonicalData() {
    console.log('[Store] Initializing canonical seed dataset with Redis key structures...');

    // 1. Regions
    const regions = [
      { id: 'reg-bayfront', name: 'District 1: Bayfront & Waterfront Core', code: 'D1-BAY', description: 'Marina, boardwalk, coastal promenade and piers' },
      { id: 'reg-civic', name: 'District 2: Civic Center & Commercial Corridor', code: 'D2-CIVIC', description: 'Downtown boulevard, civic municipal complex, retail artery' },
      { id: 'reg-industrial', name: 'District 3: Industrial Logistics & Clean Tech Park', code: 'D3-IND', description: 'West logistics gates, microgrid facility, warehouse sector' },
    ];
    for (const reg of regions) {
      this.set(`smartlamp:region:${reg.id}`, reg);
      this.sadd('smartlamp:regions:all', reg.id);
    }

    // 2. Zones
    const zones = [
      { id: 'zone-pier12', regionId: 'reg-bayfront', name: 'Pier 12 & Waterfront Promenade', coordinates: { lat: 37.7749, lng: -122.4194 } },
      { id: 'zone-marina', regionId: 'reg-bayfront', name: 'Marina Boardwalk & Harbor Way', coordinates: { lat: 37.7833, lng: -122.4167 } },
      { id: 'zone-commercial', regionId: 'reg-civic', name: 'Greenwood Commercial Boulevard', coordinates: { lat: 37.7911, lng: -122.4012 } },
      { id: 'zone-substation', regionId: 'reg-civic', name: 'District Substation East Corridor', coordinates: { lat: 37.7651, lng: -122.4089 } },
      { id: 'zone-westgate', regionId: 'reg-industrial', name: 'Industrial Park West Gate Area', coordinates: { lat: 37.7699, lng: -122.4288 } },
      { id: 'zone-rooftop', regionId: 'reg-industrial', name: 'Rooftop Irradiance Station West', coordinates: { lat: 37.7589, lng: -122.4355 } },
    ];
    for (const z of zones) {
      this.set(`smartlamp:zone:${z.id}`, z);
      this.sadd(`smartlamp:region:${z.regionId}:zones`, z.id);
      this.sadd('smartlamp:zones:all', z.id);
    }

    // 3. Initial Devices with Canonical Telemetry & Simulated Demodata
    const devices = [
      {
        id: 'DEV-SOL-1042',
        name: 'Smart Pole South Bay #42',
        type: 'Solar Streetlight',
        regionId: 'reg-bayfront',
        regionName: 'District 1: Bayfront & Waterfront Core',
        zoneId: 'zone-pier12',
        zoneName: 'Pier 12 & Waterfront Promenade',
        coordinates: { lat: 37.7749, lng: -122.4194 },
        status: 'online',
        connectivity: 'Cellular 4G/LTE',
        hardware: {
          model: 'Luminary-SolarPole-X400',
          solarRatedWatts: 150,
          batteryCapacityWh: 768,
          lampRatedWatts: 50,
          firmwareVersion: 'v3.4.12-rc2',
          installationDate: '2025-06-12',
        },
        telemetry: {
          batterySoC: 92,
          batteryVoltage: 13.3,
          batteryHealth: 98,
          solarYieldTodayKWh: 3.42,
          currentLoadW: 45,
          panelVoltage: 28.4,
          panelPowerW: 112,
          chargingCurrentA: 3.9,
          temperatureC: 24.2,
          ambientIlluminanceLux: 42000,
          lastSeen: '12 seconds ago',
          isSimulated: true,
        },
        activeSchedule: 'Sunset Adaptive (Eco Mode)',
        activeAlerts: [],
      },
      {
        id: 'DEV-SOL-1043',
        name: 'Smart Pole Marina #08',
        type: 'Solar Streetlight',
        regionId: 'reg-bayfront',
        regionName: 'District 1: Bayfront & Waterfront Core',
        zoneId: 'zone-marina',
        zoneName: 'Marina Boardwalk & Harbor Way',
        coordinates: { lat: 37.7833, lng: -122.4167 },
        status: 'warning',
        connectivity: 'LoRaWAN Mesh',
        hardware: {
          model: 'Luminary-SolarPole-X400',
          solarRatedWatts: 150,
          batteryCapacityWh: 768,
          lampRatedWatts: 60,
          firmwareVersion: 'v3.4.11',
          installationDate: '2025-07-20',
        },
        telemetry: {
          batterySoC: 44,
          batteryVoltage: 12.1,
          batteryHealth: 81,
          solarYieldTodayKWh: 1.84,
          currentLoadW: 60,
          panelVoltage: 21.2,
          panelPowerW: 48,
          chargingCurrentA: 1.6,
          temperatureC: 38.6,
          ambientIlluminanceLux: 41000,
          lastSeen: '1 min ago',
          isSimulated: true,
        },
        activeSchedule: 'Night High Intensity',
        alertMessage: 'Degraded solar yield: High soiling & dust accumulation detected',
        activeAlerts: ['ALT-9038'],
      },
      {
        id: 'DEV-INV-2089',
        name: 'Microgrid Inverter Alpha',
        type: 'Central Energy Hub',
        regionId: 'reg-civic',
        regionName: 'District 2: Civic Center & Commercial Corridor',
        zoneId: 'zone-substation',
        zoneName: 'District Substation East Corridor',
        coordinates: { lat: 37.7651, lng: -122.4089 },
        status: 'online',
        connectivity: 'Cellular 4G/LTE',
        hardware: {
          model: 'GridMaster-MicroHub-5K',
          solarRatedWatts: 5000,
          batteryCapacityWh: 15360,
          lampRatedWatts: 1200,
          firmwareVersion: 'v4.1.0-lts',
          installationDate: '2024-11-05',
        },
        telemetry: {
          batterySoC: 88,
          batteryVoltage: 51.2,
          batteryHealth: 95,
          solarYieldTodayKWh: 42.8,
          currentLoadW: 1240,
          panelVoltage: 58.6,
          panelPowerW: 3800,
          chargingCurrentA: 24.5,
          temperatureC: 31.4,
          ambientIlluminanceLux: 45000,
          lastSeen: '5 seconds ago',
          isSimulated: true,
        },
        activeSchedule: 'Industrial Peak-Shaving',
        activeAlerts: ['ALT-9022'],
      },
      {
        id: 'DEV-SOL-1090',
        name: 'Smart Pole Boulevard #15',
        type: 'Solar Streetlight',
        regionId: 'reg-civic',
        regionName: 'District 2: Civic Center & Commercial Corridor',
        zoneId: 'zone-commercial',
        zoneName: 'Greenwood Commercial Boulevard',
        coordinates: { lat: 37.7911, lng: -122.4012 },
        status: 'critical',
        connectivity: 'NB-IoT',
        hardware: {
          model: 'Luminary-SolarPole-X400',
          solarRatedWatts: 150,
          batteryCapacityWh: 768,
          lampRatedWatts: 60,
          firmwareVersion: 'v3.3.8',
          installationDate: '2025-01-14',
        },
        telemetry: {
          batterySoC: 14,
          batteryVoltage: 10.9,
          batteryHealth: 64,
          solarYieldTodayKWh: 0.45,
          currentLoadW: 0,
          panelVoltage: 16.8,
          panelPowerW: 12,
          chargingCurrentA: 0.4,
          temperatureC: 42.1,
          ambientIlluminanceLux: 39000,
          lastSeen: '8 mins ago',
          isSimulated: true,
        },
        activeSchedule: 'Standard Dusk-to-Dawn',
        alertMessage: 'Cell mismatch anomaly: Predicted failure within 48h',
        activeAlerts: ['ALT-9041'],
      },
      {
        id: 'DEV-MET-3004',
        name: 'Micro-Climatic Irradiance Sensor',
        type: 'Weather & Telemetry Station',
        regionId: 'reg-industrial',
        regionName: 'District 3: Industrial Logistics & Clean Tech Park',
        zoneId: 'zone-rooftop',
        zoneName: 'Rooftop Irradiance Station West',
        coordinates: { lat: 37.7589, lng: -122.4355 },
        status: 'online',
        connectivity: 'Zigbee Mesh',
        hardware: {
          model: 'SolarMeteo-Pro-V2',
          solarRatedWatts: 30,
          batteryCapacityWh: 150,
          lampRatedWatts: 8,
          firmwareVersion: 'v2.8.4',
          installationDate: '2025-08-01',
        },
        telemetry: {
          batterySoC: 99,
          batteryVoltage: 14.1,
          batteryHealth: 100,
          solarYieldTodayKWh: 5.12,
          currentLoadW: 8,
          panelVoltage: 24.1,
          panelPowerW: 28,
          chargingCurrentA: 1.2,
          temperatureC: 21.8,
          ambientIlluminanceLux: 46500,
          lastSeen: '2 seconds ago',
          isSimulated: true,
        },
        activeSchedule: 'Continuous Logging',
        activeAlerts: [],
      },
      {
        id: 'DEV-SOL-1102',
        name: 'Perimeter Light West Ridge #03',
        type: 'Solar Streetlight',
        regionId: 'reg-industrial',
        regionName: 'District 3: Industrial Logistics & Clean Tech Park',
        zoneId: 'zone-westgate',
        zoneName: 'Industrial Park West Gate Area',
        coordinates: { lat: 37.7699, lng: -122.4288 },
        status: 'online',
        connectivity: 'Cellular 4G/LTE',
        hardware: {
          model: 'Luminary-SolarPole-X400',
          solarRatedWatts: 150,
          batteryCapacityWh: 768,
          lampRatedWatts: 50,
          firmwareVersion: 'v3.4.12-rc2',
          installationDate: '2025-09-10',
        },
        telemetry: {
          batterySoC: 85,
          batteryVoltage: 13.1,
          batteryHealth: 92,
          solarYieldTodayKWh: 3.18,
          currentLoadW: 50,
          panelVoltage: 27.9,
          panelPowerW: 105,
          chargingCurrentA: 3.7,
          temperatureC: 25.0,
          ambientIlluminanceLux: 43000,
          lastSeen: '30 seconds ago',
          isSimulated: true,
        },
        activeSchedule: 'High Security Perimeter',
        activeAlerts: [],
      },
    ];

    for (const dev of devices) {
      this.set(`smartlamp:device:${dev.id}`, dev);
      this.sadd('smartlamp:devices:all', dev.id);
      this.sadd(`smartlamp:zone:${dev.zoneId}:devices`, dev.id);
      this.set(`smartlamp:telemetry:${dev.id}:latest`, dev.telemetry);
      this.lpush(`smartlamp:telemetry:${dev.id}:history`, {
        timestamp: new Date().toISOString(),
        ...dev.telemetry,
      });
    }

    // 4. Schedules
    const initialSchedules = [
      {
        id: 'SCH-01',
        name: 'Sunset Adaptive (Eco Mode)',
        regionId: 'reg-bayfront',
        zone: 'Zone 4, Sector B & Waterfront',
        devicesCount: 38,
        active: true,
        triggerType: 'Astronomical Sunset + 15m',
        recurrence: 'Daily (Mon-Sun)',
        dimmingProfile: [
          { time: '18:15', dimming: 100, label: 'Full Lumen (Rush Hour)' },
          { time: '22:30', dimming: 60, label: 'Eco Dimming' },
          { time: '01:00', dimming: 30, label: 'Curfew Standby' },
          { time: '05:30', dimming: 75, label: 'Dawn Commute' },
          { time: '06:45', dimming: 0, label: 'Sunrise Turn-off' },
        ],
        lastUpdated: '2026-10-18T00:00:00Z',
      },
      {
        id: 'SCH-02',
        name: 'High Security Perimeter',
        regionId: 'reg-industrial',
        zone: 'Industrial Park West Gate Area',
        devicesCount: 14,
        active: true,
        triggerType: 'Fixed Clock 18:00 - 06:00',
        recurrence: 'Daily (Mon-Sun)',
        dimmingProfile: [
          { time: '18:00', dimming: 100, label: 'Constant 100% Security Output' },
          { time: '06:00', dimming: 0, label: 'Daylight Shutdown' },
        ],
        lastUpdated: '2026-10-17T12:00:00Z',
      },
    ];
    for (const sch of initialSchedules) {
      this.set(`smartlamp:schedule:${sch.id}`, sch);
      this.sadd('smartlamp:schedules:all', sch.id);
    }

    // 5. Seeded Users (admin & operator without forced password change on initial demo)
    const adminHash = hashPassword('admin123');
    const operatorHash = hashPassword('operator123');

    const seedUsers = [
      {
        username: 'admin',
        displayName: 'System Administrator',
        role: 'Administrator',
        status: 'active',
        salt: adminHash.salt,
        hash: adminHash.hash,
        mustChangePassword: false, // Normal login allowed directly
        createdAt: '2026-10-18T00:00:00.000Z',
        lastLogin: '2026-10-18T01:00:00.000Z',
      },
      {
        username: 'operator',
        displayName: 'System Operator',
        role: 'Operator',
        status: 'active',
        salt: operatorHash.salt,
        hash: operatorHash.hash,
        mustChangePassword: false,
        createdAt: '2026-10-18T00:00:00.000Z',
        lastLogin: '2026-10-18T02:00:00.000Z',
      },
    ];

    for (const u of seedUsers) {
      this.set(`smartlamp:user:${u.username}`, u);
      this.set(`smartlamp:users:by-username:${u.username.toLowerCase()}`, u.username);
      this.sadd('smartlamp:users:all', u.username);
    }

    // Strictly maintain only admin and operator accounts (Requirement 8)
    const existingUsers = this.smembers('smartlamp:users:all');
    for (const u of existingUsers) {
      if (u !== 'admin' && u !== 'operator') {
        this.del(`smartlamp:user:${u}`);
        this.del(`smartlamp:users:by-username:${u.toLowerCase()}`);
        this.srem('smartlamp:users:all', u);
      }
    }

    this.save();
  }
}

// Instantiate storage engine
const store = new StructuredStore();
store.init();

// Helper: Strip sensitive fields before sending user data
function sanitizeUser(user) {
  if (!user) return null;
  const { salt, hash, ...safe } = user;
  return safe;
}

// Helper: authenticate request
function authenticate(req) {
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = store.activeSessions.get(token);
    if (session && session.expiresAt > Date.now()) {
      const user = store.get(`smartlamp:user:${session.username}`);
      if (user && user.status === 'active') {
        return { user, session, token };
      }
    }
  }
  return null;
}

// Helper: send JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

// Helper: parse request body
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
  });
}

// -----------------------------------------------------------------------------
// Request Handler
// -----------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // ---------------------------------------------------------------------------
  // Health & Actuator Checks
  // ---------------------------------------------------------------------------
  if (pathname === '/actuator/health' || pathname === '/api/health') {
    const devIds = store.smembers('smartlamp:devices:all');
    return sendJson(res, 200, {
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      components: {
        persistence: {
          status: 'UP',
          driver: 'StructuredStore',
          mode: 'PERSISTENT_FILE_BACKED_STORE',
          keysCount: store.storage.size,
          registeredDevices: devIds.length,
          storageFile: STORE_FILE,
        },
        solarMesh: { status: 'UP', activeNodes: devIds.length },
        predictiveEngine: { status: 'UP', model: 'IsolationForest_DeltaRegression_v2' },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Authentication Endpoints
  // ---------------------------------------------------------------------------
  if (pathname === '/api/v1/auth/login' && method === 'POST') {
    const body = await parseBody(req);
    const { username, password } = body;

    if (!username || !password) {
      return sendJson(res, 400, { error: 'Username and password are required' });
    }

    const norm = username.trim().toLowerCase();
    const resolvedUsername = store.get(`smartlamp:users:by-username:${norm}`);
    const user = resolvedUsername ? store.get(`smartlamp:user:${resolvedUsername}`) : null;

    if (!user) {
      return sendJson(res, 401, { error: 'Invalid username or password' });
    }

    if (user.status !== 'active') {
      return sendJson(res, 403, { error: 'Account has been deactivated. Contact an administrator.' });
    }

    const isValid = verifyPassword(password, user.salt, user.hash);
    if (!isValid) {
      return sendJson(res, 401, { error: 'Invalid username or password' });
    }

    // Generate session token (24h validity)
    const token = crypto.randomBytes(32).toString('hex');
    store.activeSessions.set(token, {
      username: user.username,
      role: user.role,
      expiresAt: Date.now() + 86400000,
    });

    user.lastLogin = new Date().toISOString();
    store.set(`smartlamp:user:${user.username}`, user);

    return sendJson(res, 200, {
      token,
      user: sanitizeUser(user),
      message: user.mustChangePassword
        ? 'Password change required before proceeding'
        : 'Authenticated successfully',
    });
  }

  if (pathname === '/api/v1/auth/change-password' && method === 'POST') {
    const auth = authenticate(req);
    const body = await parseBody(req);
    const { currentPassword, newPassword } = body;

    if (!auth) {
      return sendJson(res, 401, { error: 'Authentication required' });
    }

    if (!newPassword || newPassword.length < 8) {
      return sendJson(res, 400, { error: 'New password must be at least 8 characters long' });
    }

    const user = auth.user;
    if (currentPassword) {
      const isValid = verifyPassword(currentPassword, user.salt, user.hash);
      if (!isValid) {
        return sendJson(res, 400, { error: 'Current password is incorrect' });
      }
    }

    const hashed = hashPassword(newPassword);
    user.salt = hashed.salt;
    user.hash = hashed.hash;
    user.mustChangePassword = false;
    store.set(`smartlamp:user:${user.username}`, user);

    return sendJson(res, 200, {
      success: true,
      message: 'Password updated successfully',
      user: sanitizeUser(user),
    });
  }

  if (pathname === '/api/v1/auth/me' && method === 'GET') {
    const auth = authenticate(req);
    if (!auth) {
      return sendJson(res, 401, { error: 'Authentication required' });
    }
    return sendJson(res, 200, { user: sanitizeUser(auth.user) });
  }

  if (pathname === '/api/v1/auth/logout' && method === 'POST') {
    const auth = authenticate(req);
    if (auth && auth.token) {
      store.activeSessions.delete(auth.token);
    }
    return sendJson(res, 200, { success: true, message: 'Logged out successfully' });
  }

  // ---------------------------------------------------------------------------
  // User Management Endpoints (Admin Only)
  // ---------------------------------------------------------------------------
  if (pathname === '/api/v1/users' && method === 'GET') {
    const auth = authenticate(req);
    if (!auth) return sendJson(res, 401, { error: 'Authentication required' });
    if (auth.user.role !== 'Administrator') {
      return sendJson(res, 403, { error: 'Forbidden: Administrator privileges required' });
    }

    const userKeys = store.smembers('smartlamp:users:all');
    const userList = userKeys.map((u) => sanitizeUser(store.get(`smartlamp:user:${u}`))).filter(Boolean);

    return sendJson(res, 200, {
      users: userList,
      total: userList.length,
    });
  }

  if (pathname === '/api/v1/users' && method === 'POST') {
    const auth = authenticate(req);
    if (!auth) return sendJson(res, 401, { error: 'Authentication required' });
    if (auth.user.role !== 'Administrator') {
      return sendJson(res, 403, { error: 'Forbidden: Administrator privileges required' });
    }

    // Requirement 8: Platform strictly maintains only Administrator and Operator accounts
    return sendJson(res, 403, {
      error: 'Platform policy strictly restricts accounts to Administrator and Operator.',
    });
  }

  if (pathname.startsWith('/api/v1/users/')) {
    const subpath = pathname.replace('/api/v1/users/', '');
    const parts = subpath.split('/');
    const targetUsername = decodeURIComponent(parts[0]);
    const action = parts[1];

    const auth = authenticate(req);
    if (!auth) return sendJson(res, 401, { error: 'Authentication required' });
    if (auth.user.role !== 'Administrator') {
      return sendJson(res, 403, { error: 'Forbidden: Administrator privileges required' });
    }

    const norm = targetUsername.toLowerCase();
    const actualUsername = store.get(`smartlamp:users:by-username:${norm}`);
    const targetUser = actualUsername ? store.get(`smartlamp:user:${actualUsername}`) : null;

    if (!targetUser) {
      return sendJson(res, 404, { error: `User "${targetUsername}" not found` });
    }

    // Reset password
    if (action === 'reset-password' && method === 'POST') {
      const body = await parseBody(req);
      const { newPassword } = body;
      const pwd = newPassword && newPassword.length >= 8 ? newPassword : 'TempPassword2026!';
      const hashed = hashPassword(pwd);
      targetUser.salt = hashed.salt;
      targetUser.hash = hashed.hash;
      targetUser.mustChangePassword = true;
      store.set(`smartlamp:user:${targetUser.username}`, targetUser);

      return sendJson(res, 200, {
        success: true,
        message: `Password reset successfully for ${targetUsername}`,
        tempPassword: pwd,
      });
    }

    // Edit user
    if (!action && method === 'PUT') {
      const body = await parseBody(req);
      const { displayName, role, status } = body;

      if (targetUser.role === 'Administrator' && (role === 'Operator' || status === 'inactive')) {
        const allUsers = store.smembers('smartlamp:users:all').map((u) => store.get(`smartlamp:user:${u}`));
        const activeAdmins = allUsers.filter(
          (u) => u && u.role === 'Administrator' && u.status === 'active' && u.username !== targetUser.username
        );
        if (activeAdmins.length === 0) {
          return sendJson(res, 400, { error: 'Cannot deactivate or demote the last active Administrator account' });
        }
      }

      if (displayName) targetUser.displayName = displayName.trim();
      if (role && ['Administrator', 'Operator'].includes(role)) targetUser.role = role;
      if (status && ['active', 'inactive'].includes(status)) targetUser.status = status;

      store.set(`smartlamp:user:${targetUser.username}`, targetUser);
      return sendJson(res, 200, { success: true, user: sanitizeUser(targetUser) });
    }

    // Delete user
    if (!action && method === 'DELETE') {
      if (['admin', 'operator'].includes(targetUser.username.toLowerCase())) {
        return sendJson(res, 403, {
          error: 'Cannot delete core system accounts (Administrator and Operator must be maintained).',
        });
      }

      if (targetUser.role === 'Administrator') {
        const allUsers = store.smembers('smartlamp:users:all').map((u) => store.get(`smartlamp:user:${u}`));
        const activeAdmins = allUsers.filter(
          (u) => u && u.role === 'Administrator' && u.status === 'active' && u.username !== targetUser.username
        );
        if (activeAdmins.length === 0) {
          return sendJson(res, 400, { error: 'Cannot delete the last active Administrator account' });
        }
      }

      if (targetUser.username.toLowerCase() === auth.user.username.toLowerCase()) {
        return sendJson(res, 400, { error: 'You cannot delete your own logged-in administrator account' });
      }

      store.del(`smartlamp:user:${targetUser.username}`);
      store.del(`smartlamp:users:by-username:${norm}`);
      store.srem('smartlamp:users:all', targetUser.username);

      return sendJson(res, 200, { success: true, message: `User "${targetUsername}" deleted successfully` });
    }
  }

  // ---------------------------------------------------------------------------
  // Geographic Endpoints: Regions & Zones
  // ---------------------------------------------------------------------------
  if (pathname === '/api/v1/regions' && method === 'GET') {
    const regIds = store.smembers('smartlamp:regions:all');
    const regions = regIds.map((id) => store.get(`smartlamp:region:${id}`)).filter(Boolean);
    return sendJson(res, 200, { regions, total: regions.length });
  }

  if (pathname.startsWith('/api/v1/regions/') && pathname.endsWith('/zones') && method === 'GET') {
    const parts = pathname.split('/');
    const regionId = parts[4];
    const zoneIds = store.smembers(`smartlamp:region:${regionId}:zones`);
    const zones = zoneIds.map((zid) => store.get(`smartlamp:zone:${zid}`)).filter(Boolean);
    return sendJson(res, 200, { regionId, zones, total: zones.length });
  }

  // ---------------------------------------------------------------------------
  // Device Inventory & Management Endpoints (/api/v1/devices)
  // ---------------------------------------------------------------------------
  if (pathname === '/api/v1/devices' && method === 'GET') {
    const devIds = store.smembers('smartlamp:devices:all');
    const devices = devIds
      .map((id) => {
        const dev = store.get(`smartlamp:device:${id}`);
        if (!dev) return null;
        const telemetry = store.get(`smartlamp:telemetry:${id}:latest`) || dev.telemetry || {};
        return { ...dev, telemetry };
      })
      .filter(Boolean);

    // Optional query filtering
    let filtered = devices;
    const { region, zone, status, search } = parsedUrl.query;
    if (region) filtered = filtered.filter((d) => d.regionId === region);
    if (zone) filtered = filtered.filter((d) => d.zoneId === zone);
    if (status) filtered = filtered.filter((d) => d.status.toLowerCase() === status.toLowerCase());
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((d) => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q));
    }

    return sendJson(res, 200, { devices: filtered, total: filtered.length });
  }

  if (pathname === '/api/v1/devices' && method === 'POST') {
    const body = await parseBody(req);
    const {
      deviceId,
      name,
      regionId,
      zoneId,
      latitude,
      longitude,
      model,
      connectivity,
      solarRatedWatts,
      batteryCapacityWh,
      initialSoC,
      lampRatedWatts,
      firmwareVersion,
      notes,
    } = body;

    // Validation
    const id = (deviceId || '').trim();
    if (!id || !/^[A-Za-z0-9_-]{3,30}$/.test(id)) {
      return sendJson(res, 400, { error: 'Valid Device ID (3-30 alphanumeric characters) is required' });
    }

    if (store.get(`smartlamp:device:${id}`)) {
      return sendJson(res, 409, { error: `Device ID "${id}" already exists in inventory` });
    }

    if (!name || !name.trim()) {
      return sendJson(res, 400, { error: 'Device name is required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return sendJson(res, 400, { error: 'Valid numeric geographic coordinates (latitude [-90,90], longitude [-180,180]) are required' });
    }

    const reg = store.get(`smartlamp:region:${regionId}`);
    if (!reg) {
      return sendJson(res, 400, { error: `Selected region "${regionId}" does not exist` });
    }

    let targetZone = store.get(`smartlamp:zone:${zoneId}`);
    if (!targetZone) {
      // Auto-create zone if authorized custom zone specified
      const newZoneId = zoneId ? zoneId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') : `zone-${Date.now()}`;
      targetZone = {
        id: newZoneId,
        regionId: reg.id,
        name: body.zoneName || `Zone ${newZoneId}`,
        coordinates: { lat, lng },
      };
      store.set(`smartlamp:zone:${targetZone.id}`, targetZone);
      store.sadd(`smartlamp:region:${reg.id}:zones`, targetZone.id);
      store.sadd('smartlamp:zones:all', targetZone.id);
    }

    // Realistic Simulated Demonstration Telemetry
    const soc = Math.min(100, Math.max(10, parseInt(initialSoC || 90, 10)));
    const pvWatts = parseInt(solarRatedWatts || 150, 10);
    const lampWatts = parseInt(lampRatedWatts || 50, 10);
    const battWh = parseInt(batteryCapacityWh || 768, 10);

    const simulatedTelemetry = {
      batterySoC: soc,
      batteryVoltage: parseFloat((11.8 + (soc / 100) * 1.8).toFixed(2)),
      batteryHealth: 99,
      solarYieldTodayKWh: parseFloat(((pvWatts * 4.2 * 0.85) / 1000).toFixed(2)),
      currentLoadW: lampWatts,
      panelVoltage: parseFloat((24.0 + Math.random() * 4.5).toFixed(1)),
      panelPowerW: Math.round(pvWatts * 0.78),
      chargingCurrentA: parseFloat(((pvWatts * 0.78) / 13.2).toFixed(2)),
      temperatureC: parseFloat((22.0 + Math.random() * 5).toFixed(1)),
      ambientIlluminanceLux: 41000,
      lastSeen: 'Just now',
      isSimulated: true,
      simulationLabel: 'Simulated Demonstration Telemetry (Valid PoC Ranges)',
    };

    const newDevice = {
      id,
      name: name.trim(),
      type: 'Solar Streetlight',
      regionId: reg.id,
      regionName: reg.name,
      zoneId: targetZone.id,
      zoneName: targetZone.name,
      coordinates: { lat, lng },
      status: soc > 20 ? 'online' : 'warning',
      connectivity: connectivity || 'Cellular 4G/LTE',
      hardware: {
        model: model || 'Luminary-SolarPole-X400',
        solarRatedWatts: pvWatts,
        batteryCapacityWh: battWh,
        lampRatedWatts: lampWatts,
        firmwareVersion: firmwareVersion || 'v3.4.12-rc2',
        installationDate: new Date().toISOString().split('T')[0],
      },
      telemetry: simulatedTelemetry,
      activeSchedule: 'Sunset Adaptive (Eco Mode)',
      activeAlerts: [],
      notes: notes || '',
      createdAt: new Date().toISOString(),
    };

    // Store device and maintain Redis indexes
    store.set(`smartlamp:device:${id}`, newDevice);
    store.sadd('smartlamp:devices:all', id);
    store.sadd(`smartlamp:zone:${targetZone.id}:devices`, id);
    store.set(`smartlamp:telemetry:${id}:latest`, simulatedTelemetry);
    store.lpush(`smartlamp:telemetry:${id}:history`, {
      timestamp: new Date().toISOString(),
      ...simulatedTelemetry,
    });

    return sendJson(res, 201, {
      success: true,
      message: `Smart lamp ${id} provisioned and persisted successfully`,
      device: newDevice,
    });
  }

  // Single device telemetry series (Day / Week / Month for Dashboard charts)
  if (pathname.startsWith('/api/v1/devices/') && pathname.endsWith('/telemetry') && method === 'GET') {
    const parts = pathname.split('/');
    const deviceId = parts[4];
    const dev = store.get(`smartlamp:device:${deviceId}`);
    if (!dev) return sendJson(res, 404, { error: `Device "${deviceId}" not found` });

    const range = (parsedUrl.query?.range || 'day').toLowerCase();
    const pvWatts = dev.hardware?.solarRatedWatts || 150;
    const battWh = dev.hardware?.batteryCapacityWh || 768;
    const currentSoC = dev.telemetry?.batterySoC ?? dev.batterySoC ?? 65;
    const isDegraded = dev.status === 'critical' || dev.status === 'warning';

    let labels = [];
    let solarYield = [];
    let batterySoC = [];

    if (range === 'day') {
      labels = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
      const peakSolarKw = (pvWatts / 1000) * (isDegraded ? 0.45 : 0.88);
      solarYield = [0, 0, 0, 0.08, peakSolarKw * 0.45, peakSolarKw * 0.82, peakSolarKw, peakSolarKw * 0.78, peakSolarKw * 0.25, 0, 0, 0].map((v) => Number(v.toFixed(2)));
      const baseSoc = isDegraded ? Math.min(currentSoC, 35) : currentSoC;
      batterySoC = [
        Math.max(10, Math.round(baseSoc - 12)),
        Math.max(10, Math.round(baseSoc - 18)),
        Math.max(8, Math.round(baseSoc - 22)),
        Math.max(12, Math.round(baseSoc - 15)),
        Math.min(98, Math.round(baseSoc + 8)),
        Math.min(100, Math.round(baseSoc + 28)),
        Math.min(100, Math.round(baseSoc + 35)),
        Math.min(100, Math.round(baseSoc + 30)),
        Math.min(95, Math.round(baseSoc + 18)),
        Math.round(baseSoc + 5),
        baseSoc,
        Math.max(12, Math.round(baseSoc - 6)),
      ];
    } else if (range === 'week') {
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const baseDailyKwh = (pvWatts * 4.6 * (isDegraded ? 0.5 : 0.82)) / 1000;
      solarYield = [0.95, 1.05, 0.78, 1.12, 1.02, 0.88, 1.0].map((mult) => Number((baseDailyKwh * mult).toFixed(2)));
      batterySoC = [
        Math.round(currentSoC * 0.94),
        Math.round(currentSoC * 0.98),
        Math.round(currentSoC * 0.88),
        Math.round(currentSoC * 1.02),
        Math.round(currentSoC * 0.96),
        Math.round(currentSoC * 0.92),
        currentSoC,
      ].map((v) => Math.max(10, Math.min(100, v)));
    } else {
      labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const weeklyKwh = ((pvWatts * 4.6 * 7 * (isDegraded ? 0.5 : 0.82)) / 1000);
      solarYield = [0.92, 1.04, 0.88, 1.01].map((m) => Number((weeklyKwh * m).toFixed(1)));
      batterySoC = [
        Math.round(currentSoC * 0.95),
        Math.round(currentSoC * 1.01),
        Math.round(currentSoC * 0.92),
        currentSoC,
      ].map((v) => Math.max(10, Math.min(100, v)));
    }

    return sendJson(res, 200, {
      deviceId: dev.id,
      deviceName: dev.name,
      range,
      status: dev.status,
      metricUnit: {
        solarYield: range === 'day' ? 'kW' : 'kWh',
        batterySoC: '%',
      },
      summary: {
        currentSoC,
        ratedWatts: pvWatts,
        batteryCapacityWh: battWh,
        todayYieldKWh: Number(((pvWatts * 4.4 * 0.8) / 1000).toFixed(2)),
      },
      labels,
      solarYield,
      batterySoC,
    });
  }

  // Single device lookup
  if (pathname.startsWith('/api/v1/devices/') && !pathname.endsWith('/telemetry') && method === 'GET') {
    const deviceId = pathname.replace('/api/v1/devices/', '').split('/')[0];
    const dev = store.get(`smartlamp:device:${deviceId}`);
    if (!dev) return sendJson(res, 404, { error: `Device "${deviceId}" not found` });

    const telemetry = store.get(`smartlamp:telemetry:${deviceId}:latest`) || dev.telemetry;
    const history = store.lrange(`smartlamp:telemetry:${deviceId}:history`);

    return sendJson(res, 200, {
      device: { ...dev, telemetry },
      telemetryHistory: history,
    });
  }

  // Single device update (Includes relocation / movement between locations per Requirement 4.3)
  if (pathname.startsWith('/api/v1/devices/') && !pathname.endsWith('/resolve') && !pathname.endsWith('/telemetry') && method === 'PUT') {
    const deviceId = pathname.replace('/api/v1/devices/', '').split('/')[0];
    const dev = store.get(`smartlamp:device:${deviceId}`);
    if (!dev) return sendJson(res, 404, { error: `Device "${deviceId}" not found` });

    const body = await parseBody(req);
    if (body.name) dev.name = body.name.trim();
    if (body.status) dev.status = body.status;
    if (body.activeSchedule) dev.activeSchedule = body.activeSchedule;
    if (body.notes !== undefined) dev.notes = body.notes;
    if (body.comments !== undefined) dev.comments = body.comments;
    if (body.newComment) {
      if (!Array.isArray(dev.comments)) dev.comments = [];
      dev.comments.unshift(body.newComment);
      dev.notes = body.newComment.text || dev.notes;
    }

    // Relocation / Coordinates Movement
    if (body.coordinates) {
      const lat = Number(body.coordinates.lat);
      const lng = Number(body.coordinates.lng);
      if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
        return sendJson(res, 400, { error: 'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180.' });
      }
      dev.coordinates = { lat, lng };
    } else if (body.lat !== undefined && body.lng !== undefined) {
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
        return sendJson(res, 400, { error: 'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180.' });
      }
      dev.coordinates = { lat, lng };
    } else if (body.latitude !== undefined && body.longitude !== undefined) {
      const lat = Number(body.latitude);
      const lng = Number(body.longitude);
      if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
        return sendJson(res, 400, { error: 'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180.' });
      }
      dev.coordinates = { lat, lng };
    }

    if (body.regionId) {
      const reg = store.get(`smartlamp:region:${body.regionId}`);
      if (reg) {
        dev.regionId = reg.id;
        dev.regionName = reg.name;
      }
    }

    if (body.zoneId) {
      const zone = store.get(`smartlamp:zone:${body.zoneId}`);
      if (zone) {
        if (dev.zoneId && dev.zoneId !== zone.id) {
          store.srem(`smartlamp:zone:${dev.zoneId}:devices`, dev.id);
        }
        dev.zoneId = zone.id;
        dev.zoneName = zone.name;
        store.sadd(`smartlamp:zone:${zone.id}:devices`, dev.id);
      }
    }

    if (body.location) dev.location = body.location;
    dev.updatedAt = new Date().toISOString();

    store.set(`smartlamp:device:${deviceId}`, dev);
    return sendJson(res, 200, { success: true, message: `Device ${deviceId} updated successfully.`, device: dev });
  }

  // Device Issue Resolution Endpoint (Accessible to Administrator and Operator)
  if (pathname.startsWith('/api/v1/devices/') && pathname.endsWith('/resolve') && (method === 'POST' || method === 'PUT')) {
    const auth = authenticate(req);
    if (!auth) return sendJson(res, 401, { error: 'Authentication required' });
    const parts = pathname.split('/');
    const deviceId = parts[4];
    const dev = store.get(`smartlamp:device:${deviceId}`);
    if (!dev) return sendJson(res, 404, { error: `Device "${deviceId}" not found` });

    const body = await parseBody(req);
    dev.status = 'online';
    dev.activeAlerts = [];
    dev.activeAlert = null;
    dev.resolvedAt = new Date().toISOString();
    dev.resolvedBy = auth.user.username;
    dev.resolutionNotes = body.resolutionNotes || body.notes || 'Issue marked as resolved via Smart Diagnostics';
    if (dev.telemetry) {
      dev.telemetry.activeAlerts = [];
      dev.telemetry.activeAlert = null;
      dev.telemetry.status = 'online';
    }

    store.set(`smartlamp:device:${deviceId}`, dev);
    return sendJson(res, 200, {
      success: true,
      message: `Device ${deviceId} issue successfully marked as resolved.`,
      device: dev,
    });
  }

  // ---------------------------------------------------------------------------
  // Problem 1: Smart Scheduling (/api/v1/schedules)
  // ---------------------------------------------------------------------------
  if (pathname.startsWith('/api/v1/schedules')) {
    const auth = authenticate(req);
    if (auth && auth.user && auth.user.role === 'Operator') {
      return sendJson(res, 403, { error: 'Forbidden: Operator role is restricted to Dashboard and Map View' });
    }
  }

  if (pathname === '/api/v1/schedules' && method === 'GET') {
    const schIds = store.smembers('smartlamp:schedules:all');
    const schedules = schIds.map((id) => store.get(`smartlamp:schedule:${id}`)).filter(Boolean);
    return sendJson(res, 200, { schedules, total: schedules.length });
  }

  if (pathname === '/api/v1/schedules/generate' && method === 'POST') {
    const body = await parseBody(req);
    const schIds = store.smembers('smartlamp:schedules:all');
    const newId = `SCH-${String(schIds.length + 1).padStart(2, '0')}`;

    const generated = {
      id: newId,
      name: body.prompt || body.name || 'AI-Optimized Diurnal Curve',
      regionId: body.regionId || 'reg-civic',
      zone: body.zone || 'Zone 1: Civic Core',
      devicesCount: body.devicesCount || 24,
      active: true,
      triggerType: 'Astronomical Sunset + 15m',
      recurrence: 'Daily (Mon-Sun)',
      dimmingProfile: [
        { time: '18:30', dimming: body.peakDimming || 85, label: 'Evening Peak Commute' },
        { time: '23:00', dimming: 40, label: 'Civic Curfew Energy Saver' },
        { time: '05:30', dimming: 70, label: 'Morning Commute Surge' },
        { time: '06:45', dimming: 0, label: 'Sunrise Shutdown' },
      ],
      lastUpdated: new Date().toISOString(),
    };

    store.set(`smartlamp:schedule:${newId}`, generated);
    store.sadd('smartlamp:schedules:all', newId);

    return sendJson(res, 201, { success: true, schedule: generated });
  }

  if (pathname.startsWith('/api/v1/schedules/') && pathname.endsWith('/deploy') && method === 'POST') {
    const parts = pathname.split('/');
    const id = parts[4];
    const schedule = store.get(`smartlamp:schedule:${id}`);
    if (schedule) {
      schedule.active = true;
      schedule.lastUpdated = new Date().toISOString();
      store.set(`smartlamp:schedule:${id}`, schedule);
      return sendJson(res, 200, {
        success: true,
        message: `Schedule ${id} deployed to DALI-2 mesh gateways`,
        schedule,
      });
    }
    return sendJson(res, 404, { error: 'Schedule not found' });
  }

  // Create custom schedule
  if (pathname === '/api/v1/schedules' && method === 'POST') {
    const auth = authenticate(req);
    if (!auth) return sendJson(res, 401, { error: 'Authentication required' });
    if (auth.user && auth.user.role === 'Operator') {
      return sendJson(res, 403, { error: 'Forbidden: Operator cannot create schedules' });
    }

    const body = await parseBody(req);
    const schIds = store.smembers('smartlamp:schedules:all');
    const newId = body.id || `SCH-${String(schIds.length + 1).padStart(2, '0')}`;

    const schedule = {
      id: newId,
      name: body.name || 'Custom Lighting Profile',
      regionId: body.regionId || 'reg-bayfront',
      zone: body.zone || 'Municipal District',
      devicesCount: Number(body.devicesCount) || 12,
      targetDeviceIds: Array.isArray(body.targetDeviceIds) ? body.targetDeviceIds : [],
      active: body.active !== undefined ? body.active : true,
      deploymentStatus: body.deploymentStatus || 'Active Profile',
      triggerType: body.triggerType || 'Astronomical Sunset + 15m',
      recurrence: body.recurrence || 'Daily (Mon-Sun)',
      dimmingProfile: Array.isArray(body.dimmingProfile) ? body.dimmingProfile : [
        { time: '18:15', dimming: 85, label: 'Full Lumen (Dusk Commute)' },
        { time: '23:00', dimming: 30, label: 'Eco Curfew Saver' },
        { time: '05:30', dimming: 65, label: 'Dawn Commute' },
        { time: '06:45', dimming: 0, label: 'Astronomical Sunrise Turn-off' },
      ],
      lastUpdated: new Date().toISOString(),
    };

    store.set(`smartlamp:schedule:${newId}`, schedule);
    store.sadd('smartlamp:schedules:all', newId);

    return sendJson(res, 201, { success: true, schedule });
  }

  // Update schedule status / details
  if (pathname.startsWith('/api/v1/schedules/') && !pathname.endsWith('/deploy') && method === 'PUT') {
    const auth = authenticate(req);
    if (!auth) return sendJson(res, 401, { error: 'Authentication required' });
    if (auth.user && auth.user.role === 'Operator') {
      return sendJson(res, 403, { error: 'Forbidden: Operator cannot modify schedules' });
    }

    const parts = pathname.split('/');
    const id = parts[4];
    const schedule = store.get(`smartlamp:schedule:${id}`);
    if (!schedule) return sendJson(res, 404, { error: 'Schedule not found' });

    const body = await parseBody(req);
    if (body.active !== undefined) schedule.active = Boolean(body.active);
    if (body.name) schedule.name = body.name;
    if (body.dimmingProfile) schedule.dimmingProfile = body.dimmingProfile;
    schedule.lastUpdated = new Date().toISOString();

    store.set(`smartlamp:schedule:${id}`, schedule);
    return sendJson(res, 200, { success: true, schedule });
  }

  // Delete schedule (Requirement 5)
  if (pathname.startsWith('/api/v1/schedules/') && method === 'DELETE') {
    const auth = authenticate(req);
    if (!auth) return sendJson(res, 401, { error: 'Authentication required' });
    if (auth.user && auth.user.role === 'Operator') {
      return sendJson(res, 403, { error: 'Forbidden: Operator cannot delete schedules' });
    }

    const parts = pathname.split('/');
    const id = parts[4];
    const schedule = store.get(`smartlamp:schedule:${id}`);
    if (!schedule) return sendJson(res, 404, { error: 'Schedule not found' });

    store.del(`smartlamp:schedule:${id}`);
    store.srem('smartlamp:schedules:all', id);
    return sendJson(res, 200, { success: true, message: `Schedule ${id} deleted successfully` });
  }

  // ---------------------------------------------------------------------------
  // Problem 2: Solar Site Assessment (/api/v1/deployment)
  // ---------------------------------------------------------------------------
  if (pathname.startsWith('/api/v1/deployment')) {
    const auth = authenticate(req);
    if (auth && auth.user && auth.user.role === 'Operator') {
      return sendJson(res, 403, { error: 'Forbidden: Operator role is restricted to Dashboard and Map View' });
    }
  }

  if (pathname === '/api/v1/deployment/evaluate' && method === 'POST') {
    const body = await parseBody(req);
    const panelW = body.panelWattage || 150;
    const battAh = body.batteryCapacityAh || 60;
    const tilt = body.tiltAngle || 32;
    const shading = body.shadingPercent || 10;
    const loadWh = body.dailyLoadWh || 180;

    const usableBattWh = battAh * 12.8 * 0.85;
    const autonomyDays = parseFloat((usableBattWh / loadWh).toFixed(1));
    const dailyYieldWh = Math.round(panelW * 4.82 * (1 - shading / 100) * 0.82);
    let score = Math.round(Math.min(98, Math.max(15, 60 + (autonomyDays >= 3 ? 20 : -10) + (dailyYieldWh > loadWh ? 18 : -20))));

    const result = {
      id: `EVAL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      feasibilityScore: score,
      classification: score >= 75 ? 'Highly Recommended' : score >= 60 ? 'Feasible with Tuning' : 'High Outage Risk',
      metrics: {
        dailyHarvestWh: dailyYieldWh,
        autonomyDays,
        netDailyBalanceWh: dailyYieldWh - loadWh,
        optimalLatitudeTilt: 32,
      },
      recommendations: [
        autonomyDays < 3.0
          ? `Increase battery capacity to >= ${Math.ceil((3.0 * loadWh) / (12.8 * 0.85))} Ah for 3-day civic autonomy.`
          : 'Battery autonomy meets civic standard.',
        shading > 20
          ? 'High horizon shading detected. Relocate pole 4 meters south of foliage line.'
          : 'Shading loss is acceptable.',
      ],
    };

    return sendJson(res, 200, result);
  }

  if (pathname === '/api/v1/deployment/history' && method === 'GET') {
    return sendJson(res, 200, {
      history: [
        {
          id: 'EVAL-001',
          location: 'San Francisco, CA (Maritime Coastal)',
          panelWattage: 150,
          batteryAh: 60,
          tiltAngle: 32,
          shadingPercent: 10,
          autonomyDays: 3.4,
          feasibilityScore: 92,
          recommendation: 'Highly Recommended. Siting satisfies municipal autonomy guidelines.',
          timestamp: '2026-10-18T01:15:00Z',
        },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // Problem 3: Predictive Maintenance (/api/v1/forecast)
  // ---------------------------------------------------------------------------
  if (pathname.startsWith('/api/v1/forecast')) {
    const auth = authenticate(req);
    if (auth && auth.user && auth.user.role === 'Operator') {
      return sendJson(res, 403, { error: 'Forbidden: Operator role is restricted to Dashboard and Map View' });
    }
  }

  if (pathname === '/api/v1/forecast/devices' && method === 'GET') {
    return sendJson(res, 200, {
      predictions: [
        {
          deviceId: 'DEV-SOL-1090',
          deviceName: 'Smart Pole Boulevard #15',
          riskScore: 92,
          riskLevel: 'Critical Risk',
          predictedFailureWindow: '2-4 Days',
          contributingFactors: [
            { factor: 'Battery Cell Mismatch', weight: '45%', impact: 'High' },
            { factor: 'Thermal Cycling Fatigue', weight: '30%', impact: 'Moderate' },
          ],
          recommendation: 'Dispatch Field Tech for Battery Module Swap.',
        },
        {
          deviceId: 'DEV-SOL-1043',
          deviceName: 'Smart Pole Marina #08',
          riskScore: 68,
          riskLevel: 'Moderate Risk',
          predictedFailureWindow: '12-16 Days',
          contributingFactors: [
            { factor: 'Photovoltaic Soiling / Salt Spray', weight: '55%', impact: 'High' },
          ],
          recommendation: 'Schedule water spray wash of PV glass panel.',
        },
      ],
    });
  }

  if (pathname.startsWith('/api/v1/forecast/devices/') && pathname.endsWith('/telemetry')) {
    const parts = pathname.split('/');
    const devId = parts[5];
    return sendJson(res, 200, {
      deviceId: devId,
      timestamps: ['T-6d', 'T-5d', 'T-4d', 'T-3d', 'T-2d', 'T-1d', 'Today', 'T+3d (Pred)', 'T+7d (Pred)'],
      healthIndex: [88, 86, 84, 80, 74, 68, 64, 52, 38],
      failureCutoffThreshold: 40,
    });
  }

  // ---------------------------------------------------------------------------
  // Problem 4: Smart Diagnostics & AI Voice Assistant (/api/v1/troubleshoot)
  // ---------------------------------------------------------------------------
  // Permitted to both Administrator and Operator roles per Requirement 9.2

  // Raise Support Ticket Endpoint (Requirement 6 & 9.2)
  if (pathname === '/api/v1/troubleshoot/ticket' && method === 'POST') {
    const auth = authenticate(req);
    if (!auth) return sendJson(res, 401, { error: 'Authentication required' });

    const body = await parseBody(req);
    const { deviceId, priority, notes, diagnosticSnapshot } = body;

    if (!deviceId) {
      return sendJson(res, 400, { error: 'Device ID is required to raise a support ticket' });
    }
    const dev = store.get(`smartlamp:device:${deviceId}`);
    if (!dev) {
      return sendJson(res, 404, { error: `Device "${deviceId}" not found` });
    }

    const ticketId = `TICK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const ticket = {
      id: ticketId,
      ticketId,
      deviceId,
      deviceName: dev.name,
      priority: priority || 'Tier 2 - Field Investigation',
      notes: notes || 'Diagnostic telemetry and battery cell delta attached.',
      diagnosticSnapshot: diagnosticSnapshot || dev.telemetry || {},
      status: 'open',
      createdBy: auth.user.username,
      createdAt: new Date().toISOString(),
    };

    store.set(`smartlamp:ticket:${ticketId}`, ticket);
    store.sadd('smartlamp:tickets:all', ticketId);

    return sendJson(res, 201, {
      success: true,
      message: `Support ticket ${ticketId} raised with customer support team`,
      ticket,
    });
  }

  if (pathname === '/api/v1/troubleshoot/chat' && method === 'POST') {
    const auth = authenticate(req);
    if (!auth) return sendJson(res, 401, { error: 'Authentication required' });

    const body = await parseBody(req);
    const { deviceId, userMessage, symptom } = body;

    // Fetch device context from canonical store
    const dev = deviceId ? store.get(`smartlamp:device:${deviceId}`) : null;
    const telemetry = dev
      ? store.get(`smartlamp:telemetry:${deviceId}:latest`) || dev.telemetry || {}
      : {};

    const promptText = (userMessage || symptom || '').toLowerCase();

    // Deterministic Domain Rule Evaluation for Solar Street Lighting
    let evaluation = {
      identifiedCause: 'Operational Inquiry',
      confidence: 88,
      facts: [],
      hypotheses: [],
      recommendedActions: [],
      voiceReply: '',
      canEscalate: false,
    };

    if (!dev) {
      evaluation.voiceReply = "Please select or specify a smart lamp ID to analyze its telemetry and operational health.";
      evaluation.recommendedActions = ["Choose a smart lamp from the device selector"];
    } else {
      const isSimulated = telemetry.isSimulated || false;
      const simLabel = isSimulated ? " [Simulated Demonstration Telemetry]" : " [Measured]";

      evaluation.facts = [
        `Device: ${dev.name} (${dev.id})`,
        `Region & Zone: ${dev.regionName} / ${dev.zoneName}`,
        `Battery SoC: ${telemetry.batterySoC}% (${telemetry.batteryVoltage || 12.8}V)${simLabel}`,
        `Panel Voltage: ${telemetry.panelVoltage || 0}V, Generation: ${telemetry.panelPowerW || 0}W${simLabel}`,
        `Operating Temperature: ${telemetry.temperatureC || 25}°C${simLabel}`,
        `Active Alerts: ${(dev.activeAlerts || []).join(', ') || 'None'}`,
      ];

      const soc = telemetry.batterySoC ?? dev.batterySoC ?? 72;
      const volt = telemetry.batteryVoltage ?? 12.8;
      const yieldKWh = telemetry.solarYieldTodayKWh ?? dev.solarYieldTodayKWh ?? 1.4;
      const panelWatts = telemetry.panelPowerW ?? 112;
      const panelV = telemetry.panelVoltage ?? 18.4;
      const loadWatts = telemetry.currentLoadW ?? dev.currentLoadW ?? 45;
      const schedule = dev.activeSchedule || 'Sunset Adaptive (Eco)';
      const status = dev.status || 'online';
      const connectivity = dev.connectivity || 'Cellular 4G/LTE';
      const isOnline = status !== 'offline';

      evaluation.facts = [
        `Device: ${dev.name} (${dev.id})`,
        `Region & Zone: ${dev.regionName || 'Bayfront'} / ${dev.zoneName || 'Promenade'}`,
        `Status: ${status.toUpperCase()} (${isOnline ? 'Network Reachable' : 'Unreachable / Stale'})`,
        `Battery SoC: ${soc}% (${volt}V)${simLabel}`,
        `Solar Harvest: ${yieldKWh} kWh today, ${panelWatts}W instant (${panelV}V)${simLabel}`,
        `Lamp Load: ${loadWatts}W under active profile "${schedule}"`,
        `Connectivity: ${connectivity}, Last Seen: ${telemetry.lastSeen || '12s ago'}`,
        `Active Alerts: ${(dev.activeAlerts || []).join(', ') || 'None'}`,
      ];

      if (promptText.includes('sunset') || promptText.includes('fails at sunset') || promptText.includes('dark') || promptText.includes('turn on')) {
        if (volt < 11.4 || soc < 15) {
          evaluation.identifiedCause = 'Low Voltage Disconnect (LVD) Lockout';
          evaluation.confidence = 94;
          evaluation.hypotheses = [
            'Battery depleted prior to dusk due to insufficient solar harvest or internal cell degradation.',
            'LVD safety relay engaged to prevent irreversible LiFePO4 cell reversal.',
          ];
          evaluation.recommendedActions = [
            'Perform physical PV glass inspection for shading, bird droppings, or salt spray crust.',
            'Verify MPPT charge controller bulk stage threshold (should reach 14.4V during peak noon).',
            'If voltage remains under 11.2V after clear noon, dispatch tech for battery module replacement.',
          ];
          evaluation.voiceReply = `Diagnostic analysis for ${dev.name}: The pole is experiencing Low Voltage Disconnect lockout. Telemetry reports battery voltage at ${volt} volts and SoC at ${soc} percent. Recommended action: inspect photovoltaic panel for debris, and replace battery pack if voltage fails to recover above 12.6 volts by midday.`;
          evaluation.canEscalate = true;
        } else {
          evaluation.identifiedCause = 'Astronomical Schedule or Driver Fault';
          evaluation.confidence = 88;
          evaluation.hypotheses = [
            'Photocell or astronomical sunset coordinate offset is skewed.',
            'DALI-2 luminaire LED driver circuit is in open-circuit fault.',
          ];
          evaluation.recommendedActions = [
            'Check active schedule in Scheduler to verify astronomical sunset calculation.',
            'Send remote manual luminaire override test command to toggle driver relay.',
          ];
          evaluation.voiceReply = `For ${dev.name}, battery reserves are healthy at ${soc} percent (${volt} volts). The failure to illuminate is likely caused by an astronomical sunset trigger offset or a DALI-2 driver relay fault. Recommend checking the active schedule profile.`;
        }
      } else if (promptText.includes('soc') || promptText.includes('battery') || promptText.includes('voltage') || promptText.includes('charge')) {
        evaluation.identifiedCause = soc < 20 ? 'Critical Low Battery State' : soc < 50 ? 'Moderate Battery Depletion' : 'Nominal Battery Storage';
        evaluation.confidence = 94;
        evaluation.hypotheses = [
          soc < 20 ? 'Battery cell depth-of-discharge has breached safe Low Voltage Disconnect limits.' : 'Battery state of charge is tracking within operational limits.',
        ];
        evaluation.recommendedActions = [
          soc < 20 ? 'Inspect PV panel glass for soiling or heavy marine crust.' : 'Battery storage is sufficient; continue routine monitoring.',
          'Verify MPPT charge controller bulk voltage stage reaches 14.4V.',
        ];
        evaluation.voiceReply = `For ${dev.name}, the current Battery SoC is ${soc} percent with a terminal voltage of ${volt} volts. ${soc < 20 ? 'Warning: this is near the Low Voltage Disconnect threshold. Would you like me to guide you through a physical panel and wiring inspection?' : 'Cell reserves are healthy and sufficient for tonight\'s scheduled illumination cycle. Would you like to check solar harvest or lamp load?'}`;
        if (soc < 20) evaluation.canEscalate = true;
      } else if (promptText.includes('harvest') || promptText.includes('solar') || promptText.includes('irradiance') || promptText.includes('sunlight') || promptText.includes('pv') || promptText.includes('panel')) {
        evaluation.identifiedCause = panelWatts < 10 ? 'Low Photovoltaic Harvest' : 'Photovoltaic Harvest Active';
        evaluation.confidence = 92;
        evaluation.hypotheses = [
          panelWatts < 10 ? 'Ambient solar irradiance is attenuated by overcast cloud cover, marine fog, or soiling.' : 'PV generation is operating at expected insolation curve levels.',
        ];
        evaluation.recommendedActions = [
          'Verify seasonal azimuth and tilt angle.',
          'Clean PV panel surface during next maintenance window.',
        ];
        evaluation.voiceReply = `Smart pole ${dev.name} has harvested ${yieldKWh} kilowatt-hours of solar energy today, with instantaneous panel generation at ${panelWatts} watts (${panelV} volts). ${panelWatts < 20 ? 'Generation is reduced relative to peak capacity. Would you like to check if there is an active shading anomaly?' : 'Energy conversion is nominal. Would you like to inspect lamp consumption or battery reserves?'}`;
      } else if (promptText.includes('load') || promptText.includes('lamp') || promptText.includes('light') || promptText.includes('watt') || promptText.includes('dim')) {
        evaluation.identifiedCause = 'Luminaire Load Analysis';
        evaluation.confidence = 90;
        evaluation.hypotheses = [
          `Luminaire is currently drawing ${loadWatts} watts under schedule profile "${schedule}".`,
        ];
        evaluation.recommendedActions = [
          'Ensure eco-dimming curfew is enabled in Smart Scheduler to conserve battery life.',
          'Test emergency brightness override slider if immediate lumen boost is required.',
        ];
        evaluation.voiceReply = `Smart pole ${dev.name}'s luminaire load is currently measured at ${loadWatts} watts under schedule "${schedule}". All LED driver channels are operating within normal parameters. Do you want to adjust dimming levels in the Smart Scheduler?`;
      } else if (promptText.includes('reachab') || promptText.includes('network') || promptText.includes('online') || promptText.includes('connect') || promptText.includes('ping') || promptText.includes('signal')) {
        evaluation.identifiedCause = isOnline ? 'Network Connected & Healthy' : 'Telemetry Link Severed';
        evaluation.confidence = 95;
        evaluation.hypotheses = [
          isOnline ? `Active bi-directional telemetry link established via ${connectivity}.` : `Pole is unreachable over ${connectivity}. Telemetry packets are stale.`,
        ];
        evaluation.recommendedActions = [
          isOnline ? 'Automated and AI-assisted remote diagnostics can be executed immediately.' : 'Guided on-site physical inspection or technician dispatch is recommended for unreachable devices.',
        ];
        evaluation.voiceReply = `Network reachability for ${dev.name} is currently ${status.toUpperCase()} over ${connectivity}. Last heartbeat was received ${telemetry.lastSeen || 'recently'}. ${isOnline ? 'Remote automated sweeps are fully available. Would you like to trigger an automated hardware sweep now?' : 'Because remote telemetry is offline, would you like to review the guided manual troubleshooting steps?'}`;
        if (!isOnline) evaluation.canEscalate = true;
      } else if (promptText.includes('critical') || promptText.includes('risk') || promptText.includes('dispatch') || promptText.includes('truck') || promptText.includes('ticket')) {
        evaluation.identifiedCause = status === 'critical' ? 'Urgent Hardware Intervention Required' : 'Operational Status Review';
        evaluation.confidence = 91;
        evaluation.voiceReply = `Device ${dev.name} has status ${status.toUpperCase()} with risk level assessed from Battery SoC (${soc}%), solar yield (${yieldKWh} kWh), and active alerts (${(dev.activeAlerts || []).join(', ') || 'none'}). ${status === 'critical' ? 'A priority support ticket or field technician rollout is recommended. Would you like me to open the ticket creation form?' : 'No critical fault is registered. Would you like to run automated sweeps to verify all sub-components?'}`;
        evaluation.canEscalate = status === 'critical';
      } else {
        evaluation.identifiedCause = 'Comprehensive Telemetry Status';
        evaluation.confidence = 90;
        evaluation.voiceReply = `Context active for ${dev.name} (${dev.id}): Operating status is ${status.toUpperCase()}. Battery SoC is at ${soc}% (${volt}V), Solar Harvest today is ${yieldKWh} kWh (${panelWatts}W instant), and Lamp Load is ${loadWatts}W under profile "${schedule}". Reachability over ${connectivity} is nominal. What specific component or symptom would you like to investigate?`;
      }
    }

    return sendJson(res, 200, {
      deviceId: dev ? dev.id : null,
      deviceName: dev ? dev.name : null,
      evaluation,
    });
  }

  // Legacy Step-based diagnostic routes
  if (pathname === '/api/v1/troubleshoot/start' && method === 'POST') {
    const body = await parseBody(req);
    const sessionId = `TRB-${Date.now()}`;
    return sendJson(res, 201, {
      sessionId,
      currentStep: 1,
      prompt: 'Verify if active schedule reports valid astronomical sunset coordinates for this pole cluster.',
      actions: ['Schedule Confirmed Active', 'Schedule Disabled / Mismatched'],
    });
  }

  if (pathname === '/api/v1/troubleshoot/step' && method === 'POST') {
    const body = await parseBody(req);
    const step = (body.currentStep || 1) + 1;
    return sendJson(res, 200, {
      sessionId: body.sessionId,
      currentStep: step,
      prompt: step === 2
        ? 'Check LiFePO4 battery terminal voltage. Is voltage < 11.2V indicating Low Voltage Disconnect (LVD)?'
        : 'Diagnostics complete. Hardware issue verified in battery cell balance. Tier-2 ticket recommended.',
      isTerminal: step >= 3,
    });
  }

  // Default Fallback
  return sendJson(res, 404, { error: 'Route not found', path: pathname });
});

server.listen(PORT, HOST, () => {
  console.log(`[CMS Backend] Service running on http://${HOST}:${PORT}`);
  console.log(`[CMS Backend] Actuator health at http://${HOST}:${PORT}/actuator/health`);
  console.log(`[CMS Backend] Structured Redis persistent store initialized (${store.storage.size} keys)`);
});

// Clean shutdown handler
process.on('SIGTERM', () => {
  console.log('[CMS Backend] Received SIGTERM, shutting down gracefully...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[CMS Backend] Received SIGINT, shutting down gracefully...');
  server.close(() => process.exit(0));
});
