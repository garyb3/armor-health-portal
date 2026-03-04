"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseAutoSaveOptions {
  formType: string;
  getValues: () => Record<string, unknown>;
  enabled?: boolean;
  debounceMs?: number;
}

export function useAutoSave({
  formType,
  getValues,
  enabled = true,
  debounceMs = 2000,
}: UseAutoSaveOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const lastSavedRef = useRef<string>("");

  const saveDraft = useCallback(
    async (data: Record<string, unknown>) => {
      const serialized = JSON.stringify(data);
      if (serialized === lastSavedRef.current) return;

      isSavingRef.current = true;
      try {
        await fetch(`/api/forms/${formType}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formData: data, action: "save_draft" }),
        });
        lastSavedRef.current = serialized;
      } catch (err) {
        console.error("Auto-save failed:", err);
      } finally {
        isSavingRef.current = false;
      }
    },
    [formType]
  );

  const debouncedSave = useCallback(() => {
    if (!enabled || isSavingRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const values = getValues();
      saveDraft(values);
    }, debounceMs);
  }, [enabled, debounceMs, getValues, saveDraft]);

  // Save on page leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!enabled) return;
      const values = getValues();
      const blob = new Blob(
        [JSON.stringify({ formData: values, action: "save_draft" })],
        { type: "application/json" }
      );
      navigator.sendBeacon(`/api/forms/${formType}`, blob);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [formType, enabled, getValues]);

  return { debouncedSave, saveDraft };
}
