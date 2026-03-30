import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app';

// ─────────────────────────────────────────────
// Module mocks
// ─────────────────────────────────────────────
// Mocked before any imports that use them so
// vi.mock hoisting works correctly.
vi.mock('@semafy/core', () => ({
  ContractFetcherFactory: {
    getBySlug: vi.fn(),
  },
  runHeuristics: vi.fn(),
}));

vi.mock('../services/aiExplainer', () => ({
  generateExplanation: vi.fn(),
}));

vi.mock('../services/logger', () => ({
  logAnalysis: vi.fn().mockResolvedValue(null),
}));

import { ContractFetcherFactory, runHeuristics } from '@semafy/core';
import { generateExplanation } from 'src/services/aiExplainer';

const VALID_ADDRESS = '0x1b81D678ffb9C0263b24A97847620C99d213eB14';

const MOCK_CONTRACT_DATA = {
  address: VALID_ADDRESS,
  chainId: 1,
  implementationAddress: null,
  bytecode: '0x608060405234801561001057600080fd5b50',
  explorerData: {
    abi: [{ type: 'function', name: 'transfer', inputs: [], outputs: [] }],
    sourceCode: 'contract SwapRouter { function transfer() external {} }',
    contractName: 'SwapRouter',
  },
};

const MOCK_RISKS = [
  {
    id: 'OWNER_CONTROL',
    title: 'Owner Has Special Control',
    severity: 'medium' as const,
    description: 'The contract includes owner-restricted functions',
    evidence: ['onlyOwner'],
    explanationSeed: 'The contract owner has special permissions.',
  },
];

const MOCK_AI_RESULT = {
  summary: 'This contract allows an owner to control certain functions.',
  risks: MOCK_RISKS.map((r) => ({
    ...r,
    plainEnglish: 'Owner controls things.',
  })),
  source: 'anthropic' as const,
};

// ─────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────

const mockFetcher = {
  fetch: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks;

  vi.mocked(
    ContractFetcherFactory.getBySlug as ReturnType<typeof vi.fn>,
  ).mockReturnValue(mockFetcher);
  mockFetcher.fetch.mockResolvedValue(MOCK_CONTRACT_DATA);
  (runHeuristics as ReturnType<typeof vi.fn>).mockReturnValue(MOCK_RISKS);
  (generateExplanation as ReturnType<typeof vi.fn>).mockResolvedValue(
    MOCK_AI_RESULT,
  );
});

describe('POST /api/analyze — happy path', () => {
  it('returns 200 with the full analysis result', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .set('Content-Type', 'application/json')
      .send({ address: VALID_ADDRESS, chain: 'ethereum' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      contractAddress: VALID_ADDRESS,
      chainId: 1,
      contractName: 'SwapRouter',
      implementationAddress: null,
    });
  });

  it('response includes risks array with plainEnglish field from AI', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ address: VALID_ADDRESS, chain: 'ethereum' });

    expect(res.status).toBe(200);
    expect(res.body.risks).toHaveLength(1);
    expect(res.body.risks[0]).toHaveProperty('id', 'OWNER_CONTROL');
    expect(res.body.risks[0]).toHaveProperty('plainEnglish');
  });

  it('response includes explanation and explanationSource when AI succeeds', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ address: VALID_ADDRESS, chain: 'ethereum' });

    expect(res.body.explanation).toBe(MOCK_AI_RESULT.summary);
    expect(res.body.explanationSource).toBe('anthropic');
  });

  it('response includes isOwnerControlled derived correctly from risk IDs', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ address: VALID_ADDRESS, chain: 'ethereum' });

    // MOCK_RISKS includes OWNER_CONTROL, so this should be true
    expect(res.body.isOwnerControlled).toBe(true);
    expect(res.body.isUpgradeable).toBe(false);
  });

  it('calls ContractFetcherFactory.getBySlug with the correct chain slug', async () => {
    await request(app)
      .post('/api/analyze')
      .send({ address: VALID_ADDRESS, chain: 'base' });

    expect(ContractFetcherFactory.getBySlug).toHaveBeenCalledWith('base');
  });

  it('calls fetcher.fetch with the submitted address', async () => {
    await request(app)
      .post('/api/analyze')
      .send({ address: VALID_ADDRESS, chain: 'ethereum' });

    expect(mockFetcher.fetch).toHaveBeenCalledWith(VALID_ADDRESS);
  });
});

// ─────────────────────────────────────────────
// Graceful AI fallback
// ─────────────────────────────────────────────
 
