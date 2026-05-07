-- Migration: add_menu_management
-- Issue #35 — Dynamic Menu Management
-- Creates tbl-menu-item for DB-driven sidebar navigation

CREATE TABLE IF NOT EXISTS "tbl-menu-item" (
    "id"          TEXT NOT NULL,
    "key"         TEXT NOT NULL,
    "parent_key"  TEXT,
    "title"       TEXT NOT NULL,
    "url"         TEXT NOT NULL,
    "icon"        TEXT,
    "order"       INTEGER NOT NULL DEFAULT 0,
    "is_active"   BOOLEAN NOT NULL DEFAULT true,
    "is_visible"  BOOLEAN NOT NULL DEFAULT true,
    "roles"       TEXT NOT NULL DEFAULT 'all',
    "groups"      TEXT NOT NULL DEFAULT 'all',
    "job_descs"   TEXT NOT NULL DEFAULT 'all',
    "regions"     TEXT NOT NULL DEFAULT 'all',
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"  TEXT,
    "modified_by" TEXT,

    CONSTRAINT "tbl-menu-item_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on key
CREATE UNIQUE INDEX IF NOT EXISTS "tbl-menu-item_key_key" ON "tbl-menu-item"("key");

-- Self-referential FK for parent-child hierarchy
ALTER TABLE "tbl-menu-item"
    ADD CONSTRAINT "tbl-menu-item_parent_key_fkey"
    FOREIGN KEY ("parent_key")
    REFERENCES "tbl-menu-item"("key")
    ON DELETE SET NULL ON UPDATE CASCADE;
