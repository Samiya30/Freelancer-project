-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "bio" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "firstName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lastName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'Freelancer';

-- CreateTable
CREATE TABLE "public"."File" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "client" TEXT,
    "project" TEXT,
    "clientId" INTEGER,
    "projectId" INTEGER,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Settings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "workspaceName" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT 'Technology',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR (₹)',
    "notificationEmail" BOOLEAN NOT NULL DEFAULT true,
    "notificationProjects" BOOLEAN NOT NULL DEFAULT true,
    "notificationInvoices" BOOLEAN NOT NULL DEFAULT true,
    "notificationTasks" BOOLEAN NOT NULL DEFAULT true,
    "notificationWeekly" BOOLEAN NOT NULL DEFAULT true,
    "notificationMarketing" BOOLEAN NOT NULL DEFAULT false,
    "appearance" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "File_clientId_idx" ON "public"."File"("clientId" ASC);

-- CreateIndex
CREATE INDEX "File_folder_idx" ON "public"."File"("folder" ASC);

-- CreateIndex
CREATE INDEX "File_projectId_idx" ON "public"."File"("projectId" ASC);

-- CreateIndex
CREATE INDEX "File_userId_idx" ON "public"."File"("userId" ASC);

-- CreateIndex
CREATE INDEX "Settings_userId_idx" ON "public"."Settings"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "public"."Settings"("userId" ASC);

-- AddForeignKey
ALTER TABLE "public"."File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
