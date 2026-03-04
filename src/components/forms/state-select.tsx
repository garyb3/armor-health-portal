"use client";

import { Label } from "@/components/ui/label";
import { US_STATES } from "@/lib/us-states";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

interface StateSelectProps {
  label: string;
  name: string;
  required?: boolean;
  disabled?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  errors: FieldErrors;
  className?: string;
}

export function StateSelect({
  label,
  name,
  required = false,
  disabled = false,
  register,
  errors,
  className,
}: StateSelectProps) {
  const error = name
    .split(".")
    .reduce<FieldErrors | undefined>(
      (acc, key) => (acc as Record<string, FieldErrors>)?.[key] as FieldErrors | undefined,
      errors
    );
  const errorMessage = (error as { message?: string } | undefined)?.message;

  return (
    <div className={className}>
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      <select
        id={name}
        disabled={disabled}
        {...register(name)}
        className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">Select state...</option>
        {US_STATES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {errorMessage && (
        <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
