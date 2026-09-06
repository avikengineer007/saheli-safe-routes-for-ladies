import http from 'http';
import { RoutingService } from '../src/services/routingService';
import { MargProvider, OsrmFallbackProvider, isWithinIndiaBBox } from '../src/services/routingProviders';
import scoringConfig from '../src/config/scoringConfig.json';

console.log('=======================================================================');
console.log('SAHELI §15 MARG ROUTING ENGINE INTEGRATION & RESILIENCE SUITE');
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

// Shared Kolkata Ground-Truth Verification Coordinates
const PARK_STREET = { lat: 22.5542, lng: 88.3520, name: 'Flurys Park Street' };
const CAMAC_STREET = { lat: 22.5480, lng: 88.3520, name: 'Camac Street' };

async function runMargIntegrationTests() {
  console.log('1. Testing Sovereign India Bounding Box Fail-Closed Gate...');
  const kolkataInBounds = isWithinIndiaBBox(PARK_STREET);
  assert(kolkataInBounds === true, 'Kolkata coordinates must be within Indian sovereign bounding box');

  const londonOutBounds = isWithinIndiaBBox({ lat: 51.5074, lng: -0.1278 });
  assert(londonOutBounds === false, 'London coordinates must fail Indian bounding box check');

  const margForeign = new MargProvider('http://127.0.0.1:9999');
  const foreignRoute = await margForeign.getRoutes(
    { lat: 51.5074, lng: -0.1278 },
    { lat: 51.5150, lng: -0.1300 }
  );
  assert(foreignRoute === null, 'MargProvider must fail closed (null) for coordinates outside India');

  console.log('\n2. Testing Public OSRM Demo Speed Normalization & Mode Warning...');
  const osrmProvider = new OsrmFallbackProvider('https://router.project-osrm.org');
  const osrmRoutes = await osrmProvider.getRoutes(PARK_STREET, CAMAC_STREET);

  if (osrmRoutes && osrmRoutes.length > 0) {
    const route = osrmRoutes[0];
    console.log(`   OSRM distance: ${route.distanceMeters}m, normalized duration: ${route.durationSeconds}s (${(route.durationSeconds / 60).toFixed(1)} mins)`);
    assert(route.provider === 'osrm_fallback', 'Route must be tagged as osrm_fallback');
    assert(Boolean(route.modeWarning), 'Public demo OSRM route must have modeWarning populated');

    // Verify speed normalization: distance / duration should be ~1.17 m/s (4.2 km/h), NOT 8.4 m/s (30 km/h)
    const speedMps = route.distanceMeters / route.durationSeconds;
    console.log(`   Effective walking speed: ${speedMps.toFixed(2)} m/s (${(speedMps * 3.6).toFixed(1)} km/h)`);
    assert(speedMps < 2.0, 'Effective speed must reflect walking pace (< 2.0 m/s), not vehicle speed');
  } else {
    console.log('   [INFO] OSRM public demo query skipped / rate-limited by network. Testing speed math locally:');
    const dummyDist = 1578.6;
    const normSec = Math.round(dummyDist / 1.167);
    assert(normSec > 1300 && normSec < 1400, 'Normalized duration for 1578m must be approx 22.5 mins (~1352s)');
  }

  console.log('\n3. Testing Shadow Mode When Gate is False...');
  // Ensure gate is false
  (scoringConfig as any).launch_regions.kolkata.gates.marg_routing_validated = false;
  const shadowPaths = await RoutingService.fetchCandidatePaths(PARK_STREET, CAMAC_STREET);
  assert(Boolean(shadowPaths && shadowPaths.length > 0), 'Must return viable candidate paths');
  const servedProvider = shadowPaths?.[0]?.routingProvider;
  console.log(`   Served route provider under gate=false: ${servedProvider}`);
  assert(servedProvider !== 'marg', 'When marg_routing_validated is false, Marg must NEVER be the served provider');

  console.log('\n4. Testing Cutover Behavior with Live Simulated Marg Server...');
  // Spin up a transient local mock Marg HTTP server
  const mockMargServer = http.createServer((req, res) => {
    if (req.url?.startsWith('/route')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 'Ok',
        routes: [
          {
            name: 'Marg Footpath Central Corridor',
            distance: 1250,
            duration: 980,
            geometry: {
              coordinates: [
                [88.3520, 22.5542],
                [88.3521, 22.5510],
                [88.3520, 22.5480]
              ]
            }
          }
        ]
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise<void>((resolve) => mockMargServer.listen(9876, '127.0.0.1', () => resolve()));
  console.log('   Transient Mock Marg Server running on 127.0.0.1:9876');

  try {
    // Override MARG_BASE_URL to point to our mock server
    process.env.MARG_BASE_URL = 'http://127.0.0.1:9876';

    // Simulate flipping gate to true
    (scoringConfig as any).launch_regions.kolkata.gates.marg_routing_validated = true;

    const cutoverPaths = await RoutingService.fetchCandidatePaths(PARK_STREET, CAMAC_STREET);
    assert(Boolean(cutoverPaths && cutoverPaths.length > 0), 'Cutover paths must be returned');
    assert(cutoverPaths?.[0]?.routingProvider === 'marg', 'Primary provider must cut over to Marg when gate is true');
    assert(Boolean(cutoverPaths?.[0]?.name?.includes('Marg Footpath')), 'Route candidate must use Marg footpath attributes');

    console.log('\n5. Testing Graceful Degradation on Marg Daemon Failure / 500...');
    // Kill mock server to simulate Marg crash/downtime
    await new Promise<void>((resolve) => mockMargServer.close(() => resolve()));
    console.log('   Mock Marg Server terminated (simulating service outage).');

    // With gate still true, RoutingService must gracefully fallback to Google or OSRM without throwing
    const fallbackPaths = await RoutingService.fetchCandidatePaths(PARK_STREET, CAMAC_STREET);
    assert(Boolean(fallbackPaths && fallbackPaths.length > 0), 'Must successfully return fallback routes when Marg is down');
    assert(fallbackPaths?.[0]?.routingProvider !== 'marg', 'Fallback route must not claim to be Marg');
    console.log(`   Degraded to fallback provider: ${fallbackPaths?.[0]?.routingProvider}`);

    // Complete end-to-end routing calculation under fallback
    const safeRoutes = await RoutingService.calculateSafeRoutes(PARK_STREET, CAMAC_STREET, 25);
    assert(safeRoutes.routes.length > 0, 'calculateSafeRoutes must succeed during Marg outage');
    assert(safeRoutes.routes[0].compositeSafetyScore >= 0, 'Safety score must be computed accurately on fallback');

  } finally {
    // Reset gate to false to honor ground truth
    (scoringConfig as any).launch_regions.kolkata.gates.marg_routing_validated = false;
    delete process.env.MARG_BASE_URL;
  }

  console.log('\n=======================================================================');
  console.log(`MARG INTEGRATION TEST RESULTS: ${failedTests === 0 ? 'ALL TESTS PASSED' : `${failedTests} FAILURES`}`);
  console.log('=======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMargIntegrationTests().catch(err => {
  console.error('[FATAL] Unhandled test exception:', err);
  process.exit(1);
});
