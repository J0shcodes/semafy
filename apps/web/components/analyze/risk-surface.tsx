import { RiskCard, type Severity } from './risk-card';
import { AlertTriangle } from 'lucide-react';

interface Risk {
  title: string;
  severity: Severity;
  description: string;
}

interface RiskSurfaceProps {
  risks: Risk[];
}

export function RiskSurface({ risks }: RiskSurfaceProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
          <AlertTriangle className="h-4 w-4 text-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">Risk surface</h3>
      </div>
      <div className="space-y-3">
        {risks.map((risk, index) => (
          <RiskCard
            key={index}
            title={risk.title}
            severity={risk.severity}
            description={risk.description}
          />
        ))}
      </div>
    </div>
  );
}
