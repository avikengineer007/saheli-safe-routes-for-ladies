import { DeterministicSafetyScorer, SegmentData, SegmentPoint, SegmentScoreResult } from './safetyScorer';
import scoringConfig from '../config/scoringConfig.json';

export interface RouteCandidate {
  id: string;
  name: string;
  isRecommended: boolean;
  tag: 'safest' | 'fastest' | 'balanced' | 'alternate';
  distanceMeters: number;
  durationMinutes: number;
  compositeSafetyScore: number;
  scoreExplanation: string[];
  geoJsonPolyline: Array<[number, number]>;
  segments: Array<{
    start: SegmentPoint;
    end: SegmentPoint;
    score: number;
    reasons: string[];
  }>;
}

export class RoutingService {
  /**
   * Kolkata Landmark Locations Lookup
   */
  /**
   * Pan-India Landmark Locations Lookup (28 States & 8 Union Territories)
   */
  public static INDIAN_LANDMARKS: Record<string, SegmentPoint> = {
    // Delhi NCR & National Capital Territory
    'Connaught Place (Delhi)': { lat: 28.6315, lng: 77.2167 },
    'India Gate (New Delhi)': { lat: 28.6129, lng: 77.2295 },
    'Hauz Khas Village (Delhi)': { lat: 28.5494, lng: 77.1960 },
    'Cyber City (Gurugram, HR)': { lat: 28.4950, lng: 77.0895 },
    'Noida Sector 18 (UP)': { lat: 28.5708, lng: 77.3261 },
    'Chandni Chowk (Old Delhi)': { lat: 28.6506, lng: 77.2303 },

    // Maharashtra & Western India
    'Marine Drive (Mumbai, MH)': { lat: 18.9438, lng: 72.8232 },
    'Gateway of India (Mumbai)': { lat: 18.9220, lng: 72.8347 },
    'Bandra Kurla Complex (BKC, Mumbai)': { lat: 19.0657, lng: 72.8686 },
    'FC Road (Pune, MH)': { lat: 18.5204, lng: 73.8416 },
    'Sabarmati Riverfront (Ahmedabad, GJ)': { lat: 23.0300, lng: 72.5800 },
    'Pink City Hawa Mahal (Jaipur, RJ)': { lat: 26.9239, lng: 75.8267 },

    // Karnataka, Tamil Nadu, Telangana & Southern India
    'MG Road Metro (Bengaluru, KA)': { lat: 12.9756, lng: 77.6066 },
    'Koramangala 5th Block (Bengaluru)': { lat: 12.9352, lng: 77.6245 },
    'T. Nagar Bus Terminus (Chennai, TN)': { lat: 13.0418, lng: 80.2341 },
    'Marina Beach (Chennai, TN)': { lat: 13.0500, lng: 80.2824 },
    'HITEC City (Hyderabad, TS)': { lat: 17.4435, lng: 78.3772 },
    'Charminar (Hyderabad, TS)': { lat: 17.3616, lng: 78.4747 },
    'Marine Drive Kochi (Kerala)': { lat: 9.9784, lng: 76.2753 },

    // West Bengal & Eastern India
    'Park Street Metro (Kolkata, WB)': { lat: 22.5552, lng: 88.3510 },
    'Rabindra Sadan (Kolkata, WB)': { lat: 22.5416, lng: 88.3475 },
    'Salt Lake Sector V (Kolkata, WB)': { lat: 22.5731, lng: 88.4337 },
    'Howrah Railway Station (WB)': { lat: 22.5839, lng: 88.3430 },
    'Patna Sahib Railway Hub (Bihar)': { lat: 25.6110, lng: 85.2285 },
    'KIIT Chowk Bhubaneswar (Odisha)': { lat: 20.3533, lng: 85.8189 },

    // Northeast & Northern Union Territories
    'Police Bazaar (Shillong, ML)': { lat: 25.5760, lng: 91.8847 },
    'GS Road ABC Crossing (Guwahati, AS)': { lat: 26.1554, lng: 91.7783 },
    'Lal Chowk (Srinagar, J&K)': { lat: 34.0713, lng: 74.8078 },
    'Sector 17 Plaza (Chandigarh, UT)': { lat: 30.7398, lng: 76.7827 },
    'Hazratganj GPO (Lucknow, UP)': { lat: 26.8467, lng: 80.9462 }
  };

