import { create } from 'zustand';

type SidenavStore = {
  isSidenavOpen: boolean;
  setIsSidenavOpen: (isOpen: boolean) => void;
};

export const useSidenavStore = create<SidenavStore>()((set) => ({
  isSidenavOpen: false,
  setIsSidenavOpen: (isOpen) => set({ isSidenavOpen: isOpen }),
}));
