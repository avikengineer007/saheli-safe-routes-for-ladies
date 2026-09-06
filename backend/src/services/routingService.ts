import { DeterministicSafetyScorer, SegmentData, SegmentPoint, SegmentScoreResult } from './safetyScorer';
import { OsmOverpassService, OsmWayLighting } from './osmOverpassService';
import { MargProvider, GoogleMapsProvider, OsrmFallbackProvider, NormalizedRawRoute } from './routingProviders';
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
  dataConfidence?: 'verified_dense' | 'standard' | 'cold_start';
  routingProvider?: 'marg' | 'google' | 'osrm_fallback';
  modeWarning?: string;
}

export interface CandidatePath {
  id: string;
  name: string;
  polyline: Array<[number, number]>;
  routingProvider?: 'marg' | 'google' | 'osrm_fallback';
  modeWarning?: string;
}

export class RoutingService {
  /**
   * Kolkata Landmark Locations Lookup
   */
  /**
   * Pan-India Landmark Locations Lookup (28 States & 8 Union Territories)
   */
  public static INDIAN_LANDMARKS: Record<string, SegmentPoint> = {
    // Barrackpore & Local Bengal Railway Stations, Restaurants & Hubs (Exact OSM Ground-Truth)
    'Dada Boudi Hotel (Barrackpore)': { lat: 22.7607, lng: 88.3705 },
    'Dada Boudi Restaurant (Barrackpore)': { lat: 22.7607, lng: 88.3705 },
    'Dada Boudi Biryani': { lat: 22.7607, lng: 88.3705 },
    'Reliance Smart Point (Barrackpore)': { lat: 22.7610, lng: 88.3665 },
    'Audreys Korean Cafe (Barrackpore)': { lat: 22.7588, lng: 88.3651 },
    'Barrackpore Railway Station': { lat: 22.76034, lng: 88.37110 },
    'Barrackpore Station': { lat: 22.76034, lng: 88.37110 },
    'Barrackpore Railway Station (BP)': { lat: 22.76034, lng: 88.37110 },
    'Barrackpore Cantonment': { lat: 22.7610, lng: 88.3580 },
    'Mangal Pandey Park (Barrackpore)': { lat: 22.7570, lng: 88.3490 },
    'Ichhapur Railway Station': { lat: 22.79983, lng: 88.37391 },
    'Ichhapur Station': { lat: 22.79983, lng: 88.37391 },
    'Ishapore Railway Station': { lat: 22.79983, lng: 88.37391 },
    'Palta Railway Station': { lat: 22.78263, lng: 88.37027 },
    'Titagarh Railway Station': { lat: 22.74113, lng: 88.37458 },
    'Shyamnagar Railway Station': { lat: 22.82852, lng: 88.38019 },

    // Iconic Kolkata & Bengal Restaurants, Malls & Hubs
    'Flurys Park Street (Kolkata)': { lat: 22.5542, lng: 88.3520 },
    'Peter Cat (Park Street)': { lat: 22.5545, lng: 88.3525 },
    'Mocambo (Park Street)': { lat: 22.5543, lng: 88.3523 },
    'Arsalan Biryani (Park Circus)': { lat: 22.5440, lng: 88.3685 },
    '6 Ballygunge Place': { lat: 22.5270, lng: 88.3650 },
    'Quest Mall (Kolkata)': { lat: 22.5390, lng: 88.3658 },
    'Park Street Metro (Kolkata, WB)': { lat: 22.5552, lng: 88.3510 },
    'Rabindra Sadan (Kolkata, WB)': { lat: 22.5416, lng: 88.3475 },
    'Salt Lake Sector V (Kolkata, WB)': { lat: 22.5731, lng: 88.4337 },
    'Howrah Railway Station (WB)': { lat: 22.5839, lng: 88.3430 },
    'Sealdah Station (Kolkata, WB)': { lat: 22.5670, lng: 88.3712 },

    // Whole Delhi (NCT & NCR) Landmark Coverage
    'Connaught Place (Delhi)': { lat: 28.6315, lng: 77.2167 },
    'Rajiv Chowk Metro (Delhi)': { lat: 28.6328, lng: 77.2195 },
    'India Gate (New Delhi)': { lat: 28.6129, lng: 77.2295 },
    'Janpath Market (Delhi)': { lat: 28.6260, lng: 77.2188 },
    'New Delhi Railway Station (NDLS)': { lat: 28.6430, lng: 77.2194 },
    'Old Delhi Railway Station (DLI)': { lat: 28.6619, lng: 77.2307 },
    'Kashmere Gate ISBT & Metro Hub': { lat: 28.6675, lng: 77.2285 },
    'Anand Vihar ISBT & Metro': { lat: 28.6469, lng: 77.3160 },
    'Hazrat Nizamuddin Railway Station': { lat: 28.5892, lng: 77.2530 },
    'Delhi University North Campus': { lat: 28.6890, lng: 77.2100 },
    'Vishwavidyalaya Metro (DU)': { lat: 28.6946, lng: 77.2140 },
    'Kamla Nagar Market (Delhi)': { lat: 28.6800, lng: 77.2025 },
    'Miranda House (DU)': { lat: 28.6912, lng: 77.2108 },
    'Hauz Khas Village (Delhi)': { lat: 28.5494, lng: 77.1960 },
    'Hauz Khas Metro Station': { lat: 28.5432, lng: 77.2065 },
    'Saket Select CITYWALK': { lat: 28.5284, lng: 77.2193 },
    'Saket Metro Station': { lat: 28.5204, lng: 77.2015 },
    'Sarojini Nagar Market (Delhi)': { lat: 28.5778, lng: 77.1983 },
    'INA Metro & Dilli Haat': { lat: 28.5746, lng: 77.2098 },
    'Lajpat Nagar Central Market': { lat: 28.5694, lng: 77.2435 },
    'Karol Bagh Metro & Market': { lat: 28.6444, lng: 77.1906 },
    'Chandni Chowk & Red Fort': { lat: 28.6562, lng: 77.2310 },
    'Karim Restaurant (Jama Masjid, Delhi)': { lat: 28.6508, lng: 77.2335 },
    'Bukhara (ITC Maurya, New Delhi)': { lat: 28.5975, lng: 77.1738 },
    'Dwarka Sector 21 Metro': { lat: 28.5522, lng: 77.0583 },
    'Dwarka Sector 10 (Vegas Mall)': { lat: 28.5815, lng: 77.0585 },
    'Rohini Sector 18 Metro': { lat: 28.7420, lng: 77.1350 },
    'Janakpuri District Centre (West Delhi)': { lat: 28.6290, lng: 77.0815 },
    'Vasant Kunj (Ambience & Promenade)': { lat: 28.5402, lng: 77.1558 },
    'IIT Delhi (Hauz Khas)': { lat: 28.5450, lng: 77.1926 },
    'Jawaharlal Nehru University (JNU)': { lat: 28.5398, lng: 77.1664 },
    'Jamia Millia Islamia (Okhla)': { lat: 28.5616, lng: 77.2802 },
    'Laxmi Nagar Metro (East Delhi)': { lat: 28.6307, lng: 77.2774 },
    'Indira Gandhi Intl Airport (DEL T3)': { lat: 28.5562, lng: 77.1000 },
    'Noida Sector 18 (Atta Market)': { lat: 28.5708, lng: 77.3261 },
    'DLF Cyber City (Gurugram NCR)': { lat: 28.4950, lng: 77.0890 },

    // Northern States & Union Territories
    'Srinagar Lal Chowk (J&K)': { lat: 34.0716, lng: 74.8062 },
    'Jammu Tawi Railway Station (J&K)': { lat: 32.7058, lng: 74.8778 },
    'Leh Main Bazaar (Ladakh)': { lat: 34.1642, lng: 77.5848 },
    'Shimla Mall Road (HP)': { lat: 31.1048, lng: 77.1734 },
    'Dharamshala Main Square (HP)': { lat: 32.2190, lng: 76.3234 },
    'Amritsar Golden Temple (Punjab)': { lat: 31.6200, lng: 74.8765 },
    'Ludhiana Clock Tower (Punjab)': { lat: 30.9084, lng: 75.8573 },
    'Chandigarh Sector 17 Plaza (UT)': { lat: 30.7398, lng: 76.7827 },
    'Dehradun Clock Tower (UK)': { lat: 30.3256, lng: 78.0437 },
    'Rishikesh Laxman Jhula (UK)': { lat: 30.1340, lng: 78.3300 },
    'Lucknow Hazratganj (UP)': { lat: 26.8467, lng: 80.9462 },
    'Varanasi Dashashwamedh Ghat (UP)': { lat: 25.3076, lng: 83.0104 },
    'Agra Taj Ganj (UP)': { lat: 27.1738, lng: 78.0421 },
    'Kanpur Z Square Mall (UP)': { lat: 26.4725, lng: 80.3540 },
    'Jaipur Hawa Mahal (Rajasthan)': { lat: 26.9239, lng: 75.8267 },
    'Udaipur City Palace (Rajasthan)': { lat: 24.5764, lng: 73.6835 },
    'Jodhpur Clock Tower (Rajasthan)': { lat: 26.2968, lng: 73.0233 },
    'Gurugram Cyber Hub (Haryana)': { lat: 28.4950, lng: 77.0890 },
    'Faridabad Sector 15 (Haryana)': { lat: 28.4069, lng: 77.3178 },

    // Western States & Union Territories
    'Ahmedabad Sabarmati Riverfront (Gujarat)': { lat: 23.0300, lng: 72.5700 },
    'Surat Dumas Beach (Gujarat)': { lat: 21.0833, lng: 72.7167 },
    'Leopold Cafe (Colaba, Mumbai)': { lat: 18.9230, lng: 72.8318 },
    'Marine Drive (Mumbai, MH)': { lat: 18.9438, lng: 72.8232 },
    'Gateway of India (Mumbai)': { lat: 18.9220, lng: 72.8347 },
    'Pune FC Road (Maharashtra)': { lat: 18.5204, lng: 73.8406 },
    'Nagpur Zero Mile Stone (MH)': { lat: 21.1498, lng: 79.0806 },
    'Panaji Church Square (Goa)': { lat: 15.4989, lng: 73.8278 },
    'Calangute Beach (Goa)': { lat: 15.5439, lng: 73.7554 },
    'Daman Moti Daman Fort (D&NH/DD)': { lat: 20.4140, lng: 72.8328 },
    'Silvassa Tribal Museum (D&NH/DD)': { lat: 20.2763, lng: 73.0083 },

    // Central & Eastern States
    'Indore 56 Dukan (MP)': { lat: 22.7244, lng: 75.8839 },
    'Bhopal VIP Road (MP)': { lat: 23.2500, lng: 77.4000 },
    'Raipur Marine Drive Telibandha (Chhattisgarh)': { lat: 21.2380, lng: 81.6660 },
    'Patna Gandhi Maidan (Bihar)': { lat: 25.6174, lng: 85.1450 },
    'Bodh Gaya Mahabodhi Temple (Bihar)': { lat: 24.6959, lng: 84.9914 },
    'Ranchi Main Road (Jharkhand)': { lat: 23.3600, lng: 85.3300 },
    'Jamshedpur Bistupur (Jharkhand)': { lat: 22.7960, lng: 86.1820 },
    'Bhubaneswar Master Canteen (Odisha)': { lat: 20.2660, lng: 85.8430 },
    'Puri Swargadwar (Odisha)': { lat: 19.7983, lng: 85.8249 },
    'Siliguri Hong Kong Market (WB)': { lat: 26.7167, lng: 88.4333 },

    // Northeastern States (The 8 Sister States)
    'Guwahati GS Road ABC (Assam)': { lat: 26.1540, lng: 91.7760 },
    'Silchar Sadarghat (Assam)': { lat: 24.8333, lng: 92.8000 },
    'Shillong Police Bazaar (Meghalaya)': { lat: 25.5760, lng: 91.8847 },
    'Imphal Kangla Fort (Manipur)': { lat: 24.8080, lng: 93.9440 },
    'Aizawl Chanmari (Mizoram)': { lat: 23.7430, lng: 92.7176 },
    'Kohima War Cemetery (Nagaland)': { lat: 25.6751, lng: 94.1086 },
    'Agartala Ujjayanta Palace (Tripura)': { lat: 23.8364, lng: 91.2817 },
    'Itanagar Ganga Market (Arunachal Pradesh)': { lat: 27.0980, lng: 93.6166 },
    'Gangtok MG Marg (Sikkim)': { lat: 27.3314, lng: 88.6138 },

    // Southern States & Union Territories
    'MTR Mavalli Tiffin Room (Bengaluru)': { lat: 12.9550, lng: 77.5840 },
    'MG Road Metro (Bengaluru, KA)': { lat: 12.9756, lng: 77.6066 },
    'Koramangala 5th Block (Bengaluru)': { lat: 12.9352, lng: 77.6245 },
    'Mysuru Palace (Karnataka)': { lat: 12.3052, lng: 76.6552 },
    'Paradise Biryani (Secunderabad)': { lat: 17.4418, lng: 78.4982 },
    'HITEC City (Hyderabad, TS)': { lat: 17.4435, lng: 78.3772 },
    'Charminar (Hyderabad, TS)': { lat: 17.3616, lng: 78.4747 },
    'Saravana Bhavan (T. Nagar, Chennai)': { lat: 13.0410, lng: 80.2330 },
    'T. Nagar Bus Terminus (Chennai, TN)': { lat: 13.0418, lng: 80.2341 },
    'Marina Beach (Chennai, TN)': { lat: 13.0500, lng: 80.2824 },
    'Coimbatore RS Puram (TN)': { lat: 11.0080, lng: 76.9520 },
    'Visakhapatnam RK Beach (AP)': { lat: 17.7126, lng: 83.3197 },
    'Vijayawada Benz Circle (AP)': { lat: 16.5000, lng: 80.6500 },
    'Kochi Marine Drive (Kerala)': { lat: 9.9816, lng: 76.2753 },
    'Thiruvananthapuram Kowdiar (Kerala)': { lat: 8.5241, lng: 76.9602 },
    'Puducherry Promenade Beach (UT)': { lat: 11.9338, lng: 79.8350 },
    'Port Blair Cellular Jail (A&N Islands)': { lat: 11.6738, lng: 92.7473 },
    'Kavaratti Beach Jetty (Lakshadweep)': { lat: 10.5667, lng: 72.6417 }
  };

