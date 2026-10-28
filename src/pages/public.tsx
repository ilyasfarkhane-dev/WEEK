import { Link } from "@/components/link";
import { PageHeader } from "@/components/chrome";

const steps = [
  ["Discover", "Name a real governance or public-service challenge, with its context and evidence."],
  ["Collaborate", "Work with a thematic team, peers, and invited experts."],
  ["Develop", "Shape a Solution Canvas that can be reviewed and revised."],
  ["Authorize", "Separate personal commitment from formal institutional approval."],
  ["Test", "Run only a pilot that has the required authorization."],
  ["Learn", "Record evidence, decide whether to continue, and share what is reusable."],
];

export function HomePage() {
  return (
    <div>
      <section className="bg-navy text-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-[1.3fr_0.7fr] md:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-soft">Six-month institutional programme</p>
            <h1 className="mt-5 max-w-2xl font-serif text-4xl leading-[1.05] md:text-6xl">Carry the work past the summit.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">
              Public officials, institutions, and invited experts use this community to name a challenge, shape a proposal, obtain authorization, test it, and keep the learning usable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="rounded-md bg-white px-4 py-3 text-sm font-semibold text-navy" href="/login">Sign in</Link>
              <Link className="rounded-md border border-white/25 px-4 py-3 text-sm font-semibold text-white" href="/programme">Read the programme</Link>
            </div>
          </div>
          <aside className="border-s border-white/15 ps-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Inside the workspace</p>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-white/85">
              <li>Eight thematic teams for the first cohort.</li>
              <li>A challenge register with a recorded review.</li>
              <li>Solution Canvases that keep every revision.</li>
              <li>Peer requests, events, and a curated library.</li>
            </ul>
          </aside>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between gap-6 border-b border-line pb-4">
          <h2 className="font-serif text-3xl text-navy">The journey</h2>
          <p className="hidden max-w-sm text-sm leading-6 text-muted md:block">Each step is a record in the platform, not a slide in a workshop.</p>
        </div>
        <ol className="mt-2">
          {steps.map(([title, body], index) => (
            <li key={title} className="grid gap-2 border-b border-line py-5 sm:grid-cols-[4rem_12rem_1fr] sm:items-baseline">
              <p className="font-serif text-2xl text-teal">0{index + 1}</p>
              <h3 className="font-serif text-2xl text-navy">{title}</h3>
              <p className="text-sm leading-6 text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

const themes = [
  "Citizens as Co-Creators",
  "Anticipatory Government",
  "Omnichannel Service Delivery",
  "Personalized Public Services",
  "Inclusive Emerging Technologies",
  "Climate-Resilient Public Services",
  "Public–Private Innovation Partnerships",
  "Mindsets and Future Skills",
];

const cadence = [
  "Four weeks of pre-summit onboarding",
  "Summit and thematic workshops",
  "Day 30, day 60, and day 90 reviews",
  "Monthly problem-solving clinics",
  "Quarterly demonstration sessions",
  "A month-six learning and renewal review",
];

export function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <PageHeader eyebrow="About" title="A working space for a public cohort" description="GIC is designed for senior public officials and the institutions that authorize their work. It is a record of collaboration, not a public showcase of unfinished institutional business." />
      <div className="space-y-5 text-base leading-8 text-ink">
        <p>Participants keep a primary thematic team and may contribute to other workspaces when they are invited. Facilitators guide the work. Programme managers look after the cohort. Institutional sponsors see a portfolio only where access has been granted.</p>
        <p>Confidential project narratives stay with the people authorized to read them. A role title alone does not open another institution’s file.</p>
        <p>The first interface language is English. French and Arabic preferences are stored, and Arabic selection uses a right-to-left layout, so later translations do not require a new structure.</p>
      </div>
    </article>
  );
}

export function ProgrammePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <PageHeader eyebrow="Programme" title="From a challenge to a decision" description="The cohort works for six months. The platform is meant to stay useful before the summit, during the workshops, and afterwards." />
      <h2 className="font-serif text-2xl text-navy">Thematic workspaces</h2>
      <ol className="mt-4 list-decimal space-y-2 ps-5 text-sm leading-6">{themes.map((theme) => <li key={theme}>{theme}</li>)}</ol>
      <h2 className="mt-10 font-serif text-2xl text-navy">Cadence</h2>
      <ul className="mt-4 list-disc space-y-2 ps-5 text-sm leading-6">{cadence.map((item) => <li key={item}>{item}</li>)}</ul>
      <p className="mt-8 text-sm leading-6 text-muted">Proposed targets for a pilot cohort are configured inside the programme settings. They are not results, and this public page does not present them as achievements.</p>
    </article>
  );
}

export function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <PageHeader eyebrow="Privacy" title="What this platform stores" description="This notice describes the product’s data practices. A deployment should replace it with the host institution’s legal notice before production use." />
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
