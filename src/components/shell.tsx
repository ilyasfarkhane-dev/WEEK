import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { logoutAction } from "@/client/actions";
import { useRefreshSession } from "@/client/session";
import { Link } from "@/components/link";
import {
  Bell,
  CalendarDays,
  Flag,
  FolderKanban,
  Layers,
  LayoutDashboard,
  Library,
  Menu,
  MessagesSquare,
  Shield,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Workspaces", href: "/themes", icon: Layers },
  { label: "Challenges", href: "/challenges", icon: Flag },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Exchange", href: "/help-requests", icon: MessagesSquare },
  { label: "Knowledge", href: "/knowledge", icon: Library },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Community", href: "/community/members", icon: Users },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

export function AppShell({
  children,
  name,
  roles,
  phase,
  unread,
  showAdmin,
}: {
  children: React.ReactNode;
  name: string;
  roles: string;
  phase: string;
  unread: number;
  showAdmin: boolean;
}) {
  const pathname = useLocation().pathname;
  const navigate = useNavigate();
  const refresh = useRefreshSession();
  const [open, setOpen] = useState(false);
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const nav = (
    <nav aria-label="Member" className="flex flex-col gap-0.5">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Programme</p>
      {links.map((item) => {
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
              active ? "bg-navy text-white" : "text-ink hover:bg-sand",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {item.href === "/notifications" && unread > 0 ? (
              <span className={cn("rounded-full px-1.5 py-0.5 text-xs", active ? "bg-white/20" : "bg-teal text-white")}>{unread}</span>
            ) : null}
          </Link>
        );
      })}
      {showAdmin ? (
        <Link
          href="/admin"
          onClick={() => setOpen(false)}
          className={cn(
            "mt-4 flex items-center gap-3 rounded-md px-3 py-2 text-sm",
            pathname.startsWith("/admin") ? "bg-navy text-white" : "text-ink hover:bg-sand",
          )}
        >
          <Shield className="h-4 w-4" aria-hidden="true" />
          Administration
        </Link>
      ) : null}
    </nav>
  );

  const identity = (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-soft text-xs font-semibold text-teal" aria-hidden="true">
        {initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-navy">{name}</p>
        <p className="truncate text-xs text-muted">{roles}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-line bg-white px-3 py-5 md:flex">
          <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-navy font-serif text-sm text-white">Gi</span>
            <span>
              <span className="block font-serif text-lg leading-none text-navy">GIC</span>
              <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-muted">Community</span>
            </span>
          </Link>
          <div className="flex-1 overflow-y-auto">{nav}</div>
          <div className="mt-4 border-t border-line px-2 pt-4">
            {identity}
            <button
              className="mt-3 text-sm text-muted underline-offset-4 hover:text-navy hover:underline"
              type="button"
              onClick={async () => {
                const result = await logoutAction();
                await refresh();
                navigate(result.ok && result.data?.redirect ? result.data.redirect : "/");
              }}
            >
              Sign out
            </button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4 border-b border-line bg-white/80 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <button className="rounded-md border border-line bg-white p-2 md:hidden" type="button" aria-expanded={open} aria-label="Open menu" onClick={() => setOpen(true)}>
                <Menu className="h-5 w-5" />
              </button>
              <p className="text-sm text-muted">
                <span className="me-2 inline-block h-1.5 w-1.5 rounded-full bg-teal align-middle" aria-hidden="true" />
                {phase}
              </p>
            </div>
            <Link className="text-sm font-semibold text-navy" href="/profile">
              {name}
            </Link>
          </div>
          {open ? (
            <div className="fixed inset-0 z-40 bg-navy-deep/40 md:hidden" onClick={() => setOpen(false)}>
              <div className="flex h-full w-80 max-w-[85%] flex-col bg-white p-4 text-ink shadow-xl" onClick={(event) => event.stopPropagation()}>
                <div className="mb-6 flex items-center justify-between">
                  <span className="font-serif text-xl text-navy">GIC</span>
                  <button className="rounded-md p-2" type="button" aria-label="Close menu" onClick={() => setOpen(false)}>
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {nav}
                <div className="mt-auto border-t border-line px-2 pt-4">
                  {identity}
                  <button
                    className="mt-3 text-sm text-muted underline-offset-4 hover:text-navy hover:underline"
                    type="button"
                    onClick={async () => {
                      const result = await logoutAction();
                      await refresh();
                      navigate(result.ok && result.data?.redirect ? result.data.redirect : "/");
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          <main id="content" className="mx-auto max-w-6xl px-4 py-8 md:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
