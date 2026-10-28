import { PageHeader } from "@/components/chrome";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <PageHeader
        eyebrow="About"
        title="A working space for a public cohort"
        description="GIC is designed for senior public officials and the institutions that authorize their work. It is a record of collaboration, not a public showcase of unfinished institutional business."
      />
      <div className="space-y-5 text-base leading-8 text-ink">
        <p>Participants keep a primary thematic team and may contribute to other workspaces when they are invited. Facilitators guide the work. Programme managers look after the cohort. Institutional sponsors see a portfolio only where access has been granted.</p>
        <p>Confidential project narratives stay with the people authorized to read them. A role title alone does not open another institution’s file.</p>
        <p>The first interface language is English. French and Arabic preferences are stored, and Arabic selection uses a right-to-left layout, so later translations do not require a new structure.</p>
      </div>
    </article>
  );
}
