import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const [users, participants, themes, projects, challenges] = await Promise.all([
  prisma.user.count(),
  prisma.userRole.count({ where: { role: "PARTICIPANT" } }),
  prisma.theme.count(),
  prisma.project.count(),
  prisma.challenge.count(),
]);
console.log({ users, participants, themes, projects, challenges });
await prisma.$disconnect();
