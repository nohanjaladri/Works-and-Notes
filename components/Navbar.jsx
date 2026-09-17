"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Calendar,
  CheckSquare,
  FileText,
  Settings,
  LogOut,
  Clock,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { logoutUser } from "../lib/firebase";

export default function Navbar({
  activeTab,
  setActiveTab,
  user,
  currentShift,
  onOpenAuth,
  syncStatus,
}) {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("id-ID", { hour12: false }));
      setCurrentDateStr(
        now.toLocaleDateString("id-ID", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getShiftBadge = () => {
    if (!currentShift) {
      return (
        <span className="px-2 py-0.5 text-xs font-mono rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
          Shift Belum Diset
        </span>
      );
    }
    const shift = currentShift.toUpperCase();
    if (shift === "PAGI") {
      return (
        <span className="px-2 py-0.5 text-xs font-mono rounded bg-sky-950/80 text-sky-400 border border-sky-800/80 flex items-center gap-1.5 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
          SHIFT PAGI (07:00 - 15:00)
        </span>
      );
    }
    if (shift === "SIANG") {
      return (
        <span className="px-2 py-0.5 text-xs font-mono rounded bg-amber-950/80 text-amber-400 border border-amber-800/80 flex items-center gap-1.5 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          SHIFT SIANG (14:30 - 22:30)
        </span>
      );
    }
    if (shift === "MALAM") {
      return (
        <span className="px-2 py-0.5 text-xs font-mono rounded bg-purple-950/80 text-purple-400 border border-purple-800/80 flex items-center gap-1.5 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
          SHIFT MALAM (22:00 - 07:00)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
        LIBUR / OFF
      </span>
    );
  };

  const navItems = [
    { id: "daily", label: "Dashboard Hari Ini", icon: Activity },
    { id: "master", label: "Master Job Desk", icon: CheckSquare },
    { id: "roster", label: "Kalender Shift", icon: Calendar },
    { id: "notes", label: "Catatan .TXT", icon: FileText },
  ];

  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-zinc-950/95 backdrop-blur border-b border-zinc-800/90 select-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          {/* Brand & Live Shift */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center font-mono font-bold text-xs text-sky-400">
                IT
              </div>
              <span className="font-mono font-bold tracking-wider text-xs sm:text-sm text-zinc-100 hidden sm:inline">
                OPS-DESK //
              </span>
            </div>

            <div className="flex items-center">{getShiftBadge()}</div>
          </div>

          {/* Desktop Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${
                    isActive
                      ? "bg-zinc-800 text-white font-semibold border border-zinc-700 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Live Clock & User Info */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sync Indicator */}
            {syncStatus && (
              <div
                className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border ${
                  syncStatus.status === "online"
                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/80"
                    : syncStatus.status === "syncing"
                      ? "bg-sky-950/60 text-sky-400 border-sky-800/80"
                      : "bg-amber-950/60 text-amber-400 border-amber-800/80"
                }`}
                title="Status Sinkronisasi Firebase Realtime Database"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    syncStatus.status === "online"
                      ? "bg-emerald-400"
                      : syncStatus.status === "syncing"
                        ? "bg-sky-400 animate-spin"
                        : "bg-amber-400 animate-pulse"
                  }`}
                ></span>
                <span>{syncStatus.label}</span>
              </div>
            )}

            <div className="hidden lg:flex flex-col items-end text-right">
              <div className="font-mono text-xs font-semibold text-zinc-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-500" />
                {currentTime}
              </div>
              <span className="text-[10px] text-zinc-500">
                {currentDateStr}
              </span>
            </div>

            {user ? (
              <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
                <div className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] font-mono font-bold text-sky-300">
                  {(user.displayName || user.username || "IT")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-medium text-zinc-200 leading-tight truncate max-w-[110px]">
                    {user.displayName || user.username || "IT Support"}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {user.isLocalOffline ? "Mode Lokal" : "Firebase RTDB"}
                  </div>
                </div>
                <button
                  onClick={logoutUser}
                  title="Logout"
                  className="p-1.5 rounded hover:bg-zinc-900 text-zinc-400 hover:text-red-400 transition ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-2.5 py-1 text-xs font-medium rounded bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Login
              </button>
            )}

            {/* Mobile menu hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu (Top) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-zinc-800 bg-zinc-950 p-2 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-mono text-zinc-400 flex justify-between">
              <span>{currentDateStr}</span>
              <span className="text-zinc-200 font-bold">{currentTime}</span>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded text-xs font-medium flex items-center gap-2 text-left ${
                    isActive
                      ? "bg-zinc-800 text-white font-semibold border border-zinc-700"
                      : "text-zinc-300 hover:bg-zinc-900"
                  }`}
                >
                  <Icon className="w-4 h-4 text-zinc-400" />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Mobile Bottom Thumb Navigation Bar (Thumb zone for field work in DC/Warehouse) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800/90 backdrop-blur px-2 py-1 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded text-[10px] font-medium transition ${
                isActive
                  ? "text-sky-400 font-semibold"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 ${isActive ? "text-sky-400" : "text-zinc-500"}`}
              />
              <span>
                {item.label.replace("Dashboard ", "").replace("Shift", "")}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
