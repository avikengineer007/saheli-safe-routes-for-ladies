import { SegmentPoint } from './safetyScorer';

/**
 * SAHELI OpenStreetMap Infrastructure & Lighting Provider
 * 
 * ARCHITECTURE NOTICE:
 * This HTTP-based Overpass service is explicitly designated as a 
 * VALIDATION PHASE / STAGING BRIDGE ONLY.
 * For production deployment, query latency and rate limits require a 
 * localized regional OSM extract (kolkata.osm.pbf) pre-ingested into PostGIS/Spatial DB 
 * alongside the Marg OSRM pedestrian routing graph per §13.1.
 */

export interface OsmWayLighting {
  id: number;
  name?: string;
  highway?: string;
  isLit?: boolean;
  coordinates: Array<[number, number]>; // [lat, lng]
}

export interface SegmentLightingResult {
  isLit?: boolean;
  wayName?: string;
  highwayType?: string;
  distanceToWayMeters?: number;
  matched: boolean;
}

export interface OsmDataProvider {
  getLightingForBBox(south: number, west: number, north: number, east: number): Promise<OsmWayLighting[]>;
  matchSegmentLighting(start: SegmentPoint, end: SegmentPoint): Promise<SegmentLightingResult>;
}

interface CacheEntry {
  timestamp: number;
  ways: OsmWayLighting[];
}

export class OsmOverpassService implements OsmDataProvider {
  private static instance: OsmOverpassService;

  // In-memory grid cell cache (TTL: 24 hours)
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  // Primary and fallback Overpass API endpoints
  private readonly OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  public static getInstance(): OsmOverpassService {
    if (!OsmOverpassService.instance) {
      OsmOverpassService.instance = new OsmOverpassService();
    }
    return OsmOverpassService.instance;
  }

  /**
   * Generates a geo-grid key for bounding box caching (0.02 degree ~ 2.2km grid)
   */
  private getGridKey(south: number, west: number, north: number, east: number): string {
    const s = (Math.floor(south * 50) / 50).toFixed(2);
    const w = (Math.floor(west * 50) / 50).toFixed(2);
    const n = (Math.ceil(north * 50) / 50).toFixed(2);
    const e = (Math.ceil(east * 50) / 50).toFixed(2);
    return `osm_bbox_${s}_${w}_${n}_${e}`;
  }

  /**
   * Fetches highway ways with geometry and lighting tags in bounding box
   */
  public async getLightingForBBox(
    south: number,
    west: number,
    north: number,
    east: number
  ): Promise<OsmWayLighting[]> {
    const gridKey = this.getGridKey(south, west, north, east);
    const cached = this.cache.get(gridKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.ways;
    }

    // Overpass QL query: fetches ways with highway tags and their geometry within bbox
    const query = `[out:json][timeout:12];(way["highway"](${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)}););out tags geom;`;

    for (const endpoint of this.OVERPASS_ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout guard

        const url = `${endpoint}?data=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'SAHELI-SafeRoutes-Validation/1.0 (contact@saheli-safe.app)'
          }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          continue; // Try next mirror if 429/504
        }

        const data = (await response.json()) as any;
        const elements = data.elements || [];

        const ways: OsmWayLighting[] = [];

        for (const el of elements) {
          if (el.type === 'way' && el.geometry) {
            const tags = el.tags || {};
            const litTag = tags.lit?.toLowerCase();

            let isLit: boolean | undefined = undefined;
            if (litTag === 'yes' || litTag === '24/7' || litTag === 'automatic' || litTag === 'dusk-dawn') {
              isLit = true;
            } else if (litTag === 'no') {
              isLit = false;
            }

            const coords: Array<[number, number]> = el.geometry.map((g: any) => [g.lat, g.lon]);

            ways.push({
              id: el.id,
              name: tags.name,
              highway: tags.highway,
              isLit,
              coordinates: coords
            });
          }
        }

        this.cache.set(gridKey, {
          timestamp: Date.now(),
          ways
        });

        return ways;
      } catch (err) {
        // Continue to fallback mirror
      }
    }

    // If all Overpass mirrors timed out or failed, return empty array (fail-safe)
    return [];
  }

  /**
   * Matches a route segment (start to end point) to the nearest OSM way
   * Calibration parameter: maxSearchRadiusMeters (default: 25.0m)
   */
  public async matchSegmentLighting(
    start: SegmentPoint,
    end: SegmentPoint,
    maxSearchRadiusMeters: number = 25.0
  ): Promise<SegmentLightingResult> {
    const midLat = (start.lat + end.lat) / 2;
    const midLng = (start.lng + end.lng) / 2;

    // Buffer bbox around segment (~150m buffer)
    const latBuffer = 0.002;
    const lngBuffer = 0.002;

    const ways = await this.getLightingForBBox(
      midLat - latBuffer,
      midLng - lngBuffer,
      midLat + latBuffer,
      midLng + lngBuffer
    );

    if (!ways || ways.length === 0) {
      return { matched: false };
    }

    let closestWay: OsmWayLighting | null = null;
    let minDistance = Infinity;

    for (const way of ways) {
      const dist = this.pointToWayDistance(midLat, midLng, way.coordinates);
      if (dist < minDistance) {
        minDistance = dist;
        closestWay = way;
      }
    }

    if (closestWay && minDistance <= maxSearchRadiusMeters) {
      return {
        matched: true,
        isLit: closestWay.isLit,
        wayName: closestWay.name,
        highwayType: closestWay.highway,
        distanceToWayMeters: Math.round(minDistance)
      };
    }

    return { matched: false };
  }

  /**
   * Pre-fetches all lighting data along an entire polyline bounding box
   */
  public async prefetchRouteLighting(polyline: Array<[number, number]>): Promise<OsmWayLighting[]> {
    if (!polyline || polyline.length === 0) return [];

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    for (const [lat, lng] of polyline) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    // Add 100m padding (approx 0.001 degrees)
    const padding = 0.001;
    return this.getLightingForBBox(minLat - padding, minLng - padding, maxLat + padding, maxLng + padding);
  }

  public pointToWayDistance(lat: number, lng: number, coords: Array<[number, number]>): number {
    if (!coords || coords.length === 0) return Infinity;
    if (coords.length === 1) return this.haversineDistance(lat, lng, coords[0][0], coords[0][1]);

    let minDistance = Infinity;
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];

      // Local equirectangular projection
      const cosLat = Math.cos((((p1[0] + p2[0]) / 2) * Math.PI) / 180);
      const x = (lng - p1[1]) * cosLat;
      const y = lat - p1[0];
      const dx = (p2[1] - p1[1]) * cosLat;
      const dy = p2[0] - p1[0];

      const lenSq = dx * dx + dy * dy;
      let t = lenSq === 0 ? 0 : (x * dx + y * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));

      const projLat = p1[0] + t * (p2[0] - p1[0]);
      const projLng = p1[1] + t * (p2[1] - p1[1]);

      const dist = this.haversineDistance(lat, lng, projLat, projLng);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
    return minDistance;
  }

  public haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
