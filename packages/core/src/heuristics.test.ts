import { describe, it, expect } from 'vitest';
import { runHeuristics } from './heuristics';
import { ContractData, AbiItem } from './types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function makeContractData(overrides: {
  sourceCode?: string;
  abi?: AbiItem[];
  implementationAddress?: string | null;
}): ContractData {
  return {
    address: '0x1234567890123456789012345678901234567890',
    chainId: 1,
    implementationAddress: overrides.implementationAddress ?? null,
    bytecode: '0x608060405234801561001057600080fd5b50',
    explorerData: {
      abi: overrides.abi ?? [],
      sourceCode: overrides.sourceCode ?? '',
      contractName: 'TestContract',
    },
  };
}

function makeAbiFunction(name: string): AbiItem {
  return {
    type: 'function',
    name,
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  };
}

// ─────────────────────────────────────────────
// runHeuristics — general
// ─────────────────────────────────────────────

describe('runHeuristics', () => {
  it('returns an empty array when source code and ABI have no risk patterns', () => {
    const data = makeContractData({
      sourceCode: 'contract SimpleStorage { uint256 value; }',
      abi: [makeAbiFunction('getValue'), makeAbiFunction('setValue')],
    });

    const risks = runHeuristics(data);

    expect(risks).toEqual([]);
  });

  it('returns only non-null results — no null entries leak through', () => {
    const data = makeContractData({
      sourceCode: 'contract SimpleStorage { uint256 value; }',
      abi: [],
    });

    const risks = runHeuristics(data);

    risks.forEach((r) => expect(r).not.toBeNull());
  });

  it('each result has the required RiskHeuristic shape', () => {
    const data = makeContractData({
      sourceCode: 'contract Owned { modifier onlyOwner() {} }',
      abi: [],
    });

    const risks = runHeuristics(data);

    risks.forEach((r) => {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('title');
      expect(r).toHaveProperty('severity');
      expect(r).toHaveProperty('description');
      expect(r).toHaveProperty('evidence');
      expect(r).toHaveProperty('explanationSeed');
      expect(['low', 'medium', 'high']).toContain(r.severity);
      expect(Array.isArray(r.evidence)).toBe(true);
    });
  });

  it('does not produce duplicate IDs in the same run', () => {
    const data = makeContractData({
      sourceCode: 'contract T { modifier onlyOwner() {} function pause() public {} }',
      abi: [makeAbiFunction('mint'), makeAbiFunction('withdraw')],
    });

    const risks = runHeuristics(data);
    const ids = risks.map((r) => r.id);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
  });
});

// ─────────────────────────────────────────────
// OWNER_CONTROL
// ─────────────────────────────────────────────

