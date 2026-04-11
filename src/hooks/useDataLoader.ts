import { useEffect, useState } from 'react';

const cache = new Map<string, any>();

export function useJson<T>(url: string | null): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(url && cache.has(url) ? cache.get(url) : null);
  const [loading, setLoading] = useState<boolean>(!!url && !cache.has(url));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    if (cache.has(url)) {
      setData(cache.get(url));
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        cache.set(url, json);
        setData(json);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}
