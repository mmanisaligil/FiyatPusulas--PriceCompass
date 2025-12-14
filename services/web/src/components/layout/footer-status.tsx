'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getHealth } from '../../lib/api';

export function FooterStatus() {
  const { data, isError } = useQuery({ queryKey: ['health'], queryFn: getHealth, refetchInterval: 15000 });
  const healthy = data?.status === 'ok' && !isError;

  return (
    <footer className="border-t bg-white">
      <div className="max-w-5xl mx-auto px-4 py-4 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-slate-600">
          API durumu: <span className={healthy ? 'text-emerald-600' : 'text-red-600'}>{healthy ? 'Çevrimiçi' : 'Sorun var'}</span>
        </div>
        <div className="space-x-3 text-slate-600">
          <Link href="/public">Genel endeks</Link>
          <Link href="/methodology">Metodoloji</Link>
        </div>
      </div>
    </footer>
  );
}
