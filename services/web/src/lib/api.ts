import { ReceiptUploadResponse, PersonalStatsResponse, PublicStatsResponse, LineItem } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'API request failed');
  }
  return (await res.json()) as T;
}

export async function uploadReceipt(formData: FormData, userHash?: string): Promise<ReceiptUploadResponse> {
  const res = await fetch(`${API_BASE_URL}/receipts/upload`, {
    method: 'POST',
    headers: {
      ...(userHash ? { 'X-User-Hash': userHash } : {})
    },
    body: formData
  });
  return handleResponse<ReceiptUploadResponse>(res);
}

export async function confirmReceipt(receiptId: string, confirmations: { line_item_id: string; canonical_product_id: string }[], userHash?: string) {
  const res = await fetch(`${API_BASE_URL}/receipts/${receiptId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userHash ? { 'X-User-Hash': userHash } : {})
    },
    body: JSON.stringify({ confirmations })
  });
  return handleResponse<{ receipt_id: string; items: LineItem[]; status: string }>(res);
}

export async function linkBarcode(payload: { ean13: string; canonical_product_id: string; raw_text_normalized?: string }, userHash?: string) {
  const res = await fetch(`${API_BASE_URL}/barcodes/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userHash ? { 'X-User-Hash': userHash } : {})
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function getPersonalStats(userHash: string): Promise<PersonalStatsResponse> {
  const res = await fetch(`${API_BASE_URL}/stats/personal`, {
    headers: { 'X-User-Hash': userHash }
  });
  return handleResponse<PersonalStatsResponse>(res);
}

export async function getPublicStats(): Promise<PublicStatsResponse> {
  const res = await fetch(`${API_BASE_URL}/stats/public`);
  return handleResponse<PublicStatsResponse>(res);
}

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE_URL}/health`);
  return handleResponse<{ status: string }>(res);
}

export { API_BASE_URL };
