-- Check training package codes
SELECT tp.id, tp.code, tp.name FROM "ref-training-package" tp ORDER BY tp.code;

-- Check training activity with package info
SELECT 
  ta.id,
  ta.location,
  ta.total_participant,
  tp.code as package_code,
  tp.name as package_name
FROM "tbl-training-activity" ta
JOIN "ref-training-package" tp ON ta.ref_training_package_id = tp.id
ORDER BY ta.training_date DESC;

-- Check training participants count
SELECT 
  tpkg.code as package_code,
  COUNT(DISTINCT tp.farmer_id) as participant_count
FROM "tbl-training-participant" tp
JOIN "tbl-training-activity" ta ON tp.training_activity_id = ta.id
JOIN "ref-training-package" tpkg ON ta.ref_training_package_id = tpkg.id
GROUP BY tpkg.code
ORDER BY tpkg.code;
