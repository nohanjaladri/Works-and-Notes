import "./globals.css";

export const metadata = {
  title: "IT Operations // Work Notes & Shift Dispatcher",
  description:
    "IT Field Operations task engine, dynamic checklist, and handover management for Office, Warehouse & DC.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
