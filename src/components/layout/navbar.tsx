"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const NAV_LINKS = [
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
    if (pathname === href) return;
    if (pathname === "/dashboard" || pathname === "/onboarding" || pathname.startsWith("/pipeline")) {
      router.push(href);
      return;
    }
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
    <nav className="no-print bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-30">
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
          <Image
            src="/armor-health-logo.jpg"
            alt="Armor Health"
            width={160}
            height={48}
            className="h-9 w-auto object-contain"
            priority
          />
        </button>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => navigateWithConfirm(link.href)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-all duration-150 ${
                pathname === link.href
                  ? "text-accent-600 bg-accent-50 font-semibold"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="w-px h-5 bg-gray-200 mx-2" />
          {firstName && (
            <div className="text-right mr-1">
              <span className="text-sm text-gray-700 block leading-tight font-medium">
                {firstName} {lastName}
              </span>
              {role && (
                <span className="text-xs text-gray-400 block leading-tight">
                  {ROLE_LABELS[role] || role}
                </span>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5 text-gray-600" /> : <Menu className="h-5 w-5 text-gray-600" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 px-4 py-3 space-y-1 bg-white">
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
                  ? "text-accent-600 bg-accent-50 font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="border-t border-gray-100 my-2" />
          {firstName && (
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-gray-700">
                {firstName} {lastName}
              </p>
              {role && (
                <p className="text-xs text-gray-400">
                  {ROLE_LABELS[role] || role}
                </p>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full text-left text-sm px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}
