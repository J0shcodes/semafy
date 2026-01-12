import { User, Settings } from 'lucide-react';

interface HumanExplanationProps {
  whatItDoes: string;
  ownerAddress: string;
  isOwnerControlled: boolean;
  isUpgradeable: boolean;
}

export function HumanExplanation({
  whatItDoes,
  ownerAddress,
  isOwnerControlled,
  isUpgradeable,
}: HumanExplanationProps) {
  const shortenedOwner = `${ownerAddress.slice(0, 6)}...${ownerAddress.slice(-4)}`;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
            <User className="h-4 w-4 text-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            What this contract does
          </h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed pl-10">
          {whatItDoes}
        </p>
      </div>

      <div className="border-t border-border pt-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
            <Settings className="h-4 w-4 text-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            Who controls it
          </h3>
        </div>
        <div className="pl-10 space-y-3">
          <div className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/50">
            <span className="text-sm text-muted-foreground">Owner address</span>
            <code className="text-sm font-mono text-foreground">
              {shortenedOwner}
            </code>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/50">
            <span className="text-sm text-muted-foreground">
              Owner-controlled
            </span>
            <span
              className={`text-sm font-medium ${isOwnerControlled ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              {isOwnerControlled ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/50">
            <span className="text-sm text-muted-foreground">Upgradeable</span>
            <span
              className={`text-sm font-medium ${isUpgradeable ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              {isUpgradeable ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
