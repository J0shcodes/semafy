import { create } from 'zustand';

type AddressStore = {
  validAddress: string;
  setValidAddress: (address: string) => void;
  chain: string;
  setChain: (chain: string) => void;
};

export const useAddressStore = create<AddressStore>()((set) => ({
  validAddress: '',
  setValidAddress: (address) => set({ validAddress: address }),
  chain: "ethereum",
  setChain: (chain) => set({chain: chain})
}));
