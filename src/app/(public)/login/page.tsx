import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { Card } from "@/components/ui/primitives";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string }> }) {
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">Members</p>
      <h1 className="mt-3 font-serif text-4xl text-navy">Sign in</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Use the email from your invitation. Registration is not open to the public.</p>
      {params.error === "inactive" ? <p className="mt-4 text-sm text-danger">This account is not active.</p> : null}
      {params.reset ? <p className="mt-4 text-sm text-ok">Password updated. Sign in with the new password.</p> : null}
      <Card className="mt-8 p-6">
        <LoginForm />
      </Card>
      <p className="mt-4 text-sm"><Link className="font-semibold text-teal" href="/reset-password">Forgot your password?</Link></p>
    </div>
  );
}
