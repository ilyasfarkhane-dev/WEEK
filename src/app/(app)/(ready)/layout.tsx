import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/authz";
import { requireUser, toActor } from "@/server/actor";

export default async function ReadyLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const actor = toActor(user);
  if (!user.onboardingCompletedAt && !isPlatformAdmin(actor)) redirect("/onboarding");
  return children;
}
