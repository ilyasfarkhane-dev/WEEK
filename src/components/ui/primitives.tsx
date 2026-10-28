import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-semibold text-ink", className)} {...props} />;
}

const control =
  "w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink shadow-none placeholder:text-muted/80";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-28 resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-line bg-white shadow-[0_1px_0_rgba(12,35,64,0.04)]", className)} {...props} />;
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "teal" | "gold" | "danger" | "ok" | "navy";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "bg-sand text-ink",
    teal: "bg-teal-soft text-teal",
    gold: "bg-[#f3ead8] text-gold",
    danger: "bg-[#f8e8e8] text-danger",
    ok: "bg-[#e5f4ec] text-ok",
    navy: "bg-navy text-white",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function Alert({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "danger" | "ok" | "warn";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "border-line bg-sand text-ink",
    danger: "border-[#e7c7c7] bg-[#fbf4f4] text-danger",
    ok: "border-[#cfe5d8] bg-[#f3faf6] text-ok",
    warn: "border-[#ead9b8] bg-[#fbf7ef] text-warn",
  };
  return (
    <div role="status" className={cn("rounded-md border px-4 py-3 text-sm leading-6", tones[tone])}>
      {children}
    </div>
  );
}