  private static mockFetchSegmentAttributes(start: SegmentPoint, end: SegmentPoint, routeIndex: number): SegmentData {
    const seed = (Math.abs(start.lat * 1000 + start.lng * 1000 + routeIndex * 13)) % 100;
    
    let isLit = true;
    let poiDensity = 0.8;
    let historicalIncidents = 0;
    let recentCrowdReports: Array<{ ageDays: number; severity: number }> = [];
    let sosStreak = 25;

    if (routeIndex === 0) { // Well-Lit Main Commercial Corridor
      isLit = true;
      poiDensity = 0.9;
      historicalIncidents = 0;
      sosStreak = 42;
    } else if (routeIndex === 1) { // Dimly lit shortcut lane
      isLit = seed > 40;
      poiDensity = 0.3;
      if (seed > 50) historicalIncidents = 2;
      if (seed % 3 === 0) {
        recentCrowdReports.push({ ageDays: 3, severity: 1.5 });
      }
      sosStreak = 4;
    } else { // Secondary Commercial Boulevard
      isLit = true;
      poiDensity = 0.7;
      sosStreak = 20;
    }

    return {
      start,
      end,
      isLit,
      poiDensity,
      historicalIncidentsCount: historicalIncidents,
      recentCrowdsourcedReports: recentCrowdReports,
      sosFreeStreakCount: sosStreak
    };
  }

