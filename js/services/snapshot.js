import { supabase } from "/config/supabase.js";
import { getAllUsers } from "/js/services/ranking.js";

export async function forceSaveSnapshot() {
    const allUsers = await getAllUsers();

    if (!allUsers || allUsers.length === 0) {
        console.warn("No users found for snapshot");
        return { success: false, message: "No users found" };
    }

    const snapshotDate = new Date().toISOString();
    const snapshots = allUsers.map((user, index) => ({
        user_id: user.user_id,
        total_points: user.points,
        rank_position: index + 1,
        snapshot_date: snapshotDate
    }));

    const { error } = await supabase
        .from("ranking_snapshots")
        .insert(snapshots);

    if (error) {
        console.error("Error saving snapshot:", error);
        return { success: false, message: error.message };
    }

    console.log(`Snapshot saved for ${snapshots.length} users`);
    return { success: true, count: snapshots.length };
}

if (typeof window !== 'undefined') {
    window.forceSaveSnapshot = forceSaveSnapshot;
}
