import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockCreate } = vi.hoisted(() => {
  return {
    mockCreate: vi.fn(),
  };
});

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class {
      messages = {
        create: mockCreate,
      };
    },
  };
});

import { generateExplanation } from './aiExplainer';
import { RiskHeuristic } from '@semafy/core';

const MOCK_RISKS: RiskHeuristic[] = [
  {
    id: 'OWNER_CONTROL',
    title: 'Owner Has Special Control',
    severity: 'medium',
    description: 'Owner-restricted functions detected',
    evidence: ['onlyOwner', 'transferOwnership'],
    explanationSeed: 'The owner has special permissions.',
  },
  {
    id: 'OWNER_CAN_MINT',
    title: 'Owner Can Create New Tokens',
    severity: 'high',
    description: 'Mint function detected in ABI',
    evidence: ['mint'],
    explanationSeed: 'The owner can create new tokens.',
  },
];

function makeAnthropicResponse(content: string) {
  return {
    content: [{ type: 'text', text: content }],
    usage: { input_tokens: 100, output_tokens: 80 },
  };
}

const VALID_AI_RESPONSE = JSON.stringify({
  summary:
    'This contract has an owner who can create tokens and control key functions.',
  riskExplanations: {
    OWNER_CONTROL:
      'One person controls important functions others cannot access.',
    OWNER_CAN_MINT: 'The owner can create new tokens at any time.',
  },
});

const ORIGINAL_API_KEY = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key-sk-ant-123';
});

afterEach(() => {
  process.env.ANTHROPIC_API_KEY = ORIGINAL_API_KEY;
});

describe('generateExplanation — happy path', () => {
  it('returns summary, risks with plainEnglish, and source: anthropic', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse(VALID_AI_RESPONSE));

    const result = await generateExplanation(
      'TestToken',
      'Ethereum',
      MOCK_RISKS,
    );

    expect(result.summary).toBe(
      'This contract has an owner who can create tokens and control key functions.',
    );
    expect(result.source).toBe('anthropic');
  });

  it('merges plainEnglish back onto each risk by ID', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse(VALID_AI_RESPONSE));

    const result = await generateExplanation(
      'TestToken',
      'Ethereum',
      MOCK_RISKS,
    );

    const ownerRisk = result.risks.find((r) => r.id === 'OWNER_CONTROL');
    const mintRisk = result.risks.find((r) => r.id === 'OWNER_CAN_MINT');

    expect(ownerRisk?.plainEnglish).toBe(
      'One person controls important functions others cannot access.',
    );
    expect(mintRisk?.plainEnglish).toBe(
      'The owner can create new tokens at any time.',
    );
  });

  it('preserves all original risk fields alongside plainEnglish', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse(VALID_AI_RESPONSE));

    const result = await generateExplanation(
      'TestToken',
      'Ethereum',
      MOCK_RISKS,
    );

    const ownerRisk = result.risks.find((r) => r.id === 'OWNER_CONTROL');

    expect(ownerRisk).toMatchObject({
      id: 'OWNER_CONTROL',
      title: 'Owner Has Special Control',
      severity: 'medium',
      evidence: ['onlyOwner', 'transferOwnership'],
    });
  });

  it('strips markdown code fences if model includes them despite instructions', async () => {
    const wrappedResponse = `\`\`\`json\n${VALID_AI_RESPONSE}\n\`\`\``;
    mockCreate.mockResolvedValue(makeAnthropicResponse(wrappedResponse));

    const result = await generateExplanation(
      'TestToken',
      'Ethereum',
      MOCK_RISKS,
    );

    // Should still parse correctly
    expect(result.source).toBe('anthropic');
    expect(result.summary).toBeTruthy();
  });

  it('sets plainEnglish to null for risks not present in the AI response', async () => {
    const partialResponse = JSON.stringify({
      summary: 'Partial explanation.',
      riskExplanations: {
        OWNER_CONTROL: 'Owner controls things.',
        // OWNER_CAN_MINT is intentionally missing
      },
    });
    mockCreate.mockResolvedValue(makeAnthropicResponse(partialResponse));

    const result = await generateExplanation(
      'TestToken',
      'Ethereum',
      MOCK_RISKS,
    );

    const mintRisk = result.risks.find((r) => r.id === 'OWNER_CAN_MINT');

    expect(mintRisk?.plainEnglish).toBeNull();
  });
});

