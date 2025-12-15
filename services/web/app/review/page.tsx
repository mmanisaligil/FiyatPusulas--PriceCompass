import { Suspense } from 'react';
import ReviewClient from './review-client';

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="p-4">Fiş yükleniyor...</div>}>
      <ReviewClient />
    </Suspense>
  );
}
