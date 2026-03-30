# SemaFy — Understand Smart Contracts Before You Sign

> A human-readable trust layer for smart contracts. Deterministic heuristics detect risk. AI explains it in plain English.

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.13-orange.svg)](https://pnpm.io/)

---

## What is SemaFy?

Most users sign smart contract transactions without understanding what they're agreeing to. Professional audits are expensive, slow, and rare. Pure AI tools hallucinate risks that don't exist or miss ones that do.

SemaFy takes a different approach: **deterministic heuristics decide what the risks are, AI only explains them in plain English.** The analysis is transparent, reproducible, and honest about what it can and cannot tell you.

**What SemaFy is:**
- A static analysis tool for EVM smart contracts
- A plain-English explanation layer for non-technical users
- An open-source project you can self-host, audit, and contribute to

**What SemaFy is not:**
- A smart contract security audit
- A guarantee of safety
- Financial advice

---

## Features

- **Multi-chain support**: Ethereum, Base, Polygon, Arbitrum One, Optimism, BNB Smart Chain
- **5 heuristic detectors**: Owner control, minting capability, privileged withdrawal, upgradeability, transfer restrictions
- **EIP-1967 proxy resolution**: Detects upgradeable proxies at the storage slot level
- **AI explanation layer**: Anthropic Claude explains findings in plain English (graceful fallback if unavailable)
- **Decentralized logging**: Analysis results logged to Filecoin/IPFS via Storacha (w3up)
- **Indexed retrieval**: Upstash Redis indexes CIDs for fast lookup by contract address

---

## Architecture

SemaFy uses a **Core-First architecture**: the heuristics engine is authoritative, the AI layer is optional.

```
                    User (browser)
                         │
                    Next.js (web)
                         │  POST /api/analyze
                    Express (api)
                    ┌────┴────┐
             heuristics    AI explainer
            (core pkg)    (Anthropic API)
                    └────┬────┘
                         │
                    Storacha + Redis
                   (decentralized log)
```

**Monorepo structure:**

```
semafy/
├── apps/
│   ├── api/          # Express REST API (Node.js + TypeScript)
│   └── web/          # Next.js 16 frontend
├── packages/
│   └── core/         # Shared heuristics engine + types
├── docs/             # Extended documentation
├── turbo.json
└── pnpm-workspace.yaml
```

**Key packages:**
- `packages/core`: `ContractFetcher`, `ContractFetcherFactory`, `runHeuristics`, all shared types
- `apps/api`: `/api/analyze` endpoint, `aiExplainer`, `storacha`, `indexService`, `logger`
- `apps/web`: Landing page, address input, analysis results UI, Zustand store, React Query

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+
- An [Etherscan](https://etherscan.io/apis) API key (used for all EVM chains via their unified API)
- At least one EVM RPC URL (e.g. [Alchemy](https://alchemy.com), [Infura](https://infura.io))

### 1. Clone and install

```bash
git clone https://github.com/J0shcodes/semafy.git
cd semafy
pnpm install
```

### 2. Configure the API

Create `apps/api/.env`:

```env
# ── Required ──────────────────────────────────────────────
# Etherscan-compatible API (used for all chains)
ETHERSCAN_API_URL=https://api.etherscan.io/api
ETHERSCAN_API_KEY=your_etherscan_key_here

# RPC endpoints (add only the chains you want to support)
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_key
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/your_key
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your_key
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/your_key
OPTIMISM_RPC_URL=https://opt-mainnet.g.alchemy.com/v2/your_key
BSC_RPC_URL=https://bnb-mainnet.g.alchemy.com/v2/your_key

# ── Optional — AI explanations ────────────────────────────
# Without this, heuristic results still return; plainEnglish fields are null
ANTHROPIC_API_KEY=sk-ant-...

# ── Optional — Decentralized logging (Storacha/Filecoin) ──
# Without these, analysis logging is silently disabled
STORACHA_SPACE_DID=did:key:...
STORACHA_AGENT_KEY=AGE-SECRET-KEY-1...
STORACHA_PROOF=<base64-encoded UCAN delegation>

# ── Optional — Index service (Upstash Redis) ──────────────
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# ── Server ────────────────────────────────────────────────
PORT=3001
ALLOWED_ORIGIN=http://localhost:3000
```

### 3. Configure the web app

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Run the development servers

```bash
# From the monorepo root — starts both api and web concurrently
pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001

---

## Environment Variables Reference

### Required

| Variable | Description |
|---|---|
| `ETHERSCAN_API_URL` | Etherscan-compatible API base URL |
| `ETHERSCAN_API_KEY` | Your Etherscan API key |
| `ETHEREUM_RPC_URL` | Ethereum Mainnet RPC endpoint |

### Chain RPC URLs (add whichever chains you support)

| Variable | Chain |
|---|---|
| `BASE_RPC_URL` | Base (chainId: 8453) |
| `POLYGON_RPC_URL` | Polygon (chainId: 137) |
| `ARBITRUM_RPC_URL` | Arbitrum One (chainId: 42161) |
| `OPTIMISM_RPC_URL` | Optimism (chainId: 10) |
| `BSC_RPC_URL` | BNB Smart Chain (chainId: 56) |

### Optional

| Variable | Description | Effect if missing |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key | AI explanations disabled; heuristics still run |
| `STORACHA_SPACE_DID` | Your Storacha space DID | Logging disabled |
| `STORACHA_AGENT_KEY` | Agent private key (AGE-SECRET-KEY-1...) | Logging disabled |
| `STORACHA_PROOF` | Base64 UCAN delegation with space/blob/add, upload/add caps | Logging disabled |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | Logging disabled |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | Logging disabled |
| `ALLOWED_ORIGIN` | CORS origin for the web app | Defaults to http://localhost:3000 |

### Setting up Storacha credentials

```bash
# Install the w3 CLI
npm install -g @web3-storage/w3cli

# Create a space and get your DID
w3 space create semafy-logs
# → STORACHA_SPACE_DID=did:key:...

# Create an agent key
w3 key create
# → STORACHA_AGENT_KEY=AGE-SECRET-KEY-1... (use this line)
# → Agent DID: did:key:... (note this for the next step)

# Create a delegation proof (Git Bash / Linux / macOS)
w3 delegation create <agent-did> \
  --can 'space/blob/add' \
  --can 'space/index/add' \
  --can 'upload/add' | base64
# → STORACHA_PROOF=<base64 string>
```

---

## API Reference

### `POST /api/analyze`

Analyzes a smart contract and returns risk findings with optional AI explanations.

**Request body:**
```json
{
  "address": "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
  "chain": "ethereum"
}
```

**Supported chain values:** `ethereum`, `base`, `polygon`, `arbitrum`, `optimism`, `bsc`

**Success response (200):**
```json
{
  "contractAddress": "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
  "chainId": 1,
  "contractName": "MyToken",
  "implementationAddress": null,
  "risks": [
    {
      "id": "OWNER_CONTROL",
      "title": "Owner Has Special Control",
      "severity": "medium",
      "description": "The contract includes functions restricted to a privileged owner or admin",
      "evidence": ["onlyOwner", "transferOwnership"],
      "explanationSeed": "...",
      "plainEnglish": "One person has special access to important contract functions that regular users don't."
    }
  ],
  "isOwnerControlled": true,
  "isUpgradeable": false,
  "explanation": "This token contract gives its owner the ability to...",
  "explanationSource": "anthropic"
}
```

**Error responses:**

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `INVALID_ADDRESS` | Address is not a valid EVM address |
| 400 | `UNSUPPORTED_CHAIN` | Chain slug not in the supported list |
| 400 | `EOA_ADDRESS` | Address is a wallet, not a contract |
| 422 | `CONTRACT_NOT_VERIFIED` | Source code not verified on explorer |
| 503 | `UPSTREAM_FAILURE` | RPC or explorer API unavailable |

---

## Heuristics

All detectors live in `packages/core/src/heuristics.ts`. Each returns a `RiskHeuristic | null`.

| ID | Severity | Signal |
|---|---|---|
| `OWNER_CONTROL` | Medium | Source code contains `onlyOwner`, `Ownable`, `transferOwnership`, `owner()` |
| `OWNER_CAN_MINT` | High | ABI contains a function whose name includes "mint" (case-insensitive, type=function only) |
| `PRIVILEGED_WITHDRAWAL` | High | ABI contains exact match: `withdraw`, `emergencyWithdraw`, `rescueTokens`, `recoverERC20`, `drainTo` |
| `UPGRADEABLE_CONTRACT` | Medium | EIP-1967 implementation slot has a non-zero address, OR source contains `UUPSUpgradeable`, `TransparentUpgradeableProxy`, `ProxyAdmin` |
| `TRANSFER_RESTRICTIONS` | Medium | Source code contains `pause`, `unpause`, `blacklist`, `whitelist`, `whenNotPaused` (case-insensitive) |

**Important notes:**
- `delegatecall` alone does **not** trigger `UPGRADEABLE_CONTRACT`: this avoids false positives on contracts like Uniswap's SwapRouter
- EIP-1967 slot detection takes priority over source code pattern matching for upgradeability
- The ABI is used for mint/withdrawal detection; source code is used for pattern-based detectors

---

## Running Tests

```bash
# All tests across the monorepo
pnpm test

# Core heuristics only
cd packages/core && pnpm test

# API unit tests (middleware, services)
cd apps/api && pnpm test

# API route tests (requires supertest)
cd apps/api && pnpm test:integration

# Watch mode
pnpm test:watch
```

Test files are co-located with source files:
- `packages/core/src/heuristics.test.ts`
- `packages/core/src/parser/parseSourceCode.test.ts`
- `packages/core/src/fetcher/ContractFetcher.test.ts`
- `apps/api/src/routes/analyze.test.ts`
- `apps/api/src/services/aiExplainer.test.ts`
- `apps/api/src/middleware/errorHandler.test.ts`

---

## Deployment

### API — Railway

1. Create a new Railway project from your GitHub repo
2. Set the **Root Directory** to `apps/api`
3. Build command: `pnpm install && pnpm build`
4. Start command: `node dist/index.js`
5. Add all environment variables from the reference above
6. Set `ALLOWED_ORIGIN` to your Vercel frontend URL

If the TypeScript build fails due to the monorepo `rootDir` spanning, use `npx tsx src/index.ts` as the start command instead.

### Frontend — Vercel

1. Import your GitHub repo on Vercel
2. Set the **Root Directory** to `apps/web`
3. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app`
4. Deploy

---

## Project Status

SemaFy is actively developed. The core analysis pipeline, contract fetching, heuristics, AI explanation, and Storacha logging, are fully functional.

**Built and working:**
- [x] Multi-chain EVM contract fetching (6 chains)
- [x] EIP-1967 proxy resolution
- [x] 5 heuristic detectors
- [x] AI explanation via Anthropic (Haiku → Sonnet fallback, 8s timeout)
- [x] Storacha/Filecoin decentralized analysis logging
- [x] Upstash Redis CID index
- [x] Next.js frontend with chain selector
- [x] Graceful degradation (AI optional, logging optional)

**Roadmap:**
- [ ] Community false-positive/false-negative reporting UI
- [ ] GitHub Issues auto-creation at report threshold
- [ ] Language toggle (Pidgin English explanation mode)
- [ ] Discord webhook notifications
- [ ] Wallet browser extension integration
- [ ] Hosted public API

---

## Contributing

We welcome contributions, especially new heuristic detectors. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, contribution guidelines, and the heuristics contribution guide.

For quick wins, check [good first issues](https://github.com/J0shcodes/semafy/labels/good%20first%20issue).

---

## License

**MPL 2.0** (Mozilla Public License 2.0)

The core analysis logic is open and auditable under MPL 2.0, which requires modifications to MPL-licensed files to remain open source while allowing the project to be used in larger commercial systems. See [LICENSE](./LICENSE) for full terms.

---

> **Built with transparency. Use with caution. Verify always.**