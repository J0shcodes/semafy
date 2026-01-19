import {create} from "zustand"

type AddressStore = {
    validAddress: string
    setValidAddress: (address: string) => void
}

export const useAddressStore = create<AddressStore>()((set) => ({
    validAddress: "",
    setValidAddress: (address) => set({validAddress: address})
}))