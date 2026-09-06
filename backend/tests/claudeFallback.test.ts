/// <reference types="node" />
import process from 'process';
import { LLMAuxiliaryService } from '../src/services/llmClassifier';
import { IncidentService } from '../src/services/incidentService';
import { DeterministicSafetyScorer } from '../src/services/safetyScorer';
import { RoutingService } from '../src/services/routingService';

console.log('===============================================================');
console.log('SAHELI STEP 7: CLAUDE AI CLASSIFICATION & FAIL-CLOSED TEST SUITE');
console.log('===============================================================\n');

let failedTests = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}`);
    failedTests++;
  }
}

async function runStep7Verification() {
  // Test 1: PII Sanitization
  const rawTextWithPii = 'Encountered aggressive group near Park Street metro. Call me at 9876543210 or email test.victim@example.com for details.';
  const sanitized = LLMAuxiliaryService.sanitizeInput(rawTextWithPii);

  assert(!sanitized.includes('9876543210'), 'Sanitizer must strip 10-digit phone number');
  assert(sanitized.includes('[PHONE REDACTED]'), 'Sanitizer must replace phone with [PHONE REDACTED]');
  assert(!sanitized.includes('test.victim@example.com'), 'Sanitizer must strip email address');
  assert(sanitized.includes('[EMAIL REDACTED]'), 'Sanitizer must replace email with [EMAIL REDACTED]');

  // Test 2: Heuristic Fallback classification when LLM is unavailable
  const fallbackResult = await LLMAuxiliaryService.classifyIncidentDescription('Completely dark alleyway with broken lamps and zero streetlights');
  assert(fallbackResult.category === 'poor_lighting', `Fallback should classify 'dark alleyway' as poor_lighting (got ${fallbackResult.category})`);
  assert(fallbackResult.severityAuto === 'medium', `Severity should be assigned as medium (got ${fallbackResult.severityAuto})`);

  const harassmentFallback = await LLMAuxiliaryService.classifyIncidentDescription('A group of men followed and stalked me for two blocks');
  assert(harassmentFallback.category === 'harassment', `Fallback should classify 'followed and stalked' as harassment (got ${harassmentFallback.category})`);
  assert(harassmentFallback.severityAuto === 'critical', `Harassment should escalate severity to critical (got ${harassmentFallback.severityAuto})`);

  // Test 3: Simulated API Failure (Invalid key / Network down)
  const savedKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'sk-ant-invalid-simulated-failure-key';

  let reportSubmissionSucceeded = false;
  let submissionResult: any = null;

  try {
    submissionResult = await IncidentService.submitReport({
      userId: 'user_test_failclosed',
      userTrustScore: 0.8,
      userAccountAgeDays: 14,
      lat: 22.5552,
      lng: 88.3510,
      category: 'unsafe_area',
      description: 'Simulating Claude API failure on unlit desolate lane near Kolkata Maidan.'
    });
    reportSubmissionSucceeded = true;
  } catch (err: any) {
    reportSubmissionSucceeded = false;
  }

  // Restore key
  process.env.ANTHROPIC_API_KEY = savedKey;

  assert(reportSubmissionSucceeded, 'Fail-closed: API error must NEVER crash or block incident report submission');
  assert(submissionResult !== null && submissionResult.report.id.startsWith('inc_'), 'Report must be persisted with unique ID even on LLM outage');
  assert(submissionResult.triageAdvice !== undefined, 'Fallback triage advice must still be attached despite LLM failure');

  // Test 4: Fail-Closed Route Scoring Guarantee
  // Even if an incident report has only fallback/unclassified severity, it must NEVER be treated as safe
  const segmentWithReport = DeterministicSafetyScorer.scoreSegment({
    start: { lat: 22.5552, lng: 88.3510 },
    end: { lat: 22.5560, lng: 88.3520 },
    isLit: true,
    recentCrowdsourcedReports: [
      { ageDays: 1, severity: 1.5 } // Corresponds to fallback classified incident
    ]
  });

  const cleanSegment = DeterministicSafetyScorer.scoreSegment({
    start: { lat: 22.5552, lng: 88.3510 },
    end: { lat: 22.5560, lng: 88.3520 },
    isLit: true,
    recentCrowdsourcedReports: []
  });

  assert(segmentWithReport.score < cleanSegment.score, 'Fail-closed: Unclassified/fallback report MUST reduce safety score');
  assert(segmentWithReport.breakdown.crowdsourcedPenalty > 0, `Crowdsourced penalty must be > 0 (got ${segmentWithReport.breakdown.crowdsourcedPenalty})`);

  // Test 5: Route Calculation Never Blocks
  const origin = { lat: 22.5542, lng: 88.3520 }; // Park Street
  const dest = { lat: 22.5416, lng: 88.3475 };   // Rabindra Sadan
  const routesResult = await RoutingService.calculateSafeRoutes(origin, dest, 25);

  assert(routesResult.routes.length > 0, 'Routing engine must return candidate routes');
  const recommendedRoute = routesResult.routes.find(r => r.isRecommended);
  assert(recommendedRoute !== undefined, 'Routing engine must identify a recommended safest route candidate');
  assert(routesResult.routes.some(r => r.tag === 'safest' || r.isRecommended), 'Routes must include recommended safest route');
  assert(routesResult.routes.every(r => r.compositeSafetyScore >= 0 && r.compositeSafetyScore <= 100), 'All route safety scores must be in valid range [0, 100]');


  console.log('\n===============================================================');
  if (failedTests === 0) {
    console.log('ALL STEP 7 CLAUDE FAIL-CLOSED TESTS PASSED SUCCESSFULLY! ✅');
  } else {
    console.error(`${failedTests} STEP 7 TESTS FAILED ❌`);
  }
  console.log('===============================================================');
}

runStep7Verification();
