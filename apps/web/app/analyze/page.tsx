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

          {isLoading && (
            <div className="h-50 flex w-full items-center justify-center text-center">
              <div className="border-transparent border-t-muted-foreground h-10 w-10 animate-spin rounded-full border-[5px] border-solid" />
            </div>
          )}

          {isError && (
            <div className="text-sm text-severity-high flex justify-center items-center h-50">
              Failed to fetch contract analysis
            </div>
          )}

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
