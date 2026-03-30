# SemaFy — Heuristic Reporting & Logging System
## Technical Documentation

---

## 1. Overview

The Heuristic Reporting & Logging System is a feedback infrastructure built on top of SemaFy's core analysis engine. Its purpose is to close the quality loop between heuristic detection and real-world contract behavior, a gap that most static analysis tools never address.

The system operates on three layers:

- **Logging Layer**: Every analysis result is persisted to Storacha automatically as a content-addressed, tamper-resistant record.
- **Community Reporting Layer**: Users can flag individual risk items as false positives or false negatives directly from the analysis UI.
- **GitHub Integration Layer**: Aggregated reports above a confidence threshold are automatically routed to GitHub Issues for developer action.

A future **AI Review Layer** will sit between the logging and reporting layers, using accumulated confirmed cases as ground truth to pre-screen new analysis results for likely errors before they are returned to users.

> **Why Storacha?** Storing analysis logs on Storacha rather than a traditional database strengthens SemaFy's core transparency principle. Every log becomes a publicly verifiable, content-addressed record on decentralised storage, meaning the historical record of what SemaFy detected cannot be altered retroactively. This is philosophically consistent with a tool whose entire value proposition is auditability.

---

## 2. Architectural Philosophy

This system follows the same Core-First principles as SemaFy's analysis engine:

- **Content-addressed over mutable**: Analysis logs are stored as immutable records on Storacha. Once written, a log's CID is its permanent identifier and its contents cannot be changed.
- **Community confirms, system routes**: No single user report creates a GitHub issue. Aggregation and thresholds protect against noise and abuse.
- **Data before intelligence**: The AI review layer is intentionally deferred until a meaningful dataset of confirmed cases exists to train and validate it against.
- **Reporting is contextual**: The friction to submit a report must be near zero. The reporting action lives on the analysis results page, not behind a separate URL.
- **Storacha stores, index serves**: Storacha is not a queryable database. A lightweight index layer maintains the ability to look up logs by contract address and chain without compromising the decentralised storage layer.

---

## 3. High-Level System Architecture

```
Analysis Result (from Core Engine)
        │
        ▼
  Logging Layer ──────────────────────────────┐
  (auto-persist every result)                 │
        │                                     │
        ▼                                     ▼
  Analysis Result Page              Storacha (Decentralised Storage)
  (web UI)                          Content-addressed JSON blobs
        │                           (CID per analysis log)
        │                                     │
        │                             Index Service
        │                           (CID ↔ address/chainId lookup)
        │ user flags a risk item
        ▼
  Report Submission (web UI modal)
        │
        ▼
  Storacha (Report Records)
  + Index Service update
        │
        ▼
  Aggregation Service
  (threshold check per heuristicId + contractType)
        │
        ├──── below threshold ──── Discord #heuristic-reports (notification)
        │
        └──── above threshold ──── GitHub Issues API (auto-create issue)
```

---

## 4. Storacha Storage Model

### 4.1 How Storacha Works in This Context

Storacha stores arbitrary files and returns a **CID** (Content Identifier): a cryptographic hash of the content. Because CIDs are derived from content, the same data always produces the same CID, and any tampering produces a different one. This is what makes analysis logs verifiably immutable.

Every analysis log and every community report is serialised as a JSON file and uploaded to Storacha individually. The CID is the permanent reference to that record.

### 4.2 The Index Problem

Storacha is not a database, you cannot query "give me all reports where `heuristicId = UPGRADEABLE_CONTRACT`". To maintain queryability, a lightweight **Index Service** sits alongside Storacha that maps structured identifiers to CIDs.

The index stores entries in the shape:

```
logs:{contractAddress}:{chainId}  →  [CID1, CID2, ...]
reports:{heuristicId}:{status}    →  [CID1, CID2, ...]
github:{heuristicId}              →  CID
```

The index is the only mutable layer in the system. It is intentionally small, it holds only CID references, never the data itself. The canonical data always lives on Storacha.

### 4.3 Index Storage Options

For the initial build, **Upstash Redis** is the recommended index store. It is serverless, has a free tier sufficient for early traffic, works well with Node.js, and requires no infrastructure management. The index keys are short strings and the values are small arrays of CID strings, the data footprint is minimal.

As an alternative for a fully decentralised approach, the index itself can be stored as an updatable JSON file on Storacha, with a pointer to the latest version stored in a small config. This is more complex to implement and is recommended as a future improvement once the system is stable.

---

## 5. Monorepo Structure Changes

The following additions are required to the existing monorepo:

