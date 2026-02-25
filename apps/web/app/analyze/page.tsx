'use client';

import { Footer } from '@/components/ui/footer';
import { NavHeader } from '@/components/ui/nav-header';
import { useContractAnalysis } from '@/hooks/useContractAnalysis';

import { useAddressStore } from '@/store/address-store';
import { ContractAnalysis } from '@/components/analyze/contract-analysis';

const AnalyzePage = () => {
  const { validAddress, chain } = useAddressStore();

  const { contractAnalysis, isLoading, isError } = useContractAnalysis(
    validAddress,
    chain,
  );

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

          {isLoading && <div>Loading...</div>}

          {isError && <div>Failed to fetch contract analysis</div>}

          {contractAnalysis && (
            <ContractAnalysis contractAnalysis={contractAnalysis} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AnalyzePage;
