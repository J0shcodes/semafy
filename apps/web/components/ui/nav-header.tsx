'use client';

import Link from 'next/link';
import { Logo } from './logo';
import { Button } from './button';
import { MenuIcon } from 'lucide-react';

import { useSidenavStore } from '@/store/sidenav-store';

interface NavHeaderProps {
  showAnalyzeButton?: boolean;
}

export function NavHeader({ showAnalyzeButton = true }: NavHeaderProps) {
  const { setIsSidenavOpen } = useSidenavStore();

  return (
    <header className="w-full border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="flex items-center gap-6">
          <div className="sm:flex hidden gap-6">
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Methodology
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </Link>
            <Link
              href="https://github.com/J0shcodes/semafy"
              target="_blank"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </Link>
          </div>
          {showAnalyzeButton && (
            <Button asChild size="sm">
              <Link href="/analyze">Analyze Contract</Link>
            </Button>
          )}
          <MenuIcon
            className="sm:hidden"
            onClick={() => setIsSidenavOpen(true)}
          />
        </nav>
      </div>
    </header>
  );
}