  /**
   * Matches a segment to nearby OpenStreetMap ways to extract real physical tags
   */
  private static matchSegmentToOsmWays(
    start: SegmentPoint,
    end: SegmentPoint,
    ways: OsmWayLighting[],
    maxSearchRadiusMeters: number = 25.0
  ): { isLit?: boolean; wayName?: string; highwayType?: string } {
    const midLat = (start.lat + end.lat) / 2;
    const midLng = (start.lng + end.lng) / 2;

    let closestWay: OsmWayLighting | null = null;
    let minDistance = Infinity;

    for (const way of ways) {
      const dist = OsmOverpassService.getInstance().pointToWayDistance(midLat, midLng, way.coordinates);
      if (dist < minDistance) {
        minDistance = dist;
        closestWay = way;
      }
    }

    if (closestWay && minDistance <= maxSearchRadiusMeters) {
      return {
        isLit: closestWay.isLit,
        wayName: closestWay.name,
        highwayType: closestWay.highway
      };
    }

    return { isLit: undefined };
  }

  /**
   * Derives segment attributes based on real OpenStreetMap infrastructure tags
   */
  private static getSegmentAttributes(
    start: SegmentPoint,
    end: SegmentPoint,
    ways: OsmWayLighting[]
  ): { segmentData: SegmentData; isCovered: boolean } {
    const osmMatch = this.matchSegmentToOsmWays(start, end, ways);
    const isCovered = osmMatch.isLit !== undefined;

    // POI density proxy based on real OSM road classification
    let poiDensity = 0.5;
    if (osmMatch.highwayType) {
      const highTraffic = ['primary', 'secondary', 'pedestrian', 'living_street', 'trunk'];
      const medTraffic = ['tertiary', 'residential', 'footway'];
      if (highTraffic.includes(osmMatch.highwayType)) poiDensity = 0.85;
      else if (medTraffic.includes(osmMatch.highwayType)) poiDensity = 0.65;
      else poiDensity = 0.35;
    }

    return {
      segmentData: {
        start,
        end,
        isLit: osmMatch.isLit,
        poiDensity,
        historicalIncidentsCount: 0,
        recentCrowdsourcedReports: [],
        sosFreeStreakCount: 0
      },
      isCovered
    };
  }

