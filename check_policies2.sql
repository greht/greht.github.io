-- Ver definición exacta de políticas en teams
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'teams';

-- Ver si hay qualche error con la sesión anónima
SELECT 
    current_setting('request.jwt.claim.role', true) as role,
    current_user;