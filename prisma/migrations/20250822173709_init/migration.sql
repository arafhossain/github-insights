-- CreateTable
CREATE TABLE "Summary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "repos" TEXT NOT NULL,
    "sinceISO" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "promptTok" INTEGER,
    "compTok" INTEGER,
    "totalTok" INTEGER,
    "costUSD" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Summary_createdAt_idx" ON "Summary"("createdAt");