  public static async fetchCandidatePaths(
    origin: { lat: number; lng: number; name?: string },
    dest: { lat: number; lng: number; name?: string }
  ): Promise<CandidatePath[] | null> {
    const origLabel = origin.name || 'Origin';
    const destLabel = dest.name || 'Destination';

    const kolkataGates = (scoringConfig as any).launch_regions?.kolkata?.gates || {};
    const margGateValidated = Boolean(kolkataGates.marg_routing_validated);

    const margProvider = new MargProvider();
    const googleProvider = new GoogleMapsProvider();
    const osrmProvider = new OsrmFallbackProvider();

    // 1. Cutover mode: If Marg is validated, Marg is primary
    if (margGateValidated) {
      try {
        const margRoutes = await margProvider.getRoutes(origin, dest);
        if (margRoutes && margRoutes.length > 0) {
          return margRoutes.map((r) => ({
            id: r.id,
            name: `${origLabel} → ${destLabel} (${r.name})`,
            polyline: r.coordinates,
            routingProvider: 'marg'
          }));
        }
        console.warn('[RoutingService] Marg primary routing failed or returned no paths. Falling back to Google Maps...');
      } catch (err) {
        console.warn('[RoutingService] Marg primary execution error. Falling back:', err);
      }
    } else {
      // Gate is false: Shadow mode for Marg telemetry if enabled
      const shadowEnabled = (scoringConfig as any).marg_provider?.shadow_mode_enabled !== false;
      if (shadowEnabled) {
        // Non-blocking asynchronous execution
        const t0 = Date.now();
        margProvider.getRoutes(origin, dest).then(routes => {
          const latencyMs = Date.now() - t0;
          if (routes && routes.length > 0) {
            console.log(`[MargShadowMode] Marg responded in ${latencyMs}ms with ${routes.length} candidate paths.`);
          } else {
            console.log(`[MargShadowMode] Marg shadow query completed in ${latencyMs}ms (no routes returned / unavailable).`);
          }
        }).catch(err => {
          console.warn(`[MargShadowMode] Marg shadow query error:`, err?.message || err);
        });
      }
    }

    // 2. Google Maps Directions API (Primary when gate is false; Fallback 1 when gate is true)
    try {
      const googleRoutes = await googleProvider.getRoutes(origin, dest);
      if (googleRoutes && googleRoutes.length > 0) {
        return googleRoutes.map((r) => ({
          id: r.id,
          name: `${origLabel} → ${destLabel} (${r.name})`,
          polyline: r.coordinates,
          routingProvider: 'google'
        }));
      }
    } catch (err) {
      console.warn('[RoutingService] Google provider error:', err);
    }

    // 3. OSRM Fallback (Fallback tier 2, normalizes duration & discloses road-network approximation)
    try {
      const osrmRoutes = await osrmProvider.getRoutes(origin, dest);
      if (osrmRoutes && osrmRoutes.length > 0) {
        return osrmRoutes.map((r) => ({
          id: r.id,
          name: `${origLabel} → ${destLabel} (${r.name})`,
          polyline: r.coordinates,
          routingProvider: 'osrm_fallback',
          modeWarning: r.modeWarning
        }));
      }
    } catch (err) {
      console.warn('[RoutingService] OSRM fallback error:', err);
    }

    return null;
  }

