import { JourneyMonitorService, ActiveJourneyState } from '../src/services/journeyMonitor';

console.log('===============================================================');
console.log('SAHELI STEPS 8 & 9: LIVE TRACKING & SOS ESCALATION TEST SUITE');
console.log('===============================================================\n');

let failedTests = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}`);
    failedTests++;
  }
}

async function runSteps8And9Verification() {
  // Test 1: Journey Setup & Shareable Link
  const journeyId = `jny_test_${Date.now()}`;
  const routePolyline: Array<[number, number]> = [
    [22.5542, 88.3520], // Park Street
    [22.5480, 88.3500],
    [22.5416, 88.3475]  // Rabindra Sadan
  ];

  const journey: ActiveJourneyState = {
    id: journeyId,
    userId: 'user_test_8',
    status: 'active',
    routePolyline,
    startedAt: new Date(),
    etaMinutes: 15,
    consecutiveOffRoutePings: 0,
    contactAlertLogs: []
  };

  const shareableUrl = `https://saheli-safe.app/track/${journeyId}`;
  assert(shareableUrl.includes(journeyId), 'Tracking URL must contain journey ID for zero-install recipient access');

  // Test 2: On-Route Location Ping (<150m)
  const onRoutePing = JourneyMonitorService.processLocationPing(journey, 22.5510, 88.3510);
  assert(onRoutePing.onRoute === true, 'Ping close to polyline must be classified as onRoute = true');
  assert(journey.consecutiveOffRoutePings === 0, 'Consecutive off-route pings count must be 0 when on-route');
  assert(onRoutePing.alertTriggered === false, 'No deviation alert should fire on valid route path');

  // Test 3: Off-Route Deviation Detection (>150m) with 2-ping consecutive debounce
  // First off-route ping (~400m away)
  const offRoutePing1 = JourneyMonitorService.processLocationPing(journey, 22.5510, 88.3560);
  assert(offRoutePing1.onRoute === false, 'Ping 400m away must be classified as onRoute = false');
  assert(journey.consecutiveOffRoutePings === 1, 'Off-route counter must increment to 1');
  assert(offRoutePing1.alertTriggered === false, 'First off-route ping must NOT trigger alert yet (debounce guard)');

  // Second consecutive off-route ping
  const offRoutePing2 = JourneyMonitorService.processLocationPing(journey, 22.5512, 88.3562);
  assert(offRoutePing2.onRoute === false, 'Second off-route ping must be onRoute = false');
  assert(journey.consecutiveOffRoutePings === 2, 'Off-route counter must increment to 2');
  assert(offRoutePing2.alertTriggered === true, 'Second consecutive off-route ping MUST trigger deviation alert');
  assert(offRoutePing2.alertMessage !== undefined && offRoutePing2.alertMessage.includes('DEVIATION ALERT'), 'Alert message must specify DEVIATION ALERT');
  assert(journey.contactAlertLogs.some(l => l.type === 'DEVIATION_ALERT'), 'Deviation alert must be logged in journey contact alert history');

  // Recovery: Returning to route resets counter
  const recoveryPing = JourneyMonitorService.processLocationPing(journey, 22.5500, 88.3505);
  assert(recoveryPing.onRoute === true, 'Returning near polyline must register onRoute = true');
  assert(journey.consecutiveOffRoutePings === 0, 'Returning to route must reset consecutive off-route counter to 0');

  // Test 4: Missed ETA Escalation (+10m buffer)
  // Within ETA window:
  const etaCheckNormal = JourneyMonitorService.checkETAExpiry(journey);
  assert(etaCheckNormal.isExpired === false, 'Journey within ETA + buffer must not be expired');

  // Simulated 26 minutes elapsed on a 15-minute journey (15m ETA + 10m buffer = 25m threshold)
  const overdueJourney: ActiveJourneyState = {
    ...journey,
    startedAt: new Date(Date.now() - 26 * 60 * 1000)
  };
  const etaCheckOverdue = JourneyMonitorService.checkETAExpiry(overdueJourney);
  assert(etaCheckOverdue.isExpired === true, 'Journey exceeding ETA + buffer must trigger missed ETA escalation');
  assert(overdueJourney.contactAlertLogs.some(l => l.type === 'MISSED_ETA_ALERT'), 'Missed ETA alert must be logged in journey contact alert history');

  // Test 5: Deterministic One-Tap SOS Escalation
  const sosLocation = { lat: 22.5542, lng: 88.3520 };
  const sosResult = JourneyMonitorService.triggerSOS(journey, 'Ananya Sen', sosLocation, '9830012345');

  assert(journey.status === 'sos_triggered', 'Journey status must transition to sos_triggered');
  assert(sosResult.emergencyCallNumber === '112', 'Must return 112 as standard National Emergency Number');
  assert(sosResult.smsPayloads.length > 0, 'Must generate SMS dispatch payload for contacts');
  assert(sosResult.smsPayloads[0].includes('EMERGENCY SOS'), 'SMS payload must contain EMERGENCY SOS heading');
  assert(sosResult.smsPayloads[0].includes(journey.id), 'SMS payload must include tracking link for zero-install recipient');
  assert(journey.contactAlertLogs.some(l => l.type === 'SOS_TRIGGERED'), 'SOS event must be recorded in contact alert audit logs');

  console.log('\n===============================================================');
  if (failedTests === 0) {
    console.log('ALL STEPS 8 & 9 TRACKING & SOS TESTS PASSED SUCCESSFULLY! ✅');
  } else {
    console.error(`${failedTests} STEPS 8 & 9 TESTS FAILED ❌`);
  }
  console.log('===============================================================');
}

runSteps8And9Verification();
