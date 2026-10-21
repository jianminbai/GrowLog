import { PrismaClient } from "@prisma/client";

const id = process.env.HOUSEHOLD_ID?.trim();
const name = process.env.HOUSEHOLD_NAME?.trim() || "My family";
const timeZone = process.env.HOUSEHOLD_TIME_ZONE?.trim() || "Asia/Shanghai";
if (!id) throw new Error("HOUSEHOLD_ID is required.");
new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());

const prisma = new PrismaClient();
try {
  await prisma.household.upsert({
    where: { id },
    update: { name, timeZone },
    create: { id, name, timeZone }
  });
} finally {
  await prisma.$disconnect();
}
