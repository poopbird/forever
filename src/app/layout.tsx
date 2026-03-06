import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Forever',
  description: 'A warm, romantic space for couples to document their journey together.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream text-ink antialiased">{children}</body>
    </html>
  );
}
