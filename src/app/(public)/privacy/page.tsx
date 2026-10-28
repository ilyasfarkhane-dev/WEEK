import { PageHeader } from "@/components/chrome";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <PageHeader
        eyebrow="Privacy"
        title="What this platform stores"
        description="This notice describes the product’s data practices. A deployment should replace it with the host institution’s legal notice before production use."
      />
      <div className="space-y-4 text-sm leading-7 text-ink">
        <p>The platform stores account data, a professional profile, workspace membership, and the records you create: challenges, projects, comments, requests, and event registrations. It does not ask for personal contact details beyond the email used to sign in.</p>
        <p>Profile visibility is private, team, or programme. Email addresses are shown to administrators, not in the member directory. Confidential and restricted project narratives are not visible to the rest of the community.</p>
        <p>You may archive your own account from settings. Archiving removes the password, replaces the name and email, and clears biography and expertise fields. Project history can remain so that institutional records are not silently destroyed. A platform administrator can perform the same archival step.</p>
        <p>Email is not sent unless a provider is configured. In-app notifications remain the reliable channel in this build. No content is sent to an AI service; the AI interface is disabled.</p>
        <p>Demonstration data, when loaded, is synthetic and labelled in the interface.</p>
      </div>
    </article>
  );
}
