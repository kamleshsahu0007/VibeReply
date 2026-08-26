import { prisma } from "@/lib/db/client";
import { DEFAULT_TONE_PROFILES } from "@/lib/tones/defaults";
import type { ToneProfile } from "@/types";
import type { ToneProfile as ToneProfileRow } from "@prisma/client";

function toDomain(row: ToneProfileRow): ToneProfile {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    formality: row.formality,
    warmth: row.warmth,
    conciseness: row.conciseness,
    directness: row.directness,
    vocabularyStyle: row.vocabularyStyle as ToneProfile["vocabularyStyle"],
    emojiPreference: row.emojiPreference as ToneProfile["emojiPreference"],
    sentenceStyle: row.sentenceStyle as ToneProfile["sentenceStyle"],
    customInstructions: row.customInstructions,
    isCustom: row.isCustom,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

export async function ensureDevice(deviceId: string): Promise<void> {
  await prisma.device.upsert({
    where: { id: deviceId },
    update: {},
    create: { id: deviceId },
  });
}

async function ensureGlobalDefaultsSeeded(): Promise<void> {
  const count = await prisma.toneProfile.count({ where: { deviceId: null } });
  if (count > 0) return;
  await prisma.toneProfile.createMany({
    data: DEFAULT_TONE_PROFILES.map((t) => ({ ...t, deviceId: null })),
  });
}

/**
 * Returns the effective tone list for a device: global defaults, with any
 * device-specific row (same key = edited default, new key = custom tone)
 * overriding the global one. Falls back to hardcoded defaults if the DB is
 * empty/unreachable so reply generation never hard-fails on tone lookup.
 */
export async function getToneProfilesForDevice(deviceId: string | null): Promise<ToneProfile[]> {
  try {
    await ensureGlobalDefaultsSeeded();

    const [globals, deviceRows] = await Promise.all([
      prisma.toneProfile.findMany({ where: { deviceId: null } }),
      deviceId
        ? prisma.toneProfile.findMany({ where: { deviceId } })
        : Promise.resolve([] as ToneProfileRow[]),
    ]);

    const byKey = new Map<string, ToneProfileRow>();
    for (const row of globals) byKey.set(row.key, row);
    for (const row of deviceRows) byKey.set(row.key, row); // device rows override globals with the same key

    return Array.from(byKey.values())
      .map(toDomain)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  } catch (err) {
    console.error("tone.service: falling back to hardcoded defaults", err);
    return DEFAULT_TONE_PROFILES.map((t, i) => ({
      id: `fallback-${t.key}`,
      ...t,
      customInstructions: t.customInstructions,
      isCustom: false,
      isActive: true,
      sortOrder: i,
    }));
  }
}

export async function getActiveToneProfilesForDevice(deviceId: string | null): Promise<ToneProfile[]> {
  const all = await getToneProfilesForDevice(deviceId);
  return all.filter((t) => t.isActive);
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || `tone-${Date.now()}`;
}

export interface ToneProfileInput {
  key?: string; // present when editing an existing tone (default or custom)
  name: string;
  description: string;
  formality?: number;
  warmth?: number;
  conciseness?: number;
  directness?: number;
  vocabularyStyle?: ToneProfile["vocabularyStyle"];
  emojiPreference?: ToneProfile["emojiPreference"];
  sentenceStyle?: ToneProfile["sentenceStyle"];
  customInstructions?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export async function upsertDeviceTone(
  deviceId: string,
  input: ToneProfileInput
): Promise<ToneProfile> {
  await ensureDevice(deviceId);

  const isNewCustomTone = !input.key;
  const key = input.key ?? slugify(input.name);
  const isDefaultKey = DEFAULT_TONE_PROFILES.some((t) => t.key === key);

  const row = await prisma.toneProfile.upsert({
    where: { deviceId_key: { deviceId, key } },
    update: {
      name: input.name,
      description: input.description,
      formality: input.formality,
      warmth: input.warmth,
      conciseness: input.conciseness,
      directness: input.directness,
      vocabularyStyle: input.vocabularyStyle,
      emojiPreference: input.emojiPreference,
      sentenceStyle: input.sentenceStyle,
      customInstructions: input.customInstructions,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
    },
    create: {
      deviceId,
      key,
      name: input.name,
      description: input.description,
      formality: input.formality ?? 50,
      warmth: input.warmth ?? 50,
      conciseness: input.conciseness ?? 50,
      directness: input.directness ?? 50,
      vocabularyStyle: input.vocabularyStyle ?? "neutral",
      emojiPreference: input.emojiPreference ?? "none",
      sentenceStyle: input.sentenceStyle ?? "balanced",
      customInstructions: input.customInstructions ?? null,
      isCustom: isNewCustomTone && !isDefaultKey,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 99,
    },
  });

  return toDomain(row);
}

/**
 * Deletes a device-scoped tone row identified by key. For a custom tone this
 * removes it entirely. For a device's override of a default tone, this just
 * reverts the device back to the global default (the global row is untouched).
 */
export async function deleteDeviceTone(deviceId: string, key: string): Promise<void> {
  await prisma.toneProfile.deleteMany({ where: { key, deviceId } });
}
