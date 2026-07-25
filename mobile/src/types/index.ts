export type AgeGroup = 'under18' | 'adult' | 'elderly';

export interface RoutePoint {
  lat: number;
  lng: number;
}

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
    start: RoutePoint;
    end: RoutePoint;
    score: number;
    reasons: string[];
  }>;
}

export interface ActiveJourney {
  id: string;
  routeId: string;
  routeName: string;
  polyline: Array<[number, number]>;
  currentLocation: RoutePoint;
  startedAt: Date;
  etaMinutes: number;
  status: 'active' | 'completed' | 'sos_triggered' | 'abandoned';
  onRoute: boolean;
  consecutiveOffRoutePings: number;
  contactAlertLogs: Array<{ timestamp: Date; type: string; message: string }>;
}

export interface IncidentReport {
  id: string;
  lat: number;
  lng: number;
  category: 'harassment' | 'poor_lighting' | 'unsafe_area' | 'other';
  description?: string;
  severityAuto?: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  category: string;
  ageDays: number;
  radiusMeters?: number;
}

export const getCategoryRadiusMeters = (category: string): number => {
  switch (category) {
    case 'poor_lighting':
      return 10;
    case 'unsafe_area':
      return 100;
    case 'harassment':
      return 150;
    default:
      return 50;
  }
};

