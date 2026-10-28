import Link from "next/link";
import { PageHeader } from "@/components/chrome";

export const metadata = { title: "Community" };

export default function CommunityPage() {
  return (
    <div>
      <PageHeader eyebrow="Community" title="People and requests" description="Find members who have made their profile visible, or publish a request when you need a peer, an expert, or an example." />
      <div className="grid gap-4 md:grid-cols-2">
        <Link className="rounded-lg border border-line bg-white p-6" href="/community/members"><h2 className="font-serif text-2xl text-navy">Member directory</h2><p className="mt-2 text-sm text-muted">Search by expertise, institution, country, and theme. Email addresses are not listed.</p></Link>
        <Link className="rounded-lg border border-line bg-white p-6" href="/help-requests"><h2 className="font-serif text-2xl text-navy">Exchange</h2><p className="mt-2 text-sm text-muted">Open requests and responses, with explainable suggestions.</p></Link>
      </div>
    </div>
  );
}
