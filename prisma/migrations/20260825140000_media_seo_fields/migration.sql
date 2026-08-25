-- AlterTable: WordPress-style metadata for the media library. `alt` already existed; a caption
-- and a longer description round out what an attachment can carry for SEO.
ALTER TABLE `MediaAsset`
    ADD COLUMN `caption` VARCHAR(300) NULL,
    ADD COLUMN `description` TEXT NULL;

-- CreateIndex: the gallery now filters by type and pages server-side.
CREATE INDEX `MediaAsset_scope_type_createdAt_idx` ON `MediaAsset`(`scope`, `type`, `createdAt`);
