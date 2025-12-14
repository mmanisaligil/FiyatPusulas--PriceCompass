'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '../../src/components/ui/badge';
import { Button } from '../../src/components/ui/button';
import { Input } from '../../src/components/ui/input';
import { useToast } from '../../src/components/layout/toast-provider';
import { confirmReceipt, linkBarcode } from '../../src/lib/api';
import { readCachedReceipt, getUserHash } from '../../src/lib/storage';
import { LineItem } from '../../src/lib/types';
import { confidenceBadge } from '../../src/lib/utils';

export default function ReviewClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { pushToast } = useToast();
  const receiptId = params.get('receipt_id');
  const [items, setItems] = useState<LineItem[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [barcodeInputs, setBarcodeInputs] = useState<Record<string, { ean: string; canonicalId: string }>>({});
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (!receiptId) return;
    const cached = readCachedReceipt(receiptId);
    if (!cached) {
      pushToast({ title: 'Kayıt bulunamadı', description: 'Fişi yeniden yükleyin.', tone: 'error' });
      return;
    }
    setItems(cached.items || []);
    setStatus(cached.status || '');
  }, [receiptId, pushToast]);

  const needsConfirmation = useMemo(() => items.some((i) => i.resolution_status === 'UNRESOLVED'), [items]);

  const handleConfirm = async () => {
    if (!receiptId) return;
    const confirmations = Object.entries(selected).map(([line_item_id, canonical_product_id]) => ({ line_item_id, canonical_product_id }));
    if (!confirmations.length) {
      pushToast({ title: 'Seçim yok', description: 'Onaylamak istediğiniz ürünleri seçin.', tone: 'info' });
      return;
    }
    try {
      const userHash = getUserHash() || undefined;
      const resp = await confirmReceipt(receiptId, confirmations, userHash);
      setItems(resp.items);
      setStatus(resp.status);
      pushToast({ title: 'Onaylandı', description: 'Seçilen satırlar güncellendi.', tone: 'success' });
      const target = userHash ? '/me' : '/seed';
      router.push(target);
    } catch (err: any) {
      pushToast({ title: 'Onay hatası', description: err?.message || 'İşlem tamamlanamadı', tone: 'error' });
    }
  };

  const handleBarcodeLink = async (lineItemId: string) => {
    const form = barcodeInputs[lineItemId];
    if (!form?.ean || !form?.canonicalId) {
      pushToast({ title: 'Eksik bilgi', description: 'EAN13 ve ürün seçimini girin.', tone: 'error' });
      return;
    }
    try {
      const userHash = getUserHash() || undefined;
      await linkBarcode({ ean13: form.ean, canonical_product_id: form.canonicalId }, userHash);
      pushToast({ title: 'Barkod bağlandı', description: 'Bu barkod gelecekte otomatik eşleşecek.', tone: 'success' });
    } catch (err: any) {
      pushToast({ title: 'Barkod hatası', description: err?.message || 'İşlem tamamlanamadı', tone: 'error' });
    }
  };

  if (!receiptId) {
    return <div>Fiş bilgisi bulunamadı.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Satırları gözden geçir</h1>
          <p className="text-sm text-slate-600">Belirsiz ürünleri seçerek doğrulayın.</p>
        </div>
        <Badge tone={needsConfirmation ? 'warning' : 'success'}>{needsConfirmation ? 'Onay gerekiyor' : 'Tümü çözüldü'}</Badge>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const badge = confidenceBadge(item.confidence_score);
          const candidates = item.candidate_options || [];
          return (
            <div key={item.line_item_id} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{item.raw_text_original}</div>
                  <div className="text-xs text-slate-600">Fiyat: {item.detected_price ?? '—'}</div>
                </div>
                <div className="space-x-2">
                  <Badge tone={badge.tone}>{badge.label} güven</Badge>
                  <Badge tone={item.resolution_status === 'UNRESOLVED' ? 'warning' : 'success'}>{item.resolution_status}</Badge>
                </div>
              </div>

              {candidates.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-slate-700">Adaylar</div>
                  <div className="grid md:grid-cols-2 gap-2">
                    {candidates.map((c) => (
                      <label key={c.canonical_product_id} className="flex items-start gap-2 border rounded p-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`candidate-${item.line_item_id}`}
                          value={c.canonical_product_id}
                          onChange={(e) => setSelected((prev) => ({ ...prev, [item.line_item_id]: e.target.value }))}
                          checked={selected[item.line_item_id] === c.canonical_product_id}
                        />
                        <div>
                          <div className="font-medium text-sm">{c.name_tr || c.canonical_product_id}</div>
                          <div className="text-xs text-slate-600">Güven: {(c.confidence_score ?? 0).toFixed(2)}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-600">Aday bulunamadı. Barkod ile bağlayabilirsiniz.</div>
              )}

              <div className="grid md:grid-cols-3 gap-2">
                <Input
                  placeholder="Aday ürün ID'si (manuel)"
                  value={selected[item.line_item_id] || ''}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [item.line_item_id]: e.target.value }))}
                />
                <Input
                  placeholder="EAN13 girin"
                  value={barcodeInputs[item.line_item_id]?.ean || ''}
                  onChange={(e) => setBarcodeInputs((prev) => ({ ...prev, [item.line_item_id]: { ...(prev[item.line_item_id] || { canonicalId: '' }), ean: e.target.value } }))}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Barkod için ürün ID"
                    value={barcodeInputs[item.line_item_id]?.canonicalId || ''}
                    onChange={(e) => setBarcodeInputs((prev) => ({ ...prev, [item.line_item_id]: { ...(prev[item.line_item_id] || { ean: '' }), canonicalId: e.target.value } }))}
                  />
                  <Button variant="outline" onClick={() => handleBarcodeLink(item.line_item_id)}>
                    Barkod Bağla
                  </Button>
                </div>
              </div>
              <div className="text-xs text-slate-500">Kamera tarama entegrasyonu için yer ayrıldı.</div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">Durum: {status}</div>
        <Button onClick={handleConfirm}>Tamamla</Button>
      </div>
    </div>
  );
}