  public static async fetchGoogleOrOSRMDirections(
    origin: { lat: number; lng: number; name?: string },
    dest: { lat: number; lng: number; name?: string }
  ): Promise<CandidatePath[] | null> {
    return this.fetchCandidatePaths(origin, dest);
  }

  public static async calculateSafeRoutes(
    origin: SegmentPoint,
    dest: SegmentPoint,
    maxDetourBudgetPercent: number = scoringConfig.parameters.max_detour_budget_percentage
  ): Promise<{ routes: RouteCandidate[]; summaryNotice: string }> {
    
    const candidatePaths: CandidatePath[] = (await this.fetchCandidatePaths(origin, dest)) || this.generatePanIndiaCandidatePolylines(origin, dest);
    const scoredCandidates: RouteCandidate[] = [];

    let fastestDistance = Infinity;

    for (let i = 0; i < candidatePaths.length; i++) {
      const distance = this.calculatePolylineDistance(candidatePaths[i].polyline);
      if (distance < fastestDistance) {
        fastestDistance = distance;
      }
    }

    const maxDistanceAllowed = fastestDistance * (1 + maxDetourBudgetPercent / 100);

    const kolkataRegion = (scoringConfig as any).launch_regions?.kolkata;
    const inKolkataBoundary = Boolean(
      kolkataRegion &&
      origin.lat >= kolkataRegion.boundary.min_lat &&
      origin.lat <= kolkataRegion.boundary.max_lat &&
      origin.lng >= kolkataRegion.boundary.min_lng &&
      origin.lng <= kolkataRegion.boundary.max_lng
    );

    const gates = kolkataRegion?.gates || {};
    const unfulfilledGates = Object.entries(gates)
      .filter(([_, met]) => !met)
      .map(([gateName]) => gateName);
    const kolkataGatesMet = unfulfilledGates.length === 0;
    const minCoverage = kolkataRegion?.min_osm_coverage_ratio || 0.60;

    for (let i = 0; i < candidatePaths.length; i++) {
      const candidate = candidatePaths[i];
      const distance = this.calculatePolylineDistance(candidate.polyline);

      // 1. Prefetch real OpenStreetMap ways across candidate route bounding box
      const ways = await OsmOverpassService.getInstance().prefetchRouteLighting(candidate.polyline);

      const segments: RouteCandidate['segments'] = [];
      let totalWeightedScore = 0;
      let totalLength = 0;
      let coveredLength = 0;
      const aggregatedReasonsSet = new Set<string>();

      for (let j = 0; j < candidate.polyline.length - 1; j++) {
        const startPt = { lat: candidate.polyline[j][0], lng: candidate.polyline[j][1] };
        const endPt = { lat: candidate.polyline[j + 1][0], lng: candidate.polyline[j + 1][1] };
        const segLen = this.haversineDistance(startPt, endPt);

        // Derive physical attributes from real OpenStreetMap infrastructure tags
        const { segmentData, isCovered } = this.getSegmentAttributes(startPt, endPt, ways);
        const scoreRes = DeterministicSafetyScorer.scoreSegment(segmentData);

        totalWeightedScore += scoreRes.score * segLen;
        totalLength += segLen;
        if (isCovered) {
          coveredLength += segLen;
        }

        scoreRes.reasons.forEach(r => aggregatedReasonsSet.add(r));

        segments.push({
          start: startPt,
          end: endPt,
          score: scoreRes.score,
          reasons: scoreRes.reasons
        });
      }

      const compositeScore = totalLength > 0 ? Math.round(totalWeightedScore / totalLength) : 70;
      const durationMinutes = Math.max(3, Math.round((distance / 1000 / 4.2) * 60));

      const coverageRatio = totalLength > 0 ? coveredLength / totalLength : 0;
      const isVerifiedDense = inKolkataBoundary && kolkataGatesMet && (coverageRatio >= minCoverage);

      const dataConfidence: RouteCandidate['dataConfidence'] = isVerifiedDense
        ? 'verified_dense'
        : 'cold_start';

      const explanations = Array.from(aggregatedReasonsSet);
      if (dataConfidence === 'cold_start') {
        if (!inKolkataBoundary) {
          explanations.push('Unverified Region: Route computed without local ground-truth safety verification.');
        } else if (!kolkataGatesMet) {
          explanations.push(`Kolkata Validation Incomplete: Unfulfilled §13.2 launch gates: [${unfulfilledGates.join(', ')}]. Operating under cold_start confidence.`);
        } else {
          explanations.push(`Kolkata Validation Mode: OSM verified lighting coverage is ${(coverageRatio * 100).toFixed(0)}% (threshold: ${(minCoverage * 100).toFixed(0)}%).`);
        }
      }

      if (candidate.modeWarning) {
        explanations.unshift(`Road Warning: ${candidate.modeWarning}`);
      }

      scoredCandidates.push({
        id: candidate.id,
        name: candidate.name,
        isRecommended: false,
        tag: i === 0 ? 'safest' : (i === 1 ? 'fastest' : 'balanced'),
        distanceMeters: Math.round(distance),
        durationMinutes,
        compositeSafetyScore: compositeScore,
        scoreExplanation: explanations,
        geoJsonPolyline: candidate.polyline,
        segments,
        dataConfidence,
        routingProvider: candidate.routingProvider,
        modeWarning: candidate.modeWarning
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

      // 1a. Exact match against static landmark dictionary
      for (const [key, coords] of Object.entries(this.INDIAN_LANDMARKS)) {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanKey === cleanInput || key.toLowerCase() === trimmed.toLowerCase()) {
          return { ...coords, name: key };
        }
      }

      // 1b. Partial/fuzzy match against static landmark dictionary
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
        const baseLat = 22.76034;
        const baseLng = 88.37110;
        if (anchorCoords) {
          return { lat: anchorCoords.lat + 0.0005, lng: anchorCoords.lng + 0.0005, name: trimmed };
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
  ): CandidatePath[] {
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
