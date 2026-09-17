"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  User,
  Settings,
  Check,
  AlertCircle,
  Database,
} from "lucide-react";
import {
  loginWithUsername,
  registerWithUsername,
  getStoredFirebaseConfig,
  saveFirebaseConfigToStorage,
} from "../lib/firebase";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [activeTab, setActiveTab] = useState("login"); // login | register | config
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Firebase Config State
  const [firebaseConfigInput, setFirebaseConfigInput] = useState(() => {
    return JSON.stringify(getStoredFirebaseConfig(), null, 2);
  });
  const [configSaved, setConfigSaved] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const user = await loginWithUsername(username, password);
      setLoading(false);
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setLoading(false);
      console.error(err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        setErrorMsg(
          "Username atau password salah. Jika belum punya akun, silakan ke tab 'Daftar Akun'.",
        );
      } else {
        setErrorMsg(
          err.message || "Gagal login. Pastikan akun sudah terdaftar.",
        );
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const user = await registerWithUsername(username, password, displayName);
      setLoading(false);
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setLoading(false);
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setErrorMsg(
          "Username ini sudah terdaftar. Silakan pilih username lain atau gunakan menu login.",
        );
      } else if (err.code === "auth/weak-password") {
        setErrorMsg("Password minimal 6 karakter.");
      } else {
        setErrorMsg(err.message || "Gagal mendaftar akun baru.");
      }
    }
  };

  const handleSaveConfig = () => {
    try {
      const parsed = JSON.parse(firebaseConfigInput);
      saveFirebaseConfigToStorage(parsed);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2000);
    } catch (e) {
      setErrorMsg("Format JSON Firebase Config tidak valid.");
    }
  };

  const handleUseOfflineLocal = () => {
    const localUser = {
      uid: "offline-it-support",
      username: username.trim() || "nohan",
      displayName:
        displayName.trim() || username.trim() || "IT Support Officer",
      isLocalOffline: true,
    };
    localStorage.setItem("ops_auth_user", JSON.stringify(localUser));
    onAuthSuccess(localUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold text-zinc-100">
              Login Petugas IT // Ops Desk
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-sm font-mono"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/50">
          <button
            onClick={() => {
              setActiveTab("login");
              setErrorMsg("");
            }}
            className={`flex-1 py-2.5 text-xs font-semibold text-center transition ${
              activeTab === "login"
                ? "text-sky-400 border-b-2 border-sky-400 bg-zinc-900/80"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Masuk (Login)
          </button>
          <button
            onClick={() => {
              setActiveTab("register");
              setErrorMsg("");
            }}
            className={`flex-1 py-2.5 text-xs font-semibold text-center transition ${
              activeTab === "register"
                ? "text-sky-400 border-b-2 border-sky-400 bg-zinc-900/80"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Daftar Akun
          </button>
          <button
            onClick={() => {
              setActiveTab("config");
              setErrorMsg("");
            }}
            className={`px-3 py-2.5 text-xs font-semibold text-center transition flex items-center gap-1 ${
              activeTab === "config"
                ? "text-sky-400 border-b-2 border-sky-400 bg-zinc-900/80"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            title="Pengaturan Firebase Config"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab 1: Login with Username */}
        {activeTab === "login" && (
          <form onSubmit={handleLogin} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Username Petugas IT
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: nohan atau admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white shadow transition"
            >
              {loading ? "Memverifikasi..." : "Masuk ke Dashboard"}
            </button>

            <div className="pt-2 text-center space-y-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("register");
                  setErrorMsg("");
                }}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium block w-full"
              >
                Belum punya akun?{" "}
                <span className="underline font-bold">
                  Daftar Akun Baru di Sini
                </span>
              </button>
              <button
                type="button"
                onClick={handleUseOfflineLocal}
                className="text-[11px] text-zinc-500 hover:text-zinc-400 underline font-mono block w-full"
              >
                Gunakan Mode Lokal / Offline Tanpa Akun
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Register with Username */}
        {activeTab === "register" && (
          <form onSubmit={handleRegister} className="p-5 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Username Baru (Huruf/Angka tanpa spasi)
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: nohan"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.replace(/\s+/g, ""))
                  }
                  className="w-full pl-8 pr-3 py-2 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Nama Lengkap / Panggilan
              </label>
              <input
                type="text"
                placeholder="Contoh: Nohan (IT Support)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white shadow transition"
            >
              {loading ? "Mendaftarkan..." : "Daftar Username & Password"}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setErrorMsg("");
                }}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium"
              >
                Sudah punya akun?{" "}
                <span className="underline font-bold">
                  Masuk (Login) di Sini
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Firebase Config */}
        {activeTab === "config" && (
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs text-sky-400 font-mono font-semibold">
              <Database className="w-3.5 h-3.5" />
              <span>Firebase Realtime Database Active</span>
            </div>
            <p className="text-xs text-zinc-400">
              Konfigurasi Firebase proyek{" "}
              <code className="text-sky-300">work-notes-d3ca6</code> telah
              terhubung ke Realtime Database. Anda dapat mengubah pengaturan
              JSON di bawah jika diperlukan:
            </p>

            <textarea
              rows={8}
              value={firebaseConfigInput}
              onChange={(e) => setFirebaseConfigInput(e.target.value)}
              className="w-full p-2.5 rounded bg-zinc-950 border border-zinc-700 font-mono text-[11px] text-zinc-200 focus:outline-none focus:border-sky-500 leading-relaxed"
            ></textarea>

            {configSaved && (
              <div className="p-2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Konfigurasi Firebase berhasil disimpan!
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveConfig}
              className="w-full py-2 rounded text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600"
            >
              Simpan Konfigurasi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
