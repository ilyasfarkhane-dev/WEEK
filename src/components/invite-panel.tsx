"use client";

import { useState } from "react";
import { inviteUserAction } from "@/client/actions";
import { Button } from "@/components/ui/button";
import { label } from "@/lib/labels";

export function InvitePanel({ themes, institutions }: { themes: { id: string; name: string }[]; institutions: { id: string; name: string }[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  return (
    <form
      className="grid gap-3 rounded-lg border border-line bg-white p-5 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const result = await inviteUserAction({
          fullName: form.get("fullName"),
          email: form.get("email"),
          roles: form.getAll("roles").map(String),
          themeId: String(form.get("themeId") || "") || undefined,
          institutionId: String(form.get("institutionId") || "") || undefined,
        });
        if (!result.ok) {
          setLink(null);
          setMessage(result.message);
          return;
        }
        setMessage(result.message ?? "Invitation created.");
        setLink(result.data && "link" in result.data ? String(result.data.link) : null);
      }}
    >
      {message ? <p className="text-sm md:col-span-2">{message}</p> : null}
      {link ? <p className="break-all text-sm md:col-span-2">Registration link: {link}</p> : null}
      <input className="rounded-md border border-line px-3 py-2 text-sm" name="fullName" aria-label="Full name" placeholder="Full name" required />
      <input className="rounded-md border border-line px-3 py-2 text-sm" type="email" name="email" aria-label="Email" placeholder="Email" required />
      <select className="rounded-md border border-line px-3 py-2 text-sm" name="themeId" aria-label="Workspace"><option value="">No primary workspace</option>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select>
      <select className="rounded-md border border-line px-3 py-2 text-sm" name="institutionId" aria-label="Institution"><option value="">No institution</option>{institutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <fieldset className="md:col-span-2">
        <legend className="text-sm font-semibold">Roles</legend>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          {["PARTICIPANT", "THEMATIC_FACILITATOR", "PROGRAMME_MANAGER", "INSTITUTIONAL_SPONSOR", "EXPERT", "PLATFORM_ADMIN"].map((role) => (
            <label key={role} className="flex items-center gap-2"><input type="checkbox" name="roles" value={role} defaultChecked={role === "PARTICIPANT"} />{label(role)}</label>
          ))}
        </div>
      </fieldset>
      <Button type="submit">Create invitation</Button>
    </form>
  );
}
