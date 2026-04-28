"use client";

import { useRouter, usePathname } from "next/navigation";
import { Building2, Check, ChevronDown, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { apiFetch } from "@/lib/api-client";
import {
  COUNTIES,
  COUNTY_SLUGS,
  CountySlug,
  getCountyFromPath,
  isValidCountySlug,
} from "@/lib/counties";

const ROLE_LABELS: Record<string, string> = {
  HR: "HR",
  ADMIN: "Admin",
  COUNTY_REP: "County Rep",
};

interface NavbarProps {
  firstName?: string;
  lastName?: string;
  role?: string;
  countySlugs?: string[];
}

export function Navbar({ firstName, lastName, role, countySlugs }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeCounty = getCountyFromPath(pathname);
  const dashboardHref = activeCounty ? `/${activeCounty}/pipeline` : "/pipeline";
  const navLinks = [{ href: dashboardHref, label: "Dashboard" }];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sitesOpen, setSitesOpen] = useState(false);
  const sitesRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close the Sites dropdown on outside click or Escape.
  useEffect(() => {
    if (!sitesOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (sitesRef.current && !sitesRef.current.contains(e.target as Node)) {
        setSitesOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSitesOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [sitesOpen]);

  // HR/ADMIN see all counties; COUNTY_REP sees only assigned ones.
  const isStaffGlobal = role === "HR" || role === "ADMIN";
  const visibleSites: CountySlug[] = isStaffGlobal
    ? [...COUNTY_SLUGS]
    : (countySlugs ?? []).filter(isValidCountySlug);
  const showSites = role !== undefined && visibleSites.length > 1;

  const handleLogout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  function goToSite(slug: CountySlug) {
    setSitesOpen(false);
    setMobileMenuOpen(false);
    router.push(`/${slug}/pipeline`);
  }

  return (
    <nav className="no-print bg-brand-900 shadow-lg sticky top-0 z-30">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <button
          type="button"
          onClick={() => router.push(dashboardHref)}
          aria-label="Go to dashboard"
          className="flex items-center hover:opacity-80 transition-opacity"
        >
          <div className="bg-white rounded-lg px-4 py-2">
            <Image
              src="/armor-health-logo.jpg"
              alt="Armor Health"
              width={200}
              height={60}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>
        </button>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => router.push(link.href)}
              className={`text-sm px-3 py-1.5 rounded-md transition-all duration-150 ${
                pathname === link.href
                  ? "text-white bg-white/15 font-semibold"
                  : "text-brand-300 hover:text-white hover:bg-white/10"
              }`}
            >
              {link.label}
            </button>
          ))}

          {showSites && (
            <div className="relative" ref={sitesRef}>
              <button
                type="button"
                onClick={() => setSitesOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={sitesOpen}
                className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-md transition-all duration-150 text-white ${
                  sitesOpen ? "bg-white/15" : "hover:bg-white/10"
                }`}
              >
                <Building2 className="h-4 w-4" />
                Sites
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${sitesOpen ? "rotate-180" : ""}`}
                />
              </button>
              {sitesOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 rounded-lg border border-brand-700 bg-brand-800 shadow-lg overflow-hidden"
                >
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white border-b border-brand-700">
                    Switch site
                  </div>
                  <ul className="max-h-80 overflow-y-auto py-1">
                    {visibleSites.map((slug) => {
                      const cfg = COUNTIES[slug];
                      const isActive = slug === activeCounty;
                      return (
                        <li key={slug}>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => goToSite(slug)}
                            className={`w-full flex items-start gap-2 px-3 py-2 text-left text-sm transition-colors ${
                              isActive
                                ? "bg-brand-700/60"
                                : "hover:bg-brand-700/40"
                            }`}
                          >
                            <span className="flex-1 min-w-0">
                              <span className="block font-medium text-white truncate">
                                {cfg.displayName}
                              </span>
                              <span className="block text-xs text-white truncate">
                                {cfg.sheriffOfficeAddress}
                              </span>
                            </span>
                            {isActive && (
                              <Check className="h-4 w-4 text-accent-400 mt-0.5" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="w-px h-5 bg-brand-700 mx-2" />
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg text-brand-400 hover:text-white hover:bg-white/10 transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
          {firstName && (
            <div className="text-right mr-1">
              <span className="text-sm text-white block leading-tight font-medium">
                {firstName} {lastName}
              </span>
              {role && (
                <span className="text-xs text-brand-400 block leading-tight">
                  {ROLE_LABELS[role] || role}
                </span>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-brand-400 hover:text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-brand-700 px-4 py-3 space-y-1 bg-brand-800">
          {navLinks.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                router.push(link.href);
              }}
              className={`block w-full text-left text-sm px-3 py-2.5 rounded-lg transition-colors ${
                pathname === link.href
                  ? "text-white bg-white/15 font-semibold"
                  : "text-brand-300 hover:text-white hover:bg-white/10"
              }`}
            >
              {link.label}
            </button>
          ))}

          {showSites && (
            <>
              <div className="border-t border-brand-700 my-2" />
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                Sites
              </p>
              {visibleSites.map((slug) => {
                const cfg = COUNTIES[slug];
                const isActive = slug === activeCounty;
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => goToSite(slug)}
                    className={`flex items-center gap-2 w-full text-left text-sm px-3 py-2.5 rounded-lg transition-colors text-white ${
                      isActive ? "bg-white/15 font-semibold" : "hover:bg-white/10"
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="flex-1">{cfg.displayName}</span>
                    {isActive && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </>
          )}

          <div className="border-t border-brand-700 my-2" />
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-2 w-full text-left text-sm px-3 py-2.5 rounded-lg text-white hover:bg-white/10 transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
          )}
          {firstName && (
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-white">
                {firstName} {lastName}
              </p>
              {role && (
                <p className="text-xs text-white">
                  {ROLE_LABELS[role] || role}
                </p>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full text-left text-sm px-3 py-2.5 rounded-lg text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}
