"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeterministicSafetyScorer = void 0;
const scoringConfig_json_1 = __importDefault(require("../config/scoringConfig.json"));
class DeterministicSafetyScorer {
    /**
     * Generates a deterministic hash for a polyline segment
     */
    static getSegmentHash(start, end) {
        const sLat = start.lat.toFixed(4);
        const sLng = start.lng.toFixed(4);
        const eLat = end.lat.toFixed(4);
        const eLng = end.lng.toFixed(4);
        return `seg_${sLat}_${sLng}_${eLat}_${eLng}`;
    }
    /**
     * Calculates night multiplier deterministically based on date time
     */
    static getNightMultiplier(timestamp = new Date()) {
        const hour = timestamp.getHours();
        const { start, end } = scoringConfig_json_1.default.parameters.night_hours;
        const isNight = hour >= start || hour < end;
        return isNight ? scoringConfig_json_1.default.parameters.night_multiplier : scoringConfig_json_1.default.parameters.day_multiplier;
    }
    /**
     * Computes composite segment safety score (0 to 100, higher = safer)
     * Formula:
     * score = 100
     *       - w1 * historical_incident_density
     *       - w2 * recent_crowdsourced_density (exponential decay)
     *       - w3 * (unlit ? 1 : 0) * night_multiplier
     *       - w4 * isolation_score
     *       + w5 * sos_free_streak
     */
    static scoreSegment(segment, evalTime = new Date()) {
        const hash = this.getSegmentHash(segment.start, segment.end);
        const weights = scoringConfig_json_1.default.weights;
        const nightMult = this.getNightMultiplier(evalTime);
        const reasons = [];
        // 1. Historical Incident Density Penalty (0 to 1 scaling)
        const histCount = segment.historicalIncidentsCount || 0;
        const histScaled = Math.min(histCount / 5, 1.0);
        const historicalPenalty = weights.w1_historical_incident_density * histScaled;
        if (historicalPenalty > 3) {
            reasons.push(`Historical crime data registered in nearby sector (-${historicalPenalty.toFixed(1)})`);
        }
        // 2. Recent Crowdsourced Density with Exponential Decay over 30 days
        let crowdsourcedSum = 0;
        const halfLifeDays = scoringConfig_json_1.default.parameters.decay_half_life_days;
        const lambda = Math.LN2 / halfLifeDays;
        if (segment.recentCrowdsourcedReports && segment.recentCrowdsourcedReports.length > 0) {
            for (const r of segment.recentCrowdsourcedReports) {
                if (r.ageDays <= 30) {
                    const decay = Math.exp(-lambda * r.ageDays);
                    crowdsourcedSum += (r.severity || 1.0) * decay;
                }
            }
        }
        const crowdScaled = Math.min(crowdsourcedSum / 3, 1.0);
        const crowdsourcedPenalty = weights.w2_recent_crowdsourced_density * crowdScaled;
        if (crowdsourcedPenalty > 3) {
            reasons.push(`Recent community safety reports in last 30 days (-${crowdsourcedPenalty.toFixed(1)})`);
        }
        // 3. Lighting Penalty
        const isUnlit = segment.isLit === false;
        const lightingBase = isUnlit ? 1.0 : 0.0;
        const lightingPenalty = weights.w3_unlit_street * lightingBase * nightMult;
        if (lightingPenalty > 0) {
            reasons.push(nightMult > 1.0
                ? `Unlit street segment at night (-${lightingPenalty.toFixed(1)})`
                : `Street lighting marked inadequate (-${lightingPenalty.toFixed(1)})`);
        }
        // 4. Isolation Score Penalty (inverse of foot traffic / POI density)
        const poiDensity = segment.poiDensity !== undefined ? segment.poiDensity : 0.5;
        const isolationFactor = Math.max(0, 1.0 - poiDensity); // 1 = fully isolated, 0 = high traffic
        const isolationPenalty = weights.w4_isolation_score * isolationFactor;
        if (isolationPenalty > 4) {
            reasons.push(`Isolated / low pedestrian activity zone (-${isolationPenalty.toFixed(1)})`);
        }
        // 5. SOS-Free Streak Bonus
        const streak = segment.sosFreeStreakCount || 0;
        const streakScaled = Math.min(streak / 20, 1.0);
        const sosStreakBonus = weights.w5_sos_free_streak * streakScaled;
        if (sosStreakBonus > 2) {
            reasons.push(`High history of problem-free user journeys (+${sosStreakBonus.toFixed(1)})`);
        }
        // Composite Calculation
        const totalDeductions = historicalPenalty + crowdsourcedPenalty + lightingPenalty + isolationPenalty;
        const rawScore = 100 - totalDeductions + sosStreakBonus;
        const finalScore = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));
        return {
            segmentHash: hash,
            score: finalScore,
            breakdown: {
                baseScore: 100,
                historicalPenalty: Math.round(historicalPenalty * 10) / 10,
                crowdsourcedPenalty: Math.round(crowdsourcedPenalty * 10) / 10,
                lightingPenalty: Math.round(lightingPenalty * 10) / 10,
                isolationPenalty: Math.round(isolationPenalty * 10) / 10,
                sosStreakBonus: Math.round(sosStreakBonus * 10) / 10,
                nightMultiplierUsed: nightMult
            },
            reasons
        };
    }
}
exports.DeterministicSafetyScorer = DeterministicSafetyScorer;
