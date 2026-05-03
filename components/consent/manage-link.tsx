"use client";

// Re-opens the cookie settings sheet from anywhere outside the
// first-load banner — privacy page, footer, etc. The settings sheet
// itself owns persistence; this component is just the trigger.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SettingsSheet } from "./settings-sheet";

type Props = {
  className?: string;
};

export function ManageLink({
  className = "underline hover:no-underline",
}: Props) {
  const t = useTranslations("consent.manage_link");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        // aria-haspopup tells AT this control opens a dialog, not just
        // navigates somewhere. aria-expanded reflects open state so
        // the announcement updates as the sheet toggles. WCAG 4.1.2
        // (Name, Role, Value).
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {t("label")}
      </button>
      <SettingsSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
