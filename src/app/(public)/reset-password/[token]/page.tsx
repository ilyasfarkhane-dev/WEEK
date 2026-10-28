import { ResetPasswordForm } from "@/components/auth-forms";
import { Card } from "@/components/ui/primitives";

export const metadata = { title: "Choose a new password" };

export default async function ResetTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl text-navy">Choose a new password</h1>
      <Card className="mt-8 p-6"><ResetPasswordForm token={token} /></Card>
    </div>
  );
}
