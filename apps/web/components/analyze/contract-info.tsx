import { Copy, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ContractInfoProps {
  address: string
  network: string
}

export function ContractInfo({ address, network }: ContractInfoProps) {
  const shortenedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Contract Address</p>
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono text-foreground">{shortenedAddress}</code>
          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{network}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Copy className="h-4 w-4" />
          <span className="sr-only">Copy address</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ExternalLink className="h-4 w-4" />
          <span className="sr-only">View on explorer</span>
        </Button>
      </div>
    </div>
  )
}
