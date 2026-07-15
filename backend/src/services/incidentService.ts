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
    // Delhi NCR
    {
      id: 'inc_delhi_1',
      userId: 'user_delhi_1',
      lat: 28.6300,
      lng: 77.2180,
      category: 'poor_lighting',
      description: 'Streetlamps non-functional along inner ring road near Janpath subway post 9 PM.',
      severityAuto: 'medium',
      status: 'verified',
      createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      geoCellKey: '28.630_77.218'
    },
    // Mumbai, Maharashtra
    {
      id: 'inc_mumbai_1',
      userId: 'user_mumbai_1',
      lat: 18.9410,
      lng: 72.8250,
      category: 'harassment',
      description: 'Groups loitering with loud harassment along unlit alley exit near Churchgate station.',
      severityAuto: 'critical',
      status: 'verified',
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      geoCellKey: '18.941_72.825'
    },
    // Bengaluru, Karnataka
    {
      id: 'inc_blr_1',
      userId: 'user_blr_1',
      lat: 12.9730,
      lng: 77.6080,
      category: 'unsafe_area',
      description: 'Constructed flyover shadow zone near Church Street lane lacks police patrolled booths.',
      severityAuto: 'high',
      status: 'verified',
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      geoCellKey: '12.973_77.608'
    },
    // Kolkata, West Bengal
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
    // Hyderabad, Telangana
    {
      id: 'inc_hyd_1',
      userId: 'user_hyd_1',
      lat: 17.4420,
      lng: 78.3760,
      category: 'poor_lighting',
      description: 'Dark service road connecting HITEC metro station exit without CCTV or adequate lighting.',
      severityAuto: 'medium',
      status: 'verified',
      createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      geoCellKey: '17.442_78.376'
    },
    // Guwahati, Assam
    {
      id: 'inc_ghty_1',
      userId: 'user_ghty_1',
      lat: 26.1540,
      lng: 91.7760,
      category: 'unsafe_area',
      description: 'Isolated footbridge along GS Road poorly lit with sparse pedestrian density late evening.',
      severityAuto: 'high',
      status: 'verified',
      createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
      geoCellKey: '26.154_91.776'
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
      ? 'Report verified and updated on the Pan-India safety map.'
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
