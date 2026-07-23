import { useEffect, useState } from 'react';

let cached: boolean | null = null;

export function useDocsAvailable(): boolean {
  const [available, setAvailable] = useState(cached ?? false);

  useEffect(() => {
    if (cached !== null) return;
    fetch('/docs/', { method: 'HEAD' })
      .then((r) => {
        cached = r.ok;
        setAvailable(r.ok);
      })
      .catch(() => {
        cached = false;
      });
  }, []);

  return available;
}
