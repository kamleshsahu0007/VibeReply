import { PrismaClient } from "@prisma/client";
import { DEFAULT_TONE_PROFILES } from "../src/lib/tones/defaults";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.toneProfile.findMany({
    where: { deviceId: null },
    select: { key: true },
  });
  const existingKeys = new Set(existing.map((t) => t.key));
  const missing = DEFAULT_TONE_PROFILES.filter((t) => !existingKeys.has(t.key));

  if (missing.length > 0) {
    await prisma.toneProfile.createMany({
      data: missing.map((tone) => ({ ...tone, deviceId: null })),
    });
  }
  console.log(
    `Seeded ${missing.length} new global default tone profile(s); ${existingKeys.size} already present.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
