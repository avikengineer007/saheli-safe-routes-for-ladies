import { Router, Request, Response } from 'express';
import { RoutingService } from '../services/routingService';
import { JourneyMonitorService, ActiveJourneyState } from '../services/journeyMonitor';
import { IncidentService } from '../services/incidentService';

export const apiRouter = Router();

// In-memory active journey state registry for simulation/demo
const activeJourneysMap = new Map<string, ActiveJourneyState>();

/**
 * Health check endpoint
 */
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    app: 'SAHELI Safe Routes API Engine',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * Safe Route Suggestion Endpoint
 */
apiRouter.post('/routes/plan', async (req: Request, res: Response) => {
  try {
    const { origin, destination, originName, destName, maxDetourBudgetPercent } = req.body;
    
    const resolvedOrigin = await RoutingService.resolveLocation(origin || originName, originName || 'Connaught Place (Delhi)');
    const resolvedDest = await RoutingService.resolveLocation(destination || destName, destName || 'India Gate (New Delhi)', resolvedOrigin);

    const result = await RoutingService.calculateSafeRoutes(
      resolvedOrigin,
      resolvedDest,
      maxDetourBudgetPercent || 25
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Route calculation error' });
  }
});

/**
 * Start Journey Track Session
 */
apiRouter.post('/journey/start', (req: Request, res: Response) => {
  try {
    const { userId, origin, destination, polyline, etaMinutes } = req.body;

    const journeyId = `jny_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newJourney: ActiveJourneyState = {
      id: journeyId,
      userId: userId || 'user_demo_1',
      status: 'active',
      routePolyline: polyline || [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng]
      ],
      startedAt: new Date(),
      etaMinutes: etaMinutes || 15,
      consecutiveOffRoutePings: 0,
      contactAlertLogs: []
    };

    activeJourneysMap.set(journeyId, newJourney);

    res.json({
      success: true,
      journeyId,
      status: 'active',
      etaMinutes: newJourney.etaMinutes,
      shareableTrackUrl: `https://saheli-safe.app/track/${journeyId}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error starting journey' });
  }
});

/**
 * Location Ping Update with Line-Distance Deviation Check
 */
apiRouter.post('/journey/ping', (req: Request, res: Response) => {
  try {
    const { journeyId, lat, lng } = req.body;
    if (!journeyId || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'journeyId, lat, and lng are required.' });
    }

    let journey = activeJourneysMap.get(journeyId);
    if (!journey) {
      // Create ad-hoc journey session if missing
      journey = {
        id: journeyId,
        userId: 'user_demo_1',
        status: 'active',
        routePolyline: [
          [lat - 0.005, lng - 0.005],
          [lat, lng],
          [lat + 0.005, lng + 0.005]
        ],
        startedAt: new Date(),
        etaMinutes: 20,
        consecutiveOffRoutePings: 0,
        contactAlertLogs: []
      };
      activeJourneysMap.set(journeyId, journey);
    }

    const pingRes = JourneyMonitorService.processLocationPing(journey, lat, lng);
    const etaRes = JourneyMonitorService.checkETAExpiry(journey);

    res.json({
      journeyId,
      onRoute: pingRes.onRoute,
      consecutiveOffRoutePings: journey.consecutiveOffRoutePings,
      deviationAlertTriggered: pingRes.alertTriggered,
      alertMessage: pingRes.alertMessage || etaRes.alertMessage,
      status: journey.status,
      contactAlertLogsCount: journey.contactAlertLogs.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error processing ping' });
  }
});

/**
 * Deterministic SOS Escalation Trigger
 */
apiRouter.post('/journey/sos', (req: Request, res: Response) => {
  try {
    const { journeyId, userName, currentLocation, contactPhone } = req.body;

    let journey = activeJourneysMap.get(journeyId);
    if (!journey) {
      journey = {
        id: journeyId || 'jny_sos_adhoc',
        userId: 'user_demo_1',
        status: 'active',
        routePolyline: [[currentLocation?.lat || 22.5552, currentLocation?.lng || 88.3510]],
        startedAt: new Date(),
        etaMinutes: 15,
        consecutiveOffRoutePings: 0,
        contactAlertLogs: []
      };
      activeJourneysMap.set(journey.id, journey);
    }

    const sosPayload = JourneyMonitorService.triggerSOS(
      journey,
      userName || 'SAHELI User',
      currentLocation || { lat: 22.5552, lng: 88.3510 },
      contactPhone
    );

    res.json({
      success: true,
      status: 'sos_triggered',
      emergencyCallNumber: sosPayload.emergencyCallNumber, // Explicit 1-tap dial target
      dispatchedSMSCount: sosPayload.smsPayloads.length,
      notice: 'Emergency call launcher prepared. Explicit tap required on device to dial 112.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error triggering SOS' });
  }
});

/**
 * Submit Community Incident Report (Gated & Advisory Triage)
 */
apiRouter.post('/incidents/report', async (req: Request, res: Response) => {
  try {
    const { userId, userTrustScore, userAccountAgeDays, lat, lng, category, description } = req.body;

    if (lat === undefined || lng === undefined || !category) {
      return res.status(400).json({ error: 'lat, lng, and category are required.' });
    }

    const result = await IncidentService.submitReport({
      userId: userId || 'user_anon_1',
      userTrustScore: userTrustScore !== undefined ? userTrustScore : 0.7,
      userAccountAgeDays: userAccountAgeDays !== undefined ? userAccountAgeDays : 10,
      lat,
      lng,
      category,
      description
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error submitting report' });
  }
});

/**
 * Get Heatmap Data Points
 */
apiRouter.get('/incidents/heatmap', (req: Request, res: Response) => {
  try {
    const points = IncidentService.getPublicHeatmapPoints();
    res.json({
      totalVerifiedPoints: points.length,
      points,
      disclaimer: "Heatmap displays verified community safety reports only with exponential 14-day time decay."
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching heatmap' });
  }
});
