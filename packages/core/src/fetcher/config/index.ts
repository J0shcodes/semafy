import { ChainConfig } from "../../types"

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  1: { 
    name: "ethereum", 
    rpcBase: "https://eth-mainnet.g.alchemy.com/v2/", 
  },
  137: { 
    name: "polygon", 
    rpcBase: "https://polygon-mainnet.g.alchemy.com/v2/",  
  },
  8453: { 
    name: "base", 
    rpcBase: "https://base-mainnet.g.alchemy.com/v2/",
  },
  42161: { 
    name: "arbitrum", 
    rpcBase: "https://arb-mainnet.g.alchemy.com/v2/", 
  },
  56: { 
    name: "bsc",
    rpcBase: "https://base-mainnet.g.alchemy.com/v2/",
  },
  10: { 
    name: "optimism", 
    rpcBase: "https://base-mainnet.g.alchemy.com/v2/",
  }
}