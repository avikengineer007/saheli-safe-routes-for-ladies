"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JourneyMonitorService = void 0;
const routingService_1 = require("./routingService");
const scoringConfig_json_1 = __importDefault(require("../config/scoringConfig.json"));
class JourneyMonitorService {
    /**
     * Distance from point P to line segment AB in meters
     */
    static pointToSegmentDistance(p, a, b) {
        const dAB = routingService_1.RoutingService.haversineDistance(a, b);
        if (dAB === 0)
            return routingService_1.RoutingService.haversineDistance(p, a);
        // Project point onto line segment
        const t = Math.max(0, Math.min(1, ((p.lat - a.lat) * (b.lat - a.lat) + (p.lng - a.lng) * (b.lng - a.lng)) /
            (Math.pow(b.lat - a.lat, 2) + Math.pow(b.lng - a.lng, 2) || 1)));
        const projection = {
            lat: a.lat + t * (b.lat - a.lat),
            lng: a.lng + t * (b.lng - a.lng)
        };
        return routingService_1.RoutingService.haversineDistance(p, projection);
    }
    /**
     * Distance from point P to polyline
     */
    static minDistanceToPolyline(point, polyline) {
        let minDistance = Infinity;
        for (let i = 0; i < polyline.length - 1; i++) {
            const a = { lat: polyline[i][0], lng: polyline[i][1] };
            const b = { lat: polyline[i + 1][0], lng: polyline[i + 1][1] };
            const dist = this.pointToSegmentDistance(point, a, b);
            if (dist < minDistance) {
                minDistance = dist;
            }
        }
        return minDistance;
    }
    /**
     * Processes a location ping for an active journey
     */
    static processLocationPing(journey, lat, lng) {
        const distToPolyline = this.minDistanceToPolyline({ lat, lng }, journey.routePolyline);
        const thresholdMeters = scoringConfig_json_1.default.parameters.deviation_threshold_meters; // 150m
        const maxConsecutivePings = scoringConfig_json_1.default.parameters.deviation_consecutive_pings; // 2 pings
        const onRoute = distToPolyline <= thresholdMeters;
        let alertTriggered = false;
        let alertMessage = undefined;
        if (!onRoute) {
            journey.consecutiveOffRoutePings += 1;
            if (journey.consecutiveOffRoutePings >= maxConsecutivePings) {
                alertTriggered = true;
                alertMessage = `[SAHELI DEVIATION ALERT] User has deviated ${Math.round(distToPolyline)}m from their safe route for ${journey.consecutiveOffRoutePings} consecutive updates. Last location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                journey.contactAlertLogs.push({
                    timestamp: new Date(),
                    type: 'DEVIATION_ALERT',
                    message: alertMessage
                });
            }
        }
        else {
            journey.consecutiveOffRoutePings = 0;
        }
        journey.lastPing = { lat, lng, timestamp: new Date() };
        return { onRoute, alertTriggered, alertMessage };
    }
    /**
     * Checks for missed ETA deadline escalation
     */
    static checkETAExpiry(journey) {
        if (journey.status !== 'active')
            return { isExpired: false };
        const now = new Date().getTime();
        const startTime = new Date(journey.startedAt).getTime();
        const etaMs = journey.etaMinutes * 60 * 1000;
        const bufferMs = scoringConfig_json_1.default.parameters.eta_buffer_minutes * 60 * 1000;
        if (now > startTime + etaMs + bufferMs) {
            const alertMessage = `[SAHELI ETA EXCEEDED ALERT] User has not completed their journey within expected ETA (+10m buffer). Last reported location: ${journey.lastPing ? `${journey.lastPing.lat.toFixed(5)}, ${journey.lastPing.lng.toFixed(5)}` : 'Origin'}`;
            journey.contactAlertLogs.push({
                timestamp: new Date(),
                type: 'MISSED_ETA_ALERT',
                message: alertMessage
            });
            return { isExpired: true, alertMessage };
        }
        return { isExpired: false };
    }
    /**
     * Dispatches live SMS alert via Fast2SMS gateway
     */
    static async dispatchSMS(phone, message) {
        const key = process.env.FAST2SMS_API_KEY;
        if (!key) {
            console.warn('[SAHELI SMS] No Fast2SMS API key configured. SMS dispatch simulated.');
            return { success: true, data: { status: 'simulated', message } };
        }
        try {
            const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
            const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
                method: 'POST',
                headers: {
                    'authorization': key,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    route: 'q',
                    message,
                    language: 'english',
                    flash: 0,
                    numbers: cleanPhone
                })
            });
            const data = await res.json();
            console.log('[SAHELI Fast2SMS Response]:', data);
            return { success: res.ok && data.return, data };
        }
        catch (err) {
            console.warn('[SAHELI Fast2SMS Error]:', err.message || err);
            return { success: false, error: err.message || 'Fast2SMS dispatch error' };
        }
    }
    /**
     * Executes deterministic SOS Trigger Flow
     */
    static triggerSOS(journey, userName, currentLocation) {
        journey.status = 'sos_triggered';
        const liveLink = `https://saheli-safe.app/track/${journey.id}`;
        const smsMessage = `[SAHELI EMERGENCY SOS] ${userName} triggered SOS! Live location: ${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}. Tracking: ${liveLink}`;
        journey.contactAlertLogs.push({
            timestamp: new Date(),
            type: 'SOS_TRIGGERED',
            message: smsMessage
        });
        // Dispatch SMS asynchronously
        this.dispatchSMS('9876543210', smsMessage).catch(err => console.warn('[SOS SMS Dispatch Error]:', err));
        return {
            emergencyCallNumber: '112', // Standard emergency response number in India
            smsPayloads: [smsMessage]
        };
    }
}
exports.JourneyMonitorService = JourneyMonitorService;
