import { supabase } from "/config/supabase.js";

export const ADMIN_USER_ID = 'f3720dbc-0366-4ede-b6e8-ea8886d0e9d0';

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