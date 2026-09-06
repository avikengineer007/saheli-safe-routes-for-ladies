import scoringConfig from '../config/scoringConfig.json';
import { SegmentPoint } from './safetyScorer';

export interface NormalizedRawRoute {
  id: string;
  name: string;
  coordinates: Array<[number, number]>; // [lat, lng]
  distanceMeters: number;
  durationSeconds: number;
  provider: 'marg' | 'google' | 'osrm_fallback';
  modeWarning?: string;
}

export interface RoutingProvider {
  name: 'marg' | 'google' | 'osrm_fallback';
  getRoutes(origin: SegmentPoint, dest: SegmentPoint): Promise<NormalizedRawRoute[] | null>;
}

/**
 * India Geographic Bounding Box (Fail-Closed Gate)
 * Approx 6.0°N - 37.5°N, 68.0°E - 97.5°E
 */
export function isWithinIndiaBBox(pt: SegmentPoint): boolean {
  return pt.lat >= 6.0 && pt.lat <= 37.5 && pt.lng >= 68.0 && pt.lng <= 97.5;
}

/**
 * Marg Routing Engine Provider (§15.3 & §15.5)
 * Autonomous, high-performance indigenous routing engine.
 */
export class MargProvider implements RoutingProvider {
  public readonly name = 'marg';
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl?: string, timeoutMs?: number) {
    this.baseUrl = (
      process.env.MARG_BASE_URL ||
      baseUrl ||
      (scoringConfig as any).marg_provider?.base_url ||
      'https://marg-mapping-engine.onrender.com'
    ).replace(/\/+$/, '');
    this.timeoutMs = timeoutMs || (scoringConfig as any).marg_provider?.timeout_ms || 4000;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async getRoutes(origin: SegmentPoint, dest: SegmentPoint): Promise<NormalizedRawRoute[] | null> {
    // 1. Fail-closed bounding box check for sovereign Indian territory
    if (!isWithinIndiaBBox(origin) || !isWithinIndiaBBox(dest)) {
      console.warn(`[MargProvider] Route coordinates (${origin.lat},${origin.lng} -> ${dest.lat},${dest.lng}) fall outside Indian sovereign bounding box. Refusing routing.`);
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${this.baseUrl}/route?start=${origin.lat},${origin.lng}&end=${dest.lat},${dest.lng}&profile=foot`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        console.warn(`[MargProvider] HTTP ${res.status} from Marg at ${url}`);
        return null;
      }

      const data = await res.json();
      const rawRoutes = data.routes || (data.code === 'Ok' && data.routes) || (Array.isArray(data) ? data : null);

      if (!rawRoutes || rawRoutes.length === 0) {
        return null;
      }

      const normalized: NormalizedRawRoute[] = rawRoutes.map((r: any, idx: number) => {
        let coords: Array<[number, number]> = [];
        if (r.geometry && Array.isArray(r.geometry.coordinates)) {
          // GeoJSON coordinates are [lng, lat] -> convert to [lat, lng]
          coords = r.geometry.coordinates.map((pt: [number, number]) => [pt[1], pt[0]]);
        } else if (Array.isArray(r.coordinates)) {
          coords = r.coordinates;
        }

        const distanceMeters = Math.round(r.distance ?? r.distanceMeters ?? (r.legs && r.legs[0]?.distance) ?? 0);
        const durationSeconds = Math.round(r.duration ?? r.durationSeconds ?? (r.legs && r.legs[0]?.duration) ?? (distanceMeters / 1.167));

        return {
          id: `route_marg_${idx}`,
          name: r.name || (idx === 0 ? 'Marg Verified Safe Footpath' : `Marg Footpath Alternate ${idx}`),
          coordinates: coords,
          distanceMeters,
          durationSeconds,
          provider: 'marg'
        };
      });

      return normalized.length > 0 ? normalized : null;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn(`[MargProvider] Marg request timed out after ${this.timeoutMs}ms`);
      } else {
        console.warn(`[MargProvider] Marg request failed:`, err?.message || err);
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Google Maps Directions API Provider
 */
export class GoogleMapsProvider implements RoutingProvider {
  public readonly name = 'google';

  public async getRoutes(origin: SegmentPoint, dest: SegmentPoint): Promise<NormalizedRawRoute[] | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return null;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&mode=walking&alternatives=true&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return null;

      const data = await res.json();
      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        return null;
      }

      return data.routes.map((r: any, idx: number) => {
        const polylinePts = GoogleMapsProvider.decodePolyline(r.overview_polyline?.points || '');
        const distanceMeters = r.legs?.[0]?.distance?.value || 0;
        const durationSeconds = r.legs?.[0]?.duration?.value || Math.round(distanceMeters / 1.167);

        return {
          id: `route_google_${idx}`,
          name: r.summary ? `Via ${r.summary}` : (idx === 0 ? 'Direct Walking Route' : `Alternate Route ${idx}`),
          coordinates: polylinePts,
          distanceMeters,
          durationSeconds,
          provider: 'google'
        };
      });
    } catch (err) {
      console.warn('[GoogleMapsProvider] Google Directions API query error:', err);
      return null;
    }
  }

  public static decodePolyline(str: string): Array<[number, number]> {
    let index = 0;
    const len = str.length;
    let lat = 0;
    let lng = 0;
    const coordinates: Array<[number, number]> = [];

    while (index < len) {
      let b: number;
      let shift = 0;
      let result = 0;
      do {
        b = str.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = str.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      coordinates.push([lat / 1e5, lng / 1e5]);
    }

    return coordinates;
  }
}

/**
 * OpenStreetMap OSRM Fallback Provider
 * Note: router.project-osrm.org's public demo instance routes on the car/driving graph.
 * This provider explicitly recalculates duration based on real pedestrian speed (4.2 km/h / 1.167 m/s)
 * and attaches an honest modeWarning disclosure.
 */
export class OsrmFallbackProvider implements RoutingProvider {
  public readonly name = 'osrm_fallback';
  private osrmBaseUrl: string;

  constructor(osrmBaseUrl?: string) {
    this.osrmBaseUrl = (
      process.env.OSRM_URL ||
      osrmBaseUrl ||
      'https://router.project-osrm.org'
    ).replace(/\/+$/, '');
  }

  public async getRoutes(origin: SegmentPoint, dest: SegmentPoint): Promise<NormalizedRawRoute[] | null> {
    try {
      const url = `${this.osrmBaseUrl}/route/v1/walking/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&alternatives=true`;
      const res = await fetch(url);
      if (!res.ok) return null;

      const data = await res.json();
      if (!data.routes || data.routes.length === 0) return null;

      const isPublicDemo = this.osrmBaseUrl.includes('router.project-osrm.org');

      return data.routes.slice(0, 3).map((r: any, idx: number) => {
        const coords: Array<[number, number]> = r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        const rawDistanceMeters = Math.round(r.distance || 0);

        // Guard against car duration on public demo: recalculate using pedestrian speed (1.167 m/s)
        const durationSeconds = isPublicDemo
          ? Math.max(60, Math.round(rawDistanceMeters / 1.167))
          : Math.round(r.duration || (rawDistanceMeters / 1.167));

        const modeWarning = isPublicDemo
          ? 'Pedestrian routing engine unavailable. Route approximated from road network; pedestrian alleys and sidewalks may not be included.'
          : undefined;

        const tag = idx === 0 ? 'Primary Path' : (idx === 1 ? 'Alternate Path A' : 'Alternate Path B');

        return {
          id: `route_osrm_${idx}`,
          name: `${tag} (OSRM Fallback)`,
          coordinates: coords,
          distanceMeters: rawDistanceMeters,
          durationSeconds,
          provider: 'osrm_fallback',
          modeWarning
        };
      });
    } catch (err) {
      console.warn('[OsrmFallbackProvider] OSRM query failed:', err);
      return null;
    }
  }
}
