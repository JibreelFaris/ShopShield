import { supabase } from "./supabase";

/**
 * Gets the current user's org_id.
 * Uses the profiles table to get the correct org_id for multi-tenant setups.
 */
export async function getOrgId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");

  // Try to get org_id from profiles table first
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (profile?.org_id) {
    return profile.org_id;
  }

  // Fallback to user metadata for backward compatibility
  return (user.user_metadata?.org_id as string) ?? user.id;
}

export async function getUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user.id;
}

/**
 * Gets the current user's role from the profiles table.
 * Returns 'employee' as default if no role is found.
 */
export async function getRole(): Promise<'owner' | 'employee'> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role as ('owner' | 'employee') ?? 'employee';
}
