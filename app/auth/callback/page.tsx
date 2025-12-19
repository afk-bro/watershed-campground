"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side auth callback page
 * Handles both PKCE flow (code parameter) and implicit flow (tokens in URL fragment)
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient();

      // Check for PKCE code in URL params (handled by route.ts, but just in case)
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");

      if (error) {
        console.error("Auth error:", error);
        router.replace(`/admin/login?error=${encodeURIComponent(error)}`);
        return;
      }

      // Check for implicit flow tokens in URL fragment
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      if (accessToken && refreshToken) {
        // Store the session from implicit flow tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error("Session error:", sessionError);
          router.replace(`/admin/login?error=${encodeURIComponent("Failed to authenticate")}`);
          return;
        }

        // Clean up the URL
        window.history.replaceState({}, document.title, "/auth/callback");

        // Check if this is a password recovery flow or invite flow
        if (type === "recovery" || type === "invite") {
          router.replace("/admin/update-password");
          return;
        }

        // Redirect to admin
        router.replace("/admin");
        return;
      }

      // If we got here with a code, the route handler should have processed it
      // But if not, try to exchange it
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("Code exchange error:", exchangeError);
          router.replace(`/admin/login?error=${encodeURIComponent("Failed to authenticate")}`);
          return;
        }

        // Check if this is an invite or recovery flow
        const type = params.get("type");
        if (type === "recovery" || type === "invite") {
          router.replace("/admin/update-password");
          return;
        }

        router.replace("/admin");
        return;
      }

      // No code or tokens found
      router.replace("/admin/login?error=Authentication%20failed");
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-forest">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-gold"></div>
        <p className="mt-4 text-accent-beige">Completing authentication...</p>
      </div>
    </div>
  );
}
