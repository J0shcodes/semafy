import Link from 'next/link';
import { Logo } from './logo';

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-4">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Understand smart contracts before you sign.
            </p>
          </div>
          <div className="flex gap-16">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Resources</h4>
              <nav className="flex flex-col gap-2">
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Documentation
                </Link>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Methodology
                </Link>
                <Link
                  href="https://github.com/J0shcodes/semafy"
                  target="_blank"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub
                </Link>
              </nav>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Legal</h4>
              <nav className="flex flex-col gap-2">
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms
                </Link>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy
                </Link>
              </nav>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} HumanLayer. Open source under MLP 2.0
            license.
          </p>
        </div>
      </div>
    </footer>
  );
}
