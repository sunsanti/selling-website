-- i18n migration: add Vietnamese (_vi) columns for bilingual content
-- Run once against the production DB after deploying the i18n feature branch.
-- All columns default to NULL so existing rows are unaffected.

ALTER TABLE news
    ADD COLUMN title_vi   VARCHAR(255) DEFAULT NULL AFTER title,
    ADD COLUMN summary_vi VARCHAR(500) DEFAULT NULL AFTER summary,
    ADD COLUMN content_vi TEXT         DEFAULT NULL AFTER content;

ALTER TABLE projects
    ADD COLUMN name_vi          VARCHAR(255) DEFAULT NULL AFTER name,
    ADD COLUMN small_content_vi TEXT         DEFAULT NULL AFTER small_content;

ALTER TABLE about_stats
    ADD COLUMN label_vi VARCHAR(255) DEFAULT NULL AFTER label;
