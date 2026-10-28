"use client";

import { useRef, useState } from "react";
import { saveCanvasAction } from "@/client/actions";
import { Textarea } from "@/components/ui/primitives";

type Field = { key: string; label: string; helpText: string; required: boolean };

export function CanvasEditor({
  canvasId,
  initial,
  updatedAt,
  fields,
  canEdit,
}: {
  canvasId: string;
  initial: Record<string, string>;
  updatedAt: string;
  fields: Field[];
  canEdit: boolean;
}) {
  const [content, setContent] = useState(initial);
  const [stamp, setStamp] = useState(updatedAt);
  const [status, setStatus] = useState("All changes saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update(key: string, value: string) {
    const next = { ...content, [key]: value };
    setContent(next);
    if (!canEdit) return;
    setStatus("Saving…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const result = await saveCanvasAction({ canvasId, updatedAt: stamp, content: next });
      if (!result.ok) {
        setStatus(result.conflict ? result.message : "Could not save. Your latest edit is still on this page.");
        return;
      }
      if (result.data && "updatedAt" in result.data && typeof result.data.updatedAt === "string") {
        setStamp(result.data.updatedAt);
      }
      setStatus("All changes saved");
    }, 1200);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted" role="status" aria-live="polite">{canEdit ? status : "You can read this canvas. Editing is limited to authorized contributors."}</p>
      {fields.map((field) => (
        <section key={field.key} id={field.key} className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-serif text-2xl text-navy">{field.label}{field.required ? <span className="text-danger"> *</span> : null}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{field.helpText}</p>
          <Textarea
            className="mt-4"
            aria-label={field.label}
            value={content[field.key] ?? ""}
            disabled={!canEdit}
            onChange={(event) => update(field.key, event.target.value)}
          />
        </section>
      ))}
    </div>
  );
}
