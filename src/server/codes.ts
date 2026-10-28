import { prisma } from "@/lib/db";

export async function nextCode(prefix: "CH" | "PR" | "HR") {
  const row = await prisma.codeSequence.upsert({
    where: { prefix },
    create: { prefix, value: 1 },
    update: { value: { increment: 1 } },
  });
  const year = new Date().getUTCFullYear();
  return `${prefix}-${year}-${String(row.value).padStart(4, "0")}`;
}
