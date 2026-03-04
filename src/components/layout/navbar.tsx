"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/forms/volunteer-application", label: "Volunteer App" },
  { href: "/forms/drug-screen", label: "Drug Screen" },
  { href: "/forms/background-check", label: "BCI Fingerprint" },
  { href: "/forms/web-check", label: "Web Check" },
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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const navigateWithConfirm = (href: string) => {
    // Already on this page — do nothing
    if (pathname === href) return;
    // On dashboard, pipeline, or onboarding — navigate directly, no unsaved work to lose
    if (pathname === "/dashboard" || pathname === "/onboarding" || pathname.startsWith("/pipeline")) {
      router.push(href);
      return;
    }
    // On a form page — confirm before leaving
    setPendingHref(href);
    setShowLeaveDialog(true);
  };

  const isStaff = role === "RECRUITER" || role === "HR";

  const navLinks = isStaff
    ? [{ href: "/dashboard", label: "Dashboard" }]
    : NAV_LINKS;

  const homeHref = isStaff ? "/dashboard" : "/onboarding";

  const handleShieldClick = () => navigateWithConfirm(homeHref);

  const handleConfirmLeave = () => {
    setShowLeaveDialog(false);
    router.push(pendingHref);
  };

  return (
    <nav className="no-print bg-brand-500 text-white shadow-md">
      {/* Leave confirmation dialog */}
      {showLeaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 mx-4 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-900">
              Are you sure you want to leave?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Any unsaved progress on this page may be lost.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLeaveDialog(false)}
              >
                No
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmLeave}
              >
                Yes
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <button
          type="button"
          onClick={handleShieldClick}
          className="flex items-center hover:opacity-90 transition-opacity"
        >
          <Image
            src="/armor-health-logo.jpg"
            alt="Armor Health"
            width={160}
            height={48}
            className="h-10 w-auto object-contain"
            priority
          />
        </button>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {navLinks.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => navigateWithConfirm(link.href)}
              className={`text-sm transition-colors ${
                pathname === link.href
                  ? "text-white font-semibold underline underline-offset-4"
                  : "text-brand-200 hover:text-white"
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="w-px h-5 bg-brand-400" />
          {firstName && (
            <div className="text-right">
              <span className="text-sm text-brand-100 block leading-tight">
                {firstName} {lastName}
              </span>
              {role && (
                <span className="text-xs text-brand-300 block leading-tight">
                  {ROLE_LABELS[role] || role}
                </span>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white hover:bg-brand-600 hover:text-white"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Sign Out
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-brand-400 px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigateWithConfirm(link.href);
              }}
              className={`block w-full text-left text-sm px-2 py-2 rounded transition-colors ${
                pathname === link.href
                  ? "text-white font-semibold bg-brand-600"
                  : "text-brand-200 hover:text-white hover:bg-brand-600"
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="border-t border-brand-400 my-2" />
          {firstName && (
            <div className="px-2">
              <p className="text-sm text-brand-100">
                {firstName} {lastName}
              </p>
              {role && (
                <p className="text-xs text-brand-300">
                  {ROLE_LABELS[role] || role}
                </p>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white hover:bg-brand-600 hover:text-white w-full justify-start"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Sign Out
          </Button>
        </div>
      )}
    </nav>
  );
}
