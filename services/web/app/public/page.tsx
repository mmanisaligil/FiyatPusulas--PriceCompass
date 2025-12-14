'use client';

import { useQuery } from '@tanstack/react-query';
import { getPublicStats } from '../../src/lib/api';

export default function PublicPage() {
  const query = useQuery({ queryKey: ['public-stats'], queryFn: getPublicStats });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Kamusal endeks</h1>
        <p className="text-slate-600 text-sm">Gizlilik gözetimli, toplu fiyat göstergesi.</p>
      </div>

      {query.isLoading ? (
        <div>Yükleniyor...</div>
      ) : query.isError ? (
        <div className="text-red-600 text-sm">Endeks alınamadı.</div>
      ) : (
        <div className="card p-4 space-y-3">
          <div className="text-sm text-slate-600">Dönem: {query.data?.period_month ?? '—'}</div>
          <div className="text-3xl font-semibold">{query.data?.public_cpi_value ?? '—'}</div>
          <div className="text-sm text-slate-600">Örnek sayısı: {query.data?.sample_count ?? 0}</div>
          <div className="space-y-1">
            {query.data?.categories?.map((c) => (
              <div key={c.category} className="flex justify-between text-sm">
                <span>{c.category}</span>
                <span className="text-slate-700">{c.median_price ?? '—'} (n={c.sample_count ?? 0})</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-amber-700">Örneklem büyüklükleri değişkendir; sonuçlar kesin değildir.</div>
        </div>
      )}
    </div>
  );
}
