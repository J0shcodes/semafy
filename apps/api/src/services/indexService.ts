import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      '[indexService] Missing required environment variables: ' +
        'UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN',
    );
  }

  redis = new Redis({ url, token });

  return redis;
}

const keys = {
  // List of CIDs for all analysis logs for a given contract+chain
  analysisLogs: (address: string, chainId: number) =>
    `logs:${address.toLowerCase()}:${chainId}`,

  // List of CIDs for all reports for a given heuristic+status
  reports: (heuristicId: string, status: string) =>
    `reports:${heuristicId}:${status}`,

  // CID of the GitHub issue record for a given heuristics
  githubIssue: (heuristicId: string) => `github:${heuristicId}`,
};

/**
 * Adds a CID to the list of analysis logs for a contract+chain.
 * Uses Redis RPUSH so the list is ordered by insertion time (oldest first).
 */
export async function addAnalysisLogCid(
  contractAddress: string,
  chainId: number,
  cid: string,
): Promise<void> {
  const key = keys.analysisLogs(contractAddress, chainId);
  await getRedis().rpush(key, cid);
}

/**
 * Returns all CIDs for a contract+chain, oldest first.
 */
export async function getAnalysisLogCids(
  contractAddress: string,
  chainId: number,
): Promise<string[]> {
  const key = keys.analysisLogs(contractAddress, chainId);

  // returns the full list
  const result = await getRedis().lrange(key, 0, -1);
  return result as string[];
}

/**
 * Returns the most recent analysis log CID for a contract+chain.
 * Returns null if no logs exist.
 */
export async function getLatestAnalysisLogCid(
  contractAddress: string,
  chainId: number,
): Promise<string | null> {
  const key = keys.analysisLogs(contractAddress, chainId);

  const result = await getRedis().lindex(key, -1);
  return result;
}

/**
 * Adds a report CID to the index under a given heuristicId and status.
 */
export async function addReportCid(
  hueristicId: string,
  status: string,
  cid: string,
): Promise<void> {
  const key = keys.reports(hueristicId, status);
  await getRedis().rpush(key, cid);
}

/**
 * Returns all report CIDs for a heuristicId+status combination.
 */

export async function getReportCids(
  heuristicId: string,
  status: string,
): Promise<string[]> {
  const key = keys.reports(heuristicId, status);
  const result = await getRedis().lrange(key, 0, -1);
  return result as string[];
}

/**
 * Returns the count of reports for a heuristicId+status.
 * Cheaper than fetching all CIDs when only the count is needed.
 */
export async function getReportCount(
  heuristicId: string,
  status: string,
): Promise<number> {
  const key = keys.reports(heuristicId, status);
  return getRedis().llen(key);
}

/**
 * Stores the CID of a GitHub issue record for a heuristicId.
 * SET not RPUSH — there is only ever one GitHub issue per heuristic.
 */
export async function setGitHubIssueCid(
  heuristicId: string,
  cid: string,
): Promise<void> {
  const key = keys.githubIssue(heuristicId);
  await getRedis().set(key, cid);
}

/**
 * Returns the GitHub issue CID for a heuristicId.
 * Returns null if no issue has been created yet.
 */
export async function getGitHubIssueCid(
  heuristicId: string,
): Promise<string | null> {
  const key = keys.githubIssue(heuristicId);
  const result = await getRedis().get(key);
  return result as string | null;
}

/**
 * Returns true if the Redis client can be initialised.
 * Used at startup to warn if credentials are missing.
 */
export function isIndexServiceConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}
