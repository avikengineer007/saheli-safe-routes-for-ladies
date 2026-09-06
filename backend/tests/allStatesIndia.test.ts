import { RoutingService } from '../src/services/routingService';

console.log('=======================================================================');
console.log('SAHELI PAN-INDIA VERIFICATION SUITE (ALL 28 STATES & 8 UNION TERRITORIES)');
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

async function runPanIndiaVerification() {
  const panIndiaChecklist = [
    // Northern States & UTs
    { state: 'Jammu & Kashmir (UT)', query: 'Srinagar Lal Chowk', expLat: 34.07, expLng: 74.80 },
    { state: 'Ladakh (UT)', query: 'Leh Main Bazaar', expLat: 34.16, expLng: 77.58 },
    { state: 'Himachal Pradesh', query: 'Shimla Mall Road', expLat: 31.10, expLng: 77.17 },
    { state: 'Punjab', query: 'Amritsar Golden Temple', expLat: 31.62, expLng: 74.87 },
    { state: 'Chandigarh (UT)', query: 'Chandigarh Sector 17 Plaza', expLat: 30.73, expLng: 76.78 },
    { state: 'Uttarakhand', query: 'Dehradun Clock Tower', expLat: 30.32, expLng: 78.04 },
    { state: 'Haryana', query: 'Gurugram Cyber Hub', expLat: 28.49, expLng: 77.08 },
    { state: 'Delhi (NCT)', query: 'Connaught Place', expLat: 28.63, expLng: 77.21 },
    { state: 'Uttar Pradesh', query: 'Lucknow Hazratganj', expLat: 26.84, expLng: 80.94 },
    { state: 'Rajasthan', query: 'Jaipur Hawa Mahal', expLat: 26.92, expLng: 75.82 },

    // Western States & UTs
    { state: 'Gujarat', query: 'Ahmedabad Sabarmati Riverfront', expLat: 23.03, expLng: 72.57 },
    { state: 'Maharashtra', query: 'Marine Drive (Mumbai, MH)', expLat: 18.94, expLng: 72.82 },
    { state: 'Goa', query: 'Panaji Church Square', expLat: 15.49, expLng: 73.82 },
    { state: 'Dadra & Nagar Haveli and Daman & Diu (UT)', query: 'Daman Moti Daman Fort', expLat: 20.41, expLng: 72.83 },

    // Central & Eastern States
    { state: 'Madhya Pradesh', query: 'Indore 56 Dukan', expLat: 22.72, expLng: 75.88 },
    { state: 'Chhattisgarh', query: 'Raipur Marine Drive Telibandha', expLat: 21.23, expLng: 81.66 },
    { state: 'Bihar', query: 'Patna Gandhi Maidan', expLat: 25.61, expLng: 85.14 },
    { state: 'Jharkhand', query: 'Ranchi Main Road', expLat: 23.36, expLng: 85.33 },
    { state: 'Odisha', query: 'Bhubaneswar Master Canteen', expLat: 20.26, expLng: 85.84 },
    { state: 'West Bengal', query: 'Flurys Park Street (Kolkata)', expLat: 22.55, expLng: 88.35 },

    // The 8 Sister States of the Northeast
    { state: 'Assam', query: 'Guwahati GS Road ABC', expLat: 26.15, expLng: 91.77 },
    { state: 'Meghalaya', query: 'Shillong Police Bazaar', expLat: 25.57, expLng: 91.88 },
    { state: 'Manipur', query: 'Imphal Kangla Fort', expLat: 24.80, expLng: 93.94 },
    { state: 'Mizoram', query: 'Aizawl Chanmari', expLat: 23.74, expLng: 92.71 },
    { state: 'Nagaland', query: 'Kohima War Cemetery', expLat: 25.67, expLng: 94.10 },
    { state: 'Tripura', query: 'Agartala Ujjayanta Palace', expLat: 23.83, expLng: 91.28 },
    { state: 'Arunachal Pradesh', query: 'Itanagar Ganga Market', expLat: 27.09, expLng: 93.61 },
    { state: 'Sikkim', query: 'Gangtok MG Marg', expLat: 27.33, expLng: 88.61 },

    // Southern States & UTs
    { state: 'Karnataka', query: 'MG Road Metro (Bengaluru, KA)', expLat: 12.97, expLng: 77.60 },
    { state: 'Telangana', query: 'HITEC City (Hyderabad, TS)', expLat: 17.44, expLng: 78.37 },
    { state: 'Andhra Pradesh', query: 'Visakhapatnam RK Beach', expLat: 17.71, expLng: 83.31 },
    { state: 'Tamil Nadu', query: 'T. Nagar Bus Terminus (Chennai, TN)', expLat: 13.04, expLng: 80.23 },
    { state: 'Kerala', query: 'Kochi Marine Drive', expLat: 9.98, expLng: 76.27 },
    { state: 'Puducherry (UT)', query: 'Puducherry Promenade Beach', expLat: 11.93, expLng: 79.83 },
    { state: 'Andaman & Nicobar (UT)', query: 'Port Blair Cellular Jail', expLat: 11.67, expLng: 92.74 },
    { state: 'Lakshadweep (UT)', query: 'Kavaratti Beach Jetty', expLat: 10.56, expLng: 72.64 }
  ];

  console.log(`Verifying Landmark Coverage across all ${panIndiaChecklist.length} States & UT entries...`);

  for (const item of panIndiaChecklist) {
    const res = await RoutingService.resolveLocation(item.query, item.state);
    const latMatch = Math.abs(res.lat - item.expLat) < 0.1;
    const lngMatch = Math.abs(res.lng - item.expLng) < 0.1;
    assert(latMatch && lngMatch, `${item.state}: '${item.query}' resolved within bounds (lat: ${res.lat.toFixed(2)}, lng: ${res.lng.toFixed(2)})`);
  }

  // Test Route Calculation in Western India (Mumbai Colaba -> Marine Drive)
  // Per §13.2 gates: Mumbai has not undergone regional data validation, so it MUST be downgraded to cold_start.
  const colaba = await RoutingService.resolveLocation('Leopold Cafe (Colaba, Mumbai)', 'Colaba');
  const marineDrive = await RoutingService.resolveLocation('Marine Drive (Mumbai, MH)', 'Marine Drive');
  const mumbaiRoutes = await RoutingService.calculateSafeRoutes(colaba, marineDrive, 25);

  assert(mumbaiRoutes.routes.length > 0, 'Mumbai route planning must return candidates');
  assert(mumbaiRoutes.routes[0].dataConfidence === 'cold_start', `Mumbai data confidence must be downgraded to cold_start (got ${mumbaiRoutes.routes[0].dataConfidence})`);
  assert(mumbaiRoutes.routes[0].scoreExplanation.some(e => e.includes('Unverified Region')), 'Mumbai route explanation must disclose Unverified Region warning');

  // Test Route Calculation in Southern India (Bengaluru MG Road -> Koramangala)
  // Per §13.2 gates: Bengaluru has not undergone regional data validation, so it MUST be downgraded to cold_start.
  const mgRoad = await RoutingService.resolveLocation('MG Road Metro (Bengaluru, KA)', 'MG Road');
  const koramangala = await RoutingService.resolveLocation('Koramangala 5th Block (Bengaluru)', 'Koramangala');
  const blrRoutes = await RoutingService.calculateSafeRoutes(mgRoad, koramangala, 25);

  assert(blrRoutes.routes.length > 0, 'Bengaluru route planning must return candidates');
  assert(blrRoutes.routes[0].dataConfidence === 'cold_start', `Bengaluru data confidence must be downgraded to cold_start (got ${blrRoutes.routes[0].dataConfidence})`);
  assert(blrRoutes.routes[0].scoreExplanation.some(e => e.includes('Unverified Region')), 'Bengaluru route explanation must disclose Unverified Region warning');

  // Test Route Calculation in Northeast India (Guwahati GS Road -> Paltan Bazaar)
  const ghyOrigin = await RoutingService.resolveLocation('Guwahati GS Road ABC (Assam)', 'Guwahati');
  const ghyDest = { lat: 26.1750, lng: 91.7500 }; // Paltan Bazaar
  const ghyRoutes = await RoutingService.calculateSafeRoutes(ghyOrigin, ghyDest, 25);

  assert(ghyRoutes.routes.length > 0, 'Guwahati route planning must return candidates');
  assert(ghyRoutes.routes[0].dataConfidence === 'cold_start', `Guwahati data confidence must be cold_start (got ${ghyRoutes.routes[0].dataConfidence})`);
  assert(ghyRoutes.routes[0].scoreExplanation.some(e => e.includes('Unverified Region')), 'Guwahati route explanation must disclose Unverified Region warning');

  console.log('\n=======================================================================');
  if (failedTests === 0) {
    console.log('ALL PAN-INDIA (28 STATES & 8 UTs) VERIFICATION TESTS PASSED! ✅');
  } else {
    console.error(`${failedTests} PAN-INDIA TESTS FAILED ❌`);
  }
  console.log('=======================================================================');
}

runPanIndiaVerification();
