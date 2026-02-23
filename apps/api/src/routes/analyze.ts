import { Router, Response, Request, NextFunction } from 'express';
import { ContractFetcherFactory } from '@semafy/core';
import { runHeuristics } from '@semafy/core';
import { ContractData } from '@semafy/core';
import z from 'zod';
import { isAddress } from 'viem';
import { AppError } from '../types/errors';

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
      } catch (error) {
        throw new AppError(
          `Unsupported chain: ${chain}`,
          'UNSUPPORTED_CHAIN',
          400,
        );
      }

      let contractData: ContractData;
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
          'Failed to fetch contract data',
          'UPSTREAM_FAILURE',
          503,
        );
      }

      if (!contractData.explorerData.sourceCode) {
        throw new AppError(
          'Contract source code is not verified on this explorer',
          'CONTRACT_NOT_VERIFIED',
          422,
        );
      }

      const risks = runHeuristics(contractData);

      return res.status(200).json({
        contractAddress: contractData.address,
        chainId: contractData.chainId,
        contractName: contractData.explorerData.contractName ?? null,
        implementationAddress: contractData.implementationAddress,
        risks,
        isOwnerControlled: risks.some((r) => r.id === 'OWNER_CONTROL'),
        isUpgradeable: risks.some((r) => r.id === 'UPGRADEABLE_CONTRACT'),
        explanation: null,
        explanationSource: null,
      });
    } catch (error) {
      next(error);
    }
  },
);
