import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kalkulator Farmasi',
  description: 'Aplikasi perhitungan dosis obat',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Tambahkan suppressHydrationWarning di sini
    <html lang="id" suppressHydrationWarning>
      {/* Tambahkan juga di body untuk berjaga-jaga */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
