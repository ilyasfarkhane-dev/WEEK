import { PageHeader } from "@/components/chrome";

export const metadata = { title: "Programme" };

const themes = [
  "Citizens as Co-Creators",
  "Anticipatory Government",
  "Omnichannel Service Delivery",
  "Personalized Public Services",
  "Inclusive Emerging Technologies",
  "Climate-Resilient Public Services",
  "Public–Private Innovation Partnerships",
  "Mindsets and Future Skills",
];

const cadence = [
  "Four weeks of pre-summit onboarding",
  "Summit and thematic workshops",
  "Day 30, day 60, and day 90 reviews",
  "Monthly problem-solving clinics",
  "Quarterly demonstration sessions",
  "A month-six learning and renewal review",
];

export default function ProgrammePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <PageHeader
        eyebrow="Programme"
        title="From a challenge to a decision"
        description="The cohort works for six months. The platform is meant to stay useful before the summit, during the workshops, and afterwards."
      />
      <h2 className="font-serif text-2xl text-navy">Thematic workspaces</h2>
      <ol className="mt-4 list-decimal space-y-2 ps-5 text-sm leading-6">
        {themes.map((theme) => <li key={theme}>{theme}</li>)}
      </ol>
      <h2 className="mt-10 font-serif text-2xl text-navy">Cadence</h2>
      <ul className="mt-4 list-disc space-y-2 ps-5 text-sm leading-6">
        {cadence.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <p className="mt-8 text-sm leading-6 text-muted">Proposed targets for a pilot cohort are configured inside the programme settings. They are not results, and this public page does not present them as achievements.</p>
    </article>
  );
}
