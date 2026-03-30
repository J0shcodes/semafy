import Anthropic from '@anthropic-ai/sdk';

import { RiskHeuristic } from '@semafy/core';

export interface RiskExplaination {
  id: string;
  plainEnglish: string;
}

export interface AiExplainationResult {
  summary: string;
  riskExplanations: Record<string, string>;
}

export interface ExplainedRisk extends RiskHeuristic {
  plainEnglish: string | null;
}

function createClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

const client = createClient()

function buildUserMessage(
  contractName: string,
  chainName: string,
  risks: RiskHeuristic[],
): string {
  const name = contractName ?? 'Unknown Contract';

  const reducedRisks = risks.map((r) => ({
    id: r.id,
    title: r.title,
    severity: r.severity,
    evidence: r.evidence,
    explanationSeed: r.explanationSeed,
  }));

  return `
<contract_details>
<name>${name}</name>
<chain>${chainName}</chain>
</contract_details>

<detected_risks>
${JSON.stringify(reducedRisks, null, 2)}
</detected_risks>

If the <detected_risks> array is empty, return exactly this fallback JSON:
{
  "summary": "No concerning patterns were detected in this contract. This does not guarantee the contract is safe — always do your own research before interacting.",
  "riskExplanations": {}
}
`;
}

function parseAiResponse(text: string): AiExplainationResult {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);

  if (typeof parsed.summary !== 'string') {
    throw new Error('AI response missing summary field');
  }

  if (typeof parsed.riskExplanations !== 'object') {
    throw new Error('AI response missing riskExplanation field');
  }

  return parsed as AiExplainationResult;
}

function fallback(risks: RiskHeuristic[]): {
  summary: string | null;
  risks: ExplainedRisk[];
  source: 'anthropic' | null;
} {
  return {
    summary: null,
    risks: risks.map((r) => ({ ...r, plainEnglish: null })),
    source: null as null,
  };
}

/**
 * Generates a plain English explanation of the heuristic findings.
 *
 * Returns null if:
 * - ANTHROPIC_API_KEY is not set
 * - The API call fails
 * - The response cannot be parsed
 *
 * Callers should always handle a null return gracefully.
 */
export async function generateExplanation(
  contractName: string,
  chainName: string,
  risks: RiskHeuristic[],
): Promise<{
  summary: string | null;
  risks: ExplainedRisk[];
  source: 'anthropic' | null;
}> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      '[aiExplainer] ANTHROPIC_API_KEY is not set - skipping AI explanation.',
    );
    return fallback(risks);
  }

  const systemPrompt = `You are an explainer for a smart contract risk analysis tool called SemaFy.
Your job is ONLY to explain these findings in plain English for a non-technical user who is about to interact with this contract.

STRICT RULES — you must follow all of these:
- Do NOT invent, add, or imply risks that are not present in the provided list.
- Do NOT tell the user whether the contract is safe or unsafe.
- Do NOT use technical jargon — write as if explaining to someone with no blockchain knowledge.
- Be neutral, factual, and concise.
- Keep the overall summary under 100 words.
- Keep each individual risk explanation under 60 words.

OUTPUT FORMAT:
Return ONLY a valid JSON object with NO markdown, NO backticks, and NO preamble. The object must have exactly this shape:
{
  "summary": "<plain English overview of what this contract can do based on the findings>",
  "riskExplanations": {
    "<risk_id>": "<plain English explanation of this specific risk>"
  }
}`;

  const userContent = buildUserMessage(contractName, chainName, risks);

  const attempt = async (model: string) =>
    client.messages.create({
      model,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('AI explantion timed out')), 8000),
  );

  try {
    const message = await Promise.race([
      attempt('claude-haiku-4-5-20251001').catch(() =>
        attempt('claude-sonnet-4-5-20250929'),
      ),
      timeout,
    ]);

    console.log(
      `[aiExplainer] Tokens used - input: ${message.usage.input_tokens}, output: ${message.usage.output_tokens}`,
    );

    const text =
      message.content[0].type === 'text' ? message.content[0].text : '';

    const parsed = parseAiResponse(text);

    const explainedRisks: ExplainedRisk[] = risks.map((r) => ({
      ...r,
      plainEnglish: parsed.riskExplanations[r.id] ?? null,
    }));

    return {
      summary: parsed.summary,
      risks: explainedRisks,
      source: 'anthropic',
    };
  } catch (error) {
    console.error('[aiExplainer] Failed to generate explanation:', error);
    return fallback(risks);
  }
}
