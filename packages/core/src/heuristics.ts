import { boolean } from 'zod';
import { AbiItem, ContractData, RiskHeuristic } from './types';

function detectOwnerControl(data: ContractData): RiskHeuristic | null {
  const ownerPatterns = [
    'onlyOwner',
    'owner()',
    'transferOwnership',
    'Ownable',
  ];

  const found = ownerPatterns.some((pattern) =>
    data.sourceCode?.includes(pattern),
  );

  if (!found) return null;

  return {
    id: 'OWNER_CONTROL',
    title: 'Owner Has Special Control',
    severity: 'medium',
    description:
      'The contract includes functions restricted to a privileged owner or admin',
    evidence: ownerPatterns.filter((p) => data.sourceCode?.includes(p)),
    explanationSeed:
      'The contract owner has special permissions that regular users do not.',
  };
}

function detectMiniting(abi: AbiItem[]): RiskHeuristic | null {
  const mintFunctions = abi.filter(
    (fn) =>
      fn.type === 'function' && fn.name?.toLocaleLowerCase().includes('mint'),
  );

  if (mintFunctions.length === 0) return null;

  return {
    id: 'OWNER_CAN_MINT',
    title: 'Owner Can Create New Tokens',
    severity: 'high',
    description: 'A privileged role can create new tokens.',
    evidence: mintFunctions.map((fn) => fn.name),
    explanationSeed:
      'The owner can create new tokens at any time, which may reduce the value of existing tokens.',
  };
}

function detectPrivilegedWithdrawal(abi: AbiItem[]): RiskHeuristic | null {
  const withdrawFns = abi.filter((fn) =>
    ['withdraw', 'emergencyWithdraw'].includes(fn.name ?? ''),
  );

  if (withdrawFns.length === 0) return null;

  return {
    id: 'PRIVILEGED_WITHDRAWAL',
    title: 'Privileged Fund Withdrawal',
    severity: 'high',
    description: 'Funds can be withdrawn by a privileged address.',
    evidence: withdrawFns.map((fn) => fn.name),
    explanationSeed:
      'Funds held by this contract are not fully locked and can be withdrawn by a specific address.',
  };
}

function detectUpgradeableContract(data: ContractData): RiskHeuristic | null {
  const upgradePatterns = [
    'delegatecall',
    'Upgradeable',
    'UUPSUpgradeable',
    'TransparentUpgradeableProxy',
  ];

  const found = upgradePatterns.some((pattern) =>
    data.sourceCode?.includes(pattern),
  );

  if (!found) return null;

  return {
    id: 'UPGRADEABLE_CONTRACT',
    title: 'Contract Can Be Upgraded',
    severity: 'medium',
    description: 'The contract logic can be changed after deployment.',
    evidence: upgradePatterns.filter((p) => data.sourceCode?.includes(p)),
    explanationSeed:
      'This contract can be upgraded, meaning its behavior may change in the future.',
  };
}

function detectTransferRestrictions(data: ContractData): RiskHeuristic | null {
  const restrictionPatterns = [
    'pause',
    'unpause',
    'blacklist',
    'whitelist',
    'whenNotPaused',
  ];

  const found = restrictionPatterns.some((pattern) =>
    data.sourceCode?.toLowerCase().includes(pattern),
  );

  if (!found) return null;

  return {
    id: 'TRANSFER_RESTRICTIONS',
    title: 'Transfers Can Be Restricted',
    severity: 'medium',
    description: 'Transfers can be paused or restricted by a privileged role.',
    evidence: restrictionPatterns.filter((p) =>
      data.sourceCode?.toLowerCase().includes(p),
    ),
    explanationSeed:
      'The contract owner can pause or restrict transfers, which may affect asset usability.',
  };
}

export function runHeuristics(data: ContractData): RiskHeuristic[] {
  return [
    detectOwnerControl(data),
    detectMiniting(data.abi),
    detectPrivilegedWithdrawal(data.abi),
    detectTransferRestrictions(data),
    detectUpgradeableContract(data),
  ].filter(boolean) as RiskHeuristic[];
}
