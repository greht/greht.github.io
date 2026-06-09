import { supabase } from "/config/supabase.js";

export const ADMIN_USER_ID = 'c1015121-586e-4e53-9061-a3545e3e43d9';

export async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== ADMIN_USER_ID) {
        return null;
    }
    return user;
}

export function isAdminUser(userId) {
    return userId === ADMIN_USER_ID;
}