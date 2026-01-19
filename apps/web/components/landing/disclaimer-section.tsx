import { Info } from 'lucide-react';

export function DisclaimerSection() {
  return (
    <section className="w-full py-16 bg-secondary/50">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Info className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">
              Important information
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              SemaFy provides informational analysis only. This is not a
              security audit, not financial advice, and should not be used as
              the sole basis for any transaction decision. Always do your own
              research and consult professionals when needed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
