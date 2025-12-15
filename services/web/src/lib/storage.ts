const USER_HASH_KEY = 'pricecompass_user_hash';
const SEED_PHRASE_KEY = 'pricecompass_seed_phrase';
const RECEIPT_CACHE_PREFIX = 'pricecompass_receipt_';

export function getUserHash(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(USER_HASH_KEY);
}

export function setUserHash(hash: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USER_HASH_KEY, hash);
}

export function clearUserHash() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(USER_HASH_KEY);
}

export function rememberSeed(seed: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SEED_PHRASE_KEY, seed);
}

export function getRememberedSeed(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(SEED_PHRASE_KEY);
}

export function cacheReceipt(id: string, data: unknown) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(`${RECEIPT_CACHE_PREFIX}${id}`, JSON.stringify(data));
}

export function readCachedReceipt(id: string): any | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(`${RECEIPT_CACHE_PREFIX}${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}
