-- Ver políticas existentes en teams y groups
SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('teams', 'groups');

-- Intentar select directo para ver error
SELECT * FROM teams LIMIT 1;