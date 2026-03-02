import { v4 as uuidv4 } from 'uuid';
import { RiskHeuristic } from '@semafy/core';
import { uploadJSON } from './storacha';
import { addAnalysisLogCid } from './indexService';

export interface AnalysisLogInput {
  contractAddress: string;
  chainId: number;
  contractName: string | null;
  implementationAddress: string | null;
  risks: RiskHeuristic[];
  isOwnerControlled: boolean;
  isUpgradeable: boolean;
}

export interface AnalysisLog extends AnalysisLogInput {
  id: string;
  analysedAt: string; // ISO 8601
  cid: string;
  url: string; // public gateway URL
}

/**
 * Persists an analysis result to Storacha and registers the CID
 * in the Index Service for later retrieval.
 *
 * This function is designed to be called fire-and-forget from the
 * route handler. It handles its own errors internally and never
 * throws — a logging failure must never affect the API response.
 *
 * Returns the completed AnalysisLog including its CID, or null if
 * logging failed. The caller does not need to handle the return value.
 */

export async function logAnalysis(
  input: AnalysisLogInput,
): Promise<AnalysisLog | null> {
  try {
    const log: Omit<AnalysisLog, 'cid' | 'url'> = {
      id: uuidv4(),
      contractAddress: input.contractAddress,
      chainId: input.chainId,
      contractName: input.contractName,
      implementationAddress: input.implementationAddress,
      risks: input.risks,
      isOwnerControlled: input.isOwnerControlled,
      isUpgradeable: input.isUpgradeable,
      analysedAt: new Date().toISOString(),
    };

    const { cid, url } = await uploadJSON(log);

    const completedLog = { ...log, cid, url };

    await addAnalysisLogCid(input.contractAddress, input.chainId, cid);

    console.log(
      `[logger] Analysis logged — contract: ${input.contractAddress} ` +
        `chain: ${input.chainId} cid: ${cid}`,
    );

    return completedLog
  } catch (error) {
    console.error("[logger] Failed to log analysis:", error)
    return null
  }
}
