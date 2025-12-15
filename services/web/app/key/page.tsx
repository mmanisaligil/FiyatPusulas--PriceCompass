'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../src/components/ui/button';
import { Textarea } from '../../src/components/ui/textarea';
import { useToast } from '../../src/components/layout/toast-provider';
import { deriveUserHash } from '../../src/lib/seed';
import { getRememberedSeed, setUserHash } from '../../src/lib/storage';

export default function KeyPage() {
  const [seed, setSeed] = useState('');
  const [hash, setHash] = useState('');
  const router = useRouter();
  const { pushToast } = useToast();

  useEffect(() => {
    const remembered = getRememberedSeed();
    if (remembered) setSeed(remembered);
  }, []);

  const derive = async () => {
    if (!seed.trim()) {
      pushToast({ title: 'Seed gerekli', description: 'Tohum ifadenizi girin.', tone: 'error' });
      return;
    }
    const derived = await deriveUserHash(seed);
    setHash(derived);
    setUserHash(derived);
    pushToast({ title: 'Kimlik yüklendi', description: 'X-User-Hash tarayıcıda saklandı.', tone: 'success' });
    router.push('/me');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Seed ile giriş</h1>
      <p className="text-slate-600 text-sm">Seed ifadenizi yapıştırın, SHA-256 karması X-User-Hash olarak saklanacak.</p>
      <div className="card p-4 space-y-3">
        <Textarea rows={4} value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="tohum kelimeleri..." />
        <Button onClick={derive}>Kaydet</Button>
        {hash && (
          <div className="text-xs text-slate-600">
            X-User-Hash: <span className="font-mono">{hash}</span>
          </div>
        )}
      </div>
    </div>
  );
}
