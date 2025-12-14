'use client';

import { useState, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../src/components/layout/toast-provider';
import { Input } from '../../src/components/ui/input';
import { Button } from '../../src/components/ui/button';
import { uploadReceipt } from '../../src/lib/api';
import { cacheReceipt, getUserHash } from '../../src/lib/storage';

const steps = ['Yükleniyor', 'OCR', 'Satır Ayrıştırma', 'Çözümleme'];

export default function UploadPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [retailer, setRetailer] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const startUpload = async () => {
    if (!file) {
      pushToast({ title: 'Dosya seçin', description: 'Fiş görseli veya metni yükleyin.', tone: 'error' });
      return;
    }
    setUploading(true);
    setActiveStep(0);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (retailer) formData.append('retailer_name', retailer);
      if (transactionDate) formData.append('transaction_date', transactionDate);

      const userHash = getUserHash() || undefined;
      const resp = await uploadReceipt(formData, userHash || undefined);
      steps.forEach((_, idx) => setTimeout(() => setActiveStep(idx), idx * 200));
      cacheReceipt(resp.receipt_id, resp);
      pushToast({ title: 'OCR tamamlandı', description: resp.needs_confirmation ? 'Onay bekleyen satırlar var.' : 'Tüm satırlar çözüldü.', tone: 'success' });
      router.push(`/review?receipt_id=${resp.receipt_id}`);
    } catch (err: any) {
      pushToast({ title: 'Yükleme hatası', description: err?.message || 'Beklenmedik hata', tone: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Fiş Yükle</h1>
      <p className="text-slate-600 text-sm">Görüntü saklanmaz. OCR sonrası sadece metin düzen JSON'u tutulur.</p>
      <div
        className={`card p-6 border-dashed ${isDragging ? 'border-2 border-brand' : 'border'}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-slate-700">Sürükle-bırak veya cihazınızdan seçin</p>
          <Input type="file" accept="image/*,.txt" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
          {file && <div className="text-sm text-slate-600">Seçilen: {file.name}</div>}
          <div className="grid md:grid-cols-2 gap-3 w-full">
            <div>
              <label className="text-sm font-medium text-slate-700">Perakendeci</label>
              <Input placeholder="Market adı" value={retailer} onChange={(e) => setRetailer(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">İşlem tarihi</label>
              <Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
            </div>
          </div>
          <Button onClick={startUpload} disabled={uploading} className="mt-2">
            {uploading ? 'Yükleniyor...' : 'Gönder'}
          </Button>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Adımlar</h2>
        <div className="grid grid-cols-4 gap-2 text-sm">
          {steps.map((step, idx) => (
            <div key={step} className={`p-3 rounded border ${activeStep >= idx ? 'border-brand bg-sky-50' : 'border-slate-200 bg-white'}`}>
              <div className="font-medium">{step}</div>
              <div className="text-slate-600">{activeStep > idx ? 'Tamamlandı' : activeStep === idx ? 'İşleniyor' : 'Beklemede'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
