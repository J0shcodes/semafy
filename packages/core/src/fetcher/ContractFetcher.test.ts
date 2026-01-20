import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { ethers } from 'ethers';
import { ContractFetcher } from './ContractFetcher';
import { parseSourceCode } from '../parser/parseSourceCode';

// Mock dependencies
vi.mock('axios');
vi.mock('../parser');

const mockedAxios = axios as unknown as {
  get: ReturnType<typeof vi.fn>;
};
const mockedParseSourceCode = parseSourceCode as unknown as ReturnType<
  typeof vi.fn
>;

describe('ContractFetcher Integration', () => {
  let fetcher: ContractFetcher;
  let mockProvider: {
    getCode: ReturnType<typeof vi.fn>;
    getStorage: ReturnType<typeof vi.fn>;
  };

  const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';
  const IMPLEMENTATION_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const EXPLORER_CONFIG = {
    apiUrl: 'https://api.etherscan.io/api',
    apiKey: 'test-api-key',
  };

  const MOCK_BYTECODE = '0x608060405234801561001057600080fd5b50';
  const MOCK_ABI = [
    {
      type: 'function' as const,
      name: 'transfer',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'nonpayable' as const,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock ethers.JsonRpcProvider
    mockProvider = {
      getCode: vi.fn(),
      getStorage: vi.fn(),
    };

    vi.spyOn(ethers, 'JsonRpcProvider').mockImplementation(
      () => mockProvider as any,
    );

    fetcher = new ContractFetcher(
      'https://eth-mainnet.example.com',
      EXPLORER_CONFIG,
    );
  });

  describe('fetch()', () => {
    beforeEach(() => {
      mockProvider.getCode.mockResolvedValue(MOCK_BYTECODE);
      mockProvider.getStorage.mockResolvedValue(ethers.ZeroHash);
    });

    it('should fetch contract data successfully', async () => {
      const mockExplorerResponse = {
        data: {
          status: '1',
          result: [
            {
              SourceCode: 'contract Token {}',
              ABI: JSON.stringify(MOCK_ABI),
              ContractName: 'Token',
              CompilerVersion: 'v0.8.20',
              CompilerType: 'solc',
              OptimizationUsed: '1',
              Runs: '200',
              ConstructorArguments: '',
              EVMVersion: 'paris',
              Library: '',
              ContractFileName: 'Token.sol',
              LicenseType: 'MIT',
              Proxy: '0',
              Implementation: '',
              SwarmSource: '',
              SimilarMatch: '',
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockExplorerResponse);

      const result = await fetcher.fetch(TEST_ADDRESS);

      expect(result).toEqual({
        address: ethers.getAddress(TEST_ADDRESS),
        implementationAddress: null,
        bytecode: MOCK_BYTECODE,
        abi: MOCK_ABI,
        sourceCode: 'contract Token {}',
        contractName: 'Token',
      });

      expect(mockProvider.getCode).toHaveBeenCalledWith(
        ethers.getAddress(TEST_ADDRESS),
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(TEST_ADDRESS),
      );
    });

    it('should handle nested source code parsing', async () => {
      const nestedSourceCode = '{{sources: {...}}}';
      const parsedSource = { 'Contract.sol': { content: 'contract Test {}' } };

      const mockExplorerResponse = {
        data: {
          status: '1',
          result: [
            {
              SourceCode: nestedSourceCode,
              ABI: JSON.stringify(MOCK_ABI),
              ContractName: 'Test',
              CompilerVersion: 'v0.8.20',
              CompilerType: 'solc',
              OptimizationUsed: '1',
              Runs: '200',
              ConstructorArguments: '',
              EVMVersion: 'paris',
              Library: '',
              ContractFileName: 'Test.sol',
              LicenseType: 'MIT',
              Proxy: '0',
              Implementation: '',
              SwarmSource: '',
              SimilarMatch: '',
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockExplorerResponse);
      mockedParseSourceCode.mockReturnValue(parsedSource as any);

      const result = await fetcher.fetch(TEST_ADDRESS);

      expect(mockedParseSourceCode).toHaveBeenCalledWith(nestedSourceCode);
      expect(result.sourceCode).toEqual(parsedSource);
    });

    it('should throw error for EOA (no bytecode)', async () => {
      mockProvider.getCode.mockResolvedValue('0x');

      await expect(fetcher.fetch(TEST_ADDRESS)).rejects.toThrow(
        'Address is an EOA (Externally Owned Account), not a contract.',
      );
    });

    it('should handle explorer API failure gracefully', async () => {
      const mockExplorerResponse = {
        data: {
          status: '0',
          result: [],
        },
      };

      mockedAxios.get.mockResolvedValue(mockExplorerResponse);

      const result = await fetcher.fetch(TEST_ADDRESS);

      expect(result.abi).toBeNull();
      expect(result.sourceCode).toBeNull();
      expect(result.bytecode).toBe(MOCK_BYTECODE);
    });

    it('should normalize addresses to checksum format', async () => {
      const lowercaseAddress = TEST_ADDRESS.toLowerCase();

      const mockExplorerResponse = {
        data: {
          status: '1',
          result: [
            {
              SourceCode: 'contract Token {}',
              ABI: JSON.stringify(MOCK_ABI),
              ContractName: 'Token',
              CompilerVersion: 'v0.8.20',
              CompilerType: 'solc',
              OptimizationUsed: '1',
              Runs: '200',
              ConstructorArguments: '',
              EVMVersion: 'paris',
              Library: '',
              ContractFileName: 'Token.sol',
              LicenseType: 'MIT',
              Proxy: '0',
              Implementation: '',
              SwarmSource: '',
              SimilarMatch: '',
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockExplorerResponse);

      const result = await fetcher.fetch(lowercaseAddress);

      expect(result.address).toBe(ethers.getAddress(TEST_ADDRESS));
    });
  });

  describe('Proxy Resolution', () => {
    it('should resolve EIP-1967 proxy implementation', async () => {
      // Mock storage to return implementation address
      const implementationSlotValue = ethers.zeroPadValue(
        IMPLEMENTATION_ADDRESS,
        32,
      );
      mockProvider.getStorage.mockResolvedValue(implementationSlotValue);
      mockProvider.getCode.mockResolvedValue(MOCK_BYTECODE);

      const mockExplorerResponse = {
        data: {
          status: '1',
          result: [
            {
              SourceCode: 'contract Implementation {}',
              ABI: JSON.stringify(MOCK_ABI),
              ContractName: 'Implementation',
              CompilerVersion: 'v0.8.20',
              CompilerType: 'solc',
              OptimizationUsed: '1',
              Runs: '200',
              ConstructorArguments: '',
              EVMVersion: 'paris',
              Library: '',
              ContractFileName: 'Implementation.sol',
              LicenseType: 'MIT',
              Proxy: '0',
              Implementation: '',
              SwarmSource: '',
              SimilarMatch: '',
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockExplorerResponse);

      const result = await fetcher.fetch(TEST_ADDRESS, true);

      expect(result.implementationAddress).toBe(
        ethers.getAddress(IMPLEMENTATION_ADDRESS),
      );
      expect(mockProvider.getStorage).toHaveBeenCalledWith(
        ethers.getAddress(TEST_ADDRESS),
        '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
      );
    });

    it('should not resolve proxy when resolveProxy is false', async () => {
      mockProvider.getCode.mockResolvedValue(MOCK_BYTECODE);

      const mockExplorerResponse = {
        data: {
          status: '1',
          result: [
            {
              SourceCode: 'contract Token {}',
              ABI: JSON.stringify(MOCK_ABI),
              ContractName: 'Token',
              CompilerVersion: 'v0.8.20',
              CompilerType: 'solc',
              OptimizationUsed: '1',
              Runs: '200',
              ConstructorArguments: '',
              EVMVersion: 'paris',
              Library: '',
              ContractFileName: 'Token.sol',
              LicenseType: 'MIT',
              Proxy: '0',
              Implementation: '',
              SwarmSource: '',
              SimilarMatch: '',
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockExplorerResponse);

      const result = await fetcher.fetch(TEST_ADDRESS, false);

      expect(result.implementationAddress).toBeNull();
      expect(mockProvider.getStorage).not.toHaveBeenCalled();
    });

    it('should handle non-proxy contracts correctly', async () => {
      mockProvider.getStorage.mockResolvedValue(ethers.ZeroHash);
      mockProvider.getCode.mockResolvedValue(MOCK_BYTECODE);

      const mockExplorerResponse = {
        data: {
          status: '1',
          result: [
            {
              SourceCode: 'contract Token {}',
              ABI: JSON.stringify(MOCK_ABI),
              ContractName: 'Token',
              CompilerVersion: 'v0.8.20',
              CompilerType: 'solc',
              OptimizationUsed: '1',
              Runs: '200',
              ConstructorArguments: '',
              EVMVersion: 'paris',
              Library: '',
              ContractFileName: 'Token.sol',
              LicenseType: 'MIT',
              Proxy: '0',
              Implementation: '',
              SwarmSource: '',
              SimilarMatch: '',
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockExplorerResponse);

      const result = await fetcher.fetch(TEST_ADDRESS);

      expect(result.implementationAddress).toBeNull();
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      mockProvider.getCode.mockResolvedValue(MOCK_BYTECODE);
      mockProvider.getStorage.mockResolvedValue(ethers.ZeroHash);
    });

    it('should cache results and return cached data on subsequent calls', async () => {
      const mockExplorerResponse = {
        data: {
          status: '1',
          result: [
            {
              SourceCode: 'contract Token {}',
              ABI: JSON.stringify(MOCK_ABI),
              ContractName: 'Token',
              CompilerVersion: 'v0.8.20',
              CompilerType: 'solc',
              OptimizationUsed: '1',
              Runs: '200',
              ConstructorArguments: '',
              EVMVersion: 'paris',
              Library: '',
              ContractFileName: 'Token.sol',
              LicenseType: 'MIT',
              Proxy: '0',
              Implementation: '',
              SwarmSource: '',
              SimilarMatch: '',
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockExplorerResponse);

      // First call
      const result1 = await fetcher.fetch(TEST_ADDRESS);

      // Second call - should use cache
      const result2 = await fetcher.fetch(TEST_ADDRESS);

      expect(result1).toEqual(result2);
      expect(mockProvider.getCode).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should use cache for different case versions of same address', async () => {
      const mockExplorerResponse = {
        data: {
          status: '1',
          result: [
            {
              SourceCode: 'contract Token {}',
              ABI: JSON.stringify(MOCK_ABI),
              ContractName: 'Token',
              CompilerVersion: 'v0.8.20',
              CompilerType: 'solc',
              OptimizationUsed: '1',
              Runs: '200',
              ConstructorArguments: '',
              EVMVersion: 'paris',
              Library: '',
              ContractFileName: 'Token.sol',
              LicenseType: 'MIT',
              Proxy: '0',
              Implementation: '',
              SwarmSource: '',
              SimilarMatch: '',
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockExplorerResponse);

      await fetcher.fetch(TEST_ADDRESS);
      await fetcher.fetch(TEST_ADDRESS.toLowerCase());
      await fetcher.fetch(TEST_ADDRESS.toUpperCase());

      expect(mockProvider.getCode).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      mockProvider.getCode.mockResolvedValue(MOCK_BYTECODE);
      mockProvider.getStorage.mockResolvedValue(ethers.ZeroHash);
    });

    it('should throttle API calls to respect rate limits', async () => {
      const address1 = '0x1111111111111111111111111111111111111111';
      const address2 = '0x2222222222222222222222222222222222222222';

      const mockExplorerResponse = {
        data: {
          status: '1',
          result: [
            {
              SourceCode: 'contract Token {}',
              ABI: JSON.stringify(MOCK_ABI),
              ContractName: 'Token',
              CompilerVersion: 'v0.8.20',
              CompilerType: 'solc',
              OptimizationUsed: '1',
              Runs: '200',
              ConstructorArguments: '',
              EVMVersion: 'paris',
              Library: '',
              ContractFileName: 'Token.sol',
              LicenseType: 'MIT',
              Proxy: '0',
              Implementation: '',
              SwarmSource: '',
              SimilarMatch: '',
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockExplorerResponse);

      const startTime = Date.now();

      await fetcher.fetch(address1);
      await fetcher.fetch(address2);

      const elapsedTime = Date.now() - startTime;

      // Should wait at least 200ms between calls (minInterval)
      expect(elapsedTime).toBeGreaterThanOrEqual(200);
    });
  });
});
