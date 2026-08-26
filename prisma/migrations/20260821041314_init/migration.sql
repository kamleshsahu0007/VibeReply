-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ToneProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "deviceId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "formality" INTEGER NOT NULL DEFAULT 50,
    "warmth" INTEGER NOT NULL DEFAULT 50,
    "conciseness" INTEGER NOT NULL DEFAULT 50,
    "directness" INTEGER NOT NULL DEFAULT 50,
    "vocabularyStyle" TEXT NOT NULL DEFAULT 'neutral',
    "emojiPreference" TEXT NOT NULL DEFAULT 'none',
    "sentenceStyle" TEXT NOT NULL DEFAULT 'balanced',
    "customInstructions" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ToneProfile_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ToneProfile_deviceId_key_key" ON "ToneProfile"("deviceId", "key");
