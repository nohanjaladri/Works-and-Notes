"use client";

import React, { useState } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  Upload,
  Database,
  Search,
} from "lucide-react";
import { exportAllDataAsJSON, importAllDataFromJSON } from "../lib/storage";

export default function NotesHub({ notes, onSaveNotes, onRefreshAllData }) {
  const [selectedNoteId, setSelectedNoteId] = useState(notes[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState(null);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || null;

  const handleCreateNewNote = () => {
    const newNote = {
      id: `note-${Date.now()}`,
      title: "Catatan Baru.txt",
      content: `# Catatan IT Support\nTanggal: ${new Date().toLocaleDateString("id-ID")}\n\n`,
      updatedAt: new Date().toISOString(),
    };
    const updated = [newNote, ...notes];
    onSaveNotes(updated);
    setSelectedNoteId(newNote.id);
  };

  const handleUpdateCurrentNote = (field, value) => {
    if (!selectedNoteId) return;
    const updated = notes.map((n) => {
      if (n.id === selectedNoteId) {
        return {
          ...n,
          [field]: value,
          updatedAt: new Date().toISOString(),
        };
      }
      return n;
    });
    onSaveNotes(updated);
  };

  const handleDeleteNote = (id) => {
    if (!confirm("Hapus file catatan ini?")) return;
    const updated = notes.filter((n) => n.id !== id);
    onSaveNotes(updated);
    if (selectedNoteId === id) {
      setSelectedNoteId(updated[0]?.id || null);
    }
  };

  const handleUploadTxtFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const newNote = {
        id: `note-${Date.now()}`,
        title: file.name.endsWith(".txt") ? file.name : `${file.name}.txt`,
        content: content,
        updatedAt: new Date().toISOString(),
      };
      const updated = [newNote, ...notes];
      onSaveNotes(updated);
      setSelectedNoteId(newNote.id);
    };
    reader.readAsText(file);
  };

  const handleDownloadTxt = (note) => {
    const blob = new Blob([note.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = note.title.endsWith(".txt")
      ? note.title
      : `${note.title}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyNoteContent = () => {
    if (!selectedNote) return;
    navigator.clipboard.writeText(selectedNote.content);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Backup & Restore
  const handleExportAllBackup = () => {
    const jsonStr = exportAllDataAsJSON();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Backup_IT_Ops_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = importAllDataFromJSON(event.target.result);
      if (res.success) {
        setBackupFeedback("Berhasil memulihkan seluruh data database lokal!");
        if (onRefreshAllData) onRefreshAllData();
      } else {
        setBackupFeedback("Gagal memulihkan data: " + res.error);
      }
      setTimeout(() => setBackupFeedback(null), 3000);
    };
    reader.readAsText(file);
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-zinc-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            Catatan & Dokumen .TXT Fleksibel
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Simpan catatan IP address, konfigurasi switch, kontak vendor, atau
            upload file .txt dari mana saja.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="px-3 py-1.5 rounded text-xs font-medium bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-1.5 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Upload File .TXT</span>
            <input
              type="file"
              accept=".txt"
              onChange={handleUploadTxtFile}
              className="hidden"
            />
          </label>

          <button
            onClick={handleCreateNewNote}
            className="px-3.5 py-1.5 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-4 h-4" />
            Buat Catatan Baru
          </button>
        </div>
      </div>

      {/* Split Layout: Notes List (Left) + Editor (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-6">
        {/* Left List */}
        <div className="md:col-span-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Cari file catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Notes list */}
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {filteredNotes.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                Belum ada catatan .txt
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = selectedNoteId === note.id;
                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? "bg-zinc-900 border-sky-600 text-zinc-100"
                        : "bg-zinc-950/70 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div className="truncate flex-1 pr-2">
                      <div className="text-xs font-mono font-medium truncate flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">{note.title}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-1">
                        {new Date(note.updatedAt).toLocaleDateString("id-ID")}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                      className="p-1 rounded text-zinc-600 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Backup & Restore Bar */}
          <div className="pt-4 border-t border-zinc-800/90 text-xs text-zinc-400 space-y-2">
            <span className="font-mono text-[11px] text-zinc-500 flex items-center gap-1">
              <Database className="w-3.5 h-3.5" /> Database Backup & Restore:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportAllBackup}
                className="flex-1 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 text-center"
              >
                Export Backup (JSON)
              </button>
              <label className="flex-1 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 text-center cursor-pointer">
                Restore Backup
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
            {backupFeedback && (
              <div className="p-2 rounded bg-sky-950/60 border border-sky-800 text-sky-300 text-[11px]">
                {backupFeedback}
              </div>
            )}
          </div>
        </div>

        {/* Right Editor */}
        <div className="md:col-span-8 bg-zinc-950 border border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col min-h-[500px]">
          {selectedNote ? (
            <>
              {/* Note Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                <input
                  type="text"
                  value={selectedNote.title}
                  onChange={(e) =>
                    handleUpdateCurrentNote("title", e.target.value)
                  }
                  className="bg-transparent text-sm font-mono font-bold text-zinc-100 border-b border-transparent hover:border-zinc-700 focus:border-sky-500 focus:outline-none px-1 py-0.5"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyNoteContent}
                    className="px-2.5 py-1 rounded text-xs font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center gap-1.5 transition"
                  >
                    {copySuccess ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-sky-400" />
                    )}
                    <span>{copySuccess ? "Tersalin!" : "Salin Teks"}</span>
                  </button>
                  <button
                    onClick={() => handleDownloadTxt(selectedNote)}
                    className="px-2.5 py-1 rounded text-xs font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Download .txt</span>
                  </button>
                </div>
              </div>

              {/* Text Area */}
              <div className="mt-3 flex-1 flex flex-col">
                <textarea
                  value={selectedNote.content}
                  onChange={(e) =>
                    handleUpdateCurrentNote("content", e.target.value)
                  }
                  placeholder="Ketik catatan teknis di sini (IP address, konfigurasi, catatan vendor, SOP)..."
                  className="w-full flex-1 min-h-[380px] p-3 rounded bg-zinc-900/60 border border-zinc-800/80 font-mono text-xs text-zinc-200 leading-relaxed focus:outline-none focus:border-sky-500 resize-none"
                ></textarea>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>{selectedNote.content.length} karakter</span>
                <span>Tersimpan otomatis di penyimpanan lokal</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-500 p-8">
              <FileText className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-xs">
                Pilih catatan di sebelah kiri atau klik &quot;Buat Catatan
                Baru&quot;.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
