import { OsmOverpassService } from '../src/services/osmOverpassService';
import { RoutingService } from '../src/services/routingService';

console.log('=======================================================================');
console.log('SAHELI OPENSTREETMAP OVERPASS REAL DATA INTEGRATION SUITE');
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

async function runOsmTests() {
  const osmService = OsmOverpassService.getInstance();

  console.log('1. Testing Live Overpass Query for Kolkata Central Corridor...');
  // Bounding box around Camac Street & Park Street, Kolkata
  let ways = await osmService.getLightingForBBox(22.545, 88.345, 22.555, 88.358);
  if (ways.length === 0) {
    console.log('   [INFO] Shared Overpass endpoint rate-limited by consecutive test queries. Cooling down 2.5s...');
    await new Promise(r => setTimeout(r, 2500));
    ways = await osmService.getLightingForBBox(22.545, 88.345, 22.555, 88.358);
  }
  console.log(`   Retrieved ${ways.length} OpenStreetMap ways in Kolkata corridor.`);
  assert(ways.length > 0, 'Overpass API must return OSM highway ways in Kolkata');

  // Verify at least one way has physical lighting tags or highway classification
  const waysWithNames = ways.filter(w => Boolean(w.name));
  assert(waysWithNames.length > 0, `OSM ways should have identifiable street names (found ${waysWithNames.length})`);

  console.log('\n2. Testing Segment Matching on Known Kolkata Streets...');
  // Segment along Park Street / Mother Teresa Sarani (22.5542, 88.3520)
  const parkStart = { lat: 22.5535, lng: 88.3515 };
  const parkEnd = { lat: 22.5545, lng: 88.3525 };

  const matchResult = await osmService.matchSegmentLighting(parkStart, parkEnd, 75.0);
  console.log('   Match result:', matchResult);
  assert(matchResult.matched === true, `Segment should match to nearby OSM highway way (matched: ${matchResult.wayName || matchResult.highwayType})`);

  console.log('\n3. Testing Kolkata Route Calculation with Real OSM Attributes...');
  const parkStreet = await RoutingService.resolveLocation('Flurys Park Street (Kolkata)', 'Park Street');
  const camacStreet = await RoutingService.resolveLocation('Camac Street (Kolkata)', 'Camac Street');

  const routesResult = await RoutingService.calculateSafeRoutes(parkStreet, camacStreet, 25);
  assert(routesResult.routes.length > 0, 'Kolkata route calculation must return route candidates');

  const safestRoute = routesResult.routes.find(r => r.tag === 'safest') || routesResult.routes[0];
  console.log(`   Safest route composite score: ${safestRoute.compositeSafetyScore}, confidence: ${safestRoute.dataConfidence}`);
  assert(safestRoute.compositeSafetyScore >= 0 && safestRoute.compositeSafetyScore <= 100, 'Composite score must be valid 0-100');
  assert(
    safestRoute.dataConfidence === 'verified_dense' || safestRoute.dataConfidence === 'cold_start',
    'Route confidence must be verified_dense (if threshold met) or cold_start'
  );

  console.log('\n4. Testing Fail-Safe Degradation on Missing / Unverified Lighting...');
  // Test segment in rural/unmapped coordinates where OSM has no lighting data
  const unmappedStart = { lat: 26.5000, lng: 89.5000 };
  const unmappedEnd = { lat: 26.5050, lng: 89.5050 };
  const unmappedMatch = await osmService.matchSegmentLighting(unmappedStart, unmappedEnd, 25.0);
  assert(unmappedMatch.isLit === undefined, 'Unmapped segment should have isLit === undefined, not true');

  console.log('\n=======================================================================');
  if (failedTests === 0) {
    console.log('ALL REAL OPENSTREETMAP OVERPASS TESTS PASSED! ✅');
  } else {
    console.error(`${failedTests} OPENSTREETMAP TESTS FAILED ❌`);
  }
  console.log('=======================================================================');
}

runOsmTests();
