"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

/**
 * Intercepts the browser back button on form pages and shows a
 * confirmation dialog before navigating away.
 */
export function useBackButtonGuard() {
  const pathname = usePathname();
  const [showDialog, setShowDialog] = useState(false);
  const isFormPage = pathname.startsWith("/forms/");

  useEffect(() => {
    if (!isFormPage) return;

    // Push a sentry state so pressing back triggers popstate
    // instead of immediately leaving
    window.history.pushState({ guard: true }, "");

    const handlePopState = () => {
      // User pressed back — block it and show confirmation
      setShowDialog(true);
      // Re-push so the next back press is also caught if they cancel
      window.history.pushState({ guard: true }, "");
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isFormPage]);

  const confirmLeave = useCallback(() => {
    setShowDialog(false);
    // Go back twice: once past our sentry state, once for the real back
    window.history.go(-2);
  }, []);

  const cancelLeave = useCallback(() => {
    setShowDialog(false);
  }, []);

  return { showDialog, confirmLeave, cancelLeave };
}