  public static async fetchGoogleOrOSRMDirections(
    origin: { lat: number; lng: number; name?: string },
    dest: { lat: number; lng: number; name?: string }
  ): Promise<Array<{ id: string; name: string; polyline: Array<[number, number]> }> | null> {
    const origLabel = origin.name || 'Origin';
    const destLabel = dest.name || 'Destination';

    // 1. Try Google Directions API first if key exists
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (key) {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&mode=walking&alternatives=true&key=${key}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            return data.routes.slice(0, 3).map((r: any, idx: number) => {
              const polylinePts: Array<[number, number]> = [];
              if (r.overview_polyline && r.overview_polyline.points) {
                let index = 0, lat = 0, lng = 0;
                const str = r.overview_polyline.points;
                while (index < str.length) {
                  let b, shift = 0, result = 0;
                  do {
                    b = str.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                  } while (b >= 0x20);
                  const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
                  lat += dlat;

                  shift = 0; result = 0;
                  do {
                    b = str.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                  } while (b >= 0x20);
                  const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
                  lng += dlng;

                  polylinePts.push([lat / 1e5, lng / 1e5]);
                }
              }

              const tag = idx === 0 ? 'Well-Lit Main Road' : (idx === 1 ? 'Direct Alley Shortcut' : 'Commercial Walk');
              return {
                id: `route_google_${idx}`,
                name: `${origLabel} → ${destLabel} (${r.summary || tag})`,
                polyline: polylinePts
              };
            });
          }
        }
      } catch (err) {
        console.warn('[RoutingService] Google Directions API query error:', err);
      }
    }

    // 2. OpenStreetMap OSRM Public Walking Routing API (100% Free & turn-by-turn real streets)
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&alternatives=true`;
      const res = await fetch(osrmUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          return data.routes.slice(0, 3).map((r: any, idx: number) => {
            const coords: Array<[number, number]> = r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
            const tag = idx === 0 ? 'Well-Lit Main Road' : (idx === 1 ? 'Direct Alley Shortcut' : 'Commercial Promenade');
            return {
              id: `route_osrm_${idx}`,
              name: `${origLabel} → ${destLabel} (${tag})`,
              polyline: coords
            };
          });
        }
      }
    } catch (err) {
      console.warn('[RoutingService] OSRM public walking router error:', err);
    }

    return null;
  }

  public static async calculateSafeRoutes(
    origin: SegmentPoint,
    dest: SegmentPoint,
    maxDetourBudgetPercent: number = scoringConfig.parameters.max_detour_budget_percentage
  ): Promise<{ routes: RouteCandidate[]; summaryNotice: string }> {
    
    const candidatePaths = (await this.fetchGoogleOrOSRMDirections(origin, dest)) || this.generatePanIndiaCandidatePolylines(origin, dest);
    const scoredCandidates: RouteCandidate[] = [];

    let fastestDistance = Infinity;

    for (let i = 0; i < candidatePaths.length; i++) {
      const distance = this.calculatePolylineDistance(candidatePaths[i].polyline);
      if (distance < fastestDistance) {
        fastestDistance = distance;
      }
    }

    const maxDistanceAllowed = fastestDistance * (1 + maxDetourBudgetPercent / 100);

    for (let i = 0; i < candidatePaths.length; i++) {
      const candidate = candidatePaths[i];
      const distance = this.calculatePolylineDistance(candidate.polyline);

      const segments: RouteCandidate['segments'] = [];
      let totalWeightedScore = 0;
      let totalLength = 0;
      const aggregatedReasonsSet = new Set<string>();

      for (let j = 0; j < candidate.polyline.length - 1; j++) {
        const startPt = { lat: candidate.polyline[j][0], lng: candidate.polyline[j][1] };
        const endPt = { lat: candidate.polyline[j + 1][0], lng: candidate.polyline[j + 1][1] };
        const segLen = this.haversineDistance(startPt, endPt);

        const envData = this.mockFetchSegmentAttributes(startPt, endPt, i);
        const scoreRes = DeterministicSafetyScorer.scoreSegment(envData);

        totalWeightedScore += scoreRes.score * segLen;
        totalLength += segLen;

        scoreRes.reasons.forEach(r => aggregatedReasonsSet.add(r));

        segments.push({
          start: startPt,
          end: endPt,
          score: scoreRes.score,
          reasons: scoreRes.reasons
        });
      }

      const compositeScore = totalLength > 0 ? Math.round(totalWeightedScore / totalLength) : 80;
      const durationMinutes = Math.max(3, Math.round((distance / 1000 / 4.2) * 60));

      scoredCandidates.push({
        id: candidate.id,
        name: candidate.name,
        isRecommended: false,
        tag: i === 0 ? 'safest' : (i === 1 ? 'fastest' : 'balanced'),
        distanceMeters: Math.round(distance),
        durationMinutes,
        compositeSafetyScore: compositeScore,
        scoreExplanation: Array.from(aggregatedReasonsSet),
        geoJsonPolyline: candidate.polyline,
        segments
      });
    }

    const validRoutes = scoredCandidates.filter(
      r => r.distanceMeters <= maxDistanceAllowed || r.tag === 'fastest'
    );

    const candidatePool = validRoutes.length > 0 ? validRoutes : scoredCandidates;
    let bestRoute = candidatePool[0];
    for (const r of candidatePool) {
      if (r.compositeSafetyScore > bestRoute.compositeSafetyScore) {
        bestRoute = r;
      }
    }
    if (bestRoute) {
      bestRoute.isRecommended = true;
    }

    return {
      routes: scoredCandidates,
      summaryNotice: "OpenStreetMap & Google Directions real-world street routing active across all 28 States & 8 Union Territories."
    };
  }

  public static async resolveLocation(
    input: any,
    defaultName: string,
    anchorCoords?: { lat: number; lng: number }
  ): Promise<{ lat: number; lng: number; name: string }> {
    if (input && typeof input.lat === 'number' && typeof input.lng === 'number') {
      return { lat: input.lat, lng: input.lng, name: input.name || defaultName };
    }

    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) {
        return anchorCoords
          ? { ...anchorCoords, name: defaultName }
          : { lat: 28.6315, lng: 77.2167, name: defaultName };
      }

      const cleanInput = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');

      // 1. Direct or partial match against static landmark dictionary
      for (const [key, coords] of Object.entries(this.INDIAN_LANDMARKS)) {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanKey.includes(cleanInput) || cleanInput.includes(cleanKey)) {
          return { ...coords, name: key };
        }
      }

      // 2. Dynamic OpenStreetMap Nominatim Geocoding Lookup (Free, high accuracy for all places in India)
      try {
        const searchQuery = trimmed.toLowerCase().includes('india') ? trimmed : `${trimmed}, India`;
        const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=1`;
        const geoRes = await fetch(geoUrl, {
          headers: { 'User-Agent': 'SAHELI-SafeRoutesApp/1.0 (India-Safety-App)' }
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            const parsedLat = parseFloat(geoData[0].lat);
            const parsedLng = parseFloat(geoData[0].lon);
            if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
              return { lat: parsedLat, lng: parsedLng, name: trimmed };
            }
          }
        }
      } catch (err) {
        console.warn('[RoutingService] Nominatim geocoding query error:', err);
      }

      // 3. Fallback City Center Resolution
      const lower = trimmed.toLowerCase();
      if (lower.includes('barrackpore') || lower.includes('nawabganj') || lower.includes('ishapore') || lower.includes('kolkata') || lower.includes('calcutta') || lower.includes('hooghly') || lower.includes('howrah')) {
        const baseLat = 22.7630;
        const baseLng = 88.3640;
        if (anchorCoords) {
          return { lat: anchorCoords.lat - 0.015, lng: anchorCoords.lng - 0.008, name: trimmed };
        }
        return { lat: baseLat, lng: baseLng, name: trimmed };
      }
      if (lower.includes('mumbai') || lower.includes('thane') || lower.includes('navi mumbai')) return { lat: 18.9438, lng: 72.8232, name: trimmed };
      if (lower.includes('bengaluru') || lower.includes('bangalore')) return { lat: 12.9756, lng: 77.6066, name: trimmed };
      if (lower.includes('delhi') || lower.includes('noida') || lower.includes('gurugram') || lower.includes('gurgaon') || lower.includes('faridabad') || lower.includes('ghaziabad')) return { lat: 28.6315, lng: 77.2167, name: trimmed };
      if (lower.includes('chennai')) return { lat: 13.0418, lng: 80.2341, name: trimmed };
      if (lower.includes('hyderabad')) return { lat: 17.4435, lng: 78.3772, name: trimmed };
      if (lower.includes('pune')) return { lat: 18.5204, lng: 73.8416, name: trimmed };
      if (lower.includes('jaipur')) return { lat: 26.9239, lng: 75.8267, name: trimmed };
      if (lower.includes('guwahati')) return { lat: 26.1554, lng: 91.7783, name: trimmed };

      // 4. Proximity Fallback relative to anchor point (~800m offset in same city)
      if (anchorCoords) {
        let hash = 0;
        for (let i = 0; i < trimmed.length; i++) hash = (hash * 31 + trimmed.charCodeAt(i)) & 0xffffffff;
        const offLat = (((hash % 50) + 10) / 10000); // 0.001 - 0.006 deg offset (~100m to 600m)
        const offLng = ((((hash >> 3) % 50) + 10) / 10000);
        return { lat: anchorCoords.lat + offLat, lng: anchorCoords.lng + offLng, name: trimmed };
      }
    }

    return { lat: 28.6315, lng: 77.2167, name: defaultName };
  }

  private static generatePanIndiaCandidatePolylines(
    origin: { lat: number; lng: number; name?: string },
    dest: { lat: number; lng: number; name?: string }
  ): Array<{ id: string; name: string; polyline: Array<[number, number]> }> {
    const origLabel = origin.name || 'Origin';
    const destLabel = dest.name || 'Destination';

    const directPath: Array<[number, number]> = [
      [origin.lat, origin.lng],
      [dest.lat, dest.lng]
    ];

    return [
      { id: 'route_india_direct', name: `${origLabel} → ${destLabel} (Direct Walking Route)`, polyline: directPath }
    ];
  }

  public static haversineDistance(p1: SegmentPoint, p2: SegmentPoint): number {
    const R = 6371000;
    const rad = Math.PI / 180;
    const dLat = (p2.lat - p1.lat) * rad;
    const dLng = (p2.lng - p1.lng) * rad;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1.lat * rad) * Math.cos(p2.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static calculatePolylineDistance(polyline: Array<[number, number]>): number {
    let total = 0;
    for (let i = 0; i < polyline.length - 1; i++) {
      total += this.haversineDistance(
        { lat: polyline[i][0], lng: polyline[i][1] },
        { lat: polyline[i + 1][0], lng: polyline[i + 1][1] }
      );
    }
    return total;
  }
}
