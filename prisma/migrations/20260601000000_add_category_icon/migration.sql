-- Category icon support: a stable semantic icon key (e.g. "food",
-- "transport") owned by the backend so the client no longer guesses an
-- icon from the category name. null for CUSTOM categories — the client
-- renders a single default icon and the name differentiates them.
ALTER TABLE "Category" ADD COLUMN "icon" TEXT;
