import { createHash } from "node:crypto";
import type { AppRole, ProjectStage } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_CANVAS_FIELDS } from "../src/lib/canvas";
import { prisma } from "../src/lib/db";
import { DEFAULT_TARGETS } from "../src/lib/metrics";
const PASSWORD = "Demo-GIC-2026!";
const SUMMIT = new Date("2026-11-16T09:00:00.000Z");

const countries = [
  ["MA", "Morocco"], ["FR", "France"], ["SN", "Senegal"], ["KE", "Kenya"], ["JO", "Jordan"],
  ["CL", "Chile"], ["EE", "Estonia"], ["SG", "Singapore"], ["CA", "Canada"], ["GH", "Ghana"],
  ["ID", "Indonesia"], ["PT", "Portugal"], ["JP", "Japan"], ["NZ", "New Zealand"], ["BR", "Brazil"],
];

const themes = [
  ["citizens-as-co-creators", "Citizens as Co-Creators", "Work with residents to design a service, not only consult them after it is built.", "Agree who is affected, how they take part, and what decision their input can change."],
  ["anticipatory-government", "Anticipatory Government", "Use foresight to prepare a service before a known pressure arrives.", "Name the signal the institution will watch and the decision it will rehearse."],
  ["omnichannel-service-delivery", "Omnichannel Service Delivery", "Make a service coherent across offices, phone, and digital channels.", "Pick one journey and remove a handoff that currently fails."],
  ["personalized-public-services", "Personalized Public Services", "Adapt a service to a person’s situation without creating a new exclusion.", "Define the data used, the safeguard, and the people who must not be disadvantaged."],
  ["inclusive-emerging-technologies", "Inclusive Emerging Technologies", "Try a new tool only where the institution can explain and govern it.", "State the human decision that the tool will not replace."],
  ["climate-resilient-public-services", "Climate-Resilient Public Services", "Prepare a frontline service for heat, flood, or another local climate stress.", "Connect the operational change to a specific risk the institution already recognizes."],
  ["public-private-innovation-partnerships", "Public–Private Innovation Partnerships", "Set terms for working with an external partner before a pilot begins.", "Clarify ownership of learning, data, and the decision to stop."],
  ["mindsets-and-future-skills", "Mindsets and Future Skills", "Build the team practices a new service needs.", "Name the skill the team will practise during the six months, and how it will be supported."],
];

const tags = [
  ["service-design", "Service design"], ["digital-inclusion", "Digital inclusion"], ["foresight", "Foresight"],
  ["data-governance", "Data governance"], ["climate-adaptation", "Climate adaptation"], ["procurement", "Procurement"],
  ["evaluation", "Evaluation"], ["community-engagement", "Community engagement"], ["accessibility", "Accessibility"],
  ["local-government", "Local government"], ["regulatory-design", "Regulatory design"], ["learning-design", "Learning design"],
];

