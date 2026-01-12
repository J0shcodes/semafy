import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type Severity = 'low' | 'medium' | 'high';

interface RiskCardProps {
  title: string;
  severity: Severity;
  description: string;
}

const severityConfig = {
  low: {
    label: 'Low',
    className: 'bg-severity-low/10 text-severity-low border-severity-low/20',
  },
  medium: {
    label: 'Medium',
    className:
      'bg-severity-medium/10 text-severity-medium border-severity-medium/20',
  },
  high: {
    label: 'High',
    className: 'bg-severity-high/10 text-severity-high border-severity-high/20',
  },
};

export function RiskCard({ title, severity, description }: RiskCardProps) {
  const config = severityConfig[severity];

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded-full border cursor-help',
                  config.className,
                )}
              >
                {config.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs">
                <strong>Severity levels indicate potential impact:</strong>
                <br />• Low: Standard functionality, minimal concern
                <br />• Medium: Notable permissions, worth understanding
                <br />• High: Significant control, review carefully
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
