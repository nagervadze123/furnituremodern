// Client-side sign-out button. Uses the browser Supabase client so it
// can clear cookies on the active session, then hard-navigates to the
// login page.

"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      // router.refresh() doesn't clear server-rendered data soon enough;
      // a full navigation gives a guaranteed-clean state.
      router.replace("/admin/login");
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      <LogOut aria-hidden="true" className="h-4 w-4" />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
