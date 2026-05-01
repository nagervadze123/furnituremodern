// /admin/login — public page, no auth required.
// Renders without the dashboard shell.

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAuthenticatedAdmin } from "@/lib/admin/auth";
import { LoginForm } from "@/components/admin/login-form";
import { ConfigureSupabaseNotice } from "@/components/admin/configure-supabase-notice";

// Always render fresh — never cache the login page.
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <ConfigureSupabaseNotice />
      </div>
    );
  }

  // If the user is already an admin, skip the form.
  const ctx = await getAuthenticatedAdmin();
  if (ctx) redirect("/admin");

  const { next, error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Admin access only.
        </p>
        <div className="mt-6">
          <LoginForm next={next} initialError={error} />
        </div>
      </div>
    </div>
  );
}
