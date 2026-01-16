import { Eye, Cpu, BookOpen } from 'lucide-react';

const features = [
  {
    icon: Eye,
    title: 'Transparency',
    description:
      'See exactly what a contract does in plain language. No hidden complexity, no technical jargon to decode.',
  },
  {
    icon: Cpu,
    title: 'Deterministic + AI',
    description:
      'Our analysis combines deterministic code inspection with AI-powered explanations for comprehensive clarity.',
  },
  {
    icon: BookOpen,
    title: 'Built for clarity',
    description:
      'We present information neutrally — helping you understand, not telling you what to do.',
  },
];

export function WhySection() {
  return (
    <section className="w-full py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
            Why SemaFy
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Built for informed decisions, not fear
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-lg border border-border bg-card hover:border-accent/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center mb-4">
                <feature.icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
