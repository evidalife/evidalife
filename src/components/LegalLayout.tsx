import Link from 'next/link';

interface LegalLayoutProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export default function LegalLayout({ title, subtitle, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* Header */}
      <header className="border-b border-[#0e393d]/10 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-5 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl text-[#0e393d] hover:text-[#ceab84] transition-colors">
            Evida Life
          </Link>
          <Link href="/" className="text-sm text-[#0e393d]/50 hover:text-[#0e393d] transition-colors">
            ← Zurück
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10">
          <h1 className="font-serif text-4xl text-[#0e393d] mb-2">{title}</h1>
          {subtitle && <p className="text-[#0e393d]/60 text-lg">{subtitle}</p>}
          {lastUpdated && (
            <p className="mt-3 text-sm text-[#0e393d]/40">Stand: {lastUpdated}</p>
          )}
        </div>

        <div className="prose-legal">
          {children}
        </div>
      </main>

      {/* Footer links */}
      <footer className="mx-auto max-w-3xl px-6 py-8 border-t border-[#0e393d]/10 flex gap-6 text-sm text-[#0e393d]/40">
        <Link href="/legal" className="hover:text-[#0e393d] transition-colors">Impressum</Link>
        <Link href="/privacy" className="hover:text-[#0e393d] transition-colors">Datenschutz</Link>
        <Link href="/terms" className="hover:text-[#0e393d] transition-colors">AGB</Link>
      </footer>
    </div>
  );
}
