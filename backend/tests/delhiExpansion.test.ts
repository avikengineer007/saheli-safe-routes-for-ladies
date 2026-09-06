import { RoutingService } from '../src/services/routingService';
import { IncidentService } from '../src/services/incidentService';

console.log('===============================================================');
console.log('SAHELI DELHI EXPANSION VERIFICATION SUITE');
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

async function runDelhiExpansionVerification() {
  // Test 1: Central Delhi Landmark Resolution (Connaught Place -> India Gate)
  const cp = await RoutingService.resolveLocation('Connaught Place', 'Connaught Place');
  const indiaGate = await RoutingService.resolveLocation('India Gate', 'India Gate');

  assert(Math.abs(cp.lat - 28.6315) < 0.01 && Math.abs(cp.lng - 77.2167) < 0.01, 'Connaught Place must resolve to Central Delhi (lat: ~28.631, lng: ~77.216)');
  assert(Math.abs(indiaGate.lat - 28.6129) < 0.01 && Math.abs(indiaGate.lng - 77.2295) < 0.01, 'India Gate must resolve to New Delhi (lat: ~28.612, lng: ~77.229)');

  // Test 2: North Delhi Student Hub Resolution (DU North Campus -> Kamla Nagar)
  const duNorth = await RoutingService.resolveLocation('Delhi University North Campus', 'DU North Campus');
  const kamlaNagar = await RoutingService.resolveLocation('Kamla Nagar', 'Kamla Nagar');

  assert(Math.abs(duNorth.lat - 28.6890) < 0.01, 'DU North Campus must resolve to North Delhi (lat: ~28.689)');
  assert(Math.abs(kamlaNagar.lat - 28.6800) < 0.01, 'Kamla Nagar must resolve to North Delhi (lat: ~28.680)');

  // Test 3: South Delhi Heritage & Commercial (Hauz Khas Village -> Saket Citywalk)
  const hauzKhas = await RoutingService.resolveLocation('Hauz Khas Village', 'Hauz Khas');
  const saket = await RoutingService.resolveLocation('Saket Select CITYWALK', 'Saket');

  assert(Math.abs(hauzKhas.lat - 28.5494) < 0.01, 'Hauz Khas must resolve to South Delhi (lat: ~28.549)');
  assert(Math.abs(saket.lat - 28.5284) < 0.01, 'Saket must resolve to South Delhi (lat: ~28.528)');

  // Test 4: West Delhi & Transit Hubs (Dwarka Sector 21 -> Kashmere Gate ISBT)
  const dwarka = await RoutingService.resolveLocation('Dwarka Sector 21 Metro', 'Dwarka');
  const kashmereGate = await RoutingService.resolveLocation('Kashmere Gate ISBT', 'Kashmere Gate');

  assert(Math.abs(dwarka.lat - 28.5522) < 0.01, 'Dwarka Sector 21 must resolve to South West Delhi (lat: ~28.552)');
  assert(Math.abs(kashmereGate.lat - 28.6675) < 0.01, 'Kashmere Gate must resolve to North Delhi (lat: ~28.667)');

  // Test 5: Route Calculation in Delhi with Safe Scoring
  // Plan route between Connaught Place and India Gate
  const delhiRouteRes = await RoutingService.calculateSafeRoutes(cp, indiaGate, 25);

  assert(delhiRouteRes.routes.length > 0, 'Must calculate candidate routes in Delhi');
  const safestDelhiRoute = delhiRouteRes.routes.find(r => r.isRecommended || r.tag === 'safest');
  assert(safestDelhiRoute !== undefined, 'Must identify recommended safest route in Delhi');
  assert(safestDelhiRoute!.compositeSafetyScore >= 50, `Safest route score should be reasonable (got ${safestDelhiRoute?.compositeSafetyScore})`);
  assert(safestDelhiRoute!.geoJsonPolyline.length >= 2, 'Route polyline must have points');

  // Test 6: Verified Delhi Hazards in Heatmap
  const heatmapPoints = IncidentService.getPublicHeatmapPoints();
  const delhiHazards = heatmapPoints.filter(p => p.lat >= 28.4 && p.lat <= 28.9 && p.lng >= 76.9 && p.lng <= 77.4);

  assert(delhiHazards.length >= 4, `Public heatmap must contain verified hazards across Delhi (got ${delhiHazards.length} points)`);
  assert(delhiHazards.some(p => p.category === 'poor_lighting'), 'Delhi heatmap must include poor lighting reports');
  assert(delhiHazards.some(p => p.category === 'harassment'), 'Delhi heatmap must include harassment alerts');

  console.log('\n===============================================================');
  if (failedTests === 0) {
    console.log('ALL DELHI EXPANSION TESTS PASSED SUCCESSFULLY! ✅');
  } else {
    console.error(`${failedTests} DELHI TESTS FAILED ❌`);
  }
  console.log('===============================================================');
}

runDelhiExpansionVerification();