const firstNames = ["Omar", "Leila", "Amina", "Sofia", "Youssef", "Nora", "Hassan", "Ines", "Karim", "Maya", "Rania", "Tariq", "Hana", "Samir", "Lina", "Adam", "Yara", "Nabil", "Sara", "Idris"];
const lastNames = ["Hassan", "Benali", "Diallo", "Costa", "El Amrani", "Mensah", "Nasser", "Oliveira", "Khan", "Rossi", "Abebe", "Silva", "Novak", "Rahman", "Dubois", "Okeke", "Sato", "Berg", "Ibrahim", "Moreau"];

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Refusing to load demonstration data into production without ALLOW_DEMO_SEED=true.");
  }
  await prisma.$reset();

  await prisma.country.createMany({ data: countries.map(([code, name]) => ({ code, name })) });
  const institutions = [];
  for (let index = 0; index < countries.length; index += 1) {
    const [code] = countries[index];
    institutions.push(await prisma.institution.create({
      data: {
        name: `Demonstration ${index % 2 === 0 ? "Ministry of Public Service" : "Municipal Innovation Office"} (${code})`,
        countryCode: code,
        kind: index % 2 === 0 ? "ministry" : "agency",
        isDemo: true,
      },
    }));
  }
  await prisma.expertiseTag.createMany({ data: tags.map(([slug, label]) => ({ slug, label })) });
  const tagRows = await prisma.expertiseTag.findMany();
  await prisma.canvasFieldDefinition.createMany({ data: DEFAULT_CANVAS_FIELDS });
  await prisma.programmeSettings.create({
    data: {
      id: "default",
      phase: "PRE_SUMMIT",
      phaseLabel: "Four-week pre-summit onboarding",
      rulesVersion: "2026-10",
      rulesText: "Take part in good faith. Do not publish another institution’s confidential material. A personal commitment is not an authorization to test. Label self-reported results as such. Use the directory visibility controls if you do not want your profile recommended.",
      targets: DEFAULT_TARGETS,
      demonstration: true,
      summitStartsOn: SUMMIT,
    },
  });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const admin = await makeUser({
    email: "ada.mensah@demo.gic.local",
    name: "Ada Mensah",
    roles: ["PLATFORM_ADMIN"],
    institution: institutions[5],
    title: "Platform administrator",
    passwordHash,
  });
  const manager = await makeUser({
    email: "mina.rossi@demo.gic.local",
    name: "Mina Rossi",
    roles: ["PROGRAMME_MANAGER"],
    institution: institutions[1],
    title: "Programme manager",
    passwordHash,
  });
  const sponsor = await makeUser({
    email: "samir.nasser@demo.gic.local",
    name: "Samir Nasser",
    roles: ["INSTITUTIONAL_SPONSOR"],
    institution: institutions[4],
    title: "Institutional sponsor (demonstration)",
    passwordHash,
  });
  const expert = await makeUser({
    email: "noor.elamin@demo.gic.local",
    name: "Noor Elamin",
    roles: ["EXPERT"],
    institution: institutions[2],
    title: "Invited governance expert",
    passwordHash,
  });

  const themeRows = [];
  for (let index = 0; index < themes.length; index += 1) {
    const [slug, name, summary, objectives] = themes[index];
    const facilitator = await makeUser({
      email: `facilitator.${index + 1}@demo.gic.local`,
      name: `${firstNames[index]} ${lastNames[(index + 3) % lastNames.length]}`,
      roles: ["THEMATIC_FACILITATOR"],
      institution: institutions[index],
      title: "Thematic facilitator",
      passwordHash,
    });
    const theme = await prisma.theme.create({
      data: {
        slug,
        name,
        summary,
        objectives,
        sortOrder: index + 1,
        facilitatorId: facilitator.id,
      },
    });
    await prisma.workspaceMembership.create({
      data: { themeId: theme.id, userId: facilitator.id, role: "FACILITATOR", isPrimary: true },
    });
    themeRows.push({ theme, facilitator });
  }

  const participants = [];
  for (let index = 0; index < 80; index += 1) {
    const theme = themeRows[index % 8];
    const named = index === 0;
    const user = await makeUser({
      email: named ? "omar.hassan@demo.gic.local" : `participant.${String(index + 1).padStart(2, "0")}@demo.gic.local`,
      name: named ? "Omar Hassan" : `${firstNames[index % firstNames.length]} ${lastNames[(index * 3) % lastNames.length]}`,
      roles: ["PARTICIPANT"],
      institution: institutions[index % institutions.length],
      title: index % 3 === 0 ? "Service lead" : index % 3 === 1 ? "Policy adviser" : "Digital delivery manager",
      passwordHash,
      tagIds: [tagRows[index % tagRows.length].id, tagRows[(index + 4) % tagRows.length].id],
      onboarding: index !== 79,
    });
    await prisma.workspaceMembership.create({
      data: { themeId: theme.theme.id, userId: user.id, role: "MEMBER", isPrimary: true },
    });
    if (index % 11 === 0) {
      const extra = themeRows[(index + 1) % 8];
      await prisma.workspaceMembership.create({
        data: { themeId: extra.theme.id, userId: user.id, role: "CONTRIBUTOR", isPrimary: false },
      });
    }
    participants.push({ user, theme });
  }

  const inviteToken = "demo-invite-amina-gic-2026-token";
  await prisma.invitation.create({
    data: {
      email: "amina.diallo@demo.gic.local",
      fullName: "Amina Diallo",
      tokenHash: createHash("sha256").update(inviteToken).digest("hex"),
      roles: ["PARTICIPANT"],
      themeId: themeRows[0].theme.id,
      institutionId: institutions[2].id,
      invitedById: admin.id,
      expiresAt: new Date("2027-01-31T00:00:00.000Z"),
    },
  });

  const stages: ProjectStage[] = ["PROBLEM_DEFINED", "PROPOSAL_DEVELOPED", "AUTHORIZATION_SOUGHT", "TEST_APPROVED", "TESTING", "EVIDENCE_REVIEWED", "DECISION_RECORDED", "PROPOSAL_DEVELOPED"];
  const projects = [];
  for (let index = 0; index < 8; index += 1) {
    const owner = participants[index * 8];
    const stage = stages[index];
    const project = await prisma.project.create({
      data: {
        id: index === 7 ? "project_restricted_demo" : undefined,
        code: `PR-2026-${String(index + 1).padStart(4, "0")}`,
        title: index === 7 ? "Restricted demonstration file" : `Demonstration project ${index + 1}: ${themeRows[index].theme.name}`,
        summary: "Synthetic project used to exercise the lifecycle. It is not an institutional commitment.",
        institutionId: owner.user.institutionId!,
        countryCode: institutions.find((item) => item.id === owner.user.institutionId)!.countryCode,
        themeId: themeRows[index].theme.id,
        leadId: owner.user.id,
        stage,
        status: index === 6 ? "PAUSED" : "ACTIVE",
        visibility: index === 7 ? "RESTRICTED" : "TEAM",
        confidentiality: index === 7 ? "RESTRICTED" : "CONFIDENTIAL",
        isDemo: true,
        finalDecision: stage === "DECISION_RECORDED" ? "REVISE" : "UNDECIDED",
        decisionJustification: stage === "DECISION_RECORDED" ? "Demonstration decision: revise the test before any further claim." : "",
        baseline: "No baseline has been verified. This text is a placeholder in demonstration data.",
        successIndicators: "A useful result would be a documented change in a service step, or a clear decision to stop.",
        members: {
          create: [
            { userId: owner.user.id, role: "LEAD" },
            { userId: themeRows[index].facilitator.id, role: "FACILITATOR" },
            ...(index !== 7 && owner.user.id !== participants[0].user.id
              ? [{ userId: participants[0].user.id, role: "COLLABORATOR" }]
              : []),
          ].filter((member, position, list) => list.findIndex((item) => item.userId === member.userId) === position),
        },
      },
    });
    const content = Object.fromEntries(DEFAULT_CANVAS_FIELDS.map((field) => [field.key, index < 2 ? `Demonstration note for ${field.label}. Not a verified finding.` : ""]));
    const canvas = await prisma.solutionCanvas.create({
      data: {
        projectId: project.id,
        workingJson: content,
        updatedById: owner.user.id,
        versions: {
          create: {
            versionNumber: 1,
            content,
            fieldSnapshot: DEFAULT_CANVAS_FIELDS,
            contentHash: `seed-${index}-1`,
            authorId: owner.user.id,
            note: "Canvas opened",
          },
        },
      },
    });
    if (index < 2) {
      const revised = { ...content, solution: "Revised demonstration wording. Earlier version retained." };
      await prisma.canvasVersion.create({
        data: {
          canvasId: canvas.id,
          versionNumber: 2,
          content: revised,
          fieldSnapshot: DEFAULT_CANVAS_FIELDS,
          contentHash: `seed-${index}-2`,
          authorId: themeRows[index].facilitator.id,
          note: "Facilitator revision",
        },
      });
      await prisma.solutionCanvas.update({ where: { id: canvas.id }, data: { workingJson: revised } });
      await prisma.canvasComment.create({
        data: { canvasId: canvas.id, sectionKey: "solution", authorId: themeRows[index].facilitator.id, body: "Demonstration review comment. This is not an approval to test." },
      });
    }
    if (stage === "AUTHORIZATION_SOUGHT" || stage === "TEST_APPROVED" || stage === "TESTING" || stage === "EVIDENCE_REVIEWED") {
      await prisma.institutionalApproval.create({
        data: {
          projectId: project.id,
          institutionId: project.institutionId,
          sponsorName: "Demonstration authorizing officer",
          state: stage === "AUTHORIZATION_SOUGHT" ? "REQUESTED" : "APPROVED",
          isFormal: true,
          requestedById: owner.user.id,
          decisionNote: "Synthetic authorization record. It does not represent a real institution.",
          requestedAt: new Date("2026-10-20T00:00:00.000Z"),
          decidedAt: stage === "AUTHORIZATION_SOUGHT" ? null : new Date("2026-10-22T00:00:00.000Z"),
        },
      });
    }
    await prisma.participantCommitment.create({
      data: { projectId: project.id, userId: owner.user.id, statement: "I will prepare the next canvas section. This is my own commitment, not my institution’s authorization." },
    });
    await prisma.actionItem.create({
      data: {
        title: index === 0 ? "Confirm the affected users" : `Prepare the next step for project ${index + 1}`,
        ownerId: index === 0 ? participants[0].user.id : owner.user.id,
        createdById: themeRows[index].facilitator.id,
        projectId: project.id,
        themeId: project.themeId,
        dueOn: index === 0 ? new Date("2026-10-20T00:00:00.000Z") : new Date("2026-11-30T00:00:00.000Z"),
        status: "OPEN",
      },
    });
    if (stage === "EVIDENCE_REVIEWED") {
      await prisma.outcomeMeasurement.create({
        data: {
          projectId: project.id,
          indicator: "Time to complete a service step",
          definition: "Self-reported change described by the team. Not independently verified.",
          valueText: "No measured change. Demonstration record only.",
          evidenceLevel: "SELF_REPORTED",
          recordedById: owner.user.id,
          notes: "Synthetic demonstration record. Not a verified outcome.",
        },
      });
    }
    projects.push(project);
  }

  await prisma.projectGrant.create({
    data: { projectId: projects[4].id, userId: sponsor.id, permission: "VIEW", note: "Demonstration sponsor access to one project only.", grantedById: manager.id },
  });
  await prisma.projectGrant.create({
    data: { projectId: projects[4].id, userId: expert.id, permission: "VIEW", note: "Demonstration expert access.", grantedById: manager.id },
  });

  const challenge = await prisma.challenge.create({
    data: {
      code: "CH-2026-0001",
      title: "Residents cannot tell which channel will actually resolve a request",
      problemStatement: "People start in one channel and are asked to begin again in another. This demonstration statement is not a finding about a real service.",
      institutionId: institutions[0].id,
      countryCode: institutions[0].countryCode,
      context: "A municipal office with a counter, a call centre, and a web form.",
      affectedUsers: "Residents with a straightforward case, and staff who re-enter the same information.",
      evidence: "Team observation only. No administrative dataset is attached.",
      previousAttempts: "A new form was added without changing the counter process.",
      expectedBenefit: "One journey with a visible status.",
      themeId: themeRows[2].theme.id,
      expertiseRequired: "Service design, evaluation",
      ownerId: participants[0].user.id,
      createdById: participants[0].user.id,
      status: "UNDER_REVIEW",
      visibility: "TEAM",
      confidentiality: "CONFIDENTIAL",
      isDemo: true,
    },
  });
  await prisma.challengeReview.create({
    data: {
      challengeId: challenge.id,
      reviewerId: themeRows[2].facilitator.id,
      fromStatus: "SUBMITTED",
      toStatus: "UNDER_REVIEW",
      decisionNote: "Demonstration review: useful for a team discussion. Not selected for a pilot.",
    },
  });
  await prisma.project.update({ where: { id: projects[2].id }, data: { challengeId: challenge.id } });

  const extraChallenges: { title: string; status: "SUBMITTED" | "SELECTED" | "MERGED" | "REFERRED" | "RETAINED" | "CLOSED" | "UNDER_REVIEW"; theme: number; owner: number }[] = [
    { title: "Budget comments arrive after the decision is already drafted", status: "SUBMITTED", theme: 0, owner: 4 },
    { title: "Service forecasts ignore the season when demand actually rises", status: "SELECTED", theme: 1, owner: 12 },
    { title: "A digital form asks for documents the office already holds", status: "REFERRED", theme: 3, owner: 20 },
    { title: "A new channel excludes people who cannot complete it alone", status: "RETAINED", theme: 4, owner: 28 },
    { title: "Storm closures are announced after residents have already travelled", status: "UNDER_REVIEW", theme: 5, owner: 36 },
    { title: "A partnership pilot has no agreed stop rule", status: "CLOSED", theme: 6, owner: 44 },
    { title: "Training records do not show whether practice changed", status: "MERGED", theme: 7, owner: 52 },
  ];
  for (const [offset, item] of extraChallenges.entries()) {
    const owner = participants[item.owner];
    const institutionId = owner.user.institutionId;
    if (!institutionId) throw new Error("Demonstration participant is missing an institution.");
    const countryCode = institutions.find((institution) => institution.id === institutionId)?.countryCode;
    if (!countryCode) throw new Error("Demonstration institution is missing a country.");
    await prisma.challenge.create({
      data: {
        code: `CH-2026-${String(offset + 2).padStart(4, "0")}`,
        title: item.title,
        problemStatement: "Synthetic problem statement for the demonstration cohort. It is not a finding about a real service.",
        institutionId,
        countryCode,
        context: "A public office in the demonstration cohort.",
        previousAttempts: "Earlier changes were tried without recording what was learned.",
        expectedBenefit: "A clearer decision about whether to continue, revise, or stop.",
        expertiseRequired: "A peer who has worked on a similar service.",
        affectedUsers: "The people who use the service and the staff who run it.",
        evidence: "Team observation only. No administrative dataset is attached.",
        themeId: themeRows[item.theme].theme.id,
        ownerId: owner.user.id,
        createdById: owner.user.id,
        status: item.status,
        visibility: "TEAM",
        confidentiality: "INTERNAL",
        isDemo: true,
      },
    });
  }

  await prisma.helpRequest.create({
    data: {
      code: "HR-2026-0001",
      kind: "HELP_NEEDED",
      title: "Looking for a peer who has redesigned a first-contact service",
      description: "Demonstration request. We want an example of a handoff between a counter and a digital form, including what the team stopped doing.",
      requesterId: participants[0].user.id,
      institutionId: participants[0].user.institutionId,
      themeId: themeRows[0].theme.id,
      skillsRequired: "Service design",
      visibility: "PROGRAMME",
      priority: "NORMAL",
      status: "OPEN",
      responseBy: new Date("2026-11-06T00:00:00.000Z"),
      isDemo: true,
    },
  });
  const answered = await prisma.helpRequest.create({
    data: {
      code: "HR-2026-0002",
      kind: "EXPERT_REVIEW",
      title: "Request a review of assumptions before any test",
      description: "Demonstration request for an expert comment on what would count as a reason to stop.",
      requesterId: participants[8].user.id,
      themeId: themeRows[0].theme.id,
      skillsRequired: "Evaluation",
      visibility: "PROGRAMME",
      status: "IN_DISCUSSION",
      assigneeId: expert.id,
      isDemo: true,
    },
  });
  await prisma.helpResponse.create({
    data: { requestId: answered.id, authorId: expert.id, body: "Demonstration response: write the stop rule before discussing a vendor or a tool." },
  });

  await prisma.resource.create({
    data: {
      title: "Demonstration template: Solution Canvas worksheet",
      description: "A blank worksheet matching the configurable canvas. It is a template, not evidence.",
      type: "TEMPLATE",
      themeId: themeRows[0].theme.id,
      language: "en",
      source: "Governance Innovation Community demonstration",
      attribution: "Synthetic template",
      authorName: "Programme team",
      tags: ["canvas", "template"],
      visibility: "PROGRAMME",
      verification: "VERIFIED",
      featured: true,
      externalUrl: "https://example.com/gic-canvas-template",
      createdById: manager.id,
      isDemo: true,
    },
  });
  await prisma.resource.create({
    data: {
      title: "Community note on a failed handoff",
      description: "A community contribution. It has not been verified.",
      type: "LESSON",
      themeId: themeRows[2].theme.id,
      verification: "COMMUNITY",
      visibility: "PROGRAMME",
      createdById: participants[2].user.id,
      isDemo: true,
    },
  });

  const events = [
    ["Pre-summit orientation", "ONBOARDING", new Date("2026-10-20T09:00:00.000Z"), new Date("2026-10-20T10:30:00.000Z")],
    ["Summit opening and team formation", "SUMMIT", SUMMIT, new Date("2026-11-16T12:00:00.000Z")],
    ["Day 30 review", "REVIEW", new Date("2026-12-16T09:00:00.000Z"), new Date("2026-12-16T11:00:00.000Z")],
    ["Day 60 review", "REVIEW", new Date("2027-01-15T09:00:00.000Z"), new Date("2027-01-15T11:00:00.000Z")],
    ["Day 90 review", "REVIEW", new Date("2027-02-14T09:00:00.000Z"), new Date("2027-02-14T11:00:00.000Z")],
    ["Month-six learning and renewal review", "REVIEW", new Date("2027-05-16T09:00:00.000Z"), new Date("2027-05-16T12:00:00.000Z")],
    ["Monthly problem-solving clinic", "CLINIC", new Date("2026-11-27T14:00:00.000Z"), new Date("2026-11-27T15:30:00.000Z")],
    ["Quarterly demonstration session", "DEMONSTRATION", new Date("2027-02-18T14:00:00.000Z"), new Date("2027-02-18T16:00:00.000Z")],
  ] as const;
  for (const [title, kind, startsAt, endsAt] of events) {
    const event = await prisma.event.create({
      data: {
        title,
        description: "Demonstration session on the programme calendar. Attendance in this environment is synthetic.",
        kind,
        hostId: manager.id,
        startsAt,
        endsAt,
        timeZone: "UTC",
        themeId: kind === "CLINIC" ? themeRows[0].theme.id : null,
        visibility: "PROGRAMME",
        preparation: "Read your team’s challenge before the session.",
        isDemo: true,
      },
    });
    if (startsAt < new Date()) {
      await prisma.eventRegistration.create({
        data: { eventId: event.id, userId: participants[0].user.id, status: "ATTENDED" },
      });
    }
  }

  await prisma.comment.create({
    data: {
      body: "Demonstration discussion: we should name the residents who are turned away before we discuss a new channel.",
      authorId: participants[0].user.id,
      themeId: themeRows[0].theme.id,
    },
  });
  await prisma.themeNote.create({
    data: {
      themeId: themeRows[0].theme.id,
      authorId: themeRows[0].facilitator.id,
      kind: "DECISION",
      title: "Keep the first discussion on one journey",
      body: "Demonstration decision note. The team will not open a second project until the first canvas has a stop rule.",
    },
  });
  await prisma.announcement.create({
    data: {
      title: "Demonstration cohort is open",
      body: "This environment is loaded with synthetic people and records. Do not treat any authorization or outcome as real.",
      authorId: manager.id,
    },
  });
  await prisma.notification.create({
    data: {
      userId: participants[0].user.id,
      type: "ACTION_ASSIGNMENT",
      title: "An action was assigned to you",
      body: "Confirm the affected users",
      href: `/projects/${projects[0].id}`,
    },
  });
  await prisma.auditEvent.create({
    data: { actorId: admin.id, action: "seed.complete", entityType: "ProgrammeSettings", entityId: "default", metadata: { demonstration: true } },
  });
  await prisma.codeSequence.createMany({ data: [{ prefix: "CH", value: 8 }, { prefix: "PR", value: 8 }, { prefix: "HR", value: 2 }] });
}

