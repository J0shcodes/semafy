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

export type ContractData = {
  abi: AbiItem[];
  sourceCode?: string;
  byteCode?: string;
};

export type RiskHeuristic = {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: string[];
  explanationSeed: string;
};
