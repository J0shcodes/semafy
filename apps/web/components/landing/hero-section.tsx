'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';

import { evmAddressSchema } from '@/schema/address-schema';
import { useAddressStore } from '@/store/address-store';

export function HeroSection() {
  const [inputValue, setInputValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const { setValidAddress } = useAddressStore();

  const performValidation = (address: string) => {
    if (!address) {
      setError(null);
      return;
    }

    // if (address.length > 0 && address.length < 42) {
    //   setError(null);
    //   return;
    // }

    const validation = evmAddressSchema.safeParse(address);

    if (!validation.success) {
      console.log(validation.error.issues[0].message);
      setError(validation.error.issues[0].message);
    } else {
      setError(null);
      setValidAddress(address);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      performValidation(inputValue);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [inputValue]);

  return (
    <section className="w-full py-24 md:py-32">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground text-balance leading-tight">
          Understand smart contracts before you sign.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
          SemaFy converts complex smart contract logic into clear,
          human-readable explanations — so you know exactly what permissions
          you&apos;re granting.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Paste contract address (0x...)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={() => performValidation(inputValue)}
                className="pl-10 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            {error && (
              <p className="text-xs text-severity-high mt-0.5">{error}</p>
            )}
          </div>

          <Button
            asChild
            size="lg"
            className="h-12 px-6"
            disabled={!!error || !inputValue}
          >
            {!error && inputValue ? (
              <Link href="/analyze">
                Analyze Contract
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            ) : (
              <span className='cursor-not-allowed'>
                Analyze Contract
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            )}
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Works with Ethereum, Polygon, and other EVM-compatible chains
        </p>
      </div>
    </section>
  );
}
