export type AbiItem = {
  type: 'function' | 'constructor' | 'event' | 'fallback' | 'receive';

  name?: string;

  inputs?: {
    name: string;
    type: string;
    indexed?: boolean;
  }[];

  outputs?: {
    name: string;
    type: string;
  }[];

  stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable';

  anonymous?: boolean;
};

export type ExplorerData = {
  abi: AbiItem[] | null;
  sourceCode: string | null;
  contractName?: string | null;
};

export type ContractData = {
  address: string;
  implementationAddress: string | null;
  abi: AbiItem[] | null;
  sourceCode?: string | null;
  bytecode?: string;
  explorerData: ExplorerData;
};

export type RiskHeuristic = {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: string[];
  explanationSeed: string;
};

export interface ExplorerConfig {
  apiUrl: string;
  apiKey: string;
}

export interface ContractResult {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  CompilerType: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  ContractFileName: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
  SimilarMatch: string;
}
