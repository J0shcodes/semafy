import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizes = {
    sm: "h-6",
    md: "h-8",
    lg: "h-10",
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(sizes[size], 'w-auto')}
      >
        <rect width="32" height="32" rx="6" className="fill-primary" />
        <path
          d="M8 16h6M18 16h6M11 10v12M21 10v12"
          className="stroke-primary-foreground"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-semibold text-foreground tracking-tight">
        SemaFy
      </span>
    </div>
  );
}