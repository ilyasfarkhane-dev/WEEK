import Link from "next/link";
import type { ProjectStage } from "@prisma/client";
import { Forbidden, PageHeader } from "@/components/chrome";
import { Card } from "@/components/ui/primitives";
import { StageChart } from "@/components/stage-chart";
import { canViewAnalytics } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { formatPercent } from "@/lib/format";
import { label } from "@/lib/labels";
import { compareTarget, STAGE_ORDER } from "@/lib/metrics";
import { requireActor } from "@/server/actor";
import { loadProgrammeMetrics, type MetricFilters } from "@/server/metrics-query";

export const metadata = { title: "Monitoring" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { actor } = await requireActor();
  if (!canViewAnalytics(actor)) return <Forbidden />;
  const filters: MetricFilters = {
    from: params.from ? new Date(params.from) : undefined,
    to: params.to ? new Date(params.to) : undefined,
    themeId: params.theme || undefined,
    countryCode: params.country || undefined,
    institutionId: params.institution || undefined,
    stage: (STAGE_ORDER.find((item) => item === params.stage) ?? undefined) as ProjectStage | undefined,
  };
  const [metrics, themes, countries, institutions] = await Promise.all([
    loadProgrammeMetrics(filters),
    prisma.theme.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" } }),
    prisma.country.findMany({ orderBy: { name: "asc" } }),
    prisma.institution.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
  ]);
  const targets = [
    ["Substantive contributors before the event", metrics.flow.contributors, metrics.targets.substantiveContributorsBeforeEvent],
    ["Reviewed Solution Canvases", metrics.projects.reviewedCanvases, metrics.targets.reviewedCanvases],
    ["Help requests answered within the working-day target", metrics.flow.helpOnTime, null],
    ["Formal sponsors by day 30", metrics.projects.sponsorsByDay30, metrics.targets.sponsorsByDay30],
    ["Contributors during days 61–90", metrics.projects.contributorsDays61to90, metrics.targets.contributorsDays61to90],
    ["Authorized tests within 90 days", metrics.projects.testsWithin90, metrics.targets.authorizedTestsWithin90Days],
  ] as const;
  return (
    <div>
      <PageHeader eyebrow={metrics.phaseLabel || "Monitoring"} title="Activity, progress, and outcomes" description="Figures are calculated from stored records. They describe activity and recorded decisions. They do not show that the programme caused an outcome." actions={<a className="text-sm font-semibold text-teal" href={`/api/admin/analytics/export?${new URLSearchParams(params as Record<string, string>).toString()}`}>Export CSV</a>} />
      {metrics.demonstration ? <p className="mb-4 text-sm text-warn">This environment includes demonstration records. Do not report them as programme results.</p> : null}
      <p className="mb-4 text-sm text-muted">{metrics.windowNote} {metrics.definition}</p>
      <form className="mb-6 grid gap-3 rounded-lg border border-line bg-white p-4 md:grid-cols-3" method="get">
        <input className="rounded-md border border-line px-3 py-2 text-sm" type="date" name="from" defaultValue={params.from} aria-label="From" />
        <input className="rounded-md border border-line px-3 py-2 text-sm" type="date" name="to" defaultValue={params.to} aria-label="To" />
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="theme" defaultValue={params.theme ?? ""} aria-label="Theme"><option value="">All themes</option>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select>
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="country" defaultValue={params.country ?? ""} aria-label="Country"><option value="">All countries</option>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select>
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="institution" defaultValue={params.institution ?? ""} aria-label="Institution"><option value="">All institutions</option>{institutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="stage" defaultValue={params.stage ?? ""} aria-label="Stage"><option value="">All stages</option>{STAGE_ORDER.map((stage) => <option key={stage} value={stage}>{label(stage)}</option>)}</select>
        <button className="rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white" type="submit">Apply</button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Registered participants" value={String(metrics.stock.participants)} />
        <Stat title="Onboarding" value={formatPercent(metrics.stock.onboardingRate)} />
        <Stat title="Active participants, 30 days" value={String(metrics.stock.activeParticipants)} />
        <Stat title="Events attended" value={String(metrics.flow.attendances)} />
        <Stat title="Requests published" value={String(metrics.flow.helpPublished)} />
        <Stat title="Requests with a response" value={String(metrics.flow.helpAnswered)} />
        <Stat title="Resources contributed" value={String(metrics.flow.resources)} />
        <Stat title="Meaningful contributions in filter" value={String(metrics.flow.contributors)} />
      </div>
      <Card className="mt-6 p-5">
        <h2 className="font-serif text-2xl text-navy">Projects by lifecycle stage</h2>
        <StageChart data={STAGE_ORDER.map((stage) => ({ stage: label(stage), count: metrics.projects.byStage[stage] }))} />
        <p className="text-sm text-muted">{metrics.projects.paused} paused · {metrics.projects.closed} closed or archived · {metrics.projects.canvases} canvases</p>
      </Card>
      <section className="mt-6">
        <h2 className="font-serif text-2xl text-navy">Proposed targets</h2>
        <p className="mt-2 text-sm text-muted">These are configuration values, not achievements. “Insufficient data” means the window or the denominator is missing.</p>
        <ul className="mt-4 space-y-3">
          {targets.map(([title, observed, target]) => {
            const state = compareTarget(observed, target);
            return (
              <li key={title} className="rounded-md border border-line bg-white p-4 text-sm">
                <p className="font-semibold">{title}</p>
                <p className="text-muted">Observed: {observed === null ? "Insufficient data" : observed}{target !== null ? ` · Proposed target: ${target}` : ""} · {state === "met" ? "At or above the proposed target" : state === "not_yet" ? "Below the proposed target" : "Insufficient data"}</p>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm text-muted">Help responses on time use a target of {metrics.targets.helpResponseWorkingDays} working days. Answered on time: {metrics.flow.helpOnTime ?? "Insufficient data"} of {metrics.flow.helpOnTimeDenominator}. Median working days to first response: {metrics.helpMedianDays ?? "Insufficient data"}.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-serif text-2xl text-navy">Outcome records by evidence level</h2>
        <ul className="mt-3 text-sm">{metrics.outcomes.map((row) => <li key={row.evidenceLevel}>{label(row.evidenceLevel)}: {row._count._all}</li>)}</ul>
        <p className="mt-2 text-sm text-muted">Self-reported values are not verified evidence. A blank list means no outcome records match the filter.</p>
      </section>
      <p className="mt-6 text-sm text-muted">A reviewed canvas, in this calculation, has every required section filled and at least one comment from a facilitator, programme manager, or administrator.</p>
      <Link className="mt-4 inline-block text-sm font-semibold text-teal" href="/admin/settings">Edit proposed targets</Link>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return <Card className="p-4"><p className="text-xs uppercase tracking-[0.12em] text-muted">{title}</p><p className="mt-2 font-serif text-3xl text-navy">{value}</p></Card>;
}
