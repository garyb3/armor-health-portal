"use client";

import { createContext, useContext } from "react";
import type { CountySlug } from "@/lib/counties";

export interface CountyContextValue {
  id: string;
  slug: CountySlug;
  displayName: string;
}

const CountyContext = createContext<CountyContextValue | null>(null);

export function CountyProvider({
  county,
  children,
}: {
  county: CountyContextValue;
  children: React.ReactNode;
}) {
  return <CountyContext.Provider value={county}>{children}</CountyContext.Provider>;
}

export function useCounty(): CountyContextValue {
  const ctx = useContext(CountyContext);
  if (!ctx) {
    throw new Error("useCounty must be used inside a CountyProvider (under /[county]/...)");
  }
  return ctx;
}

export function useCountyOptional(): CountyContextValue | null {
  return useContext(CountyContext);
}
