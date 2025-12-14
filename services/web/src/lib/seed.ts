const WORD_LIST = [
  'deniz',
  'gunes',
  'marti',
  'lale',
  'zeytin',
  'ceviz',
  'fidan',
  'lavanta',
  'nazar',
  'pamuk',
  'sehir',
  'ulus',
  'yildiz',
  'kale',
  'baris',
  'umut',
  'dere',
  'bereket',
  'fiyat',
  'pusula',
  'koy',
  'pazar',
  'simit',
  'carsi',
  'meydan'
];

export function generateSeedPhrase(): string {
  const words: string[] = [];
  const randomValues = new Uint32Array(12);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(randomValues);
  } else {
    const nodeCrypto = getNodeCrypto();
    if (nodeCrypto) {
      const buf = nodeCrypto.randomBytes(48);
      for (let i = 0; i < 12; i++) {
        randomValues[i] = buf.readUInt32LE(i * 4);
      }
    }
  }
  for (let i = 0; i < 12; i++) {
    const idx = randomValues[i] % WORD_LIST.length;
    words.push(WORD_LIST[idx]);
  }
  return words.join(' ');
}

export async function deriveUserHash(seedPhrase: string): Promise<string> {
  const normalized = seedPhrase.trim();
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  const nodeCrypto = getNodeCrypto();
  if (!nodeCrypto) throw new Error('Crypto unavailable');
  const hash = nodeCrypto.createHash('sha256');
  hash.update(normalized);
  return hash.digest('hex');
}

function getNodeCrypto() {
  if (typeof window === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('crypto') as typeof import('crypto');
  }
  return null;
}
