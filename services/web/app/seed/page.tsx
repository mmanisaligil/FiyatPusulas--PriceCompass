'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../src/components/ui/button';
import { Input } from '../../src/components/ui/input';
import { useToast } from '../../src/components/layout/toast-provider';
import { deriveUserHash, generateSeedPhrase } from '../../src/lib/seed';
import { rememberSeed, setUserHash } from '../../src/lib/storage';

export default function SeedPage() {
  const [seed, setSeed] = useState('');
  const [saved, setSaved] = useState(false);
  const [remember, setRemember] = useState(false);
  const router = useRouter();
  const { pushToast } = useToast();

  useEffect(() => {
    setSeed(generateSeedPhrase());
  }, []);

  const copySeed = async () => {
    if (!seed) return;
    await navigator.clipboard.writeText(seed);
    pushToast({ title: 'Kopyalandı', description: 'Tohum ifadenizi güvenli yere kaydedin.', tone: 'info' });
  };

  const confirmSaved = async () => {
    if (!saved) {
      pushToast({ title: 'Onay gerekli', description: 'Tohum ifadenizi kaydettiğinizi işaretleyin.', tone: 'error' });
      return;
    }
    const hash = await deriveUserHash(seed);
    setUserHash(hash);
    if (remember) rememberSeed(seed);
    pushToast({ title: 'Kimlik oluşturuldu', description: 'X-User-Hash tarayıcıda saklandı.', tone: 'success' });
    router.push('/me');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tohum ifadenizi saklayın</h1>
      <p className="text-slate-600 text-sm">Bu cümle hesap yerinize geçer. Yalnızca tarayıcınızda tutulur.</p>
      <div className="card p-4 space-y-3">
        <div className="font-mono text-lg bg-slate-50 p-3 rounded">{seed || '—'}</div>
        <div className="flex gap-2">
          <Button onClick={copySeed} variant="outline">
            Kopyala
          </Button>
          <Button onClick={() => setSeed(generateSeedPhrase())} variant="ghost">
            Yeni üret
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          <span>Tohum ifademi güvenli bir yerde kaydettim.</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>Bu cihazda hatırla (isteğe bağlı).</span>
        </label>
        <Button onClick={confirmSaved}>Devam et</Button>
      </div>
      <div className="card p-4 text-sm text-slate-700">
        <div className="font-semibold">Güvenlik</div>
        <ul className="list-disc ml-5 space-y-1 mt-2">
          <li>Seed yalnızca tarayıcıda saklanır. Sunucuya gönderilmez.</li>
          <li>X-User-Hash = SHA-256(seed). API kimliği olarak kullanılır.</li>
          <li>Seed yoksa eşleşen verilerinize erişemezsiniz.</li>
        </ul>
      </div>
    </div>
  );
}
