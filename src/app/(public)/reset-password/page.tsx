import { ResetRequestForm } from "@/components/auth-forms";
import { Card } from "@/components/ui/primitives";

export const metadata = { title: "Reset password" };

export default function ResetRequestPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl text-navy">Reset your password</h1>
      <p className="mt-3 text-sm leading-6 text-muted">If the account exists, a reset is queued. This screen does not confirm whether the email is registered. Delivery happens only when an email provider is configured.</p>
      <Card className="mt-8 p-6"><ResetRequestForm /></Card>
    </div>
  );
}