```
root/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── analyze.ts         # existing — add logging call here
│   │       │   └── reports.ts         # NEW: POST /api/reports
│   │       ├── services/
│   │       │   ├── logger.ts          # NEW: persists analysis results to Storacha
│   │       │   ├── storacha.ts        # NEW: Storacha client and upload helpers
│   │       │   ├── index.ts           # NEW: Index Service (CID ↔ address lookup)
│   │       │   ├── aggregator.ts      # NEW: threshold checks and routing
│   │       │   ├── github.ts          # NEW: GitHub Issues API integration
│   │       │   └── discord.ts         # NEW: Discord webhook integration
│   └── web/
│       └── components/
│           └── analyze/
│               ├── risk-card.tsx      # existing — add report button here
│               └── report-modal.tsx   # NEW: report submission modal
└── packages/
    └── core/                          # unchanged
```

---

## 6. Data Models

### 6.1 Analysis Log

Persisted automatically on every successful analysis. Serialised to JSON and uploaded to Storacha. The returned CID is stored in the Index Service.

```typescript
type AnalysisLog = {
  id: string;                  // uuid — generated before upload, used as index key
  contractAddress: string;     // checksummed EVM address
  chainId: number;             // numeric chain ID
  contractName: string | null;
  implementationAddress: string | null;
  risks: RiskHeuristic[];      // full heuristic output
  isOwnerControlled: boolean;
  isUpgradeable: boolean;
  analyzedAt: string;          // ISO 8601 timestamp (Date serialised for JSON)
  cid?: string;                // populated after Storacha upload
};
```

### 6.2 Heuristic Report

Created when a user submits a report from the analysis UI. Serialised to JSON and uploaded to Storacha. The CID is stored in the Index Service alongside the `analysisLogCid` it references.

```typescript
type HeuristicReport = {
  id: string;                        // uuid
  analysisLogCid: string;            // CID of the AnalysisLog this report references
  contractAddress: string;
  chainId: number;
  heuristicId: string;               // e.g. "UPGRADEABLE_CONTRACT"
  reportType: 'FALSE_POSITIVE' | 'FALSE_NEGATIVE';
  reason: string;                    // user-provided explanation
  status: 'PENDING' | 'CONFIRMED' | 'DISMISSED';
  reportedAt: string;                // ISO 8601 timestamp
  cid?: string;                      // populated after Storacha upload
};
```

### 6.3 GitHub Issue Record

Tracks issues that have been auto-created to prevent duplicates. Stored as a JSON record on Storacha with its CID held in the Index Service under `github:{heuristicId}`.

```typescript
type GitHubIssue = {
  id: string;
  heuristicId: string;
  contractType: string | null;   // inferred from contractName patterns
  issueNumber: number;           // GitHub issue number
  issueUrl: string;
  reportCount: number;           // number of reports that triggered this
  createdAt: string;             // ISO 8601 timestamp
};
```

---

## 7. Logging Layer

### 7.1 Where Logging Happens

The logging call is added to the existing `POST /api/analyze` route handler, after the heuristics run and before the response is returned. It is fire-and-forget, a logging failure must never cause the analysis response to fail.

```typescript
// In apps/api/src/routes/analyze.ts
const risks = runHeuristics(contractData);

// Fire and forget — do not await, do not block the response
logger.logAnalysis({
  contractAddress: contractData.address,
  chainId: contractData.chainId,
  contractName: contractData.contractName ?? null,
  implementationAddress: contractData.implementationAddress,
  risks,
  isOwnerControlled: risks.some((r) => r.id === 'OWNER_CONTROL'),
  isUpgradeable: risks.some((r) => r.id === 'UPGRADEABLE_CONTRACT'),
}).catch((err) => console.error('Analysis logging failed:', err));

return res.status(200).json({ ... });
```

### 7.2 What the Logger Does

The `logger.logAnalysis()` function performs three steps in sequence:

1. Serialises the log object to a JSON `Blob`
2. Uploads the blob to Storacha via the Storacha client, receiving a CID in return
3. Writes the mapping `logs:{contractAddress}:{chainId} → CID` to the Index Service

If step 2 or 3 fails, the error is caught and logged to the console. The analysis response is never affected.

### 7.3 What Gets Logged

Every field of the analysis result is persisted including the full `risks` array. Because Storacha is content-addressed, the log is immutable once written, if a heuristic is later modified or removed, the historical output is preserved exactly as it was returned to the user at that point in time.

### 7.4 Deduplication

The same contract address on the same chain will be analyzed multiple times. Logs are not deduplicated, every analysis is its own Storacha record with its own CID and timestamp. The Index Service accumulates an array of CIDs per `{contractAddress}:{chainId}` key. This preserves the ability to track whether a contract's risk profile changes over time.

