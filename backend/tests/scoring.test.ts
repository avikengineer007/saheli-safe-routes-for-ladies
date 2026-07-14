import { DeterministicSafetyScorer } from '../src/services/safetyScorer';
import { RoutingService } from '../src/services/routingService';
import { JourneyMonitorService } from '../src/services/journeyMonitor';
import { IncidentService } from '../src/services/incidentService';

console.log('==================================================');
console.log('SAHELI DETERMINISTIC ENGINE VERIFICATION SUITE');
console.log('==================================================\n');

let failedTests = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}`);
    failedTests++;
  }
}

async function runTests() {
  // Test 1: Night multiplier calculation
  const dayDate = new Date(2026, 6, 13, 14, 0, 0); // 14:00 local time (Day)
  const nightDate = new Date(2026, 6, 13, 22, 30, 0); // 22:30 local time (Night)
  
  const dayMult = DeterministicSafetyScorer.getNightMultiplier(dayDate);
  const nightMult = DeterministicSafetyScorer.getNightMultiplier(nightDate);
  
  assert(dayMult === 1.0, 'Day multiplier should equal 1.0');
  assert(nightMult === 1.8, 'Night multiplier should equal 1.8');

  // Test 2: Deterministic segment score on lit vs unlit street at night
  const start = { lat: 28.6139, lng: 77.2090 };
  const end = { lat: 28.6145, lng: 77.2095 };

  const litScore = DeterministicSafetyScorer.scoreSegment({
    start,
    end,
    isLit: true,
    poiDensity: 0.8,
    historicalIncidentsCount: 0,
    sosFreeStreakCount: 10
  }, nightDate);

  const unlitScore = DeterministicSafetyScorer.scoreSegment({
    start,
    end,
    isLit: false,
    poiDensity: 0.8,
    historicalIncidentsCount: 0,
    sosFreeStreakCount: 10
  }, nightDate);

  assert(litScore.score > unlitScore.score, 'Lit street should have higher safety score than unlit street');
  assert(unlitScore.breakdown.lightingPenalty === 36, `Night unlit penalty should be 20 * 1.8 = 36 (got ${unlitScore.breakdown.lightingPenalty})`);

  // Test 3: Haversine distance formula
  const dMeters = RoutingService.haversineDistance(start, end);
  assert(dMeters > 50 && dMeters < 100, `Distance between points should be ~75m (got ${Math.round(dMeters)}m)`);

  // Test 4: Journey deviation boundary calculation
  const routePolyline: Array<[number, number]> = [
    [28.6139, 77.2090],
    [28.6150, 77.2090]
  ];

  const onRoutePing = { lat: 28.6142, lng: 77.2091 }; // ~10 meters off line
  const offRoutePing = { lat: 28.6142, lng: 77.2120 }; // ~300 meters off line

  const distOn = JourneyMonitorService.minDistanceToPolyline(onRoutePing, routePolyline);
  const distOff = JourneyMonitorService.minDistanceToPolyline(offRoutePing, routePolyline);

  assert(distOn < 150, `On-route ping distance should be < 150m (got ${Math.round(distOn)}m)`);
  assert(distOff > 150, `Off-route ping distance should be > 150m (got ${Math.round(distOff)}m)`);

  // Test 5: Incident deterministic trust gating
  const establishedReport = await IncidentService.submitReport({
    userId: 'test_user_established',
    userTrustScore: 0.8,
    userAccountAgeDays: 15,
    lat: 28.6139,
    lng: 77.2090,
    category: 'poor_lighting',
    description: 'Test report from established user account'
  });

  const newAccReport = await IncidentService.submitReport({
    userId: 'test_user_new',
    userTrustScore: 0.4,
    userAccountAgeDays: 2,
    lat: 28.7000,
    lng: 77.3000, // separate cell
    category: 'harassment',
    description: 'Test report from brand new account'
  });

  assert(establishedReport.report.status === 'verified', 'Established account report should go straight to verified');
  assert(newAccReport.report.status === 'pending', 'New account report should enter pending state for moderation/corroboration');

  console.log('\n==================================================');
  if (failedTests === 0) {
    console.log('ALL SAHELI VERIFICATION TESTS PASSED SUCCESSFULLY! ✅');
  } else {
    console.error(`${failedTests} TESTS FAILED ❌`);
  }
  console.log('==================================================');
}

runTests();
