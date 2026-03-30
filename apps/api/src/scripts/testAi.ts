import "dotenv/config"
import { generateExplanation } from "src/services/aiExplainer"

const mockRisks = [
  {
    id: 'OWNER_CONTROL',
    title: 'Owner Has Special Control',
    severity: 'medium' as const,
    description: 'The contract includes functions restricted to a privileged owner',
    evidence: ['onlyOwner', 'transferOwnership'],
    explanationSeed: 'The contract owner has special permissions that regular users do not.',
  },
  {
    id: 'OWNER_CAN_MINT',
    title: 'Owner Can Create New Tokens',
    severity: 'high' as const,
    description: 'A privileged role can create new tokens.',
    evidence: ['mint'],
    explanationSeed: 'The owner can create new tokens at any time.',
  },
];

async function main() {
  console.log('Testing AI explainer...\n');

  const result = await generateExplanation(
    'TestToken',
    'Ethereum',
    mockRisks,
  );

  console.log(result)

  console.log('Summary:', result.summary);
  console.log('\nRisks:');
  result.risks.forEach((r) => {
    console.log(`  [${r.id}] ${r.plainEnglish}`);
  });
  console.log('\nSource:', result.source);
}

main().catch(console.error);