---

## 8. Community Reporting Layer

### 8.1 UI — Report Button on Risk Card

A "Report" button is added to each `RiskCard` component. It is intentionally subtle: a small flag icon that reveals itself on hover, so it does not distract from the primary analysis content.

When clicked, it opens `ReportModal` pre-populated with:
- The contract address
- The heuristic ID and title
- The chain
- The `analysisLogCid` from the current analysis result

The user selects `False Positive` or `False Negative` and provides a short reason (required, minimum 20 characters to discourage low-effort reports).

### 8.2 API Endpoint — `POST /api/reports`

**Request body:**
```typescript
{
  analysisLogCid: string;
  heuristicId: string;
  reportType: 'FALSE_POSITIVE' | 'FALSE_NEGATIVE';
  reason: string;
}
```

**Validation rules:**
- `analysisLogCid` must be a valid CID string and must exist in the Index Service
- `heuristicId` must be a known heuristic ID
- `reason` must be between 20 and 500 characters

**Response (success):**
```typescript
{
  reportCid: string;
  message: 'Report submitted. Thank you for helping improve SemaFy.';
}
```

**On submission, the route handler:**
1. Validates the request
2. Serialises the report and uploads it to Storacha, receiving a `reportCid`
3. Writes `reports:{heuristicId}:PENDING → reportCid` to the Index Service
4. Calls the aggregation service asynchronously
5. Returns the success response with the `reportCid`

### 8.3 Rate Limiting

To prevent a single user from flooding reports, apply per-IP rate limiting specifically on the reports endpoint: maximum 10 reports per hour. This is separate from any rate limiting on the analyze endpoint.

---

## 9. Aggregation Service

The aggregation service runs after every new report is submitted. It answers one question: *has this heuristic accumulated enough independent reports to warrant a GitHub issue?*

### 9.1 Threshold Logic

The aggregation service queries the Index Service rather than Storacha directly, the index holds the count of pending report CIDs per heuristic, which is what the threshold check needs. The full report content is only fetched from Storacha when building the GitHub issue body.

```typescript
// apps/api/src/services/aggregator.ts

const GITHUB_ISSUE_THRESHOLD = Number(process.env.REPORT_THRESHOLD) || 3;

async function checkThreshold(heuristicId: string): Promise<void> {
  const pendingCids = await indexService.getReportCids(heuristicId, 'PENDING');

  if (pendingCids.length >= GITHUB_ISSUE_THRESHOLD) {
    const existingIssueCid = await indexService.getGitHubIssueCid(heuristicId);

    if (!existingIssueCid) {
      // Fetch full report data from Storacha to build the issue body
      const reports = await storachaService.fetchMany(pendingCids);
      await githubService.createIssue(heuristicId, reports);
    } else {
      await githubService.addComment(existingIssueCid, pendingCids.length);
    }

    await discordService.notifyNewReport(heuristicId, pendingCids.length);
  }
}
```

### 9.2 Threshold Configuration

```
REPORT_THRESHOLD=3
```

Start at 3 and increase it as report volume grows to maintain signal quality.

---

## 10. GitHub Integration Layer

### 10.1 Issue Template

Auto-created issues follow a consistent template so developers have all the context they need immediately:

```markdown
## Heuristic Quality Report — [HEURISTIC_ID]

**Report type:** False Positive / False Negative
**Heuristic:** UPGRADEABLE_CONTRACT
**Report count:** 4 independent reports
**Auto-generated by:** SemaFy Reporting System

---

### Reported Contracts

| Address | Chain | Contract Name | Reporter Reason | Log CID |
|---------|-------|---------------|-----------------|---------|
| 0x1b81... | Ethereum | SwapRouter | Uses delegatecall for routing | bafyrei... |
| 0xA0b8... | Ethereum | UniswapV3Pool | Same pattern — internal delegatecall | bafyrei... |

---

### Suggested Investigation

Review the `detectUpgradeableContract` heuristic in `packages/core/src/heuristics/`.
Consider whether the current pattern list produces false positives for contracts
that use `delegatecall` for routing rather than proxy upgradeability.

Log records are publicly verifiable on Storacha via their CIDs above.

---

### Labels
`heuristic-quality` `false-positive` `good-first-issue`
```

Note that the Log CID column links each report back to its immutable Storacha record. Developers reviewing the issue can independently verify the original analysis output that triggered the report.

### 10.2 Labels

The following labels should be created in the GitHub repository before launch:

- `heuristic-quality`: all auto-generated issues get this label
- `false-positive`: report type
- `false-negative`: report type
- `good-first-issue`: added automatically, since heuristic improvements are well-scoped contributions

