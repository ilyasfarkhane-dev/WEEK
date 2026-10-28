import Link from "next/link";

export default function NotFound() {
  return (
    <main id="content" className="mx-auto max-w-xl px-4 py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">404</p>
      <h1 className="mt-3 font-serif text-4xl text-navy">That page is not available</h1>
      <p className="mt-4 text-sm leading-6 text-muted">The address may be wrong, or the record is not visible to this session. Restricted records respond in the same way.</p>
      <Link className="mt-6 inline-block text-sm font-semibold text-teal" href="/">Go to the public site</Link>
    </main>
  );
}
