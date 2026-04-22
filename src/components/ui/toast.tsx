"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";

export interface ToastOptions {
  kind?: ToastKind;
  message: string;
  duration?: number;
}

interface ToastEntry {
  id: number;
  kind: ToastKind;
  message: string;
  duration: number;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

let nextToastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastEntry[]>([]);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = React.useCallback(
    (options: ToastOptions) => {
      const id = ++nextToastId;
      const entry: ToastEntry = {
        id,
        kind: options.kind ?? "info",
        message: options.message,
        duration: options.duration ?? 4000,
      };
      setToasts((prev) => [...prev, entry]);
      if (entry.duration > 0) {
        window.setTimeout(() => dismiss(id), entry.duration);
      }
    },
    [dismiss]
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message, duration) => show({ kind: "success", message, duration }),
      error: (message, duration) => show({ kind: "error", message, duration }),
      info: (message, duration) => show({ kind: "info", message, duration }),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const KIND_ACCENT: Record<
  ToastKind,
  { icon: React.ComponentType<{ className?: string }>; stripe: string; iconClass: string }
> = {
  success: {
    icon: CheckCircle2,
    stripe: "border-l-emerald-500",
    iconClass: "text-emerald-500",
  },
  error: {
    icon: AlertCircle,
    stripe: "border-l-red-500",
    iconClass: "text-red-500",
  },
  info: {
    icon: Info,
    stripe: "border-l-accent-500",
    iconClass: "text-accent-500",
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastEntry;
  onDismiss: () => void;
}) {
  const { icon: Icon, stripe, iconClass } = KIND_ACCENT[toast.kind];
  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border border-l-4 bg-white p-4 shadow-lg",
        "border-gray-200 dark:border-brand-700 dark:bg-brand-800",
        "animate-in slide-in-from-right-4 fade-in-0 duration-200",
        stripe
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconClass)} />
      <p className="flex-1 text-sm leading-relaxed text-gray-900 dark:text-gray-50">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="rounded-sm text-gray-400 transition-opacity hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500/40 dark:hover:text-gray-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
