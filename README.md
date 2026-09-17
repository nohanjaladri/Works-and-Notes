# IT Operations // Work Notes & Shift Dispatcher

Aplikasi web operasional harian untuk **IT Support Engineer** yang mengelola 3 area operasional: **Office**, **Warehouse**, dan **Data Center (DC)**.

Dibangun dengan arsitektur **Next.js (App Router)**, **Tailwind CSS**, **Lucide React**, dan **Firebase Authentication**, dirancang dengan prinsip **Anti-AI-Slop** (utilitarian dark slate/zinc, tipografi tajam, ramah mobile dan desktop).

---

## Fitur Utama

### 1. Master Data Job Desk (Mulai dari Kondisi Kosong / Clean Slate)

- Data dimulai dalam kondisi bersih tanpa data dummy bawaan.
- Anda dapat menginputkan job desk satu per satu per kategori shift:
  - **Shift Pagi (07:00 - 15:00)**
  - **Shift Siang (14:30 - 22:30)**
  - **Shift Malam (22:00 - 07:00)**
- Setiap job memiliki target jam, lokasi operasional (Office / Warehouse / Data Center), prioritas, dan daftar sub-checklist dinamis.
- _Tersedia tombol opsional `Muat Rekomendasi Presets` jika ingin langsung mengisi template awal PTL Warehouse, Hardware Office, dan Sweeping._

### 2. Kalender Shift Bulanan & AI Roster Importer

- Tampilan kalender 1 bulan penuh dengan kode warna status shift.
- **Tombol "Salin Prompt untuk AI"**: Sekali klik untuk menyalin template instruksi, lalu kirim bersama foto jadwal shift kerja Anda ke AI eksternal (ChatGPT, Claude, atau Gemini).
- **Import Teks Jadwal (.TXT)**: Cukup unggah atau tempel teks hasil AI ke dalam modal import, sistem akan otomatis mengisi kalender 1 bulan penuh dalam 1 detik.
- Ekspor kalender shift ke format `.txt`.

### 3. Dashboard Hari Ini & Dynamic Task Queue

- **Auto-Detect Hari Ini**: Begitu web dibuka, sistem membaca tanggal hari ini dan otomatis memuat paket pekerjaan sesuai jadwal shift tanggal tersebut.
- **Dynamic Queue**:
  - Tombol merah **`+ Job Dadakan (Ad-hoc)`**: Sisipkan tiket insiden mendadak di sela pekerjaan rutin.
  - Tombol **`Pause`**: Menjeda tugas yang sedang berjalan untuk memprioritaskan insiden darurat.
  - Tombol **`Resume`** & **`Done`**: Lanjutkan dan tandai selesai.
- **Time Tracking & Micro-Logs**: Stopwatch pencatat durasi pengerjaan otomatis dan kotak catatan log lapangan per tugas.
- **Laporan Handover (.TXT)**: Sekali klik untuk menghasilkan teks ringkasan laporan handover tugas yang siap dikirim via WhatsApp ke tim IT atau shift berikutnya.

### 4. Hub Catatan Dokumen .TXT & Backup

- Tempat membuat, membaca, mengedit, dan mengunggah (_drag & drop_) file catatan `.txt` (seperti daftar IP address, port switch, kontak vendor).
- Fitur pencadangan (_Backup & Restore_) seluruh database lokal ke file JSON.

### 5. Firebase Authentication & Offline-First

- Otentikasi Email & Password menggunakan Firebase v10 modular SDK.
- Dilengkapi **Mode Lokal / Offline** sehingga aplikasi tetap dapat digunakan 100% tanpa internet ketika berada di lorong Data Center atau gudang.

---

## Cara Menjalankan Aplikasi

Pastikan Node.js v22 sudah terpasang di komputer Anda.

1. **Buka terminal** di folder proyek:

   ```bash
   cd "d:\Nohan\Data\Project\Work Notes"
   ```

2. **Instal dependensi**:

   ```bash
   npm install
   ```

3. **Jalankan server pengembangan**:

   ```bash
   npm run dev
   ```

4. **Buka di browser**:
   Akses `http://localhost:3000` di laptop Anda.

5. **Untuk membuka di HP saat keliling gudang/DC**:
   - Pastikan laptop dan HP terhubung ke Wi-Fi yang sama.
   - Buka alamat IP laptop Anda di browser HP, contoh: `http://192.168.1.xxx:3000`.
