import { InvitationForm } from "@/components/auth-forms";
import { Card } from "@/components/ui/primitives";

export const metadata = { title: "Accept invitation" };

export default async function InvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl text-navy">Accept your invitation</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Choose a password of at least 12 characters, with upper and lower case letters and a number. You will then complete your profile and accept the participation rules.</p>
      <Card className="mt-8 p-6">
        {params.token ? <InvitationForm token={params.token} /> : <p className="text-sm text-danger">This page needs the invitation link you were given.</p>}
      </Card>
    </div>
  );
}
