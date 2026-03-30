# Contributing to SemaFy

Thank you for your interest in contributing. SemaFy is an open-source project built at the intersection of smart contract safety and accessible tooling for everyday users. Every contribution, whether it's a new heuristic detector, a bug fix, or a documentation improvement, moves that mission forward.

This document covers everything you need to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [The Heuristics System — Contribution Guide](#the-heuristics-system--contribution-guide)
- [Making Changes](#making-changes)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Good First Issues](#good-first-issues)

---

## Code of Conduct

This project expects all contributors to be respectful, constructive, and focused on building something useful together. We do not tolerate harassment, dismissiveness, or bad-faith engagement in issues, PRs, or discussions.

---

## Ways to Contribute

**Code:**
- New heuristic detectors (the most impactful type of contribution — see the guide below)
- Bug fixes in the fetcher, API routes, or frontend
- Performance improvements to the caching or rate-limiting logic
- New chain support
- SemaFy web UI updates or optimization

**Non-code:**
- Reporting false positives or false negatives you encounter on real contracts
- Improving or translating documentation
- Writing tests for untested paths
- Opening well-scoped issues for reproducible bugs

---

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 10.13+ (`npm install -g pnpm`)
- Git

### 1. Fork and clone

```bash
git clone https://github.com/J0shcodes/semafy.git
cd semafy
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Copy the example env file for the API:

```bash
cp apps/api/.env.example apps/api/.env
```

For local development, you only need:

```env
# Minimum required to run the heuristics pipeline
ETHERSCAN_API_URL=https://api.etherscan.io/api
ETHERSCAN_API_KEY=your_etherscan_key
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_key
ALLOWED_ORIGIN=http://localhost:3000
```

Everything else (Anthropic, Storacha, Redis) is optional for local development. The server logs clearly which services are disabled at startup.

For the frontend:

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > apps/web/.env.local
```

### 4. Start the dev servers

```bash
# Starts both API (port 3001) and web (port 3000)
pnpm dev
```

### 5. Verify the setup

Open http://localhost:3000, paste a verified contract address (e.g. `0xdAC17F958D2ee523a2206206994597C13D831ec7` on Ethereum for USDT), and confirm you get analysis results.

---

## Project Structure

```
semafy/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── routes/analyze.ts        # Main analysis endpoint
│   │       ├── services/
│   │       │   ├── aiExplainer.ts       # Anthropic integration
│   │       │   ├── storacha.ts          # Filecoin/IPFS upload
│   │       │   ├── indexService.ts      # Redis CID index
│   │       │   └── logger.ts            # Fire-and-forget logging
│   │       ├── middleware/errorHandler.ts
│   │       ├── types/errors.ts
│   │       └── app.ts
│   └── web/
│       ├── app/                         # Next.js App Router pages
│       ├── components/
│       │   ├── analyze/                 # Analysis results UI
│       │   └── landing/                 # Landing page sections
│       ├── hooks/useContractAnalysis.ts # React Query hook
│       └── store/address-store.ts       # Zustand state
└── packages/
    └── core/
        └── src/
            ├── fetcher/
            │   ├── ContractFetcher.ts   # EIP-1967, LRU cache, rate limiting
            │   └── chains.ts            # Chain registry + factory
            ├── heuristics.ts            # ← Most contributions go here
            ├── types.ts
            └── index.ts
```

**The rule of thumb:** if it affects what gets detected as a risk, it lives in `packages/core`. If it affects how results are explained, stored, or served, it lives in `apps/api`. If it affects how results are displayed, it lives in `apps/web`.

---

## The Heuristics System — Contribution Guide

This is the most valuable area for contributors and deserves detailed explanation.

### Core philosophy

SemaFy uses a **Core-First** architecture: heuristics are deterministic and authoritative. The AI layer only explains findings; it never invents them. This means a new heuristic you write will have a direct, reproducible impact on every contract analysis — no prompt tuning required.

### Anatomy of a detector

Every detector in `packages/core/src/heuristics.ts` follows this pattern:

```typescript
function detectSomething(data: ContractData): RiskHeuristic | null {
  // 1. Check for the signal (source code patterns or ABI function names)
  const found = /* your detection logic */;
  
  // 2. Return null if the signal is absent — no false positives
  if (!found) return null;

  // 3. Return a RiskHeuristic describing what was found
  return {
    id: 'YOUR_DETECTOR_ID',       // Stable, uppercase snake_case
    title: 'Short user-facing title',
    severity: 'low' | 'medium' | 'high',
    description: 'One sentence describing the technical finding',
    evidence: [],                  // Which patterns were matched
    explanationSeed: 'Seed text for the AI explainer',
  };
}
```

The detector is then added to the `runHeuristics` function:

```typescript
export function runHeuristics(data: ContractData): RiskHeuristic[] {
  return [
    detectOwnerControl(data),
    detectMinting(data.explorerData.abi!),
    // ... existing detectors
    detectSomething(data),         // ← Add your detector here
  ].filter((r): r is RiskHeuristic => r !== null);
}
```

### Choosing the right data source

| You want to detect... | Use |
|---|---|
| Patterns in contract source code | `data.explorerData.sourceCode` |
| Specific function names in the ABI | `data.explorerData.abi` |
| Whether it's behind a proxy | `data.implementationAddress` |

### Severity guidelines

| Severity | When to use |
|---|---|
| `high` | The owner can move funds or create tokens without restriction |
| `medium` | The owner has significant control but it doesn't directly threaten funds |
| `low` | Standard optional patterns that are worth informing users about |

### False positive discipline — the most important rule

**Your detector must not flag the Uniswap V3 SwapRouter.** This contract (`0xE592427A0AEce92De3Edee1F18E0157C05861564` on Ethereum) is a well-known, safe contract that many users interact with. It uses `delegatecall` internally for routing but is not upgradeable. Any detector that triggers on it is producing a false positive.

Before opening a PR for a new detector, test it against these known-safe contracts:
- Uniswap V3 SwapRouter: `0xE592427A0AEce92De3Edee1F18E0157C05861564` (Ethereum)
- USDC token: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` (Ethereum)
- Aave V3 Pool: `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` (Ethereum)

And test against these known-risky contracts to verify it fires when it should (search "rug pull" or "honeypot" in blockchain explorer lists for current examples, we won't link specific addresses here as they change).

### Writing tests for your detector

Every new detector requires tests in `packages/core/src/heuristics.test.ts`. The test file uses a `makeContractData()` helper to build minimal fixture objects:

```typescript
// Test that your detector fires
it('detects <your pattern>', () => {
  const data = makeContractData({
    sourceCode: 'contract T { /* code containing your pattern */ }',
    abi: [makeAbiFunction('yourFunctionName')],
  });

  const risks = runHeuristics(data);
  const yourRisk = risks.find((r) => r.id === 'YOUR_DETECTOR_ID');

  expect(yourRisk).toBeDefined();
  expect(yourRisk?.severity).toBe('high'); // or 'medium', 'low'
});

// Test that it does NOT fire on clean contracts
it('does NOT flag a contract without the pattern', () => {
  const data = makeContractData({
    sourceCode: 'contract T { function normalThing() external {} }',
    abi: [makeAbiFunction('normalThing')],
  });

  const risks = runHeuristics(data);
  expect(risks.find((r) => r.id === 'YOUR_DETECTOR_ID')).toBeUndefined();
});

// Regression test for false positives
it('does NOT flag Uniswap-like contracts that use delegatecall', () => {
  const data = makeContractData({
    sourceCode: 'contract Router { function route() internal { assembly { delegatecall(...) } } }',
    abi: [makeAbiFunction('exactInputSingle')],
    implementationAddress: null,
  });

  const risks = runHeuristics(data);
  expect(risks.find((r) => r.id === 'YOUR_DETECTOR_ID')).toBeUndefined();
});
```

### Proposing a new heuristic before writing code

For new detectors, open an issue first using the **Heuristic Proposal** template. Include:
1. The pattern you want to detect and why it's a risk
2. Real contract examples where it fires (verified on-chain)
3. Real contract examples where it should NOT fire
4. Proposed severity and rationale

This prevents duplicate work and gets early feedback on whether the signal is reliable enough.

---

## Making Changes

### Branching

Work on a feature branch:

```bash
git checkout -b feat/detect-fee-on-transfer
# or
git checkout -b fix/owner-control-false-positive
# or
git checkout -b docs/update-contributing-guide
```

Branch naming: `feat/`, `fix/`, `docs/`, `test/`, `chore/`

### Commit messages

Follow conventional commits:

```
feat(core): add detectFeeOnTransfer heuristic
fix(core): remove delegatecall from upgrade patterns
test(api): add timeout coverage for aiExplainer
docs: expand heuristic contribution guide
```

### Code style

The project uses Prettier with these settings (`.prettierrc`):
- `semi: true`
- `singleQuote: true`
- `printWidth: 80`
- `tabWidth: 2`

Run `pnpm format` before committing. TypeScript strict mode is enforced; `pnpm type-check` must pass.

---

## Testing Requirements

All PRs must include tests. Here's what's required by contribution type:

**New heuristic detector:**
- At least 3 tests: fires correctly, does not fire on clean contracts, does not fire on known safe contracts (false positive regression)
- Add to the existing `heuristics.test.ts`: do not create a new test file

**Bug fix:**
- A test that fails before your fix and passes after

**New API endpoint or route change:**
- Tests in the relevant `*.test.ts` file using the existing mock patterns

**Frontend component:**
- At minimum, a smoke test that the component renders without throwing

### Running tests

```bash
# Full test suite
pnpm test

# Core package only (fastest feedback loop for heuristic work)
cd packages/core && pnpm test

# Watch mode during development
cd packages/core && pnpm test:watch

# API unit tests
cd apps/api && pnpm test

# API route tests (needs supertest)
cd apps/api && pnpm test:integration
```

---

## Pull Request Process

1. **Keep PRs focused.** One logical change per PR. A new heuristic + its tests is fine. A new heuristic + a frontend component refactor is two PRs.

2. **Fill out the PR template.** Describe what changed, why, and how you tested it. For heuristics, include at least one real contract address where the detector fires.

3. **Self-review first.** Read your own diff before requesting review. Check that `pnpm type-check`, `pnpm lint`, and `pnpm test` all pass.

4. **PRs require one approval** from a maintainer before merging.

5. **Maintainer merge policy.** Maintainers may squash commits on merge. Rebase onto `main` if your branch has conflicts; do not merge `main` into your branch.

### PR checklist

```
- [ ] pnpm type-check passes
- [ ] pnpm lint passes  
- [ ] pnpm test passes
- [ ] New functionality has tests
- [ ] Heuristic PRs include false-positive regression tests
- [ ] No .env files or secrets committed
- [ ] CHANGELOG entry added (for user-facing changes)
```

---

## Reporting Bugs

Open a GitHub issue with:

1. **What you were doing**: contract address, chain, steps to reproduce
2. **What you expected**: e.g. "USDC should not flag UPGRADEABLE_CONTRACT"
3. **What happened**: the actual response or error
4. **Environment**: Node version, whether you're running locally or against the hosted API

For false positives/negatives: include the contract address and chain so we can reproduce. Verified source code on Etherscan is a requirement for a reproducible bug report.

Security issues should be emailed privately rather than filed as public issues.

---

## Good First Issues

The following are well-scoped, self-contained issues suitable for first-time contributors:

- **Language toggle wiring**: The `LanguageToggle` component in `apps/web` shows a "Pidgin" option but it isn't connected to the AI prompt language. Wire the selected language from the toggle state through to the `generateExplanation` call in the API.

- **detectMinting false positive**: The current detector flags any function whose name contains "mint" including public user-facing NFT minting functions that don't represent admin risk. Improve the heuristic to distinguish admin mint functions (typically access-controlled) from public mint functions. This requires ABI analysis of function modifiers or inputs.

- **Footer copyright text**: `apps/web/components/ui/footer.tsx` currently says "HumanLayer" in the copyright line. Update it to "SemaFy".

- **useContractAnalysis hardcoded URL**: `apps/web/hooks/useContractAnalysis.ts` has `http://localhost:3001` hardcoded. Replace it with `process.env.NEXT_PUBLIC_API_URL` with a fallback.

- **`ExternalLink` button in ContractInfo**: The external link button in `apps/web/components/analyze/contract-info.tsx` doesn't link anywhere. Wire it to the appropriate block explorer URL based on the current chain.

Look for issues labelled [`good first issue`](https://github.com/J0shcodes/semafy/labels/good%20first%20issue) on GitHub for the current list.

---

## Questions?

If you're unsure about scope, approach, or whether something is worth a PR, open a discussion or a draft issue first. It's much better to align early than to spend time on something that won't merge.

---

**Thank you for helping make smart contracts more understandable.**