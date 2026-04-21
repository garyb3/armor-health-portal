"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut, Menu, Moon, Sun, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { apiFetch } from "@/lib/api-client";

const NAV_LINKS = [{ href: "/pipeline", label: "Dashboard" }];

const ROLE_LABELS: Record<string, string> = {
  HR: "HR",
  ADMIN: "Admin",
};

interface NavbarProps {
  firstName?: string;
  lastName?: string;
  role?: string;
}

export function Navbar({ firstName, lastName, role }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <nav className="no-print bg-brand-900 shadow-lg sticky top-0 z-30">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <button
          type="button"
          onClick={() => router.push("/pipeline")}
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
          {NAV_LINKS.map((link) => (
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
          {NAV_LINKS.map((link) => (
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
          <div className="border-t border-brand-700 my-2" />
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-2 w-full text-left text-sm px-3 py-2.5 rounded-lg text-brand-300 hover:text-white hover:bg-white/10 transition-colors"
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
                <p className="text-xs text-brand-400">
                  {ROLE_LABELS[role] || role}
                </p>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full text-left text-sm px-3 py-2.5 rounded-lg text-brand-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}
