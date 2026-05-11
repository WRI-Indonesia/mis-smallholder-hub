-- Simple check for training packages
SELECT id, code, name FROM "ref-training-package" LIMIT 5;

-- Check training activities
SELECT id, ref_training_package_id, total_participant FROM "tbl-training-activity" LIMIT 5;

-- Check training participants (this might be empty)
SELECT COUNT(*) as total_participants FROM "tbl-training-participant" LIMIT 1;
