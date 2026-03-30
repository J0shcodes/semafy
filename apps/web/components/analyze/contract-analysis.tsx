import { HeuristicsAnalysis } from '@semafy/core';
import { LanguageToggle } from './language-toggle';
import { ContractInfo } from './contract-info';
import { useAddressStore } from '@/store/address-store';
import { HumanExplanation } from './human-explanation';
import { RiskSurface } from './risk-surface';
import { Info } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';

const mockContractData = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  network: 'Ethereum',
  whatItDoes:
    'This contract is an ERC-20 token with additional administrative controls. It allows the owner to mint new tokens, pause all transfers, and modify transfer fees. Users can transfer tokens between addresses, approve spending allowances for other addresses, and check their balances. The contract also implements a fee mechanism that takes a percentage of each transfer and sends it to a designated treasury address.',
  ownerAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
  isOwnerControlled: true,
  isUpgradeable: true,
  risks: [
    {
      title: 'Owner Can Mint Tokens',
      severity: 'high' as const,
      description:
        'The contract owner has the ability to create new tokens at any time, which could dilute the value of existing tokens.',
    },
    {
      title: 'Contract Is Upgradeable',
      severity: 'medium' as const,
      description:
        'The contract uses a proxy pattern allowing the implementation to be changed. Future upgrades could modify behavior.',
    },
    {
      title: 'Transfers Can Be Paused',
      severity: 'medium' as const,
      description:
        'The owner can pause all token transfers, which would temporarily prevent any movement of tokens.',
    },
    {
      title: 'Fee Mechanism',
      severity: 'low' as const,
      description:
        'A small percentage of each transfer is sent to a treasury. This is standard for many tokens and is clearly documented.',
    },
  ],
};

export function ContractAnalysis({
  contractAnalysis,
}: {
  contractAnalysis: HeuristicsAnalysis;
}) {
  const { validAddress, chain } = useAddressStore();
  return (
    <section>
      {/* Contract Info Bar */}
      <div className="mb-8">
        <ContractInfo address={validAddress} network={chain} />
      </div>

      {/* Language Toggle */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          Explanation language:
        </span>
        <LanguageToggle />
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column - Human Explanation */}
        {contractAnalysis.explanation && (
          <div className="p-6 rounded-xl border border-border bg-card">
            <HumanExplanation
              whatItDoes={contractAnalysis.explanation}
              // ownerAddress={mockContractData.ownerAddress}
              isOwnerControlled={contractAnalysis.isOwnerControlled}
              isUpgradeable={contractAnalysis.isUpgradeable}
            />
          </div>
        )}

        {/* Right Column - Risk Surface */}
        <>
          {contractAnalysis.risks && contractAnalysis.risks.length === 0 ? (
            <div>
              {/* <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">
                  Risk surface
                </h3>
              </div> */}
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm font-medium text-foreground mb-1">
                  No risks detected
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  No known risk patterns were found in this contract. This does
                  not guarantee safety so always do your own research.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-border bg-card">
              <RiskSurface risks={contractAnalysis.risks} />
            </div>
          )}
        </>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 p-4 rounded-lg bg-secondary/50 flex items-start gap-3">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          This analysis is for informational purposes only. It is not an audit,
          not financial advice, and should not be the sole basis for any
          decision. Always conduct your own research.
        </p>
      </div>
    </section>
  );
}
