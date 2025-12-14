import { useEffect, useState } from 'react';
import { getUserHash, setUserHash } from '../lib/storage';

export function useUserHash() {
  const [userHash, setHash] = useState<string | null>(null);

  useEffect(() => {
    setHash(getUserHash());
  }, []);

  const updateHash = (value: string) => {
    setUserHash(value);
    setHash(value);
  };

  return { userHash, updateHash };
}
