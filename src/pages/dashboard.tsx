import { Link } from "@/components/link";
import { Badge, Card } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { label } from "@/lib/labels";
import { useView } from "@/client/use-view";

type DashboardData = {
  firstName: string;
  primaryName: string | null;
  metrics: null | {
    windowNote: string;
    stock: { participants: number; onboardingRate: number | null; activeParticipants: number };
    projects: { total: number };
  };
  announcements: Array<{ id: string; title: string; body: string }>;
  projects: Array<{ id: string; title: string; code: string; stage: string; theme: { name: string } }>;
  actions: Array<{ id: string; title: string; dueOn: string | null; status: string }>;
  events: Array<{ id: string; title: string; startsAt: string; timeZone: string }>;
  posts: Array<{ id: string; body: string; author: { name: string }; theme: { name: string } | null }>;
  requests: Array<{ id: string; title: string; status: string }>;
  notifications: Array<{ id: string; title: string; body: string }>;
  resources: Array<{ id: string; title: string }>;
  peers: Array<{ id: string; name: string; profile: { title: string } | null; institution: { name: string } | null; expertise: Array<{ tag: { label: string } }> }>;
};

export function DashboardPage() {
  const view = useView<DashboardData>();
  if (view.status === "loading") return <p className="text-sm text-muted" role="status">Loading the workspace…</p>;
  if (view.status !== "ready") return <p className="text-sm text-danger">The dashboard could not be loaded.</p>;
  const { firstName, primaryName, metrics, announcements, projects, actions, events, posts, requests, notifications, resources, peers } = view.data;
  return (
    <div>
      <section className="mb-8 overflow-hidden rounded-lg border border-line bg-navy text-white">
        <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_auto] md:items-end md:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Programme</p>
            <h1 className="mt-3 font-serif text-4xl">Welcome, {firstName}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">{primaryName ? `Your primary workspace is ${primaryName}.` : "You do not have a primary workspace yet."}</p>
          </div>
          <Link className={buttonClass("inverse", "sm")} href="/challenges/new">Submit a challenge</Link>
        </div>
      </section>
      {announcements.map((item) => (
        <Card key={item.id} className="mb-4 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Announcement</p>
          <h2 className="mt-2 font-serif text-2xl text-navy">{item.title}</h2>
          <p className="mt-2 text-sm leading-6">{item.body}</p>
        </Card>
      ))}
      {metrics ? (
        <section className="mb-8">
          <h2 className="mb-3 font-serif text-2xl text-navy">Programme snapshot</h2>
          <p className="mb-4 text-sm text-muted">{metrics.windowNote}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Registered participants" value={String(metrics.stock.participants)} />
            <Metric label="Onboarding complete" value={metrics.stock.onboardingRate === null ? "Insufficient data" : `${Math.round(metrics.stock.onboardingRate * 100)}%`} />
            <Metric label="Active in 30 days" value={String(metrics.stock.activeParticipants)} />
            <Metric label="Open projects" value={String(metrics.projects.total)} />
          </div>
          <Link className="mt-3 inline-block text-sm font-semibold text-teal" href="/admin/analytics">Open the monitoring view</Link>
        </section>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="p-5 lg:row-span-2">
          <h2 className="font-serif text-2xl text-navy">My projects</h2>
          {projects.length === 0 ? <p className="mt-3 text-sm text-muted">No active projects yet. <Link className="font-semibold text-teal" href="/projects/new">Open one</Link>.</p> : (
            <ul className="mt-4 space-y-3">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link className="font-semibold text-navy hover:text-teal" href={`/projects/${project.id}`}>{project.title}</Link>
                  <p className="text-sm text-muted">{project.code} · {label(project.stage)} · {project.theme.name}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="font-serif text-2xl text-navy">Pending actions</h2>
          {actions.length === 0 ? <p className="mt-3 text-sm text-muted">Nothing is waiting on you.</p> : (
            <ul className="mt-4 space-y-3">
              {actions.map((action) => (
                <li key={action.id} className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-sm font-semibold">{action.title}</span>
                    <span className="text-sm text-muted">{action.dueOn ? formatDate(action.dueOn) : "No deadline"}</span>
                  </span>
                  <Badge tone={action.dueOn && new Date(action.dueOn) < new Date() ? "danger" : "gold"}>{label(action.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="font-serif text-2xl text-navy">Upcoming sessions</h2>
          <ul className="mt-4 space-y-3">
            {events.length === 0 ? <li className="text-sm text-muted">No upcoming sessions in your workspaces.</li> : events.map((event) => (
              <li key={event.id}><Link className="font-semibold text-navy" href={`/events/${event.id}`}>{event.title}</Link><p className="text-sm text-muted">{formatDate(event.startsAt, event.timeZone)}</p></li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-serif text-2xl text-navy">Recent discussion</h2>
          <ul className="mt-4 space-y-3">
            {posts.length === 0 ? <li className="text-sm text-muted">Your workspaces have no recent posts.</li> : posts.map((post) => (
              <li key={post.id} className="text-sm"><span className="font-semibold">{post.author.name}</span> in {post.theme?.name}: {post.body.slice(0, 140)}</li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-serif text-2xl text-navy">Open requests</h2>
          <ul className="mt-4 space-y-3">
            {requests.length === 0 ? <li className="text-sm text-muted">No open requests in view. <Link className="font-semibold text-teal" href="/help-requests/new">Ask for help</Link>.</li> : requests.map((request) => (
              <li key={request.id}><Link className="font-semibold text-navy" href={`/help-requests/${request.id}`}>{request.title}</Link><p className="text-sm text-muted">{label(request.status)}</p></li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-serif text-2xl text-navy">Notifications</h2>
          <ul className="mt-4 space-y-3">
            {notifications.length === 0 ? <li className="text-sm text-muted">You are up to date.</li> : notifications.map((item) => (
              <li key={item.id} className="text-sm"><span className="font-semibold">{item.title}</span><p className="text-muted">{item.body}</p></li>
            ))}
          </ul>
          <Link className="mt-3 inline-block text-sm font-semibold text-teal" href="/notifications">Notification centre</Link>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-serif text-2xl text-navy">Featured resources</h2>
          <ul className="mt-4 space-y-3">
            {resources.length === 0 ? <li className="text-sm text-muted">No verified resources have been featured yet.</li> : resources.map((resource) => (
              <li key={resource.id}><Link className="font-semibold text-navy" href={`/knowledge/${resource.id}`}>{resource.title}</Link></li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-serif text-2xl text-navy">People with shared expertise</h2>
          <ul className="mt-4 space-y-3">
            {peers.length === 0 ? <li className="text-sm text-muted">Add expertise to your profile to see explainable matches. Private profiles are not recommended.</li> : peers.map((peer) => (
              <li key={peer.id} className="text-sm">
                <span className="font-semibold">{peer.name}</span>
                <p className="text-muted">{peer.profile?.title}{peer.institution ? ` · ${peer.institution.name}` : ""}</p>
                <p className="text-muted">Shared expertise: {peer.expertise.map((item) => item.tag.label).slice(0, 3).join(", ")}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label: title, value }: { label: string; value: string }) {
  return (
    <Card className="border-t-2 border-t-teal p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{title}</p>
      <p className="mt-2 font-serif text-3xl text-navy">{value}</p>
    </Card>
  );
}
