// =============================================================================
// Automated End-to-End API, RBAC & Domain Verification Test Suite
// =============================================================================

const http = require('http');

const BASE_URL = 'http://127.0.0.1:8080';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options.headers,
      },
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=====================================================================');
  console.log('   CMS Platform — Comprehensive Automated API & Domain Test Suite   ');
  console.log('=====================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Actuator Health Check
    console.log('[Test Group 1: Actuator & Persistence Health]');
    const health = await request('/actuator/health');
    assert(health.status === 200, 'Health endpoint responds with HTTP 200');
    assert(health.body.status === 'UP', 'Service status is UP');
    assert(health.body.components.persistence.status === 'UP', 'Persistent store driver is UP');
    assert(health.body.components.persistence.registeredDevices >= 6, 'Registered canonical devices indexed');

    // 2. Authentication
    console.log('\n[Test Group 2: Authentication & Credentials]');
    const badLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'wrongpassword' },
    });
    assert(badLogin.status === 401, 'Invalid credentials rejected with HTTP 401');

    const adminLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'admin123' },
    });
    assert(adminLogin.status === 200, 'Admin login succeeds with HTTP 200');
    assert(adminLogin.body.user.role === 'Administrator', 'Admin user has Administrator role');
    const adminToken = adminLogin.body.token;

    const operatorLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'operator', password: 'operator123' },
    });
    assert(operatorLogin.status === 200, 'Operator login succeeds with HTTP 200');
    assert(operatorLogin.body.user.role === 'Operator', 'Operator has Operator role');
    const operatorToken = operatorLogin.body.token;

    // 3. Strict Two-Account Policy Enforcement
    console.log('\n[Test Group 3: Strict Two-Account Policy (Admin + Operator Only)]');
    const usersListRes = await request('/api/v1/users', { token: adminToken });
    assert(usersListRes.status === 200, 'Admin can list users');
    assert(usersListRes.body.users.length === 2, 'Strictly only 2 accounts exist in system');
    const usernames = usersListRes.body.users.map(u => u.username).sort();
    assert(usernames[0] === 'admin' && usernames[1] === 'operator', 'Accounts are strictly "admin" and "operator"');

    // Attempting to create an extra account is forbidden
    const attemptCreateRes = await request('/api/v1/users', {
      method: 'POST',
      token: adminToken,
      body: {
        username: 'extra_user',
        displayName: 'Extra User',
        role: 'Operator',
        initialPassword: 'Password123!',
      },
    });
    assert(attemptCreateRes.status === 403, 'Creating additional accounts rejected with HTTP 403');

    // Attempting to delete core accounts is forbidden
    const deleteAdminRes = await request('/api/v1/users/admin', {
      method: 'DELETE',
      token: adminToken,
    });
    assert(deleteAdminRes.status === 403, 'Deleting core admin account rejected with HTTP 403');

    // 4. Backend RBAC Restrictions for Operator
    console.log('\n[Test Group 4: Operator Role-Based Access Control (RBAC)]');
    // Operator forbidden from administrative settings (users)
    const opUsers = await request('/api/v1/users', { token: operatorToken });
    assert(opUsers.status === 403, 'Operator forbidden from administrative /api/v1/users (HTTP 403)');

    // Operator forbidden from schedules
    const opSchedules = await request('/api/v1/schedules', { token: operatorToken });
    assert(opSchedules.status === 403, 'Operator forbidden from /api/v1/schedules (HTTP 403)');

    // Operator forbidden from Solar Deployment Intelligence
    const opDeploy = await request('/api/v1/deployment/evaluate', {
      method: 'POST',
      token: operatorToken,
      body: { targetRegion: 'reg-bayfront' },
    });
    assert(opDeploy.status === 403, 'Operator forbidden from /api/v1/deployment/evaluate (HTTP 403)');

    // Operator forbidden from Solar Health Intelligence
    const opForecast = await request('/api/v1/forecast/devices', { token: operatorToken });
    assert(opForecast.status === 403, 'Operator forbidden from /api/v1/forecast/devices (HTTP 403)');

    // Operator IS PERMITTED to access Smart Diagnostics (Requirement 9.2):
    const opTroubleshoot = await request('/api/v1/troubleshoot/chat', {
      method: 'POST',
      token: operatorToken,
      body: { deviceId: 'DEV-SOL-1090', userMessage: 'Check status' },
    });
    assert(opTroubleshoot.status === 200, 'Operator permitted to access Smart Diagnostics /api/v1/troubleshoot/chat (HTTP 200)');
    assert(opTroubleshoot.body.evaluation !== undefined, 'Smart Diagnostics evaluation returned for operator');

    // Operator IS PERMITTED to submit support tickets (Requirement 9.2):
    const opTicket = await request('/api/v1/troubleshoot/ticket', {
      method: 'POST',
      token: operatorToken,
      body: {
        deviceId: 'DEV-SOL-1090',
        deviceName: 'Bayfront Pier #12 Mast',
        issueSummary: 'Operator initiated field inspection request',
        priority: 'high',
        recommendedAction: 'Check LiFePO4 cell #3',
      },
    });
    assert(opTicket.status === 201, 'Operator permitted to submit support ticket via /api/v1/troubleshoot/ticket (HTTP 201)');

    // Unauthenticated requests are rejected (HTTP 401)
    const unauthTroubleshoot = await request('/api/v1/troubleshoot/chat', {
      method: 'POST',
      body: { deviceId: 'DEV-SOL-1090', userMessage: 'Check status' },
    });
    assert(unauthTroubleshoot.status === 401, 'Unauthenticated user rejected from Smart Diagnostics with HTTP 401');

    // Operator CAN access Dashboard and Map APIs:
    const opDevices = await request('/api/v1/devices', { token: operatorToken });
    assert(opDevices.status === 200, 'Operator permitted to access /api/v1/devices (HTTP 200)');
    assert(opDevices.body.devices.length >= 6, 'Operator receives device fleet listing for Map View & Dashboard');

    const opRegions = await request('/api/v1/regions', { token: operatorToken });
    assert(opRegions.status === 200, 'Operator permitted to access /api/v1/regions (HTTP 200)');

    // Operator can query device telemetry series (Day, Week, Month):
    const opTelemetryDay = await request('/api/v1/devices/DEV-SOL-1042/telemetry?range=day', { token: operatorToken });
    assert(opTelemetryDay.status === 200, 'GET /api/v1/devices/:id/telemetry?range=day returns HTTP 200');
    assert(opTelemetryDay.body.solarYield && opTelemetryDay.body.solarYield.length > 0, 'Day telemetry returns valid solarYield series');
    assert(opTelemetryDay.body.batterySoC && opTelemetryDay.body.batterySoC.length > 0, 'Day telemetry returns valid batterySoC series');

    const opTelemetryWeek = await request('/api/v1/devices/DEV-SOL-1042/telemetry?range=week', { token: operatorToken });
    assert(opTelemetryWeek.status === 200, 'GET /api/v1/devices/:id/telemetry?range=week returns HTTP 200');
    assert(opTelemetryWeek.body.solarYield && opTelemetryWeek.body.solarYield.length === 7, 'Week telemetry returns 7 daily data points');

    const opTelemetryMonth = await request('/api/v1/devices/DEV-SOL-1042/telemetry?range=month', { token: operatorToken });
    assert(opTelemetryMonth.status === 200, 'GET /api/v1/devices/:id/telemetry?range=month returns HTTP 200');
    assert(opTelemetryMonth.body.solarYield && opTelemetryMonth.body.solarYield.length > 0, 'Month telemetry returns valid monthly aggregated series');

    // Device relocation test (Requirement 4.3):
    const relocateRes = await request('/api/v1/devices/DEV-SOL-1042', {
      method: 'PUT',
      token: adminToken,
      body: {
        lat: 37.7812,
        lng: -122.3945,
        regionId: 'reg-bayfront',
        zoneId: 'zone-marina',
        location: 'Bayfront Harbor Way #42',
      },
    });
    assert(relocateRes.status === 200, 'PUT /api/v1/devices/:id relocation returns HTTP 200');
    assert(relocateRes.body.device.coordinates.lat === 37.7812, 'Device latitude successfully updated and persisted');

    // 5. Geographic Hierarchy (Regions & Zones)
    console.log('\n[Test Group 5: Geographic Regions & Zones]');
    const regionsRes = await request('/api/v1/regions', { token: adminToken });
    assert(regionsRes.status === 200, 'GET /api/v1/regions returns HTTP 200');
    assert(regionsRes.body.regions.length >= 3, 'All 3 municipal districts returned');

    const zonesRes = await request('/api/v1/regions/reg-bayfront/zones', { token: adminToken });
    assert(zonesRes.status === 200, 'GET /api/v1/regions/:id/zones returns HTTP 200');
    assert(zonesRes.body.zones.length >= 2, 'Bayfront zones returned correctly');

    // 6. Smart Lamp Inventory & Telemetry Fallbacks
    console.log('\n[Test Group 6: Smart Lamp Inventory & Telemetry Integrity]');
    const devicesRes = await request('/api/v1/devices', { token: adminToken });
    assert(devicesRes.status === 200, 'GET /api/v1/devices returns HTTP 200');
    const devList = devicesRes.body.devices;
    assert(devList.length >= 6, 'Fleet contains expected active test poles');
    // Verify telemetry data fields
    const devSample = devList[0];
    assert(devSample.telemetry !== undefined, 'Device contains telemetry object');
    assert(typeof devSample.telemetry.batterySoC === 'number' || devSample.telemetry.batterySoC === undefined, 'Battery SoC is valid number or undefined');

    // 7. Smart Diagnostics & AI Assistant API
    console.log('\n[Test Group 7: Smart Diagnostics AI & Support Workflow]');
    const diagSunsetRes = await request('/api/v1/troubleshoot/chat', {
      method: 'POST',
      token: adminToken,
      body: {
        deviceId: 'DEV-SOL-1090',
        userMessage: 'Why did this luminaire fail at sunset?',
      },
    });
    assert(diagSunsetRes.status === 200, 'POST /api/v1/troubleshoot/chat returns HTTP 200');
    assert(
      diagSunsetRes.body.evaluation.identifiedCause === 'Low Voltage Disconnect (LVD) Lockout',
      'Diagnostic engine evaluates Low Voltage Disconnect correctly for depleted battery'
    );
    assert(diagSunsetRes.body.evaluation.facts.length > 0, 'Context facts returned with simulated telemetry flags');
    assert(typeof diagSunsetRes.body.evaluation.voiceReply === 'string', 'Voice speech transcript generated');

    // 8. Issue Resolution & Customer Support Ticket Endpoints
    console.log('\n[Test Group 8: Diagnostic Resolution & Support Ticket Backend]');
    const resolveRes = await request('/api/v1/devices/DEV-SOL-1090/resolve', {
      method: 'POST',
      token: adminToken,
      body: {
        resolutionNotes: 'Replaced degraded lithium iron phosphate cell bank and cleaned solar panel.',
      },
    });
    assert(resolveRes.status === 200, 'POST /api/v1/devices/:id/resolve returns HTTP 200');
    assert(resolveRes.body.device.status === 'online', 'Device status transitioned to online');
    assert(resolveRes.body.device.activeAlert === null, 'Active alert successfully cleared');

    const ticketRes = await request('/api/v1/troubleshoot/ticket', {
      method: 'POST',
      token: adminToken,
      body: {
        deviceId: 'DEV-SOL-1090',
        deviceName: 'Bayfront Pier #12 Mast',
        issueSummary: 'LVD Lockout after extended cloud cover',
        priority: 'high',
        recommendedAction: 'Dispatch field technician for on-site battery inspection',
      },
    });
    assert(ticketRes.status === 201, 'POST /api/v1/troubleshoot/ticket returns HTTP 201');
    assert(ticketRes.body.ticket.ticketId.startsWith('TICK-'), 'Support ticket created with valid ticketId');
    assert(ticketRes.body.ticket.status === 'open', 'Support ticket has status open');

    // 9. Schedule Management & Deletion Lifecycle
    console.log('\n[Test Group 9: Schedule Creation, Deletion & RBAC]');
    // Create a temporary schedule
    const createSchedRes = await request('/api/v1/schedules', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Automated Test Night Dimming',
        targetType: 'region',
        targetId: 'reg-bayfront',
        brightness: 40,
        active: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        triggerType: 'astronomical',
        triggerEvent: 'sunset',
        triggerOffsetMinutes: 15,
      },
    });
    assert(createSchedRes.status === 201, 'POST /api/v1/schedules returns HTTP 201');
    const createdSchedId = createSchedRes.body.schedule.id;
    assert(createdSchedId !== undefined, 'Created schedule has valid ID');

    // Operator cannot delete schedule
    const opDelSched = await request(`/api/v1/schedules/${createdSchedId}`, {
      method: 'DELETE',
      token: operatorToken,
    });
    assert(opDelSched.status === 403, 'Operator forbidden from deleting schedule (HTTP 403)');

    // Admin can delete schedule
    const adminDelSched = await request(`/api/v1/schedules/${createdSchedId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert(adminDelSched.status === 200, 'Admin can delete schedule (HTTP 200)');
    assert(adminDelSched.body.success === true, 'Schedule deletion returns success: true');

    // Summary
    console.log('\n=====================================================================');
    console.log(`   Verification Summary: ${passed} Passed, ${failed} Failed`);
    console.log('=====================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed unexpectedly:', err);
    process.exit(1);
  }
}

runTests();
