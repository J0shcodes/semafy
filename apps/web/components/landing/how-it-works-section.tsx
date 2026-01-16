import { FileSearch, Shield, FileText } from 'lucide-react';

const steps = [
  {
    icon: FileSearch,
    title: 'Paste contract address',
    description: 'Enter any EVM-compatible contract address to begin analysis.',
  },
  {
    icon: Shield,
    title: 'SemaFy analyzes permissions',
    description:
      "We examine the contract's functions, permissions, and potential risk surfaces using deterministic analysis and AI explanation.",
  },
  {
    icon: FileText,
    title: 'Get a clear explanation',
    description:
      'Receive a human-readable breakdown of what the contract does and what permissions it requires — before you interact.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="w-full py-20 bg-card border-y border-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            Three steps to understanding
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-6">
                  <step.icon className="h-6 w-6 text-foreground" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Step {index + 1}
                </span>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-7 left-[calc(50%+3rem)] w-[calc(100%-6rem)] h-px bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
