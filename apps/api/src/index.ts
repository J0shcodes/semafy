import 'dotenv/config';
import app from './app';

const REQUIRED_VARS = ['ETHERSCAN_RPC_URL', 'ETHERSCAN_API_KEY'];
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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Semafy API running on port ${PORT}`);
  console.log(`AI explanations: ${process.env.ANTHROPIC_API_KEY ? 'enabled' : 'disabled'}`)
});
