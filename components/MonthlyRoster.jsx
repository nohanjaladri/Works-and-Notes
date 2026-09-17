"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  Copy,
  Check,
  Sparkles,
  FileText,
  AlertCircle,
} from "lucide-react";
import { parseRosterText, saveRosterForMonth } from "../lib/storage";

export default function MonthlyRoster({
  rosterData,
  onSaveRoster,
  onDateShiftChange,
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [importFeedback, setImportFeedback] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0 - 11
  const yearMonth = `${year}-${String(month + 1).padStart(2, "0")}`;

  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const currentMonthRoster = rosterData[yearMonth] || {};

  // Calendar math
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Click on a date cycles: PAGI -> SIANG -> MALAM -> OFF -> (None)
  const handleDateClick = (dayNumber) => {
    const dateKey = `${yearMonth}-${String(dayNumber).padStart(2, "0")}`;
    const currentVal = currentMonthRoster[dateKey];
    let nextVal = "PAGI";

    if (currentVal === "PAGI") nextVal = "SIANG";
    else if (currentVal === "SIANG") nextVal = "MALAM";
    else if (currentVal === "MALAM") nextVal = "OFF";
    else if (currentVal === "OFF") nextVal = null; // clear

    const updatedMonth = { ...currentMonthRoster };
    if (nextVal) {
      updatedMonth[dateKey] = nextVal;
    } else {
      delete updatedMonth[dateKey];
    }

    onSaveRoster(yearMonth, updatedMonth);
  };

  // AI Prompt Template Copy Tool
  const aiPromptTemplate = `Tolong baca gambar jadwal shift kerja saya ini. Ekstrak data jadwal untuk diri saya dan ubah menjadi format teks standar berikut persis tanpa teks tambahan/pembuka/penutup agar dapat dibaca langsung oleh sistem:

# BULAN: ${yearMonth}
# KODE: PAGI | SIANG | MALAM | OFF

${yearMonth}-01: PAGI
${yearMonth}-02: PAGI
${yearMonth}-03: SIANG
${yearMonth}-04: SIANG
${yearMonth}-05: MALAM
${yearMonth}-06: MALAM
${yearMonth}-07: OFF
`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(aiPromptTemplate);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Process text or file upload
  const handleProcessImport = () => {
    if (!importText.trim()) return;
    const parsed = parseRosterText(importText, yearMonth);
    if (parsed.count === 0) {
      setImportFeedback({
        error: true,
        message:
          "Tidak ada data tanggal dan shift yang terdeteksi. Pastikan format teks sesuai (contoh: 2026-09-01: PAGI atau 01: P).",
      });
      return;
    }

    onSaveRoster(parsed.yearMonth, parsed.rosterMap);
    
    // Jump calendar to imported month
    if (parsed.yearMonth) {
      const [pYear, pMonth] = parsed.yearMonth.split("-").map(Number);
      if (pYear && pMonth) {
        setCurrentDate(new Date(pYear, pMonth - 1, 1));
      }
    }

    setImportFeedback({
      error: false,
      message: `Berhasil memuat ${parsed.count} jadwal shift untuk bulan ${parsed.yearMonth}!`,
    });
    setTimeout(() => {
      setIsImportModalOpen(false);
      setImportFeedback(null);
      setImportText("");
    }, 1500);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImportText(event.target.result);
    };
    reader.readAsText(file);
  };

  // Export this month's roster to .txt
  const handleExportTxt = () => {
    let output = `# JADWAL SHIFT BULANAN IT SUPPORT\n# BULAN: ${yearMonth}\n# Dibuat pada: ${new Date().toLocaleString("id-ID")}\n\n`;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${yearMonth}-${String(day).padStart(2, "0")}`;
      const shift = currentMonthRoster[dateKey] || "OFF";
      output += `${dateKey}: ${shift}\n`;
    }

    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Jadwal_Shift_${yearMonth}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Summary counts
  const counts = Object.values(currentMonthRoster).reduce(
    (acc, val) => {
      if (val === "PAGI") acc.pagi++;
      else if (val === "SIANG") acc.siang++;
      else if (val === "MALAM") acc.malam++;
      else if (val === "OFF") acc.off++;
      return acc;
    },
    { pagi: 0, siang: 0, malam: 0, off: 0 },
  );

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 pb-20 md:pb-10">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-zinc-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-sky-400" />
            Kalender Shift Bulanan
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Klik tanggal untuk ubah shift secara manual, atau salin prompt AI
            untuk mengonversi foto jadwal bulanan ke file .txt.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyPrompt}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-zinc-900 border border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-800 flex items-center gap-1.5 transition"
            title="Salin template instruksi untuk dikirim bersama foto jadwal ke ChatGPT/Claude/Gemini"
          >
            {copySuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>
              {copySuccess ? "Prompt Tersalin!" : "Salin Prompt untuk AI"}
            </span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 shadow transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Teks Jadwal (.TXT)</span>
          </button>

          <button
            onClick={handleExportTxt}
            className="px-2.5 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800 flex items-center gap-1 transition"
            title="Download jadwal bulan ini sebagai .txt"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Month Navigator & Summary Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-5">
        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-bold text-zinc-100 font-mono">
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend / Summary */}
        <div className="flex items-center gap-2 text-xs flex-wrap font-mono">
          <span className="px-2 py-1 rounded bg-sky-950/70 text-sky-400 border border-sky-800/80">
            PAGI: <strong>{counts.pagi}</strong>
          </span>
          <span className="px-2 py-1 rounded bg-amber-950/70 text-amber-400 border border-amber-800/80">
            SIANG: <strong>{counts.siang}</strong>
          </span>
          <span className="px-2 py-1 rounded bg-purple-950/70 text-purple-400 border border-purple-800/80">
            MALAM: <strong>{counts.malam}</strong>
          </span>
          <span className="px-2 py-1 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
            OFF: <strong>{counts.off}</strong>
          </span>
        </div>
      </div>

      {/* Interactive Monthly Calendar Grid */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {/* Day Header */}
        <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/60 text-center py-2 text-[11px] font-mono font-semibold text-zinc-400">
          <div>MIN</div>
          <div>SEN</div>
          <div>SEL</div>
          <div>RAB</div>
          <div>KAM</div>
          <div>JUM</div>
          <div>SAB</div>
        </div>

        {/* Date Cells */}
        <div className="grid grid-cols-7 auto-rows-fr gap-px bg-zinc-800">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[70px] sm:min-h-[90px] bg-zinc-950/50 p-1.5 opacity-30"
            ></div>
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateKey = `${yearMonth}-${String(day).padStart(2, "0")}`;
            const shift = currentMonthRoster[dateKey];
            const isToday = new Date().toISOString().slice(0, 10) === dateKey;

            return (
              <div
                key={day}
                onClick={() => handleDateClick(day)}
                className={`min-h-[70px] sm:min-h-[90px] p-2 bg-zinc-950 hover:bg-zinc-900/80 cursor-pointer transition flex flex-col justify-between select-none relative ${
                  isToday ? "ring-1 ring-sky-500 bg-sky-950/10" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-semibold ${isToday ? "text-sky-400 font-bold" : "text-zinc-300"}`}
                  >
                    {day}
                  </span>
                  {isToday && (
                    <span className="text-[9px] px-1 rounded bg-sky-600 text-white font-mono font-semibold">
                      HARI INI
                    </span>
                  )}
                </div>

                {/* Shift Indicator Pill */}
                <div className="mt-1">
                  {shift === "PAGI" && (
                    <div className="w-full text-center py-1 rounded bg-sky-950/90 text-sky-400 border border-sky-800/90 font-mono text-[11px] font-bold">
                      PAGI
                    </div>
                  )}
                  {shift === "SIANG" && (
                    <div className="w-full text-center py-1 rounded bg-amber-950/90 text-amber-400 border border-amber-800/90 font-mono text-[11px] font-bold">
                      SIANG
                    </div>
                  )}
                  {shift === "MALAM" && (
                    <div className="w-full text-center py-1 rounded bg-purple-950/90 text-purple-400 border border-purple-800/90 font-mono text-[11px] font-bold">
                      MALAM
                    </div>
                  )}
                  {shift === "OFF" && (
                    <div className="w-full text-center py-1 rounded bg-zinc-900 text-zinc-500 border border-zinc-800 font-mono text-[11px]">
                      OFF
                    </div>
                  )}
                  {!shift && (
                    <div className="w-full text-center py-1 rounded text-zinc-700 font-mono text-[10px] hover:text-zinc-500">
                      + Set
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 text-[11px] text-zinc-500 font-mono flex items-center justify-between">
        <span>
          💡 Tips: Klik kotak tanggal untuk mengubah shift (Pagi ➔ Siang ➔ Malam
          ➔ Off ➔ Kosong)
        </span>
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-sky-400" />
                Upload / Tempel Teks Jadwal dari AI
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Kirim foto jadwal ke AI di luar web menggunakan tombol{" "}
                <em>Salin Prompt untuk AI</em>, lalu tempel (*paste*) teks
                hasilnya di bawah atau upload file{" "}
                <code className="text-sky-400">.txt</code>-nya:
              </p>

              <div>
                <textarea
                  rows={8}
                  placeholder={`Contoh teks hasil AI:\n\n# BULAN: ${yearMonth}\n${yearMonth}-01: PAGI\n${yearMonth}-02: PAGI\n${yearMonth}-03: SIANG\n...`}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full p-3 rounded bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs font-mono focus:outline-none focus:border-sky-500"
                ></textarea>
              </div>

              {/* Upload file directly */}
              <div className="flex items-center justify-between pt-1">
                <label className="text-xs text-sky-400 hover:text-sky-300 cursor-pointer flex items-center gap-1.5 font-medium">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Pilih file .txt dari komputer</span>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-zinc-500 font-mono">
                  Format .TXT
                </span>
              </div>

              {importFeedback && (
                <div
                  className={`p-3 rounded text-xs ${
                    importFeedback.error
                      ? "bg-red-950/80 text-red-300 border border-red-800"
                      : "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                  }`}
                >
                  {importFeedback.message}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessImport}
                disabled={!importText.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white shadow"
              >
                Terapkan ke Kalender
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
