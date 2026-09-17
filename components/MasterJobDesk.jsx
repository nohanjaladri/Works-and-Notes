"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Clock,
  MapPin,
  CheckCircle2,
  CheckSquare,
  AlertCircle,
  Layers,
  Sparkles,
  Server,
  Building2,
  Package,
} from "lucide-react";

export default function MasterJobDesk({
  masterJobs = { PAGI: [], SIANG: [], MALAM: [] },
  onSaveMasterJobs,
}) {
  const [selectedShift, setSelectedShift] = useState("PAGI");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);

  // Form State
  const [title, setTitle] = useState("");
  const [targetTime, setTargetTime] = useState("07:30");
  const [location, setLocation] = useState("Warehouse");
  const [priority, setPriority] = useState("P2");
  const [checklistItems, setChecklistItems] = useState([""]);

  const safeMasterJobs = masterJobs || { PAGI: [], SIANG: [], MALAM: [] };
  const currentShiftJobs = safeMasterJobs[selectedShift] || [];

  const handleOpenAddModal = () => {
    setEditingJobId(null);
    setTitle("");
    setTargetTime(
      selectedShift === "PAGI"
        ? "07:30"
        : selectedShift === "SIANG"
          ? "15:00"
          : "22:30",
    );
    setLocation("Warehouse");
    setPriority("P2");
    setChecklistItems([""]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (job) => {
    setEditingJobId(job.id);
    setTitle(job.title);
    setTargetTime(job.targetTime || "08:00");
    setLocation(job.location || "Office");
    setPriority(job.priority || "P2");
    setChecklistItems(
      job.checklist && job.checklist.length > 0
        ? job.checklist.map((c) => c.text)
        : [""],
    );
    setIsModalOpen(true);
  };

  const handleAddChecklistField = () => {
    setChecklistItems([...checklistItems, ""]);
  };

  const handleRemoveChecklistField = (index) => {
    const updated = checklistItems.filter((_, i) => i !== index);
    setChecklistItems(updated.length > 0 ? updated : [""]);
  };

  const handleChecklistChange = (index, value) => {
    const updated = [...checklistItems];
    updated[index] = value;
    setChecklistItems(updated);
  };

  const handleSaveJob = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const filteredChecklist = checklistItems
      .filter((item) => item.trim().length > 0)
      .map((item, idx) => ({
        id: `chk-${Date.now()}-${idx}`,
        text: item.trim(),
        isDone: false,
      }));

    const newJobObj = {
      id: editingJobId || `job-${Date.now()}`,
      title: title.trim(),
      targetTime: targetTime,
      location: location,
      priority: priority,
      checklist: filteredChecklist,
      updatedAt: new Date().toISOString(),
    };

    const updatedShiftJobs = editingJobId
      ? currentShiftJobs.map((j) => (j.id === editingJobId ? newJobObj : j))
      : [...currentShiftJobs, newJobObj];

    // Sort by target time
    updatedShiftJobs.sort((a, b) => a.targetTime.localeCompare(b.targetTime));

    const newMaster = {
      ...masterJobs,
      [selectedShift]: updatedShiftJobs,
    };

    onSaveMasterJobs(newMaster);
    setIsModalOpen(false);
  };

  const handleDeleteJob = (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus job desk ini?")) return;
    const updated = currentShiftJobs.filter((j) => j.id !== id);
    onSaveMasterJobs({
      ...masterJobs,
      [selectedShift]: updated,
    });
  };

  // Optional preset helper: load recommended starter templates for IT Support (PTL, HW Office, Sweeping)
  const handleLoadSamplePresets = () => {
    if (currentShiftJobs.length > 0) {
      if (
        !confirm(
          "Ini akan menambahkan template rekomendasi (PTL Warehouse, Hardware Office, Sweeping) ke shift ini. Lanjutkan?",
        )
      ) {
        return;
      }
    }

    const sampleJobs = [
      {
        id: `preset-swp-${Date.now()}`,
        title: "Sweeping Awal Shift (DC, Warehouse & Office)",
        targetTime:
          selectedShift === "PAGI"
            ? "07:00"
            : selectedShift === "SIANG"
              ? "14:30"
              : "22:00",
        location: "Data Center",
        priority: "P1",
        checklist: [
          {
            id: "s1",
            text: "Inspeksi lorong dingin DC & suhu AC PAC (18 - 22°C)",
            isDone: false,
          },
          {
            id: "s2",
            text: "Cek lampu LED server & alarm UPS/PDU (tidak ada amber/red)",
            isDone: false,
          },
          {
            id: "s3",
            text: "Cek fisik Access Point (AP) gudang & kerapian box switch",
            isDone: false,
          },
          {
            id: "s4",
            text: "Pastikan pintu Data Center tertutup rapat & terkunci",
            isDone: false,
          },
        ],
      },
      {
        id: `preset-ptl-${Date.now()}`,
        title: "Checklist PTL Warehouse (Pick/Put-To-Light)",
        targetTime:
          selectedShift === "PAGI"
            ? "07:30"
            : selectedShift === "SIANG"
              ? "15:30"
              : "23:00",
        location: "Warehouse",
        priority: "P1",
        checklist: [
          {
            id: "p1",
            text: "Ping controller/gateway PTL & koneksi WMS server",
            isDone: false,
          },
          {
            id: "p2",
            text: "Cek modul display LED rak (tidak ada digit redup/mati)",
            isDone: false,
          },
          {
            id: "p3",
            text: "Uji acak tombol push-button/sensor konfirmasi rak",
            isDone: false,
          },
          {
            id: "p4",
            text: "Cek adaptor power & kabel LAN/PoE switch rak PTL",
            isDone: false,
          },
          {
            id: "p5",
            text: "Cek koneksi ring scanner / barcode scanner ke terminal PTL",
            isDone: false,
          },
        ],
      },
      {
        id: `preset-hwo-${Date.now()}`,
        title: "Checklist Hardware Office & Meeting Room",
        targetTime:
          selectedShift === "PAGI"
            ? "08:30"
            : selectedShift === "SIANG"
              ? "16:30"
              : "01:00",
        location: "Office",
        priority: "P2",
        checklist: [
          {
            id: "h1",
            text: "Cek kertas & sisa toner printer operasional / mesin fotokopi",
            isDone: false,
          },
          {
            id: "h2",
            text: "Cek TV, proyektor & kabel HDMI meeting room",
            isDone: false,
          },
          {
            id: "h3",
            text: "Cek kestabilan PC kasir / user admin kritis",
            isDone: false,
          },
          {
            id: "h4",
            text: "Periksa kerapihan kabel jaringan & switch lantai kantor",
            isDone: false,
          },
        ],
      },
    ];

    onSaveMasterJobs({
      ...masterJobs,
      [selectedShift]: [...currentShiftJobs, ...sampleJobs],
    });
  };

  const getLocationIcon = (loc) => {
    if (loc === "Data Center")
      return <Server className="w-3.5 h-3.5 text-purple-400" />;
    if (loc === "Warehouse")
      return <Package className="w-3.5 h-3.5 text-amber-400" />;
    return <Building2 className="w-3.5 h-3.5 text-sky-400" />;
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 pb-20 md:pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-zinc-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-sky-400" />
            Kelola Master Job Desk per Shift
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Inputkan daftar pekerjaan standar untuk masing-masing shift. Data
            ini otomatis dimuat setiap hari sesuai jadwal shift Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadSamplePresets}
            className="px-3 py-1.5 rounded text-xs font-medium bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-1.5 transition"
            title="Muat contoh job desk (PTL, HW Office, Sweeping)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Muat Rekomendasi</span> Presets
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Tambah Job Desk
          </button>
        </div>
      </div>

      {/* Shift Tabs */}
      <div className="flex items-center gap-2 my-5 overflow-x-auto pb-1">
        {[
          {
            id: "PAGI",
            label: "Shift Pagi (07:00 - 15:00)",
            count: (safeMasterJobs["PAGI"] || []).length,
          },
          {
            id: "SIANG",
            label: "Shift Siang (14:30 - 22:30)",
            count: (safeMasterJobs["SIANG"] || []).length,
          },
          {
            id: "MALAM",
            label: "Shift Malam (22:00 - 07:00)",
            count: (safeMasterJobs["MALAM"] || []).length,
          },
        ].map((shift) => (
          <button
            key={shift.id}
            onClick={() => setSelectedShift(shift.id)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-2 transition ${
              selectedShift === shift.id
                ? "bg-zinc-800 text-white border border-zinc-600 font-semibold shadow-sm"
                : "bg-zinc-900/60 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent"
            }`}
          >
            <span>{shift.label}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-[10px] font-mono text-zinc-300">
              {shift.count} job
            </span>
          </button>
        ))}
      </div>

      {/* Job List (Clean State if Empty) */}
      {currentShiftJobs.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-xl p-8 sm:p-12 text-center bg-zinc-950/40">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-500">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">
            Belum Ada Job Desk untuk {selectedShift}
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1 mb-5">
            Sistem dimulai dari data bersih. Anda dapat menginputkan job desk
            satu per satu (misal: Checklist PTL Warehouse, Hardware Office, atau
            Sweeping), atau klik tombol rekomendasi.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              Input Job Desk Pertama
            </button>
            <button
              onClick={handleLoadSamplePresets}
              className="px-3.5 py-2 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Gunakan Template Rekomendasi (PTL / HW / Sweeping)
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {currentShiftJobs.map((job, index) => (
            <div
              key={job.id}
              className="bg-zinc-900/80 border border-zinc-800/90 rounded-lg p-3.5 sm:p-4 hover:border-zinc-700 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-zinc-800 text-sky-400 border border-zinc-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    {job.targetTime}
                  </span>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-zinc-100">
                        {job.title}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {getLocationIcon(job.location)}
                        {job.location}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          job.priority === "P1"
                            ? "bg-red-950 text-red-400 border border-red-800"
                            : job.priority === "P2"
                              ? "bg-amber-950 text-amber-400 border border-amber-800"
                              : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {job.priority}
                      </span>
                    </div>

                    {/* Checklist items preview */}
                    {job.checklist && job.checklist.length > 0 && (
                      <div className="mt-2.5 space-y-1">
                        <div className="text-[11px] text-zinc-500 font-medium">
                          Checklist Item ({job.checklist.length}):
                        </div>
                        <ul className="text-xs text-zinc-400 space-y-1 pl-1">
                          {job.checklist.map((chk, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                              <span>{chk.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEditModal(job)}
                    className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                    title="Edit Job Desk"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition"
                    title="Hapus Job Desk"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-sky-400" />
                {editingJobId
                  ? "Edit Job Desk"
                  : `Tambah Job Desk (${selectedShift})`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSaveJob}
              className="p-5 overflow-y-auto space-y-4 flex-1"
            >
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nama Pekerjaan / SOP <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Checklist PTL Warehouse atau Sweeping DC"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Time, Location & Priority Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Target Jam
                  </label>
                  <input
                    type="time"
                    value={targetTime}
                    onChange={(e) => setTargetTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Lokasi Area
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-sky-500"
                  >
                    <option value="Warehouse">Warehouse</option>
                    <option value="Data Center">Data Center</option>
                    <option value="Office">Office</option>
                    <option value="All Sites">All Sites</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Prioritas
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs font-mono focus:outline-none focus:border-sky-500"
                  >
                    <option value="P1">P1 (Kritis / Rutin Wajib)</option>
                    <option value="P2">P2 (Standar / Normal)</option>
                    <option value="P3">P3 (Rendah / Opsional)</option>
                  </select>
                </div>
              </div>

              {/* Checklist Items Builder */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Poin Checklist (Daftar yang Harus Diperiksa)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddChecklistField}
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3 h-3" /> Tambah Poin
                  </button>
                </div>

                <div className="space-y-2">
                  {checklistItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-zinc-500 w-5 text-right">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        placeholder="Contoh: Cek koneksi gateway PTL atau suhu PAC"
                        value={item}
                        onChange={(e) =>
                          handleChecklistChange(idx, e.target.value)
                        }
                        className="flex-1 px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-sky-500"
                      />
                      {checklistItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistField(idx)}
                          className="p-1 text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 text-white shadow"
                >
                  Simpan Job Desk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
