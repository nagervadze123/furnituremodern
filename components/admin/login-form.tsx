// Login form. Client component because it needs to call
// supabase.auth.signInWithPassword from the browser. Validation runs
// on both sides — Zod here for instant feedback, and again server-side
// during the protected mutation flow.

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ZodError } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/admin/schemas";
import { Button } from "@/components/ui/button";

type Props = {
  next?: string;
  initialError?: string;
};

export function LoginForm({ next, initialError }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialError ?? null
  );
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const raw = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    let parsed;
    try {
      parsed = loginSchema.parse(raw);
    } catch (err) {
      if (err instanceof ZodError) {
        const fe: { email?: string; password?: string } = {};
        for (const issue of err.issues) {
          const key = issue.path[0];
          if (key === "email" || key === "password") {
            fe[key] = issue.message;
          }
        }
        setFieldErrors(fe);
      }
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.email,
        password: parsed.password,
      });
      if (error) {
        // Use a generic message — don't leak whether the email exists.
        setErrorMessage("Invalid email or password.");
        return;
      }
      // Hard navigation so server components see the new session cookie.
      router.replace(next && next.startsWith("/admin") ? next : "/admin");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          aria-required="true"
          // Link the visible field error to the input via
          // aria-describedby so AT users hear the error after the
          // field name. WCAG 3.3.1 Error Identification.
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          aria-invalid={fieldErrors.email ? true : undefined}
          // text-base on phones (sm:text-sm at desktop) prevents iOS
          // Safari from auto-zooming to the focused input. min-h-11
          // ensures comfortable thumb-typing.
          className="mt-1 block w-full min-h-11 rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
        />
        {fieldErrors.email ? (
          <p id="email-error" className="mt-1 text-xs text-destructive">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-required="true"
          aria-describedby={
            fieldErrors.password ? "password-error" : undefined
          }
          aria-invalid={fieldErrors.password ? true : undefined}
          // text-base on phones (sm:text-sm at desktop) prevents iOS
          // Safari from auto-zooming to the focused input. min-h-11
          // ensures comfortable thumb-typing.
          className="mt-1 block w-full min-h-11 rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
        />
        {fieldErrors.password ? (
          <p id="password-error" className="mt-1 text-xs text-destructive">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      {/*
        Form-level error region. role="alert" + aria-live="assertive"
        because failed login is a security-critical message — the
        admin should hear it interrupting any in-progress reading.
        Wrap is stable so the announcement still fires when the
        message string switches between empty and a value. WCAG 3.3.1.
      */}
      <div role="alert" aria-live="assertive">
        {errorMessage ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className="min-h-11 w-full"
      >
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
