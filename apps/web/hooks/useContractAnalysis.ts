import { useQuery } from '@tanstack/react-query';
import { HeuristicsAnalysis } from '@semafy/core';

export function useContractAnalysis(address: string, chain: string) {
  const {
    data: contractAnalysis,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['contract-analysis', address, chain],
    enabled: !!address && !!chain,
    queryFn: async (): Promise<HeuristicsAnalysis | undefined> => {
      try {
        const response = await fetch('http://localhost:3001/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ address, chain }),
        });
        return await response.json();
      } catch (error) {
        console.error(error);
      }
    },
  });

  return { contractAnalysis, isLoading, isError };
}
