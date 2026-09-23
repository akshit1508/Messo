"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ADMIN_NAV_ITEMS } from "./AdminSidebar";

export function AdminHeader({ onLogout }: { onLogout: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { currentUser } = useAuth();

  return (
    <header className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl font-black tracking-tight text-blue-600">MESO</span>
          <span className="text-slate-300">|</span>
          <Badge variant="warning" size="sm">
            Admin
          </Badge>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <div className="flex items-center space-x-3 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {currentUser?.email || "Administrator"}
              </p>
              <p className="text-[11px] text-amber-700 font-mono font-medium">ROLE_ADMIN</p>
            </div>
          </div>

          <nav className="space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className={isActive ? "text-blue-600" : "text-slate-400"}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="w-full justify-center"
            >
              Sign out
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
