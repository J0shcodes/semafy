'use client';

import { Footer } from '@/components/ui/footer';
import { NavHeader } from '@/components/ui/nav-header';
import { ContractInfo } from '@/components/analyze/contract-info';
import { LanguageToggle } from '@/components/analyze/language-toggle';
import { HumanExplanation } from '@/components/analyze/human-explanation';
import { RiskSurface } from '@/components/analyze/risk-surface';
import { Info } from 'lucide-react';

// import {runHeuristics} from "@semafy/core"
import { useAddressStore } from '@/store/address-store';

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

const AnalyzePage = () => {
  const { validAddress } = useAddressStore();

  console.log(validAddress);

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader />
      <main className="flex-1 py-8 md:py-12">
        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
              Contract Analysis
            </h1>
            <p className="text-muted-foreground">
              Human-readable breakdown of contract behavior and permissions
            </p>
          </div>

          {/* Contract Info Bar */}
          <div className="mb-8">
            <ContractInfo
              address={validAddress}
              network={mockContractData.network}
            />
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
            <div className="p-6 rounded-xl border border-border bg-card">
              <HumanExplanation
                whatItDoes={mockContractData.whatItDoes}
                ownerAddress={mockContractData.ownerAddress}
                isOwnerControlled={mockContractData.isOwnerControlled}
                isUpgradeable={mockContractData.isUpgradeable}
              />
            </div>

            {/* Right Column - Risk Surface */}
            <div className="p-6 rounded-xl border border-border bg-card">
              <RiskSurface risks={mockContractData.risks} />
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-8 p-4 rounded-lg bg-secondary/50 flex items-start gap-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              This analysis is for informational purposes only. It is not an
              audit, not financial advice, and should not be the sole basis for
              any decision. Always conduct your own research.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AnalyzePage;