describe('detectOwnerControl', () => {
  it('detects onlyOwner modifier', () => {
    const data = makeContractData({
      sourceCode: 'contract T { modifier onlyOwner() { _; } }',
    });

    const risks = runHeuristics(data);
    const ownerRisk = risks.find((r) => r.id === 'OWNER_CONTROL');

    expect(ownerRisk).toBeDefined();
    expect(ownerRisk?.severity).toBe('medium');
  });

  it('detects Ownable inheritance pattern', () => {
    const data = makeContractData({
      sourceCode: 'import "@openzeppelin/Ownable.sol"; contract T is Ownable {}',
    });

    const risks = runHeuristics(data);
    const ownerRisk = risks.find((r) => r.id === 'OWNER_CONTROL');

    expect(ownerRisk).toBeDefined();
    expect(ownerRisk?.evidence).toContain('Ownable');
  });

  it('detects transferOwnership function', () => {
    const data = makeContractData({
      sourceCode:
        'contract T { function transferOwnership(address newOwner) external {} }',
    });

    const risks = runHeuristics(data);
    const ownerRisk = risks.find((r) => r.id === 'OWNER_CONTROL');

    expect(ownerRisk).toBeDefined();
    expect(ownerRisk?.evidence).toContain('transferOwnership');
  });

  it('detects owner() function signature', () => {
    const data = makeContractData({
      sourceCode: 'contract T { function owner() public view returns (address) {} }',
    });

    const risks = runHeuristics(data);
    const ownerRisk = risks.find((r) => r.id === 'OWNER_CONTROL');

    expect(ownerRisk).toBeDefined();
  });

  it('evidence array only contains patterns that were actually found', () => {
    const data = makeContractData({
      sourceCode: 'contract T { modifier onlyOwner() {} }',
    });

    const risks = runHeuristics(data);
    const ownerRisk = risks.find((r) => r.id === 'OWNER_CONTROL');

    // Only 'onlyOwner' is in the source — others should not appear
    expect(ownerRisk?.evidence).toContain('onlyOwner');
    expect(ownerRisk?.evidence).not.toContain('transferOwnership');
    expect(ownerRisk?.evidence).not.toContain('Ownable');
  });

  it('does NOT flag a contract with no owner patterns', () => {
    const data = makeContractData({
      sourceCode: 'contract T { function add(uint a, uint b) public pure returns (uint) { return a + b; } }',
    });

    const risks = runHeuristics(data);
    const ownerRisk = risks.find((r) => r.id === 'OWNER_CONTROL');

    expect(ownerRisk).toBeUndefined();
  });

  it('does NOT flag when sourceCode is null', () => {
    const data = makeContractData({ sourceCode: undefined });
    // explorerData.sourceCode will be empty string from helper
    data.explorerData.sourceCode = null;

    const risks = runHeuristics(data);
    const ownerRisk = risks.find((r) => r.id === 'OWNER_CONTROL');

    expect(ownerRisk).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// OWNER_CAN_MINT
// ─────────────────────────────────────────────

describe('detectMinting', () => {
  it('detects a mint function in the ABI', () => {
    const data = makeContractData({
      abi: [makeAbiFunction('mint')],
    });

    const risks = runHeuristics(data);
    const mintRisk = risks.find((r) => r.id === 'OWNER_CAN_MINT');

    expect(mintRisk).toBeDefined();
    expect(mintRisk?.severity).toBe('high');
  });

  it('detects mintTo function (partial match)', () => {
    const data = makeContractData({
      abi: [makeAbiFunction('mintTo')],
    });

    const risks = runHeuristics(data);
    const mintRisk = risks.find((r) => r.id === 'OWNER_CAN_MINT');

    expect(mintRisk).toBeDefined();
    expect(mintRisk?.evidence).toContain('mintTo');
  });

  it('detects batchMint function', () => {
    const data = makeContractData({
      abi: [makeAbiFunction('batchMint')],
    });

    const risks = runHeuristics(data);
    const mintRisk = risks.find((r) => r.id === 'OWNER_CAN_MINT');

    expect(mintRisk).toBeDefined();
  });

  it('is case-insensitive for mint detection', () => {
    const data = makeContractData({
      abi: [makeAbiFunction('MINT')],
    });

    const risks = runHeuristics(data);
    const mintRisk = risks.find((r) => r.id === 'OWNER_CAN_MINT');

    expect(mintRisk).toBeDefined();
  });

  it('evidence contains the function name that triggered detection', () => {
    const data = makeContractData({
      abi: [makeAbiFunction('mintTokens'), makeAbiFunction('transfer')],
    });

    const risks = runHeuristics(data);
    const mintRisk = risks.find((r) => r.id === 'OWNER_CAN_MINT');

    expect(mintRisk?.evidence).toContain('mintTokens');
    expect(mintRisk?.evidence).not.toContain('transfer');
  });

  it('does NOT flag a contract with no mint functions', () => {
    const data = makeContractData({
      abi: [makeAbiFunction('transfer'), makeAbiFunction('approve')],
    });

    const risks = runHeuristics(data);
    const mintRisk = risks.find((r) => r.id === 'OWNER_CAN_MINT');

    expect(mintRisk).toBeUndefined();
  });

  it('does NOT flag a contract with an empty ABI', () => {
    const data = makeContractData({ abi: [] });

    const risks = runHeuristics(data);
    const mintRisk = risks.find((r) => r.id === 'OWNER_CAN_MINT');

    expect(mintRisk).toBeUndefined();
  });

  it('does NOT flag ABI items that are not functions (e.g. events)', () => {
    const data = makeContractData({
      abi: [{ type: 'event', name: 'Mint' }],
    });

    const risks = runHeuristics(data);
    const mintRisk = risks.find((r) => r.id === 'OWNER_CAN_MINT');

    expect(mintRisk).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// PRIVILEGED_WITHDRAWAL
// ─────────────────────────────────────────────

describe('detectPrivilegedWithdrawal', () => {
  const withdrawalFunctions = [
    'withdraw',
    'emergencyWithdraw',
    'rescueTokens',
    'recoverERC20',
    'drainTo',
  ];

  withdrawalFunctions.forEach((fnName) => {
    it(`detects ${fnName} as a privileged withdrawal function`, () => {
      const data = makeContractData({
        abi: [makeAbiFunction(fnName)],
      });

      const risks = runHeuristics(data);
      const withdrawRisk = risks.find((r) => r.id === 'PRIVILEGED_WITHDRAWAL');

      expect(withdrawRisk).toBeDefined();
      expect(withdrawRisk?.severity).toBe('high');
      expect(withdrawRisk?.evidence).toContain(fnName);
    });
  });

  it('detects multiple withdrawal functions in the same ABI', () => {
    const data = makeContractData({
      abi: [makeAbiFunction('withdraw'), makeAbiFunction('emergencyWithdraw')],
    });

    const risks = runHeuristics(data);
    const withdrawRisk = risks.find((r) => r.id === 'PRIVILEGED_WITHDRAWAL');

    expect(withdrawRisk).toBeDefined();
    expect(withdrawRisk?.evidence).toContain('withdraw');
    expect(withdrawRisk?.evidence).toContain('emergencyWithdraw');
  });

  it('does NOT flag non-privileged functions like transfer', () => {
    const data = makeContractData({
      abi: [
        makeAbiFunction('transfer'),
        makeAbiFunction('approve'),
        makeAbiFunction('balanceOf'),
      ],
    });

    const risks = runHeuristics(data);
    const withdrawRisk = risks.find((r) => r.id === 'PRIVILEGED_WITHDRAWAL');

    expect(withdrawRisk).toBeUndefined();
  });

  it('does NOT do a partial match — withdrawFunds should NOT trigger', () => {
    const data = makeContractData({
      abi: [makeAbiFunction('withdrawFunds')],
    });

    const risks = runHeuristics(data);
    const withdrawRisk = risks.find((r) => r.id === 'PRIVILEGED_WITHDRAWAL');

    // 'withdrawFunds' is not in the exact match list
    expect(withdrawRisk).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// UPGRADEABLE_CONTRACT
// ─────────────────────────────────────────────

describe('detectUpgradeableContract', () => {
  it('detects upgradeability via EIP-1967 proxy slot (implementationAddress present)', () => {
    const data = makeContractData({
      implementationAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      sourceCode: 'contract Proxy {}',
    });

    const risks = runHeuristics(data);
    const upgradeRisk = risks.find((r) => r.id === 'UPGRADEABLE_CONTRACT');

    expect(upgradeRisk).toBeDefined();
    expect(upgradeRisk?.evidence).toContain(
      'EIP-1967 proxy implementation slot detected',
    );
  });

  it('EIP-1967 detection takes priority — no source code patterns needed', () => {
    const data = makeContractData({
      implementationAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      sourceCode: 'contract CleanProxy {}', // no upgrade patterns
    });

    const risks = runHeuristics(data);
    const upgradeRisk = risks.find((r) => r.id === 'UPGRADEABLE_CONTRACT');

    expect(upgradeRisk).toBeDefined();
  });

  it('detects UUPSUpgradeable pattern in source code', () => {
    const data = makeContractData({
      sourceCode:
        'import "@openzeppelin/UUPSUpgradeable.sol"; contract T is UUPSUpgradeable {}',
    });

    const risks = runHeuristics(data);
    const upgradeRisk = risks.find((r) => r.id === 'UPGRADEABLE_CONTRACT');

    expect(upgradeRisk).toBeDefined();
    expect(upgradeRisk?.evidence).toContain('UUPSUpgradeable');
  });

  it('detects TransparentUpgradeableProxy pattern', () => {
    const data = makeContractData({
      sourceCode:
        'contract T is TransparentUpgradeableProxy { constructor() {} }',
    });

    const risks = runHeuristics(data);
    const upgradeRisk = risks.find((r) => r.id === 'UPGRADEABLE_CONTRACT');

    expect(upgradeRisk).toBeDefined();
    expect(upgradeRisk?.evidence).toContain('TransparentUpgradeableProxy');
  });

  it('detects ProxyAdmin pattern', () => {
    const data = makeContractData({
      sourceCode: 'contract T { ProxyAdmin admin; }',
    });

    const risks = runHeuristics(data);
    const upgradeRisk = risks.find((r) => r.id === 'UPGRADEABLE_CONTRACT');

    expect(upgradeRisk).toBeDefined();
  });

  it('does NOT flag raw delegatecall usage as upgradeability', () => {
    // Uniswap V3 SwapRouter uses delegatecall for routing, not upgradeability
    const data = makeContractData({
      sourceCode:
        'contract SwapRouter { function execute() internal { assembly { delegatecall(gas(), target, 0, 0, 0, 0) } } }',
    });

    const risks = runHeuristics(data);
    const upgradeRisk = risks.find((r) => r.id === 'UPGRADEABLE_CONTRACT');

    // delegatecall alone should NOT trigger — this was the false positive we fixed
    expect(upgradeRisk).toBeUndefined();
  });

  it('does NOT flag a non-upgradeable contract with no proxy patterns', () => {
    const data = makeContractData({
      sourceCode: 'contract SimpleToken { mapping(address => uint) balances; }',
    });

    const risks = runHeuristics(data);
    const upgradeRisk = risks.find((r) => r.id === 'UPGRADEABLE_CONTRACT');

    expect(upgradeRisk).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// TRANSFER_RESTRICTIONS
// ─────────────────────────────────────────────

describe('detectTransferRestrictions', () => {
  it('detects pause function', () => {
    const data = makeContractData({
      sourceCode: 'contract T { function pause() external onlyOwner {} }',
    });

    const risks = runHeuristics(data);
    const restrictionRisk = risks.find((r) => r.id === 'TRANSFER_RESTRICTIONS');

    expect(restrictionRisk).toBeDefined();
    expect(restrictionRisk?.severity).toBe('medium');
  });

  it('detects unpause function', () => {
    const data = makeContractData({
      sourceCode: 'contract T { function unpause() external onlyOwner {} }',
    });

    const risks = runHeuristics(data);
    const restrictionRisk = risks.find((r) => r.id === 'TRANSFER_RESTRICTIONS');

    expect(restrictionRisk).toBeDefined();
  });

  it('detects blacklist pattern', () => {
    const data = makeContractData({
      sourceCode:
        'contract T { mapping(address => bool) public blacklist; }',
    });

    const risks = runHeuristics(data);
    const restrictionRisk = risks.find((r) => r.id === 'TRANSFER_RESTRICTIONS');

    expect(restrictionRisk).toBeDefined();
    expect(restrictionRisk?.evidence).toContain('blacklist');
  });

  it('detects whitelist pattern', () => {
    const data = makeContractData({
      sourceCode:
        'contract T { mapping(address => bool) public whitelist; }',
    });

    const risks = runHeuristics(data);
    const restrictionRisk = risks.find((r) => r.id === 'TRANSFER_RESTRICTIONS');

    expect(restrictionRisk).toBeDefined();
    expect(restrictionRisk?.evidence).toContain('whitelist');
  });

  it('detects whenNotPaused modifier', () => {
    const data = makeContractData({
      sourceCode:
        'contract T { function transfer(address to, uint256 amount) public whenNotPaused {} }',
    });

    const risks = runHeuristics(data);
    const restrictionRisk = risks.find((r) => r.id === 'TRANSFER_RESTRICTIONS');

    expect(restrictionRisk).toBeDefined();
    expect(restrictionRisk?.evidence).toContain('whenNotPaused');
  });

  it('is case-insensitive for pattern matching', () => {
    const data = makeContractData({
      sourceCode: 'contract T { function PAUSE() external {} }',
    });

    const risks = runHeuristics(data);
    const restrictionRisk = risks.find((r) => r.id === 'TRANSFER_RESTRICTIONS');

    expect(restrictionRisk).toBeDefined();
  });

  it('does NOT flag contracts without restriction patterns', () => {
    const data = makeContractData({
      sourceCode:
        'contract T { function transfer(address to, uint256 amount) public returns (bool) {} }',
    });

    const risks = runHeuristics(data);
    const restrictionRisk = risks.find((r) => r.id === 'TRANSFER_RESTRICTIONS');

    expect(restrictionRisk).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// Real-world contract scenarios
// ─────────────────────────────────────────────

describe('Real-world contract scenarios', () => {
  it('Uniswap V3 SwapRouter — should return no risks', () => {
    // SwapRouter has no owner, no mint, no withdrawal, no restrictions
    // and is NOT upgradeable despite using delegatecall
    const data = makeContractData({
      sourceCode: `
        contract SwapRouter is ISwapRouter, PeripheryImmutableState {
          function exactInputSingle(ExactInputSingleParams calldata params)
            external payable override checkDeadline(params.deadline)
            returns (uint256 amountOut) {
            assembly { delegatecall(gas(), target, 0, 0, 0, 0) }
          }
        }
      `,
      abi: [
        makeAbiFunction('exactInputSingle'),
        makeAbiFunction('exactInput'),
        makeAbiFunction('exactOutputSingle'),
      ],
      implementationAddress: null,
    });

    const risks = runHeuristics(data);

    expect(risks.find((r) => r.id === 'UPGRADEABLE_CONTRACT')).toBeUndefined();
    expect(risks.find((r) => r.id === 'OWNER_CONTROL')).toBeUndefined();
    expect(risks.find((r) => r.id === 'OWNER_CAN_MINT')).toBeUndefined();
  });

  it('High-risk ERC-20 token — detects all relevant risks', () => {
    const data = makeContractData({
      sourceCode: `
        import "@openzeppelin/Ownable.sol";
        contract HighRiskToken is Ownable {
          modifier onlyOwner() { _; }
          function pause() external onlyOwner {}
          function unpause() external onlyOwner {}
          mapping(address => bool) public blacklist;
        }
      `,
      abi: [
        makeAbiFunction('mint'),
        makeAbiFunction('withdraw'),
        makeAbiFunction('transfer'),
        makeAbiFunction('pause'),
      ],
    });

    const risks = runHeuristics(data);
    const riskIds = risks.map((r) => r.id);

    expect(riskIds).toContain('OWNER_CONTROL');
    expect(riskIds).toContain('OWNER_CAN_MINT');
    expect(riskIds).toContain('PRIVILEGED_WITHDRAWAL');
    expect(riskIds).toContain('TRANSFER_RESTRICTIONS');
  });

  it('UUPS Upgradeable proxy — detects upgradeability', () => {
    const data = makeContractData({
      sourceCode: `
        import "@openzeppelin/UUPSUpgradeable.sol";
        contract MyToken is UUPSUpgradeable {
          function _authorizeUpgrade(address) internal override onlyOwner {}
        }
      `,
      abi: [],
      implementationAddress: null,
    });

    const risks = runHeuristics(data);
    const upgradeRisk = risks.find((r) => r.id === 'UPGRADEABLE_CONTRACT');

    expect(upgradeRisk).toBeDefined();
  });
});