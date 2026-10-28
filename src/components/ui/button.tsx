import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-navy text-white hover:bg-navy-800",
        secondary: "border border-line bg-white text-ink hover:bg-sand",
        teal: "bg-teal text-white hover:opacity-95",
        ghost: "text-navy hover:bg-sand",
        danger: "bg-danger text-white hover:opacity-95",
        inverse: "bg-white text-navy hover:bg-sand",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function buttonClass(variant: VariantProps<typeof buttonVariants>["variant"] = "primary", size: VariantProps<typeof buttonVariants>["size"] = "md") {
  return buttonVariants({ variant, size });
}
