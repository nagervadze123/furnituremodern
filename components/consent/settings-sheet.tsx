"use client";

// Cookie preferences sheet. Caller owns open/closed state so the same
// component is reused by the first-load banner ("Customize") and the
// permanent ManageLink (footer / privacy page). Reads current choice
// via `useConsent()`, writes via `setChoice` only when the user clicks
// Save — Cancel and Escape close without persisting.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useConsent, type ConsentChoice } from "@/lib/consent";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Inner body. Mounted only when `open` is true so React tears it down
// and remounts on every closed → open transition, naturally resetting
// the local toggle state to the latest persisted choice — no useEffect
// + setState pattern needed (and avoids the
// react-hooks/set-state-in-effect lint).
function SettingsBody({
  choice,
  setChoice,
  onOpenChange,
}: {
  choice: ConsentChoice | null;
  setChoice: (c: { analytics: boolean; marketing: boolean }) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("consent.settings");
  const [analytics, setAnalytics] = useState<boolean>(
    choice?.analytics ?? false
  );
  const [marketing, setMarketing] = useState<boolean>(
    choice?.marketing ?? false
  );

  const save = () => {
    setChoice({ analytics, marketing });
    onOpenChange(false);
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>{t("heading")}</SheetTitle>
        <SheetDescription>{t("intro")}</SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4">
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-medium">{t("necessary_label")}</p>
          <p className="mt-1 text-muted-foreground">
            {t("necessary_description")}
          </p>
        </div>
        <label
          htmlFor="consent-analytics"
          className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
        >
          <input
            id="consent-analytics"
            type="checkbox"
            checked={analytics}
            onChange={(e) => setAnalytics(e.target.checked)}
            className="mt-1 size-4"
          />
          <div className="flex-1 text-sm">
            <p className="font-medium">{t("analytics_label")}</p>
            <p className="mt-1 text-muted-foreground">
              {t("analytics_description")}
            </p>
          </div>
        </label>
        <label
          htmlFor="consent-marketing"
          className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
        >
          <input
            id="consent-marketing"
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="mt-1 size-4"
          />
          <div className="flex-1 text-sm">
            <p className="font-medium">{t("marketing_label")}</p>
            <p className="mt-1 text-muted-foreground">
              {t("marketing_description")}
            </p>
          </div>
        </label>
      </div>
      <SheetFooter className="flex flex-row justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {t("cancel")}
        </Button>
        <Button onClick={save}>{t("save")}</Button>
      </SheetFooter>
    </>
  );
}

export function SettingsSheet({ open, onOpenChange }: Props) {
  const { choice, setChoice } = useConsent();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="motion-reduce:transition-none motion-reduce:duration-0"
      >
        {open ? (
          <SettingsBody
            choice={choice}
            setChoice={setChoice}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
