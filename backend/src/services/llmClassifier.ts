import Anthropic from '@anthropic-ai/sdk';

export interface TriageResult {
  category: 'harassment' | 'poor_lighting' | 'unsafe_area' | 'other';
  severityAuto: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  reasoning: string;
}

export class LLMAuxiliaryService {
  private static getClient(): Anthropic | null {
    const key = process.env.ANTHROPIC_API_KEY;
    return key ? new Anthropic({ apiKey: key }) : null;
  }

  /**
   * Sanitizes user text to strip phone numbers or obvious email addresses before forwarding
   */
  public static sanitizeInput(text: string): string {
    return text
      .replace(/\b\d{10}\b/g, '[PHONE REDACTED]')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL REDACTED]');
  }

  /**
   * Classifies free-text incident description for moderator triage (advisory only)
   */
  public static async classifyIncidentDescription(description: string): Promise<TriageResult> {
    const cleanText = this.sanitizeInput(description);

    const client = this.getClient();
    if (!client || !process.env.ANTHROPIC_API_KEY) {
      // Fallback rule-based classifier when API key is not present in local test environment
      return this.fallbackLocalTriage(cleanText);
    }

    try {
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 300,
        temperature: 0,
        system: `You are an advisory triage classifier for a safety app. Classify the user text into:
category: "harassment" | "poor_lighting" | "unsafe_area" | "other"
severityAuto: "low" | "medium" | "high" | "critical"
Respond ONLY in JSON format: {"category": string, "severityAuto": string, "confidence": number, "reasoning": string}`,
        messages: [{ role: 'user', content: `Classify safety report text: "${cleanText}"` }]
      });

      const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const parsed = JSON.parse(raw);
      return {
        category: parsed.category || 'other',
        severityAuto: parsed.severityAuto || 'medium',
        confidence: parsed.confidence || 0.85,
        reasoning: parsed.reasoning || 'LLM classification complete'
      };
    } catch (err: any) {
      console.warn('[SAHELI AI Classifier Error]:', err.message || err);
      return this.fallbackLocalTriage(cleanText);
    }
  }

  /**
   * Generates a plain-language summary of route safety flags (auxiliary display only)
   */
  public static generatePlainLanguageExplanation(reasons: string[]): string {
    if (reasons.length === 0) {
      return "This route is well-lit, frequented by pedestrians, and has zero recent incident reports.";
    }
    return `Route Advisory: ${reasons.join('; ')}.`;
  }

  private static fallbackLocalTriage(text: string): TriageResult {
    const lower = text.toLowerCase();
    let category: TriageResult['category'] = 'other';
    let severityAuto: TriageResult['severityAuto'] = 'low';

    if (lower.includes('stalk') || lower.includes('follow') || lower.includes('chase') || lower.includes('touch')) {
      category = 'harassment';
      severityAuto = 'critical';
    } else if (lower.includes('dark') || lower.includes('lamp') || lower.includes('light') || lower.includes('bulb')) {
      category = 'poor_lighting';
      severityAuto = 'medium';
    } else if (lower.includes('group') || lower.includes('drunk') || lower.includes('gated') || lower.includes('isolated')) {
      category = 'unsafe_area';
      severityAuto = 'high';
    }

    return {
      category,
      severityAuto,
      confidence: 0.9,
      reasoning: 'Heuristic keyword match fallback (Local Advisory Triage)'
    };
  }
}