describe('generateExplanation — fallback behaviour', () => {
  it('returns fallback (null summary, null source) when API key is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
 
    const result = await generateExplanation('TestToken', 'Ethereum', MOCK_RISKS);
 
    expect(result.summary).toBeNull();
    expect(result.source).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });
 
  it('returns fallback when Anthropic API throws an error', async () => {
    mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));
 
    const result = await generateExplanation('TestToken', 'Ethereum', MOCK_RISKS);
 
    expect(result.summary).toBeNull();
    expect(result.source).toBeNull();
  });
 
  it('returns fallback when API returns unparseable JSON', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse('not valid json at all'));
 
    const result = await generateExplanation('TestToken', 'Ethereum', MOCK_RISKS);
 
    expect(result.summary).toBeNull();
    expect(result.source).toBeNull();
  });
 
  it('returns fallback when API response is missing the summary field', async () => {
    const malformed = JSON.stringify({ riskExplanations: {} }); // no summary
    mockCreate.mockResolvedValue(makeAnthropicResponse(malformed));
 
    const result = await generateExplanation('TestToken', 'Ethereum', MOCK_RISKS);
 
    expect(result.summary).toBeNull();
    expect(result.source).toBeNull();
  });
 
  it('returns fallback when API response is missing riskExplanations field', async () => {
    const malformed = JSON.stringify({ summary: 'Some summary' }); // no riskExplanations
    mockCreate.mockResolvedValue(makeAnthropicResponse(malformed));
 
    const result = await generateExplanation('TestToken', 'Ethereum', MOCK_RISKS);
 
    expect(result.summary).toBeNull();
    expect(result.source).toBeNull();
  });
 
  it('fallback result still contains all original risks with null plainEnglish', async () => {
    delete process.env.ANTHROPIC_API_KEY;
 
    const result = await generateExplanation('TestToken', 'Ethereum', MOCK_RISKS);
 
    expect(result.risks).toHaveLength(MOCK_RISKS.length);
    result.risks.forEach((r) => {
      expect(r.plainEnglish).toBeNull();
      // Original fields should be preserved
      expect(r.id).toBeDefined();
      expect(r.severity).toBeDefined();
    });
  });
 
  it('times out and returns fallback when API call exceeds timeout', async () => {
    vi.useFakeTimers();
 
    mockCreate.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 20000)),
    );
 
    const resultPromise = generateExplanation('TestToken', 'Ethereum', MOCK_RISKS);
 
    // Advance past the 8 second timeout
    vi.advanceTimersByTime(9000);
 
    const result = await resultPromise;
 
    expect(result.summary).toBeNull();
    expect(result.source).toBeNull();
 
    vi.useRealTimers();
  });
});

describe('generateExplanation — model fallback', () => {
  it('falls back to Sonnet when Haiku throws an error', async () => {
    // First call (Haiku) throws, second call (Sonnet) succeeds
    mockCreate
      .mockRejectedValueOnce(new Error('Model overloaded'))
      .mockResolvedValueOnce(makeAnthropicResponse(VALID_AI_RESPONSE));
 
    const result = await generateExplanation('TestToken', 'Ethereum', MOCK_RISKS);
 
    expect(result.source).toBe('anthropic');
    expect(result.summary).toBeTruthy();
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
 
  it('returns fallback when both Haiku and Sonnet fail', async () => {
    mockCreate.mockRejectedValue(new Error('All models unavailable'));
 
    const result = await generateExplanation('TestToken', 'Ethereum', MOCK_RISKS);
 
    expect(result.summary).toBeNull();
    expect(result.source).toBeNull();
  });
});

describe('generateExplanation — empty risks', () => {
  it('handles an empty risks array without crashing', async () => {
    const emptyRisksResponse = JSON.stringify({
      summary:
        'No concerning patterns were detected in this contract. This does not guarantee the contract is safe.',
      riskExplanations: {},
    });
    mockCreate.mockResolvedValue(makeAnthropicResponse(emptyRisksResponse));
 
    const result = await generateExplanation('CleanContract', 'Ethereum', []);
 
    expect(result.risks).toEqual([]);
    expect(result.summary).toBeTruthy();
    expect(result.source).toBe('anthropic');
  });
});