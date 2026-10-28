import { Link } from "@/components/link";
import { ActionForm } from "@/components/action-form";
import { EmptyState, PageHeader, Pagination } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { useView } from "@/client/use-view";
import { formatDateTime } from "@/lib/format";
import { label } from "@/lib/labels";

function Pending({ status }: { status: string }) {
  if (status === "loading") return <p className="text-sm text-muted" role="status">Loading the workspace…</p>;
  if (status === "missing") return <p className="text-sm">That page is not available.</p>;
  return <p className="text-sm text-danger">This page could not be loaded.</p>;
}

export function ThemesPage() {
  const view = useView<{ themes: Array<{ id: string; slug: string; name: string; summary: string; sortOrder: number; mine: boolean; facilitator: { name: string } | null; _count: { memberships: number; projects: number } }> }>();
  if (view.status !== "ready") return <Pending status={view.status} />;
  return (
    <div>
      <PageHeader eyebrow="Cohort" title="Thematic workspaces" description="Each participant has one primary team and may contribute elsewhere when invited." />
      <div className="grid gap-4 md:grid-cols-2">
        {view.data.themes.map((theme) => (
          <article key={theme.id} className="rounded-lg border border-line bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">{theme.mine ? "Your workspace" : `Workspace ${theme.sortOrder}`}</p>
            <h2 className="mt-2 font-serif text-2xl text-navy"><Link href={`/themes/${theme.slug}`}>{theme.name}</Link></h2>
            <p className="mt-2 text-sm leading-6 text-muted">{theme.summary}</p>
            <p className="mt-3 text-sm text-muted">{theme.facilitator ? `Facilitator: ${theme.facilitator.name}` : "Facilitator not assigned"} · {theme._count.memberships} members · {theme._count.projects} projects</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ChallengesPage() {
  const view = useView<{ page: number; pages: number; q: string; status: string; theme: string; country: string; canCreate: boolean; themes: Array<{ id: string; slug: string; name: string }>; countries: Array<{ code: string; name: string }>; rows: Array<{ id: string; code: string; title: string; status: string; theme: { name: string }; country: { name: string }; institution: { name: string } }> }>();
  if (view.status !== "ready") return <Pending status={view.status} />;
  const data = view.data;
  return (
    <div>
      <PageHeader eyebrow="Challenge register" title="Challenges" description="Submit a public-service problem, follow its review, and see whether it is taken into collaboration." actions={data.canCreate ? <Link className={buttonClass()} href="/challenges/new">Submit a challenge</Link> : null} />
      <form className="mb-6 grid gap-3 rounded-lg border border-line bg-white p-4 md:grid-cols-5" method="get">
        <input className="rounded-md border border-line px-3 py-2 text-sm md:col-span-2" name="q" defaultValue={data.q} placeholder="Search title or identifier" aria-label="Search challenges" />
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="status" defaultValue={data.status} aria-label="Status"><option value="">Any status</option>{["SUBMITTED", "UNDER_REVIEW", "SELECTED", "MERGED", "REFERRED", "RETAINED", "CLOSED"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="theme" defaultValue={data.theme} aria-label="Theme"><option value="">Any theme</option>{data.themes.map((theme) => <option key={theme.id} value={theme.slug}>{theme.name}</option>)}</select>
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="country" defaultValue={data.country} aria-label="Country"><option value="">Any country</option>{data.countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select>
        <button className={buttonClass("secondary", "sm")} type="submit">Apply filters</button>
      </form>
      {data.rows.length === 0 ? <EmptyState title="No challenges in this view" body="Adjust the filters, or submit a challenge from a workspace you belong to." action={<Link className={buttonClass()} href="/challenges/new">Submit a challenge</Link>} /> : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[720px] text-start text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted"><tr><th className="px-4 py-3 font-semibold">Identifier</th><th className="px-4 py-3 font-semibold">Title</th><th className="px-4 py-3 font-semibold">Theme</th><th className="px-4 py-3 font-semibold">Country</th><th className="px-4 py-3 font-semibold">Status</th></tr></thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-3"><Link className="font-semibold text-navy" href={`/challenges/${row.id}`}>{row.title}</Link><p className="text-muted">{row.institution.name}</p></td>
                  <td className="px-4 py-3">{row.theme.name}</td>
                  <td className="px-4 py-3">{row.country.name}</td>
                  <td className="px-4 py-3"><Badge>{label(row.status)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={data.page} pages={data.pages} path={`/challenges?q=${encodeURIComponent(data.q)}&status=${data.status}&theme=${data.theme}&country=${data.country}`} />
    </div>
  );
}

export function ProjectsPage() {
  const view = useView<{ page: number; pages: number; q: string; stage: string; theme: string; canCreate: boolean; themes: Array<{ id: string; slug: string; name: string }>; rows: Array<{ id: string; code: string; title: string; stage: string; status: string; theme: string; country: string; institution: string }> }>();
  if (view.status !== "ready") return <Pending status={view.status} />;
  const data = view.data;
  return (
    <div>
      <PageHeader eyebrow="Lifecycle" title="Projects" description="A project keeps its history when it is paused, revised, or closed. Testing stages require a recorded institutional authorization." actions={data.canCreate ? <Link className={buttonClass()} href="/projects/new">Open a project</Link> : null} />
      <form className="mb-6 grid gap-3 rounded-lg border border-line bg-white p-4 md:grid-cols-4" method="get">
        <input className="rounded-md border border-line px-3 py-2 text-sm" name="q" defaultValue={data.q} aria-label="Search projects" placeholder="Search" />
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="stage" defaultValue={data.stage} aria-label="Stage"><option value="">Any stage</option>{["PROBLEM_DEFINED", "PROPOSAL_DEVELOPED", "AUTHORIZATION_SOUGHT", "TEST_APPROVED", "TESTING", "EVIDENCE_REVIEWED", "DECISION_RECORDED"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="theme" defaultValue={data.theme} aria-label="Theme"><option value="">Any theme</option>{data.themes.map((theme) => <option key={theme.id} value={theme.slug}>{theme.name}</option>)}</select>
        <button className={buttonClass("secondary", "sm")} type="submit">Apply</button>
      </form>
      {data.rows.length === 0 ? <EmptyState title="No projects in this view" body="Open a project from a challenge, or change the filters." /> : (
        <ul className="space-y-3">
          {data.rows.map((project) => (
            <li key={project.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-muted">{project.code}</span><Badge>{label(project.stage)}</Badge><Badge tone="neutral">{label(project.status)}</Badge></div>
              <Link className="mt-2 block font-serif text-2xl text-navy" href={`/projects/${project.id}`}>{project.title}</Link>
              <p className="mt-1 text-sm text-muted">{project.theme} · {project.country} · {project.institution}</p>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={data.page} pages={data.pages} path={`/projects?q=${encodeURIComponent(data.q)}&stage=${data.stage}&theme=${data.theme}`} />
    </div>
  );
}

export function HelpPage() {
  const view = useView<{ page: number; pages: number; q: string; canCreate: boolean; rows: Array<{ id: string; title: string; kind: string; status: string; requester: { name: string; institution: { name: string } | null }; theme: { name: string } | null }> }>();
  if (view.status !== "ready") return <Pending status={view.status} />;
  const data = view.data;
  return (
    <div>
      <PageHeader eyebrow="Peer and expert exchange" title="Requests" description="Ask for help, offer expertise, or request an example. Matches are explained. Private profile details are not disclosed." actions={data.canCreate ? <Link className={buttonClass()} href="/help-requests/new">New request</Link> : null} />
      <form className="mb-6 flex flex-wrap gap-3" method="get">
        <input className="rounded-md border border-line bg-white px-3 py-2 text-sm" name="q" defaultValue={data.q} aria-label="Search requests" placeholder="Search expertise, title, or description" />
        <button className={buttonClass("secondary", "sm")} type="submit">Search</button>
      </form>
      {data.rows.length === 0 ? <EmptyState title="No requests" body="Publish a request if you need a peer, an example, or a review." /> : (
        <ul className="space-y-3">
          {data.rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex gap-2"><Badge>{label(row.kind)}</Badge><Badge tone="neutral">{label(row.status)}</Badge></div>
              <Link className="mt-2 block font-serif text-2xl text-navy" href={`/help-requests/${row.id}`}>{row.title}</Link>
              <p className="text-sm text-muted">{row.requester.name}{row.requester.institution ? ` · ${row.requester.institution.name}` : ""}{row.theme ? ` · ${row.theme.name}` : ""}</p>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={data.page} pages={data.pages} path={`/help-requests?q=${encodeURIComponent(data.q)}`} />
    </div>
  );
}

export function KnowledgePage() {
  const view = useView<{ q: string; canCreate: boolean; rows: Array<{ id: string; title: string; verification: string; type: string; featured: boolean; language: string; theme: { name: string } | null }> }>();
  if (view.status !== "ready") return <Pending status={view.status} />;
  const data = view.data;
  return (
    <div>
      <PageHeader eyebrow="Library" title="Knowledge" description="Verified resources, community contributions, and drafts are labelled differently. Featuring is a curator’s choice, not a claim of impact." actions={data.canCreate ? <Link className={buttonClass()} href="/knowledge/new">Add a resource</Link> : null} />
      <form className="mb-6 flex flex-wrap gap-3" method="get">
        <input className="rounded-md border border-line bg-white px-3 py-2 text-sm" name="q" defaultValue={data.q} aria-label="Search knowledge" placeholder="Search title or description" />
        <button className={buttonClass("secondary", "sm")} type="submit">Search</button>
      </form>
      {data.rows.length === 0 ? <EmptyState title="Nothing in the library yet" body="Managers can verify a contribution after review." /> : (
        <ul className="space-y-3">
          {data.rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-wrap gap-2"><Badge tone={row.verification === "VERIFIED" ? "ok" : row.verification === "DRAFT" ? "gold" : "neutral"}>{label(row.verification)}</Badge><Badge>{label(row.type)}</Badge>{row.featured ? <Badge tone="teal">Featured</Badge> : null}</div>
              <Link className="mt-2 block font-serif text-2xl text-navy" href={`/knowledge/${row.id}`}>{row.title}</Link>
              <p className="text-sm text-muted">{row.theme?.name ?? "Cross-cutting"} · {label(row.language)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EventsPage() {
  const view = useView<{ canManage: boolean; events: Array<{ id: string; title: string; kind: string; startsAt: string; endsAt: string; timeZone: string; theme: { name: string } | null; _count: { registrations: number } }> }>();
  if (view.status !== "ready") return <Pending status={view.status} />;
  const upcoming = view.data.events.filter((event) => new Date(event.endsAt) >= new Date());
  const past = view.data.events.filter((event) => new Date(event.endsAt) < new Date());
  return (
    <div>
      <PageHeader eyebrow="Calendar" title="Events" description="Onboarding, the summit, reviews, clinics, and demonstrations. Registration is stored here. Email reminders are sent only when a provider is configured." actions={view.data.canManage ? <Link className={buttonClass()} href="/events/new">Schedule</Link> : null} />
      {view.data.events.length === 0 ? <EmptyState title="No events yet" body="Programme managers can add the cohort calendar." /> : null}
      <EventList title="Upcoming" events={upcoming} />
      <EventList title="Earlier" events={past} />
    </div>
  );
}

function EventList({ title, events }: { title: string; events: Array<{ id: string; title: string; kind: string; startsAt: string; timeZone: string; theme: { name: string } | null; _count: { registrations: number } }> }) {
  if (events.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="font-serif text-2xl text-navy">{title}</h2>
      <ul className="mt-3 space-y-3">
        {events.map((event) => (
          <li key={event.id} className="rounded-lg border border-line bg-white p-4">
            <Badge>{label(event.kind)}</Badge>
            <Link className="mt-2 block font-serif text-2xl text-navy" href={`/events/${event.id}`}>{event.title}</Link>
            <p className="text-sm text-muted">{formatDateTime(event.startsAt, event.timeZone)}{event.theme ? ` · ${event.theme.name}` : ""} · {event._count.registrations} registrations</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CommunityPage() {
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

export function MembersPage() {
  const view = useView<{ q: string; country: string; institution: string; theme: string; countries: Array<{ code: string; name: string }>; institutions: Array<{ id: string; name: string }>; themes: Array<{ id: string; slug: string; name: string }>; people: Array<{ id: string; name: string; title: string; institution: string; expertise: string[]; themes: string[]; visibility: string }> }>();
  if (view.status !== "ready") return <Pending status={view.status} />;
  const data = view.data;
  return (
    <div>
      <PageHeader eyebrow="Directory" title="Members" description="Profiles set to private are omitted. Contact emails are not shown." />
      <form className="mb-6 grid gap-3 md:grid-cols-4" method="get">
        <input className="rounded-md border border-line bg-white px-3 py-2 text-sm" name="q" defaultValue={data.q} aria-label="Search members" placeholder="Name, title, or expertise" />
        <select className="rounded-md border border-line bg-white px-3 py-2 text-sm" name="country" defaultValue={data.country} aria-label="Country"><option value="">Any country</option>{data.countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select>
        <select className="rounded-md border border-line bg-white px-3 py-2 text-sm" name="institution" defaultValue={data.institution} aria-label="Institution"><option value="">Any institution</option>{data.institutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select className="rounded-md border border-line bg-white px-3 py-2 text-sm" name="theme" defaultValue={data.theme} aria-label="Theme"><option value="">Any theme</option>{data.themes.map((theme) => <option key={theme.id} value={theme.slug}>{theme.name}</option>)}</select>
        <button className="rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white" type="submit">Search</button>
      </form>
      {data.people.length === 0 ? <EmptyState title="No visible members" body="Try a broader search. People who chose a private profile will not appear." /> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.people.map((person) => (
            <li key={person.id} className="rounded-lg border border-line bg-white p-4 text-sm">
              <p className="font-semibold">{person.name}</p>
              <p className="text-muted">{person.title}{person.institution ? ` · ${person.institution}` : ""}</p>
              <p className="mt-2 text-muted">{person.expertise.join(", ") || "Expertise not listed"}</p>
              <p className="mt-1 text-muted">{person.themes.join(" · ")}</p>
              {person.visibility ? <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted">{label(person.visibility)} profile</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NotificationsPage() {
  const view = useView<{ openRequests: number; items: Array<{ id: string; type: string; title: string; body: string; href: string | null; createdAt: string; readAt: string | null }> }>();
  if (view.status !== "ready") return <Pending status={view.status} />;
  const data = view.data;
  return (
    <div>
      <PageHeader eyebrow="Inbox" title="Notifications" description="A short digest of recent notices. Email is not sent unless you enable it and a provider is configured." actions={<ActionForm name="notifications.read"><SubmitButton variant="secondary">Mark all read</SubmitButton></ActionForm>} />
      <p className="mb-4 text-sm text-muted">You have {data.openRequests} unresolved request{data.openRequests === 1 ? "" : "s"} that you opened.</p>
      {data.items.length === 0 ? <EmptyState title="No notifications" body="Assignments, reviews, and reminders will appear here." /> : (
        <ul className="space-y-3">
          {data.items.map((item) => (
            <li key={item.id} className="rounded-lg border border-line bg-white p-4 text-sm">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">{label(item.type)} · {formatDateTime(item.createdAt)}{item.readAt ? "" : " · Unread"}</p>
              <p className="mt-1 font-semibold">{item.title}</p>
              <p>{item.body}</p>
              {item.href ? <Link className="mt-2 inline-block font-semibold text-teal" href={item.href}>Open</Link> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
