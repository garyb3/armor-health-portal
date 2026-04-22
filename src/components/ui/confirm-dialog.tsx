"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmVariant = "default" | "destructive";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

export interface NotifyOptions {
  title: string;
  description?: string;
  acknowledgeLabel?: string;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  notify: (options: NotifyOptions) => Promise<void>;
}

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

type DialogState =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: "notify"; options: NotifyOptions; resolve: () => void }
  | null;

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>(null);
  const confirmButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const close = React.useCallback((result: boolean) => {
    setState((current) => {
      if (!current) return null;
      if (current.kind === "confirm") {
        current.resolve(result);
      } else {
        current.resolve();
      }
      return null;
    });
  }, []);

  const confirm = React.useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setState({ kind: "confirm", options, resolve });
      }),
    []
  );

  const notify = React.useCallback(
    (options: NotifyOptions) =>
      new Promise<void>((resolve) => {
        setState({ kind: "notify", options, resolve });
      }),
    []
  );

  const value = React.useMemo<ConfirmContextValue>(
    () => ({ confirm, notify }),
    [confirm, notify]
  );

  const open = state !== null;
  const isConfirm = state?.kind === "confirm";
  const title = state?.options.title ?? "";
  const description = state?.options.description;
  const confirmLabel =
    state?.kind === "confirm"
      ? state.options.confirmLabel ?? "Confirm"
      : state?.kind === "notify"
      ? state.options.acknowledgeLabel ?? "OK"
      : "OK";
  const cancelLabel =
    (state?.kind === "confirm" && state.options.cancelLabel) || "Cancel";
  const variant: ConfirmVariant =
    (state?.kind === "confirm" && state.options.variant) || "default";

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close(false);
        }}
      >
        <DialogContent
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            confirmButtonRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription className="pt-1">
                {description}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            {isConfirm ? (
              <Button variant="outline" onClick={() => close(false)}>
                {cancelLabel}
              </Button>
            ) : null}
            <Button
              ref={confirmButtonRef}
              variant={variant}
              onClick={() => close(true)}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx;
}
