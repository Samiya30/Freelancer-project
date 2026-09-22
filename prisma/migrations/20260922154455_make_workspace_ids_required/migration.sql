/*
  Warnings:

  - Made the column `workspaceId` on table `Client` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workspaceId` on table `Contract` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workspaceId` on table `Conversation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workspaceId` on table `Expense` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workspaceId` on table `File` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workspaceId` on table `Invoice` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workspaceId` on table `Lead` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workspaceId` on table `Payment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workspaceId` on table `Project` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workspaceId` on table `Proposal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workspaceId` on table `Task` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workspaceId` on table `TimeEntry` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "workspaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Contract" ALTER COLUMN "workspaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "workspaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "workspaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "File" ALTER COLUMN "workspaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "workspaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Lead" ALTER COLUMN "workspaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "workspaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "workspaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Proposal" ALTER COLUMN "workspaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "workspaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "TimeEntry" ALTER COLUMN "workspaceId" SET NOT NULL;
