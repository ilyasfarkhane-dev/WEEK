"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { completeOnboardingAction, updateProfileAction } from "@/server/actions/profile";
import { createChallengeAction, createProjectAction } from "@/server/actions/collaboration";
import { createHelpRequestAction } from "@/server/actions/engagement";
import { challengeSchema, helpSchema, onboardingSchema, profileSchema, projectSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/primitives";
import { Alert } from "@/components/ui/primitives";

type Option = { id: string; label: string };

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-danger">{message}</p>;
}

export function ProfileForm({
  mode,
  rules,
  defaults,
  institutions,
  countries,
  tags,
  themes,
}: {
  mode: "onboarding" | "profile";
  rules?: string;
  defaults: {
    fullName: string;
    title: string;
    institutionId: string;
    countryCode: string;
    biography: string;
    expertise: string[];
    themesOfInterest: string[];
    expertiseOffered: string;
    supportRequested: string;
    preferredLanguage: "en" | "fr" | "ar";
    profileVisibility: "PROGRAMME" | "TEAM" | "PRIVATE";
  };
  institutions: Option[];
  countries: Option[];
  tags: Option[];
  themes: Option[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(mode === "onboarding" ? onboardingSchema : profileSchema),
    defaultValues: { ...defaults, acceptRules: false },
  });
  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={form.handleSubmit(async (values) => {
        setMessage(null);
        const result = mode === "onboarding" ? await completeOnboardingAction(values) : await updateProfileAction(values);
        if (!result.ok) setMessage(result.message);
        else if (mode === "onboarding") router.push("/dashboard");
        else setMessage(result.message ?? "Saved.");
      })}
    >
      {message ? <Alert tone={message.includes("saved") || message.includes("ready") ? "ok" : "danger"}>{message}</Alert> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" {...form.register("fullName")} />
          <ErrorText message={form.formState.errors.fullName?.message} />
        </div>
        <div>
          <Label htmlFor="title">Professional title</Label>
          <Input id="title" {...form.register("title")} />
        </div>
        <div>
          <Label htmlFor="countryCode">Country</Label>
          <Select id="countryCode" {...form.register("countryCode")}>
            <option value="">Select</option>
            {countries.map((country) => <option key={country.id} value={country.id}>{country.label}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="institutionId">Institution</Label>
          <Select id="institutionId" {...form.register("institutionId")}>
            <option value="">Select</option>
            {institutions.map((institution) => <option key={institution.id} value={institution.id}>{institution.label}</option>)}
          </Select>
          <ErrorText message={form.formState.errors.institutionId?.message} />
        </div>
      </div>
      <div>
        <Label htmlFor="biography">Professional biography</Label>
        <Textarea id="biography" {...form.register("biography")} />
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Areas of expertise</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {tags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" value={tag.id} {...form.register("expertise")} />
              {tag.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Governance themes of interest</legend>
        <div className="grid gap-2">
          {themes.map((theme) => (
            <label key={theme.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" value={theme.id} {...form.register("themesOfInterest")} />
              {theme.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <Label htmlFor="expertiseOffered">Expertise offered</Label>
        <Textarea id="expertiseOffered" {...form.register("expertiseOffered")} />
      </div>
      <div>
        <Label htmlFor="supportRequested">Support requested</Label>
        <Textarea id="supportRequested" {...form.register("supportRequested")} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="preferredLanguage">Preferred language</Label>
          <Select id="preferredLanguage" {...form.register("preferredLanguage")}>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="ar">العربية</option>
          </Select>
          <p className="mt-2 text-sm text-muted">The interface is in English for this release. Arabic selection also switches the layout direction.</p>
        </div>
        <div>
          <Label htmlFor="profileVisibility">Profile visibility</Label>
          <Select id="profileVisibility" {...form.register("profileVisibility")}>
            <option value="PROGRAMME">Visible to the programme</option>
            <option value="TEAM">Visible to my workspace</option>
            <option value="PRIVATE">Hidden from the directory</option>
          </Select>
        </div>
      </div>
      {mode === "onboarding" ? (
        <div className="rounded-md border border-line bg-sand p-4">
          <h2 className="font-serif text-xl text-navy">Participation rules</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">{rules}</p>
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input className="mt-1" type="checkbox" {...form.register("acceptRules")} />
            I accept these rules for this programme.
          </label>
          <ErrorText message={form.formState.errors.acceptRules?.message} />
        </div>
      ) : null}
      <Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? "Saving…" : "Save profile"}</Button>
    </form>
  );
}

export function ChallengeForm({ institutions, countries, themes }: { institutions: Option[]; countries: Option[]; themes: Option[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: "",
      problemStatement: "",
      institutionId: "",
      countryCode: "",
      context: "",
      affectedUsers: "",
      evidence: "",
      previousAttempts: "",
      expectedBenefit: "",
      themeId: themes[0]?.id ?? "",
      expertiseRequired: "",
      visibility: "TEAM" as const,
      confidentiality: "CONFIDENTIAL" as const,
    },
  });
  const fields: Array<[string, string, boolean]> = [
    ["title", "Title", false],
    ["problemStatement", "Problem statement", true],
    ["context", "Country and context", true],
    ["affectedUsers", "Affected users or stakeholders", true],
    ["evidence", "Supporting evidence", true],
    ["previousAttempts", "Previous attempts and lessons", true],
    ["expectedBenefit", "Expected benefit", true],
    ["expertiseRequired", "Expertise required", true],
  ];
  return (
    <form className="space-y-4" noValidate onSubmit={form.handleSubmit(async (values) => {
      const result = await createChallengeAction(values);
      if (!result.ok) setMessage(result.message);
      else if (result.data && "id" in result.data) router.push(`/challenges/${result.data.id}`);
    })}>
      {message ? <Alert tone="danger">{message}</Alert> : null}
      {fields.map(([name, label, area]) => (
        <div key={name}>
          <Label htmlFor={name}>{label}</Label>
          {area ? <Textarea id={name} {...form.register(name as "title")} /> : <Input id={name} {...form.register(name as "title")} />}
        </div>
      ))}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="countryCode">Country</Label>
          <Select id="countryCode" {...form.register("countryCode")}>{countries.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select>
        </div>
        <div>
          <Label htmlFor="institutionId">Owning institution</Label>
          <Select id="institutionId" {...form.register("institutionId")}>{institutions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select>
        </div>
        <div>
          <Label htmlFor="themeId">Theme</Label>
          <Select id="themeId" {...form.register("themeId")}>{themes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select>
        </div>
        <div>
          <Label htmlFor="visibility">Visibility</Label>
          <Select id="visibility" {...form.register("visibility")}>
            <option value="TEAM">Team</option>
            <option value="PRIVATE">Private</option>
            <option value="RESTRICTED">Restricted</option>
          </Select>
          <p className="mt-2 text-sm text-muted">Programme-wide visibility is applied by a reviewer, not at submission.</p>
        </div>
      </div>
      <Button disabled={form.formState.isSubmitting} type="submit">Submit challenge</Button>
    </form>
  );
}

export function ProjectForm({ institutions, countries, themes, challenges, members }: { institutions: Option[]; countries: Option[]; themes: Option[]; challenges: Option[]; members: Option[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: "",
      summary: "",
      institutionId: "",
      countryCode: "",
      themeId: themes[0]?.id ?? "",
      challengeId: "",
      visibility: "TEAM" as const,
      confidentiality: "CONFIDENTIAL" as const,
      collaboratorIds: [] as string[],
    },
  });
  return (
    <form className="space-y-4" noValidate onSubmit={form.handleSubmit(async (values) => {
      const result = await createProjectAction({ ...values, challengeId: values.challengeId || undefined });
      if (!result.ok) setMessage(result.message);
      else if (result.data && "id" in result.data) router.push(`/projects/${result.data.id}`);
    })}>
      {message ? <Alert tone="danger">{message}</Alert> : null}
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...form.register("title")} />
      </div>
      <div>
        <Label htmlFor="summary">Summary</Label>
        <Textarea id="summary" {...form.register("summary")} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="themeId">Workspace</Label>
          <Select id="themeId" {...form.register("themeId")}>{themes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select>
        </div>
        <div>
          <Label htmlFor="challengeId">Linked challenge</Label>
          <Select id="challengeId" {...form.register("challengeId")}><option value="">None yet</option>{challenges.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select>
        </div>
        <div>
          <Label htmlFor="countryCode">Country</Label>
          <Select id="countryCode" {...form.register("countryCode")}>{countries.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select>
        </div>
        <div>
          <Label htmlFor="institutionId">Owning institution</Label>
          <Select id="institutionId" {...form.register("institutionId")}>{institutions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select>
        </div>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Collaborators in this workspace</legend>
        <div className="grid max-h-48 gap-2 overflow-auto sm:grid-cols-2">
          {members.map((member) => (
            <label key={member.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" value={member.id} {...form.register("collaboratorIds")} />
              {member.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Button disabled={form.formState.isSubmitting} type="submit">Open project</Button>
    </form>
  );
}

export function HelpForm({ themes }: { themes: Option[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(helpSchema),
    defaultValues: {
      kind: "HELP_NEEDED" as const,
      title: "",
      description: "",
      themeId: "",
      skillsRequired: "",
      visibility: "TEAM" as const,
      priority: "NORMAL" as const,
      responseBy: "",
    },
  });
  return (
    <form className="space-y-4" noValidate onSubmit={form.handleSubmit(async (values) => {
      const result = await createHelpRequestAction(values);
      if (!result.ok) setMessage(result.message);
      else if (result.data && "id" in result.data) router.push(`/help-requests/${result.data.id}`);
    })}>
      {message ? <Alert tone="danger">{message}</Alert> : null}
      <div>
        <Label htmlFor="kind">Type</Label>
        <Select id="kind" {...form.register("kind")}>
          <option value="HELP_NEEDED">Help needed</option>
          <option value="EXPERTISE_OFFERED">Expertise offered</option>
          <option value="PEER_INSTITUTION">Peer institution</option>
          <option value="EXPERT_REVIEW">Expert review</option>
          <option value="EXAMPLES">Examples or resources</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...form.register("title")} />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...form.register("description")} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="themeId">Theme</Label>
          <Select id="themeId" {...form.register("themeId")}><option value="">None</option>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.label}</option>)}</Select>
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" {...form.register("priority")}>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="skillsRequired">Skills or experience required</Label>
        <Input id="skillsRequired" {...form.register("skillsRequired")} />
      </div>
      <div>
        <Label htmlFor="responseBy">Preferred response date</Label>
        <Input id="responseBy" type="date" {...form.register("responseBy")} />
      </div>
      <Button disabled={form.formState.isSubmitting} type="submit">Publish request</Button>
    </form>
  );
}
