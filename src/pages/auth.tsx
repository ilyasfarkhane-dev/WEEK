import { useSearchParams, useParams } from "react-router-dom";
import { Link } from "@/components/link";
import { InvitationForm, LoginForm, ResetPasswordForm, ResetRequestForm } from "@/components/auth-forms";
import { Card } from "@/components/ui/primitives";

export function LoginPage() {
  const [params] = useSearchParams();
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">Members</p>
      <h1 className="mt-3 font-serif text-4xl text-navy">Sign in</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Use the email from your invitation. Registration is not open to the public.</p>
      {params.get("error") === "inactive" ? <p className="mt-4 text-sm text-danger">This account is not active.</p> : null}
      {params.get("reset") ? <p className="mt-4 text-sm text-ok">Password updated. Sign in with the new password.</p> : null}
      <Card className="mt-8 p-6"><LoginForm /></Card>
      <p className="mt-4 text-sm"><Link className="font-semibold text-teal" href="/reset-password">Forgot your password?</Link></p>
    </div>
  );
}

export function ResetRequestPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl text-navy">Reset password</h1>
      <p className="mt-3 text-sm leading-6 text-muted">If the account exists, a reset is queued. Email is sent only when a provider is configured.</p>
      <Card className="mt-8 p-6"><ResetRequestForm /></Card>
    </div>
  );
}

export function ResetPasswordPage() {
  const { token = "" } = useParams();
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl text-navy">Choose a new password</h1>
      <Card className="mt-8 p-6"><ResetPasswordForm token={token} /></Card>
    </div>
  );
}

export function InvitationPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl text-navy">Accept your invitation</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Create a password for the invited account. The invitation expires after 14 days.</p>
      <Card className="mt-8 p-6">{token ? <InvitationForm token={token} /> : <p className="text-sm text-danger">This invitation link is missing its token.</p>}</Card>
    </div>
  );
}
