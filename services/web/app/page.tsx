import Link from 'next/link';
import { appName } from '../src/lib/utils';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="text-center space-y-4">
        <p className="text-sm uppercase tracking-wide text-slate-500">Kişisel fiyat pusulanız</p>
        <h1 className="text-3xl sm:text-4xl font-semibold">{appName}: makbuzlardan gerçek zamanlı fiyat sezgisi</h1>
        <p className="text-lg text-slate-700 max-w-3xl mx-auto">
          Fişinizi anonim olarak yükleyin, OCR ve ürün eşleme ile satır satır çözümlensin. Belirsizlikleri onaylayarak hem kendi
          endeksinizi hem de kamusal fiyat göstergemizi besleyin.
        </p>
        <div className="flex justify-center gap-3">
          <Link className="button-primary" href="/upload">
            Fiş Yükle
          </Link>
          <Link className="button-primary bg-white text-brand border border-brand" href="/key">
            Kendi Enflasyonunu Gör
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-4 space-y-2">
            <h3 className="font-semibold text-slate-900">Şeffaf ve güvenli</h3>
            <p className="text-sm text-slate-700">Görüntü saklanmaz, sadece OCR düzen JSON'u tutulur. Belirsizlikler açıkça gösterilir.</p>
          </div>
        ))}
      </section>

      <section className="card p-4 text-sm text-slate-700">
        <p>
          Gizlilik: Görüntüler işlem sonrası silinir (üzeri sıfırla yazılıp kaldırılır). Kimlik yerine tarayıcınızda üretilen
          gizli bir tohum cümlesi kullanılır; API yalnızca onun SHA-256 karmasını görür.
        </p>
      </section>
    </div>
  );
}
