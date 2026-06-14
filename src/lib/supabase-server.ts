import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase client (service role).
 *
 * SECURITY: This module uses the SUPABASE_SERVICE_ROLE_KEY and must ONLY be
 * imported from Server Actions or Route Handlers — NEVER from a client
 * component. The service role key bypasses Row Level Security.
 */

export const PRODUCT_IMAGES_BUCKET = "product-images";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  // Validate URL structure so misconfiguration surfaces as a clear error.
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not a valid URL — check your environment configuration",
    );
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must use http or https protocol",
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}

/** Resolve the public URL for an object in the product-images bucket. */
export function productImagePublicUrl(path: string): string {
  const { data } = getSupabaseAdmin()
    .storage.from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}
