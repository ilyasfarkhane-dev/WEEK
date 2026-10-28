import type { PrismaClient } from "@prisma/client";
import { createJsonPrisma } from "@/lib/json-store";

type JsonPrisma = PrismaClient & { $reset: () => Promise<void> };

const globalForDb = globalThis as unknown as { gicJson?: JsonPrisma };

export const prisma: JsonPrisma = globalForDb.gicJson ?? (createJsonPrisma() as unknown as JsonPrisma);

if (process.env.NODE_ENV !== "production") globalForDb.gicJson = prisma;