describe('POST /api/analyze — AI fallback behaviour', () => {
  it('still returns 200 when AI explanation fails', async () => {
    (generateExplanation as ReturnType<typeof vi.fn>).mockResolvedValue({
      summary: null,
      risks: MOCK_RISKS.map((r) => ({ ...r, plainEnglish: null })),
      source: null,
    });
 
    const res = await request(app)
      .post('/api/analyze')
      .send({ address: VALID_ADDRESS, chain: 'ethereum' });
 
    expect(res.status).toBe(200);
    expect(res.body.explanation).toBeNull();
    expect(res.body.explanationSource).toBeNull();
    // Heuristic risk data must still be present
    expect(res.body.risks).toHaveLength(1);
    expect(res.body.risks[0].id).toBe('OWNER_CONTROL');
  });
 
  it('returns empty risks array (not null) when no heuristics fire', async () => {
    (runHeuristics as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (generateExplanation as ReturnType<typeof vi.fn>).mockResolvedValue({
      summary: null,
      risks: [],
      source: null,
    });
 
    const res = await request(app)
      .post('/api/analyze')
      .send({ address: VALID_ADDRESS, chain: 'ethereum' });
 
    expect(res.status).toBe(200);
    expect(res.body.risks).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// Validation errors — 400
// ─────────────────────────────────────────────
 
describe('POST /api/analyze — validation errors', () => {
  it('returns 400 for an invalid EVM address', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ address: 'not-an-address', chain: 'ethereum' });
 
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('code', 'INVALID_ADDRESS');
    expect(res.body).toHaveProperty('error');
  });
 
  it('returns 400 for a missing address field', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ chain: 'ethereum' });
 
    expect(res.status).toBe(400);
  });
 
  it('returns 400 for an unsupported chain', async () => {
    (ContractFetcherFactory.getBySlug as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Unsupported chain: "solana"');
    });
 
    const res = await request(app)
      .post('/api/analyze')
      .send({ address: VALID_ADDRESS, chain: 'solana' });
 
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNSUPPORTED_CHAIN');
  });
 
  it('returns 400 with EOA_ADDRESS code when address is a wallet', async () => {
    mockFetcher.fetch.mockRejectedValue(
      new Error('Address is an EOA (Externally Owned Account), not a contract.'),
    );
 
    const res = await request(app)
      .post('/api/analyze')
      .send({ address: VALID_ADDRESS, chain: 'ethereum' });
 
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('EOA_ADDRESS');
  });
 
  it('returns 422 when contract source code is not verified', async () => {
    mockFetcher.fetch.mockResolvedValue({
      ...MOCK_CONTRACT_DATA,
      explorerData: { abi: null, sourceCode: null, contractName: null },
    });
 
    const res = await request(app)
      .post('/api/analyze')
      .send({ address: VALID_ADDRESS, chain: 'ethereum' });
 
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('CONTRACT_NOT_VERIFIED');
  });
});

// ─────────────────────────────────────────────
// Upstream failures — 503
// ─────────────────────────────────────────────
 
describe('POST /api/analyze — upstream failures', () => {
  it('returns 503 when the RPC call fails', async () => {
    mockFetcher.fetch.mockRejectedValue(new Error('RPC unavailable'));
 
    const res = await request(app)
      .post('/api/analyze')
      .send({ address: VALID_ADDRESS, chain: 'ethereum' });
 
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('UPSTREAM_FAILURE');
  });
});

// ─────────────────────────────────────────────
// Response shape contract
// ─────────────────────────────────────────────
 
describe('POST /api/analyze — response shape contract', () => {
  it('always returns the required top-level fields', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ address: VALID_ADDRESS, chain: 'ethereum' });
 
    const required = [
      'contractAddress',
      'chainId',
      'contractName',
      'implementationAddress',
      'risks',
      'isOwnerControlled',
      'isUpgradeable',
      'explanation',
      'explanationSource',
    ];
 
    required.forEach((field) => {
      expect(res.body).toHaveProperty(field);
    });
  });
 
  it('each risk item always has the required fields', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ address: VALID_ADDRESS, chain: 'ethereum' });
 
    res.body.risks.forEach((risk: Record<string, unknown>) => {
      expect(risk).toHaveProperty('id');
      expect(risk).toHaveProperty('title');
      expect(risk).toHaveProperty('severity');
      expect(risk).toHaveProperty('description');
      expect(risk).toHaveProperty('evidence');
    });
  });
 
  it('does not expose internal fields like bytecode or explorerData', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ address: VALID_ADDRESS, chain: 'ethereum' });
 
    expect(res.body).not.toHaveProperty('bytecode');
    expect(res.body).not.toHaveProperty('explorerData');
  });
});
