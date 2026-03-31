// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface StorachaUploadResult {
  cid: string;
  url: string;
}

// ─────────────────────────────────────────────
// Client Singleton
// ─────────────────────────────────────────────

let clientPromise: Promise<any> | null = null;

async function getClient(): Promise<any> {
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    const agentKey = process.env.STORACHA_AGENT_KEY;
    const proof = process.env.STORACHA_PROOF;
    const spaceDid = process.env.STORACHA_SPACE_DID;

    if (!agentKey || !proof || !spaceDid) {
      throw new Error(
        '[storacha] Missing required environment variables: ' +
          'STORACHA_AGENT_KEY, STORACHA_PROOF, STORACHA_SPACE_DID',
      );
    }

    // Dynamic imports — required because w3up-client v17 is ESM-only

    const { create } = await import('@web3-storage/w3up-client');
    const { ed25519 } = await import('@ucanto/principal');
    const { parse: parseProof } =
      await import('@web3-storage/w3up-client/proof');

    const principal = ed25519.Signer.parse(agentKey);
    const client = await create({ principal });

    // w3up-client/proof's parse() handles the Base64 decoding automatically
    try {
      const proofResult = await parseProof(proof);
      const space = await client.addSpace(proofResult);
      await client.setCurrentSpace(space.did());
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);

      throw new Error(
        `[storacha] Failed to parse proof or add space: ${errorMessage}`,
      );
    }

    console.log('[storacha] Client initialised — space:', spaceDid);
    return client;
  })();

  return clientPromise;
}

// ─────────────────────────────────────────────
// Upload
// ─────────────────────────────────────────────

export async function uploadJSON(data: object): Promise<StorachaUploadResult> {
  const client = await getClient();

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });

  const cid = await client.uploadFile(blob);
  const cidString = cid.toString();

  return {
    cid: cidString,
    url: `https://${cidString}.ipfs.w3s.link`,
  };
}

export async function fetchJSON<T>(cid: string): Promise<T> {
  const url = `https://${cid}.ipfs.w3s.link`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `[storacha] Failed to fetch CID ${cid}: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

export async function fetchMany<T>(cids: string[]): Promise<T[]> {
  const results = await Promise.allSettled(
    cids.map((cid) => fetchJSON<T>(cid)),
  );

  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<T>).value);
}

export function isStorachaConfigured(): boolean {
  return !!(
    process.env.STORACHA_AGENT_KEY &&
    process.env.STORACHA_PROOF &&
    process.env.STORACHA_SPACE_DID
  );
}
