import { AuthService } from '../src/services/authService';
import { IncidentService } from '../src/services/incidentService';
import { PersistenceService } from '../src/services/persistenceService';

console.log('=======================================================================');
console.log('SAHELI AUTHENTICATION & CORROBORATION ANTI-ABUSE VERIFICATION SUITE');
console.log('=======================================================================\n');

let failedTests = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}`);
    failedTests++;
  }
}

async function runAuthAndCorroborationTests() {
  const persistence = PersistenceService.getInstance();
  persistence.resetForTesting();

  console.log('1. Testing Phone OTP Generation and Rate Limiting...');
  const testPhone = '+919876543210';

  // Request 1: should succeed
  const sendRes1 = await AuthService.sendOtp(testPhone);
  assert(sendRes1.success === true, 'First OTP send request should succeed');

  // Request 2 & 3: should succeed
  await AuthService.sendOtp(testPhone);
  await AuthService.sendOtp(testPhone);

  // Request 4: should fail due to rate limit (max 3 sends per hour per phone)
  let rateLimitCaught = false;
  try {
    await AuthService.sendOtp(testPhone);
  } catch (err: any) {
    rateLimitCaught = err.message.includes('Rate limit exceeded');
  }
  assert(rateLimitCaught, '4th OTP send within one hour must be blocked by rate limiter');

  console.log('\n2. Testing OTP Code Verification & Tamper-Proof Session Tokens...');
  // Verify with invalid OTP code
  let invalidOtpCaught = false;
  try {
    await AuthService.verifyOtpAndLogin(testPhone, '000000');
  } catch (err: any) {
    invalidOtpCaught = err.message.includes('Incorrect OTP');
  }
  assert(invalidOtpCaught, 'Verification with incorrect OTP must fail');

  // Test brute-force protection: 5 consecutive invalid attempts must lock out the session
  const brutePhone = '+919876543299';
  persistence.saveOtp(brutePhone, '654321', 300);

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await AuthService.verifyOtpAndLogin(brutePhone, '111111');
    } catch (_) {}
  }

  let lockedOut = false;
  try {
    // 5th attempt triggers lockout
    await AuthService.verifyOtpAndLogin(brutePhone, '111111');
  } catch (err: any) {
    lockedOut = err.message.includes('Max incorrect attempts exceeded') || err.message.includes('No OTP requested');
  }
  assert(lockedOut, '5 consecutive invalid OTP attempts must lock out the session');

  // Verify with valid test OTP code ('123456' for test environment)
  const loginRes = await AuthService.verifyOtpAndLogin(testPhone, '123456', 'Ananya Sen');
  assert(Boolean(loginRes.token), 'Valid OTP verification must return session token');
  assert(loginRes.user.phone === testPhone, 'User record must reflect verified phone number');

  // Verify token validation and tamper detection
  const tokenValidation = AuthService.verifySessionToken(loginRes.token);
  assert(tokenValidation.valid === true, 'Generated session token must pass signature verification');

  const tamperedToken = loginRes.token.slice(0, -4) + 'abcd';
  const tamperedValidation = AuthService.verifySessionToken(tamperedToken);
  assert(tamperedValidation.valid === false, 'Tampered session token signature must be rejected');

  console.log('\n3. Testing 3-User, 150m, 48h Corroboration Engine (§12.3)...');
  // Cluster Location: Park Street / Camac Street crossing (22.5535, 88.3515)
  const clusterLat = 22.5535;
  const clusterLng = 88.3515;

  // Report 1 from User A (account age 30 days, trust 0.8)
  const report1 = await IncidentService.submitReport({
    userId: 'user_corrob_a',
    userPhone: '+919876543211',
    userTrustScore: 0.8,
    userAccountAgeDays: 30,
    lat: clusterLat,
    lng: clusterLng,
    category: 'poor_lighting',
    description: 'Broken sodium lamp at corner of Park Street and Camac Street'
  });

  assert(report1.report.status === 'pending', 'First report without quorum must remain pending');
  assert(report1.corroborationStatus.currentQuorumCount === 1, 'Cluster quorum count should be 1');
  assert(report1.corroborationStatus.isVerified === false, 'Report 1 must not be verified without quorum');

  // Report 2 from User B (50m away, within 150m radius)
  const report2 = await IncidentService.submitReport({
    userId: 'user_corrob_b',
    userPhone: '+919876543212',
    userTrustScore: 0.75,
    userAccountAgeDays: 14,
    lat: clusterLat + 0.0003, // ~33 meters away
    lng: clusterLng + 0.0002,
    category: 'poor_lighting',
    description: 'Very dark stretch along corner'
  });

  assert(report2.report.status === 'pending', 'Second report without quorum must remain pending');
  assert(report2.corroborationStatus.currentQuorumCount === 2, 'Cluster quorum count should be 2');
  assert(report2.corroborationStatus.isVerified === false, 'Report 2 must not be verified without quorum');

  // Report 3 from User C (within 150m radius) -> Meets Quorum (3/3)!
  const report3 = await IncidentService.submitReport({
    userId: 'user_corrob_c',
    userPhone: '+919876543213',
    userTrustScore: 0.9,
    userAccountAgeDays: 45,
    lat: clusterLat - 0.0002, // ~22 meters away
    lng: clusterLng - 0.0001,
    category: 'poor_lighting',
    description: 'Confirming unlit streetlamp'
  });

  assert(report3.report.status === 'verified', 'Third independent user report meeting quorum must be promoted to verified');
  assert(report3.corroborationStatus.currentQuorumCount >= 3, 'Cluster quorum count must be >= 3');
  assert(report3.corroborationStatus.isVerified === true, 'Report 3 must be marked verified');

  // Verify that prior reports in the cluster were also promoted to verified
  const allIncidents = persistence.getIncidents();
  const promotedReport1 = allIncidents.find(i => i.id === report1.report.id);
  const promotedReport2 = allIncidents.find(i => i.id === report2.report.id);
  assert(promotedReport1?.status === 'verified', 'Report 1 in cluster must be auto-promoted to verified');
  assert(promotedReport2?.status === 'verified', 'Report 2 in cluster must be auto-promoted to verified');

  console.log('\n4. Testing Public Heatmap Strict Gating...');
  const heatmapPoints = IncidentService.getPublicHeatmapPoints();
  const verifiedPoints = allIncidents.filter(i => i.status === 'verified');
  assert(heatmapPoints.length === verifiedPoints.length, 'Public heatmap must ONLY contain verified reports');

  console.log('\n5. Testing Walk Feedback Persistence (Priority 3)...');
  const feedbackRecord = persistence.recordFeedback({
    journeyId: 'jny_test_101',
    safetyRating: 5,
    lightingAdequate: true,
    detourWorthIt: true,
    notes: 'Well-lit Kolkata commercial corridor route was peaceful.'
  });

  assert(Boolean(feedbackRecord.id), 'Feedback must be saved with unique ID');
  const storedFeedbacks = persistence.getFeedbacks();
  const foundFeedback = storedFeedbacks.find(f => f.id === feedbackRecord.id);
  assert(Boolean(foundFeedback), 'Feedback record must be retrieved from persistent storage');
  assert(foundFeedback?.safetyRating === 5, 'Feedback safety rating must be accurately stored');

  console.log('\n=======================================================================');
  if (failedTests === 0) {
    console.log('ALL AUTHENTICATION, PERSISTENCE & CORROBORATION TESTS PASSED! ✅');
  } else {
    console.error(`${failedTests} TESTS FAILED ❌`);
  }
  console.log('=======================================================================');
}

runAuthAndCorroborationTests();
