"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut, Menu, Moon, Sun, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { apiFetch } from "@/lib/api-client";

const NAV_LINKS = [
  { href: "/forms/volunteer-app", label: "Clearance Form" },
  { href: "/forms/professional-license", label: "License" },
  { href: "/forms/drug-screen", label: "Drug Screen" },
  { href: "/forms/background-check", label: "BCI Fingerprint" },
];

const ROLE_LABELS: Record<string, string> = {
  APPLICANT: "Applicant",
  RECRUITER: "Recruiter",
  ADMIN_ASSISTANT: "Admin Assistant",
  COUNTY_REPRESENTATIVE: "County Representative",
  HR: "HR",
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
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingHref, setPendingHref] = useState<string>("/dashboard");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const navigateWithConfirm = (href: string) => {
    if (pathname === href) return;
    if (pathname === "/dashboard" || pathname === "/background-clearance" || pathname.startsWith("/pipeline")) {
      router.push(href);
      return;
    }
    setPendingHref(href);
    setShowLeaveDialog(true);
  };

  const isStaff = ["RECRUITER", "HR", "ADMIN", "ADMIN_ASSISTANT"].includes(role || "");

  const navLinks = isStaff
    ? [{ href: "/dashboard", label: "Dashboard" }]
    : NAV_LINKS;

  const homeHref = isStaff ? "/dashboard" : "/background-clearance";

  const handleShieldClick = () => navigateWithConfirm(homeHref);

  const handleConfirmLeave = () => {
    setShowLeaveDialog(false);
    router.push(pendingHref);
  };

  return (
    <nav className="no-print bg-brand-900 shadow-lg sticky top-0 z-30">
      {/* Leave confirmation dialog */}
      {showLeaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 mx-4 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-900">
              Are you sure you want to leave?
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Any unsaved progress on this page may be lost.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLeaveDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmLeave}
              >
                Leave Page
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <button
          type="button"
          onClick={handleShieldClick}
          className="flex items-center hover:opacity-80 transition-opacity"
        >
          <div className="bg-white rounded-lg px-3 py-1.5">
            <Image
              src="/armor-health-logo.jpg"
              alt="Armor Health"
              width={160}
              height={48}
              className="h-8 w-auto object-contain"
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
              onClick={() => navigateWithConfirm(link.href)}
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
          {navLinks.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigateWithConfirm(link.href);
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
