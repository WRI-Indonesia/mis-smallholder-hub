-- List all tables to find the correct table names
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%farmer%' 
ORDER BY table_name;

-- Check if farmer-group table exists with different name
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%group%' 
ORDER BY table_name;
