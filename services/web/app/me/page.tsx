'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../src/components/ui/button';
import { getPersonalStats, getPublicStats } from '../../src/lib/api';
import { getUserHash } from '../../src/lib/storage';

export default function MePage() {
  const router = useRouter();
  const userHash = getUserHash();

  const personalQuery = useQuery({
    queryKey: ['personal-stats', userHash],
    queryFn: async () => {
      if (!userHash) throw new Error('missing user');
      return getPersonalStats(userHash);
    },
    enabled: Boolean(userHash)
  });

  const publicQuery = useQuery({ queryKey: ['public-stats'], queryFn: getPublicStats });

  const warning = useMemo(() => {
    if (!personalQuery.data) return '';
    if ((personalQuery.data.sample_count || 0) < 3) return 'Örneklem düşük, güven aralığı geniş olabilir.';
    return '';
  }, [personalQuery.data]);

  if (!userHash) {
    return (
      <div className="space-y-4">
        <p className="text-slate-700">Seed ifadenizi yükleyin.</p>
        <Button onClick={() => router.push('/seed')}>Seed oluştur</Button>
        <Button variant="outline" onClick={() => router.push('/key')}>
          Seedimi yapıştıracağım
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kişisel endeks</h1>
          <p className="text-slate-600 text-sm">X-User-Hash ile ilişkilendirilmiş sepet.</p>
        </div>
        <div className="text-xs text-slate-500 break-all">{userHash}</div>
      </div>

      {personalQuery.isLoading ? (
        <div>Yükleniyor...</div>
      ) : personalQuery.isError ? (
        <div className="text-red-600 text-sm">Veri alınamadı.</div>
      ) : (
        <div className="card p-4 space-y-3">
          <div className="text-sm text-slate-600">Dönem: {personalQuery.data?.period_month || '—'}</div>
          <div className="text-3xl font-semibold">{personalQuery.data?.personal_cpi_value ?? '—'}</div>
          <div className="text-sm text-slate-600">Örnek sayısı: {personalQuery.data?.sample_count ?? 0}</div>
          {warning && <div className="text-amber-700 text-sm">{warning}</div>}
          <div className="space-y-1">
            {personalQuery.data?.categories?.map((c) => (
              <div key={c.category} className="flex justify-between text-sm">
                <span>{c.category}</span>
                <span className="text-slate-700">{c.median_price ?? '—'} (n={c.sample_count ?? 0})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4 space-y-2">
        <div className="font-semibold">Kamusal karşılaştırma</div>
        {publicQuery.isLoading ? (
          <div>Yükleniyor...</div>
        ) : publicQuery.isError ? (
          <div className="text-red-600 text-sm">Genel endeks alınamadı.</div>
        ) : (
          <div className="space-y-1 text-sm">
            <div>Endeks: {publicQuery.data?.public_cpi_value ?? '—'} (n={publicQuery.data?.sample_count ?? 0})</div>
            <div>Dönem: {publicQuery.data?.period_month ?? '—'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
