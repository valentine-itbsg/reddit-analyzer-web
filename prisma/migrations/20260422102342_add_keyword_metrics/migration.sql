-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN     "keywordCount" INTEGER,
ADD COLUMN     "keywordFrequency" JSONB,
ADD COLUMN     "matchedKeywords" JSONB,
ADD COLUMN     "topKeywords" JSONB,
ADD COLUMN     "uniqueKeywordCount" INTEGER;