### 10.3 Required Environment Variables

```
GITHUB_TOKEN=          # Personal access token with repo scope
GITHUB_REPO_OWNER=     # e.g. J0shcodes
GITHUB_REPO_NAME=      # e.g. semafy
```

---

## 11. Discord Integration

Discord's role is notification and discussion, not reporting. It receives a webhook message when a report crosses the GitHub issue threshold.

### 11.1 Notification Format

Posted to a dedicated `#heuristic-reports` channel:

```
🚩 New Heuristic Report Threshold Reached

Heuristic: UPGRADEABLE_CONTRACT
Type: False Positive
Reports: 4 independent submissions
GitHub Issue: #42 — https://github.com/J0shcodes/semafy/issues/42
Storacha Log: bafyrei... (publicly verifiable)

A GitHub issue has been created. Community discussion welcome.
```

### 11.2 Required Environment Variables

```
DISCORD_WEBHOOK_URL=   # Webhook URL for #heuristic-reports channel
```

---

## 12. Storacha Setup

### 12.1 Installation

```bash
pnpm add @web3-storage/w3up-client
```

### 12.2 Space Configuration

A Storacha **Space** is the container that holds all uploaded files. You create one Space for SemaFy and all logs and reports are uploaded into it.

Create your space at console.storacha.network before starting development. You will receive a Space DID that identifies it. All uploads reference this Space.

### 12.3 Authentication

Storacha uses **UCAN** (User Controlled Authorization Networks) for authentication. Your API authenticates as a registered agent that has been delegated permission to upload to the Space. The delegation proof and agent key are stored as environment variables.

### 12.4 Required Environment Variables

```
STORACHA_SPACE_DID=       # did:key:... identifier for your Storacha space
STORACHA_AGENT_KEY=        # base64-encoded private key for your upload agent
STORACHA_PROOF=            # base64-encoded UCAN delegation proof
```

These are obtained during space creation at console.storacha.network and via the `w3` CLI tool documented in the Storacha quickstart guide.

---

## 13. Build Order

The recommended implementation sequence after the core MVP is deployed:

**Phase 1: Storacha logging only (2–3 days)**
Set up the Storacha space and credentials. Install the `@web3-storage/w3up-client` SDK. Build the `storacha.ts` client service and the Index Service using Upstash Redis. Add the fire-and-forget logging call to the analyze route. Deploy. Data starts accumulating immediately with zero user-facing changes.

**Phase 2: Reporting UI (3–4 days)**
Add the report button to `RiskCard`, build `ReportModal`, implement `POST /api/reports` with Storacha upload, Index Service write, and rate limiting. Return the `reportCid` in the response.

**Phase 3: GitHub Integration (2–3 days)**
Build the aggregation service using the Index Service for threshold checks and Storacha for full report retrieval. Implement GitHub issue creation with the Log CID column in the issue template. Test the full flow in a staging environment.

**Phase 4: Discord Notifications (1 day)**
Add the Discord webhook notification after Phase 3 is stable. This is the lowest-risk phase and should not block the others.

**Phase 5: AI Review Layer (future)**
Once a meaningful dataset of confirmed reports exists (suggested minimum: 100 confirmed cases across at least 5 heuristic types), design the AI review layer using confirmed Storacha records as ground truth for evaluation.

---

## 14. Future — AI Review Layer

The AI Review Layer is intentionally excluded from the initial build. When the dataset is sufficient, it will sit between the heuristics output and the API response, reviewing each result for likely false positives before they reach the user.

Its scope will be bounded by the same Core-First principle that governs the rest of SemaFy:

- **The AI flags candidates for review; it does not override heuristics.**
- **AI confidence scores are included in the response so the frontend can surface uncertainty.**
- **Confirmed community reports stored on Storacha serve as the evaluation set to measure whether the AI layer is actually improving accuracy.**

The CID-rooted nature of Storacha records means every training example for the AI layer is independently verifiable, the provenance of each confirmed case is cryptographically guaranteed.

The reporting platform built in Phases 1–4 is the prerequisite for this layer to be credible.

---

## 15. Environment Variables Summary

```
# Storacha (Decentralised Storage)
STORACHA_SPACE_DID=
STORACHA_AGENT_KEY=
STORACHA_PROOF=

# Index Service (Upstash Redis)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# GitHub Integration
GITHUB_TOKEN=
GITHUB_REPO_OWNER=
GITHUB_REPO_NAME=

# Discord Integration
DISCORD_WEBHOOK_URL=

# Reporting Configuration
REPORT_THRESHOLD=3
```
