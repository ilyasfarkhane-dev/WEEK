import { PageHeader } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { deleteOwnAccountAction, updateNotificationPreferencesAction } from "@/server/actions/profile";

export const metadata = { title: "Settings" };

const TYPES = ["INVITATION", "WORKSPACE_ASSIGNMENT", "COMMENT", "MENTION", "HELP_RESPONSE", "ACTION_ASSIGNMENT", "DEADLINE", "PROJECT_STAGE", "EVENT_REMINDER", "REVIEW_REQUEST", "SYSTEM"] as const;

export default async function SettingsPage() {
  const { actor } = await requireActor();
  const prefs = await prisma.notificationPreference.findUnique({ where: { userId: actor.id } });
  async function save(formData: FormData) {
    "use server";
    const mutedTypes = TYPES.filter((type) => formData.get(`mute-${type}`) === "on");
    await updateNotificationPreferencesAction({
      inAppEnabled: formData.get("inAppEnabled") === "on",
      emailEnabled: formData.get("emailEnabled") === "on",
      digestFrequency: (String(formData.get("digestFrequency")) || "DAILY") as "OFF" | "IMMEDIATE" | "DAILY" | "WEEKLY",
      mutedTypes,
    });
  }
  async function remove() {
    "use server";
    await deleteOwnAccountAction();
  }
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="Settings" title="Notifications and account" description="In-app notices are the default. Turning on email only queues messages. This build does not claim they were delivered." />
      <form action={save} className="space-y-4 rounded-lg border border-line bg-white p-5">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="inAppEnabled" defaultChecked={prefs?.inAppEnabled ?? true} /> In-app notifications</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="emailEnabled" defaultChecked={prefs?.emailEnabled ?? false} /> Queue email when a provider exists</label>
        <label className="block text-sm font-semibold">Email frequency
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" name="digestFrequency" defaultValue={prefs?.digestFrequency ?? "DAILY"}>
            <option value="OFF">Off</option>
            <option value="IMMEDIATE">Immediate, when email is enabled</option>
            <option value="DAILY">Daily digest preference</option>
            <option value="WEEKLY">Weekly digest preference</option>
          </select>
        </label>
        <fieldset>
          <legend className="text-sm font-semibold">Mute these in-app types</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={`mute-${type}`} defaultChecked={prefs?.mutedTypes.includes(type) ?? false} />
                {type.replaceAll("_", " ").toLowerCase()}
              </label>
            ))}
          </div>
        </fieldset>
        <SubmitButton>Save preferences</SubmitButton>
      </form>
      <form action={remove} className="rounded-lg border border-[#e7c7c7] bg-white p-5">
        <h2 className="font-serif text-2xl text-danger">Archive your account</h2>
        <p className="mt-2 text-sm leading-6 text-muted">This removes your password and clears your biography, expertise, and contact name. Project history may remain so other institutions do not lose their record. This cannot be undone from the screen.</p>
        <div className="mt-4"><SubmitButton variant="danger" pendingLabel="Archiving…">Archive my account</SubmitButton></div>
      </form>
    </div>
  );
}
