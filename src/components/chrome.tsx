import { Link } from "@/components/link";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-navy/15 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? <p className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-teal"><span className="h-px w-8 bg-teal" aria-hidden="true" />{eyebrow}</p> : null}
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-navy md:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white px-6 py-12 text-center">
      <h2 className="font-serif text-2xl text-navy">{title}</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Forbidden({ body = "Your role does not include this record. Access is granted per workspace, project, or explicit permission." }: { body?: string }) {
  return (
    <div className="mx-auto max-w-xl py-16">
      <PageHeader eyebrow="Access" title="This page is not available to you" description={body} />
      <Link className="text-sm font-semibold text-teal underline-offset-4 hover:underline" href="/dashboard">
        Return to the dashboard
      </Link>
    </div>
  );
}

const NOTICES: Record<string, string> = {
  saved: "Changes saved.",
  forbidden: "That action is not available for your account.",
  invited: "Invitation created. Check the result for the registration link. Email is not sent unless a provider is configured.",
};

export function Notice({ code }: { code?: string }) {
  if (!code || !NOTICES[code]) return null;
  return <div className="mb-6 rounded-md border border-[#cfe5d8] bg-[#f3faf6] px-4 py-3 text-sm text-ok">{NOTICES[code]}</div>;
}

export function Pagination({ page, pages, path }: { page: number; pages: number; path: string }) {
  if (pages <= 1) return null;
  const href = (next: number) => {
    const [base, query = ""] = path.split("?");
    const params = new URLSearchParams(query);
    params.set("page", String(next));
    return `${base}?${params.toString()}`;
  };
  return (
    <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Pagination">
      <span className="text-muted">Page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 ? <Link className="rounded-md border border-line bg-white px-3 py-2" href={href(page - 1)}>Previous</Link> : null}
        {page < pages ? <Link className="rounded-md border border-line bg-white px-3 py-2" href={href(page + 1)}>Next</Link> : null}
      </div>
    </nav>
  );
}

export function DemoBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="border-b border-[#ead9b8] bg-[#fbf7ef] px-4 py-2 text-center text-sm text-warn">
      Demonstration environment. People, institutions, authorizations, and outcomes shown here are synthetic.
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-danger">{message}</p>;
}

export function DefinitionList({ items }: { items: { term: string; detail: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.term} className="rounded-md border border-line bg-white px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{item.term}</dt>
          <dd className="mt-1 text-sm leading-6 text-ink">{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Muted({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-6 text-muted", className)} {...props} />;
}
