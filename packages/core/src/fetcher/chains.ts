import { ContractFetcher } from './ContractFetcher';
import { ExplorerConfig } from '../types';

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorer: ExplorerConfig;
}

// ─────────────────────────────────────────────
// Supported Chain Registry
// ─────────────────────────────────────────────
// Add or remove chains here. The rest of the system
// picks them up automatically via the factory below.
// RPC URLs and API keys are read from environment variables
// so no secrets are hardcoded.
export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.ETHEREUM_RPC_URL!,
    explorer: {
      apiUrl: process.env.ETHERSCAN_API_URL!,
      apiKey: process.env.ETHERSCAN_API_KEY!,
    },
  },
  base: {
    chainId: 8453,
    name: 'Base Mainnet',
    rpcUrl: process.env.BASE_RPC_URL!,
    explorer: {
      apiUrl: process.env.ETHERSCAN_API_URL!,
      apiKey: process.env.ETHERSCAN_API_KEY!,
    },
  },

  polygon: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: process.env.POLYGON_RPC_URL!,
    explorer: {
      apiUrl: process.env.ETHERSCAN_API_URL!,
      apiKey: process.env.ETHERSCAN_API_KEY!,
    },
  },

  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: process.env.ARBITRUM_RPC_URL!,
    explorer: {
      apiUrl: process.env.ETHERSCAN_API_URL!,
      apiKey: process.env.ETHERSCAN_API_KEY!,
    },
  },

  optimism: {
    chainId: 10,
    name: 'Optimism Mainnet',
    rpcUrl: process.env.OPTIMISM_RPC_URL!,
    explorer: {
      apiUrl: process.env.ETHERSCAN_API_URL!,
      apiKey: process.env.ETHERSCAN_API_KEY!,
    },
  },

  bsc: {
    chainId: 56,
    name: 'BNB Smart Chain',
    rpcUrl: process.env.BSC_RPC_URL!,
    explorer: {
      apiUrl: process.env.ETHERSCAN_API_URL!,
      apiKey: process.env.ETHERSCAN_API_KEY!,
    },
  },
};

const CHAIN_ID_MAP: Record<number, ChainConfig> = Object.fromEntries(
  Object.values(SUPPORTED_CHAINS).map((chain) => [chain.chainId, chain]),
);

// ─────────────────────────────────────────────
// ContractFetcherFactory
// ─────────────────────────────────────────────
// Creates and caches one ContractFetcher instance per chain.
// This avoids spinning up redundant RPC providers and ensures
// the LRU cache inside each fetcher is reused across requests.

export class ContractFetcherFactory {
  private static fetchers = new Map<number, ContractFetcher>();

  /**
   * Get a fetcher by chain slug (e.g. "ethereum", "base")
   */
  static getBySlug(slug: string): ContractFetcher {
    const config = SUPPORTED_CHAINS[slug];
    if (!config) {
      throw new Error(
        `Unsupported chain: "${slug}". Supported chains: ${Object.keys(SUPPORTED_CHAINS).join(', ')}`,
      );
    }
    return this.getOrCreate(config);
  }

  /**
   * Get a fetcher by chain ID number (e.g. 1, 137, 8453)
   */
  static getByChainId(chainId: number): ContractFetcher {
    const config = CHAIN_ID_MAP[chainId];
    if (!config) {
      throw new Error(
        `Unsupported chain ID: ${chainId}. Supported IDs: ${Object.keys(CHAIN_ID_MAP).join(', ')}`,
      );
    }

    return this.getOrCreate(config);
  }

  /**
   * Returns all supported chain slugs — useful for building chain selector UIs
   */
  static getSupportedChains(): {
    slug: string;
    chainId: number;
    name: string;
  }[] {
    return Object.entries(SUPPORTED_CHAINS).map(([slug, config]) => ({
      slug,
      chainId: config.chainId,
      name: config.name,
    }));
  }

  private static getOrCreate(config: ChainConfig): ContractFetcher {
    if (!this.fetchers.has(config.chainId)) {
      this.fetchers.set(
        config.chainId,
        new ContractFetcher(config.rpcUrl, config.explorer, config.chainId),
      );
    }
    return this.fetchers.get(config.chainId)!
  }
}
