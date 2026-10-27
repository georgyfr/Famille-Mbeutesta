"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function FcWatermark() {
  return (
    <img
      src="/logo-famille.png"
      alt=""
      aria-hidden
      className="fc-watermark fixed -right-24 top-1/4 w-[420px] max-w-[70vw] opacity-[0.07]"
    />
  );
}

export function FcLogo({ size = 96, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo-famille.png"
      alt="Armoiries de la Famille Mbeutetsa"
      width={size}
      height={size}
      className={cn("mx-auto drop-shadow-sm", className)}
      style={{ width: size, height: "auto" }}
    />
  );
}

export function FcTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h1 className={cn("fc-serif text-center text-[34px] font-bold tracking-tight text-[#1E4D2B]", className)}>
      {children}
    </h1>
  );
}

export function FcCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "fc-fade-up rounded-3xl border border-[#E5DCC0] bg-[#FBF7EA] shadow-[0_8px_30px_rgba(42,74,58,0.10)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function FcInput({
  icon,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }) {
  return (
    <div className={cn("relative", className)}>
      {icon && (
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1E4D2B]">{icon}</span>
      )}
      <input
        {...props}
        className={cn(
          "h-[54px] w-full rounded-xl border border-[#C9B98A] bg-[#FFFDF6] text-[16px] text-[#2B3530] placeholder:text-[#8A9288]",
          "focus:border-[#2A4A3A] focus:outline-none focus:ring-2 focus:ring-[#2A4A3A]/15",
          icon ? "pl-12 pr-4" : "px-4"
        )}
      />
    </div>
  );
}

export function FcButton({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "gold" | "ghost" | "outline" }) {
  const styles = {
    primary: "bg-[#1F5B3F] text-white hover:bg-[#184a33] shadow-md",
    gold: "bg-[#C89F62] text-[#2B2416] hover:bg-[#b98f50] shadow-md",
    ghost: "bg-transparent text-[#2A4A3A] hover:bg-[#2A4A3A]/5",
    outline: "border border-[#C9B98A] bg-transparent text-[#2A4A3A] hover:bg-[#C89F62]/10",
  }[variant];
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-[16px] font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        styles,
        className
      )}
    >
      {children}
    </button>
  );
}

const priorityStyles: Record<string, { label: string; className: string }> = {
  CRITIQUE: { label: "Critique", className: "bg-[#B91C1C] text-white border-transparent" },
  HAUTE: { label: "Importante", className: "bg-[#D97706] text-white border-transparent" },
  NORMALE: { label: "Normale", className: "bg-[#3D6B52]/10 text-[#2A4A3A] border-[#3D6B52]/30" },
  INFO: { label: "Info", className: "bg-[#C89F62]/15 text-[#7A5B2E] border-[#C89F62]/40" },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const s = priorityStyles[priority] ?? priorityStyles.NORMALE;
  return (
    <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-wide", s.className)}>
      {s.label}
    </Badge>
  );
}

export function FcDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-[#E5DCC0]" />
      {label && <span className="text-xs font-medium uppercase tracking-wide text-[#8A9288]">{label}</span>}
      <span className="h-px flex-1 bg-[#E5DCC0]" />
    </div>
  );
}

export function FcSpinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      role="status"
      aria-label="Chargement"
    />
  );
}
