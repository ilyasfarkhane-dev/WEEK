import Link from "next/link";

const steps = [
  ["Discover", "Name a real governance or public-service challenge, with its context and evidence."],
  ["Collaborate", "Work with a thematic team, peers, and invited experts."],
  ["Develop", "Shape a Solution Canvas that can be reviewed and revised."],
  ["Authorize", "Separate personal commitment from formal institutional approval."],
  ["Test", "Run only a pilot that has the required authorization."],
  ["Learn", "Record evidence, decide whether to continue, and share what is reusable."],
];

export default function HomePage() {
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
