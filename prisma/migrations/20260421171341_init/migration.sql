-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "title" TEXT,
    "subreddit" TEXT,
    "author" TEXT,
    "postScore" INTEGER,
    "commentCount" INTEGER,
    "parsedCommentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAtReddit" TIMESTAMP(3),
    "summary" TEXT,
    "sentiment" TEXT,
    "recommendedServices" JSONB,
    "mentionedBrands" JSONB,
    "painPoints" JSONB,
    "advantages" JSONB,
    "keyTakeaways" JSONB,
    "usefulnessScore" INTEGER,
    "topicRelevanceScore" INTEGER,
    "finalTakeaway" TEXT,
    "errorMessage" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Analysis_sourceUrl_key" ON "Analysis"("sourceUrl");
