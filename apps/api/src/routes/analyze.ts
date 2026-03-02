import { Router, Response, Request, NextFunction } from 'express';
import {
  ContractFetcherFactory,
  runHeuristics,
  ContractData,
} from '@semafy/core';
import z from 'zod';
import { isAddress } from 'viem';
import { AppError } from '../types/errors';
import { generateExplanation } from 'src/services/aiExplainer';
import { logAnalysis } from 'src/services/logger';

export const analyzerRouter = Router();

const analyzeSchema = z.object({
  address: z.string().refine((val) => isAddress(val), {
    error: 'Invalid EVM address',
  }),
  chain: z.string(),
});

interface AnalyzeBody {
  address: string;
  chain: string;
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  8453: 'Base',
  137: 'Polygon',
  42161: 'Arbitrum One',
  10: 'Optimism',
  56: 'BNB Smart Chain',
};

analyzerRouter.post(
  '/analyze',
  async (
    req: Request<{}, {}, AnalyzeBody>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const parsed = analyzeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          parsed.error.issues[0].message,
          'INVALID_ADDRESS',
          400,
        );
      }

      const { address, chain } = parsed.data;

      let fetcher;
      try {
        fetcher = ContractFetcherFactory.getBySlug(chain);
      } catch {
        throw new AppError(
          `Unsupported chain: ${chain}`,
          'UNSUPPORTED_CHAIN',
          400,
        );
      }

      let contractData;
      try {
        contractData = await fetcher.fetch(address);
      } catch (error: any) {
        if (error.message.includes('EOA')) {
          throw new AppError(
            'This address is a wallet, not a contract',
            'EOA_ADDRESS',
            400,
          );
        }
        throw new AppError(
          'Failed to fetch contract data. The RPC or explorer may be unavailable.',
          'UPSTREAM_FAILURE',
          503,
        );
      }

      if (!contractData.explorerData.sourceCode) {
        throw new AppError(
          'Contract source code is not verified on this explorer.',
          'CONTRACT_NOT_VERIFIED',
          422,
        );
      }

      const heuristicRisks = runHeuristics(contractData);

      // ── 6. Fire-and-forget logging ───────────
      // Runs after heuristics, before the AI call.
      // A logging failure never blocks or degrades the response.
      // The .catch() is a safety net on top of logger's internal
      // error handling — belt and braces.

      logAnalysis({
        contractAddress: contractData.address,
        chainId: contractData.chainId,
        contractName: contractData.explorerData.contractName ?? null,
        implementationAddress: contractData.implementationAddress,
        risks: heuristicRisks,
        isOwnerControlled: heuristicRisks.some((r) => r.id === 'OWNER_CONTROL'),
        isUpgradeable: heuristicRisks.some(
          (r) => r.id === 'UPGRADEABLE_CONTRACT',
        ),
      }).catch((err) =>
        console.log('[analyze] Unexpected logging error:', err),
      );

      const chainName = CHAIN_NAMES[contractData.chainId] ?? chain;

      const aiTimeout = new Promise<null>((resolve) =>
        setTimeout(() => {
          console.warn(
            '[analyze] AI explanation timed out — returning without it.',
          );
          resolve(null);
        }, 8000),
      );

      const aiResult = await Promise.race([
        generateExplanation(
          contractData.explorerData.contractName! ?? null,
          chainName,
          heuristicRisks,
        ),
        aiTimeout,
      ]);

      const risks = aiResult
        ? aiResult.risks
        : heuristicRisks.map((r) => ({ ...r, plainEnglish: null }));
      const summary = aiResult ? aiResult.summary : null;
      const explanationSource = aiResult ? aiResult.source : null;

      return res.status(200).json({
        contractAddress: contractData.address,
        chainId: contractData.chainId,
        contractName: contractData.explorerData.contractName ?? null,
        implementationAddress: contractData.implementationAddress,
        risks,
        isOwnerControlled: heuristicRisks.some((r) => r.id === 'OWNER_CONTROL'),
        isUpgradeable: heuristicRisks.some(
          (r) => r.id === 'UPGRADEABLE_CONTRACT',
        ),
        explanation: summary,
        explanationSource,
      });
    } catch (error) {
      next(error);
    }
  },
);
