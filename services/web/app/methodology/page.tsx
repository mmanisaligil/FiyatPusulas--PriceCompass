export default function MethodologyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Metodoloji ve güvenlik</h1>
        <p className="text-slate-600 text-sm">OCR, ürün eşleme ve endeks hesaplaması hakkında.</p>
      </div>
      <div className="card p-4 space-y-3 text-sm text-slate-700">
        <div>
          <div className="font-semibold">Görüntü gizliliği</div>
          <p>Fiş görseli OCR sonrası sıfırla yazılıp silinir. Kalıcı depoya kaydedilmez. Audit için yalnızca OCR düzen JSON'u saklanır.</p>
        </div>
        <div>
          <div className="font-semibold">Entity Resolution</div>
          <ul className="list-disc ml-5 space-y-1">
            <li>Normalizasyon: büyük harf, TR diakritik temizleme, alfa-numaraya indirgeme.</li>
            <li>Alias arama: kayıtlı eşleşmeler AUTO_RESOLVED olur.</li>
            <li>Kandidat üretme: token örtüşmesi ile 2-4 aday.</li>
            <li>Güven eşiği: düşükse kullanıcıdan onay istenir.</li>
            <li>Manuel onay ve barkod bağlama her seferinde audit trail bırakır.</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold">Örneklem uyarıları</div>
          <p>n değeri düşük olduğunda sonuçlar gürültülüdür. Arayüz her kartta örnek sayısını gösterir.</p>
        </div>
        <div>
          <div className="font-semibold">Seed & kimlik</div>
          <p>Hesap yoktur. Tarayıcınızda ürettiğiniz 12 kelime seed'in SHA-256 karması X-User-Hash olarak kullanılır. Seed isteğe bağlı olarak sadece cihazda saklanır.</p>
        </div>
      </div>
    </div>
  );
}
