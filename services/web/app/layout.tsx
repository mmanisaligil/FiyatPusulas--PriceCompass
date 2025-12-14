import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppProviders } from '../src/providers';
import { FooterStatus } from '../src/components/layout/footer-status';
import { appName } from '../src/lib/utils';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: appName,
  description: 'FiyatPusulası / PriceCompass front-end for receipt ER and inflation snapshots'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <AppProviders>
          <div className="min-h-screen flex flex-col">
            <header className="border-b bg-white">
              <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                <a href="/" className="text-xl font-semibold text-brand">
                  {appName}
                </a>
                <nav className="space-x-4 text-sm text-slate-700">
                  <a href="/upload">Fiş Yükle</a>
                  <a href="/me">Bana Özel</a>
                  <a href="/public">Genel Endeks</a>
                  <a href="/methodology">Metodoloji</a>
                </nav>
              </div>
            </header>
            <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">{children}</main>
            <FooterStatus />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