async function makeUser(input: {
  email: string;
  name: string;
  roles: AppRole[];
  institution: { id: string; countryCode: string };
  title: string;
  passwordHash: string;
  tagIds?: string[];
  onboarding?: boolean;
}) {
  const onboarded = input.onboarding !== false;
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      status: "ACTIVE",
      isDemo: true,
      institutionId: input.institution.id,
      onboardingCompletedAt: onboarded ? new Date("2026-10-21T00:00:00.000Z") : null,
      rulesAcceptedAt: onboarded ? new Date("2026-10-21T00:00:00.000Z") : null,
      rulesVersion: onboarded ? "2026-10" : null,
      lastActiveAt: new Date("2026-10-27T00:00:00.000Z"),
      roles: { create: input.roles.map((role) => ({ role })) },
      profile: {
        create: {
          fullName: input.name,
          title: input.title,
          biography: "Synthetic biography for the demonstration cohort. This person does not represent a real official.",
          countryCode: input.institution.countryCode,
          expertiseOffered: "Willing to review a one-page canvas.",
          supportRequested: "An example from a peer institution.",
          preferredLanguage: "en",
          profileVisibility: "PROGRAMME",
        },
      },
      expertise: input.tagIds ? { create: input.tagIds.map((tagId) => ({ tagId })) } : undefined,
      notificationPreference: { create: {} },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
