import { Link } from "@/components/link";

export function PublicHeader() {
  return (
    <header className="border-b border-white/10 bg-navy text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-white font-serif text-sm text-navy">Gi</span>
          <span>
            <span className="block font-serif text-xl leading-none">GIC</span>
            <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-white/60">Governance Innovation</span>
          </span>
        </Link>
        <nav aria-label="Public" className="flex items-center gap-4 text-sm">
          <Link className="hidden text-white/75 hover:text-white sm:inline" href="/about">About</Link>
          <Link className="hidden text-white/75 hover:text-white sm:inline" href="/programme">Programme</Link>
          <Link className="hidden text-white/75 hover:text-white md:inline" href="/privacy">Privacy</Link>
          <Link className="rounded-md bg-white px-3 py-2 font-semibold text-navy" href="/login">Sign in</Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-muted md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-serif text-xl text-navy">Governance Innovation Community</p>
          <p className="mt-2 max-w-md leading-6">A six-month collaboration for public institutions. The working records stay with signed-in members.</p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <Link className="hover:text-navy" href="/about">About</Link>
          <Link className="hover:text-navy" href="/programme">Programme</Link>
          <Link className="hover:text-navy" href="/privacy">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
