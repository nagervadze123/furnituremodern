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
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {t("label")}
      </button>
      <SettingsSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
