import { LLMAuxiliaryService, TriageResult } from './llmClassifier';

export interface IncidentInput {
  userId: string;
  userTrustScore: number;
  userAccountAgeDays: number;
  lat: number;
  lng: number;
  category: 'harassment' | 'poor_lighting' | 'unsafe_area' | 'other';
  description?: string;
}

export interface StoredIncident {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  category: string;
  description?: string;
  severityAuto?: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: Date;
  geoCellKey: string;
}

export class IncidentService {
  private static mockIncidents: StoredIncident[] = [
    {
      id: 'inc_kolkata_1',
      userId: 'user_est_1',
      lat: 22.5530,
      lng: 88.3525,
      category: 'poor_lighting',
      description: 'Streetlamps off along dark lane behind Park Street metro exit after 8 PM.',
      severityAuto: 'medium',
      status: 'verified',
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      geoCellKey: '22.553_88.353'
    },
    {
      id: 'inc_kolkata_2',
      userId: 'user_est_2',
      lat: 22.5450,
      lng: 88.3480,
      category: 'harassment',
      description: 'Aggressive catcalling and groups crowding near dark corner of Theatre Road.',
      severityAuto: 'critical',
      status: 'verified',
      createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      geoCellKey: '22.545_88.348'
    },
    {
      id: 'inc_kolkata_3',
      userId: 'user_est_3',
      lat: 22.5410,
      lng: 88.3440,
      category: 'unsafe_area',
      description: 'Dimly lit alley near Exide crossing with no security or active foot traffic.',
      severityAuto: 'high',
      status: 'verified',
      createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
      geoCellKey: '22.541_88.344'
    }
  ];

  public static getGeoCellKey(lat: number, lng: number): string {
    return `${lat.toFixed(3)}_${lng.toFixed(3)}`;
  }

  public static async submitReport(input: IncidentInput): Promise<{
    report: StoredIncident;
    triageAdvice?: TriageResult;
    message: string;
  }> {
    const geoCellKey = this.getGeoCellKey(input.lat, input.lng);
    const now = new Date();

    const oneHourAgo = new Date(now.getTime() - 3600 * 1000);
    const recentUserCellReports = this.mockIncidents.filter(
      r => r.userId === input.userId && r.geoCellKey === geoCellKey && r.createdAt >= oneHourAgo
    );

    if (recentUserCellReports.length >= 3) {
      throw new Error('Rate limit: Max 3 safety reports allowed per area per hour to stop spam.');
    }

    let triage: TriageResult | undefined = undefined;
    if (input.description && input.description.trim().length > 0) {
      triage = await LLMAuxiliaryService.classifyIncidentDescription(input.description);
    }

    const isEstablished = input.userAccountAgeDays >= 7 && input.userTrustScore >= 0.6;
    let initialStatus: StoredIncident['status'] = isEstablished ? 'verified' : 'pending';

    if (initialStatus === 'pending') {
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 3600 * 1000);
      const corroboratingReport = this.mockIncidents.find(
        r => r.userId !== input.userId && r.geoCellKey === geoCellKey && r.createdAt >= fortyEightHoursAgo
      );
      if (corroboratingReport) {
        initialStatus = 'verified';
      }
    }

    const newReport: StoredIncident = {
      id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: input.userId,
      lat: input.lat,
      lng: input.lng,
      category: input.category,
      description: input.description ? LLMAuxiliaryService.sanitizeInput(input.description) : undefined,
      severityAuto: triage?.severityAuto,
      status: initialStatus,
      createdAt: now,
      geoCellKey
    };

    this.mockIncidents.unshift(newReport);

    const message = initialStatus === 'verified'
      ? 'Report verified and updated on the Kolkata safety map.'
      : 'Report received and saved for verification.';

    return {
      report: newReport,
      triageAdvice: triage,
      message
    };
  }

  public static getPublicHeatmapPoints(): Array<{
    lat: number;
    lng: number;
    intensity: number;
    category: string;
    ageDays: number;
  }> {
    const now = new Date().getTime();
    const halfLifeDays = 14;
    const lambda = Math.LN2 / halfLifeDays;

    return this.mockIncidents
      .filter(r => r.status === 'verified')
      .map(r => {
        const ageDays = (now - r.createdAt.getTime()) / (1000 * 3600 * 24);
        const timeDecayFactor = Math.exp(-lambda * ageDays);
        
        let severityWeight = 0.5;
        if (r.category === 'harassment') severityWeight = 1.0;
        else if (r.category === 'poor_lighting') severityWeight = 0.7;
        else if (r.category === 'unsafe_area') severityWeight = 0.8;

        const intensity = Math.round(severityWeight * timeDecayFactor * 100) / 100;

        return {
          lat: r.lat,
          lng: r.lng,
          intensity,
          category: r.category,
          ageDays: Math.round(ageDays * 10) / 10
        };
      });
  }
}
