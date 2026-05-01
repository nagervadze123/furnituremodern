// Layout for every authenticated admin page (everything except /admin/login).
// Wraps children in AdminShell and runs the auth check on the server.

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ConfigureSupabaseNotice } from "@/components/admin/configure-supabase-notice";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Offline development: surface a clear instruction instead of
  // crashing or redirecting in a loop.
  if (!isSupabaseConfigured()) {
    return (
      <AdminShell>
        <ConfigureSupabaseNotice />
      </AdminShell>
    );
  }

  // requireAdmin() redirects to /admin/login if the request is
  // unauthenticated or if the user has no admin_users row.
  const ctx = await requireAdmin();

  return <AdminShell email={ctx.email}>{children}</AdminShell>;
}
