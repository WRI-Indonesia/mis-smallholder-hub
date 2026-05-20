SELECT 'Batch data check:' as info;
SELECT COUNT(*) as total_batches FROM "ref-batch";
SELECT id, code, name FROM "ref-batch" LIMIT 5;
