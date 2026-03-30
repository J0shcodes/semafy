import 'dotenv/config';
import app from './app';
import { isStorachaConfigured } from './services/storacha';
import { isIndexServiceConfigured } from './services/indexService';

const REQUIRED_VARS = ['ETHERSCAN_API_URL', 'ETHERSCAN_API_KEY'];
const OPTIONAL_VARS = ['ANTHROPIC_API_KEY'];

REQUIRED_VARS.forEach((key) => {
  if (!process.env[key]) {
    console.warn(
      `[startup] WARNING: Required environment variable "${key}" is not set.`,
    );
  }
});

OPTIONAL_VARS.forEach((key) => {
  if (!process.env[key]) {
    console.warn(
      `[startup] WARNING: Optional environment variable "${key}" is not set. ` +
        `AI explanations will be disabled until it is provided.`,
    );
  }
});

const storachaReady = isStorachaConfigured()
const indexReady = isIndexServiceConfigured()

if (!storachaReady) {
  console.warn(
    '[startup] WARNING: Storacha credentials are not set ' +
    '(STORACHA_AGENT_KEY, STORACHA_PROOF, STORACHA_SPACE_DID). ' +
    'Analysis logging will be disabled.',
  );
}

if (!indexReady) {
  console.warn(
    '[startup] WARNING: Upstash Redis credentials are not set ' +
    '(UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN). ' +
    'Analysis logging will be disabled.',
  );
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\nSemaFy API running on port ${PORT}`);
  console.log(`  AI explanations : ${process.env.ANTHROPIC_API_KEY ? '✓ enabled' : '✗ disabled'}`);
  console.log(`  Storacha logging: ${storachaReady ? '✓ enabled' : '✗ disabled'}`);
  console.log(`  Index service   : ${indexReady ? '✓ enabled' : '✗ disabled'}\n`);
});
