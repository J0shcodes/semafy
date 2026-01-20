'use client';

import Link from 'next/link';
import { X } from 'lucide-react';

import { useSidenavStore } from '@/store/sidenav-store';

export function SideNav() {
  const { isSidenavOpen, setIsSidenavOpen } = useSidenavStore();

  return (
    <div
      className={`fixed w-1/2 h-full top-0 right-0 z-50 bg-card p-4 sm:hidden ${isSidenavOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out`}
    >
      <X className="justify-self-end" onClick={() => setIsSidenavOpen(false)} />
      <nav className="flex flex-col gap-6 mt-4">
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
      </nav>
    </div>
  );
}
