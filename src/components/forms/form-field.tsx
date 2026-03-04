"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  errors: FieldErrors;
  className?: string;
}

export function FormField({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  disabled = false,
  register,
  errors,
  className,
}: FormFieldProps) {
  const error = name
    .split(".")
    .reduce<FieldErrors | undefined>(
      (acc, key) => (acc as Record<string, FieldErrors>)?.[key] as FieldErrors | undefined,
      errors
    );
  const errorMessage = (error as { message?: string } | undefined)?.message;

  if (type === "textarea") {
    return (
      <div className={className}>
        <Label htmlFor={name} required={required}>
          {label}
        </Label>
        <textarea
          id={name}
          placeholder={placeholder}
          disabled={disabled}
          {...register(name)}
          className="mt-1 flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
        />
        {errorMessage && (
          <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
        )}
      </div>
    );
  }

  if (type === "select") {
    return null; // Handled separately with options prop
  }

  return (
    <div className={className}>
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        error={!!errorMessage}
        {...register(name)}
        className="mt-1"
      />
      {errorMessage && (
        <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
