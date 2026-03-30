import axios from 'axios';
import { ethers } from 'ethers';
import { LRUCache } from 'lru-cache';

import { parseSourceCode } from '../parser/parseSourceCode';
import { SUPPORTED_CHAINS } from './config';

// EIP-1967 Implementation Slot: keccak256('eip1967.proxy.implementation') - 1
const IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

import {
  //   AbiItem,
  //   ContractData,
  ExplorerConfig,
  ContractResult,
  ExplorerData,
  ContractData,
} from '../types';

export class ContractFetcher {
  private provider: ethers.JsonRpcProvider;
  private explorer: ExplorerConfig;
  private chainId: number;
  private cache = new LRUCache<string, any>({
    max: 5000,
    ttl: 3.154e12, // Set TTL to ~100 years in milliseconds
    allowStale: false,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
  });
  private lastCallTime = 0;
  private minInterval = 200; // milliseconds

  constructor(rpcUrl: string, explorer: ExplorerConfig, chainId: number) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.explorer = explorer;
    this.chainId = chainId
  }

  /**
   * Builds a chain-scoped cache key to prevent collisions across chains.
   * e.g. "1:0xAbC..." for Ethereum, "8453:0xAbC..." for Base
   */
  private cacheKey(address: string): string {
    return `${this.chainId}:${address}`
  }

  /**
   * Main entry point: Fetches data with proxy resolution and caching
   */
  async fetch(address: string, resolveProxy = true): Promise<ContractData> {
    const checksummed = ethers.getAddress(address.toLowerCase());
    const key = this.cacheKey(checksummed)

    if (this.cache.has(key)) return this.cache.get(key)!;

    const bytecode = await this.provider.getCode(checksummed);
    if (bytecode === '0x') {
      throw new Error(
        'Address is an EOA (Externally Owned Account), not a contract.',
      );
    }

    let targetAddress = checksummed;
    if (resolveProxy) {
      const implementationAddress =
        await this.getImplementationAddress(checksummed);
      if (implementationAddress !== ethers.ZeroAddress) {
        targetAddress = implementationAddress;
      }
    }

    await this.throttle();
    const explorerData = await this.fetchFromExplorer(address, this.chainId);

    const result: ContractData = {
      address: checksummed,
      chainId: this.chainId,
      implementationAddress:
        targetAddress !== checksummed ? targetAddress : null,
      bytecode,
      explorerData: explorerData,
    };

    this.cache.set(key, result);

    return result;
  }

  /**
   * Resolves EIP-1967 Proxy addresses
   */
  private async getImplementationAddress(
    proxyAddress: string,
  ): Promise<string> {
    const storage = await this.provider.getStorage(
      proxyAddress,
      IMPLEMENTATION_SLOT,
    );

    const address = ethers.getAddress(ethers.dataSlice(storage, 12));
    return address;
  }

  /**
   * Handles Rate Limiting for Explorer API
   */
  private async throttle() {
    const now = Date.now();
    const timeSinceLast = now - this.lastCallTime;
    if (timeSinceLast < this.minInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minInterval - timeSinceLast),
      );
    }
    this.lastCallTime = Date.now();
  }

  /**
   * Fetches and parses Source/ABI (Handling Nested JSON)
   */
  private async fetchFromExplorer(address: string, chainId: number): Promise<ExplorerData> {
    const url = `${this.explorer.apiUrl}?module=contract&action=getsourcecode&address=${address}&apikey=${this.explorer.apiKey}&chainid=${chainId}`;
    const response = await axios.get(url);

    if (response.data.status !== '1') return { abi: null, sourceCode: null };

    const result: ContractResult = response.data.result[0];
    let sourceCode = result.SourceCode;

    // if (sourceCode.startsWith('{{')) {
    //   sourceCode = parseSourceCode(sourceCode);
    // }

    return {
      abi: JSON.parse(result.ABI),
      sourceCode: sourceCode,
      contractName: result.ContractName,
    };
  }
}