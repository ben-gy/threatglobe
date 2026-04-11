import { useEffect, useState } from 'react';

let cache: any[] | null = null;
const subs = new Set<(features: any[]) => void>();

export function useCountriesGeo(): any[] {
  const [features, setFeatures] = useState<any[]>(cache || []);

  useEffect(() => {
    if (cache) return;
    const cb = (f: any[]) => setFeatures(f);
    subs.add(cb);
    fetch('/data/world-countries.geojson')
      .then((r) => r.json())
      .then((g) => {
        cache = g.features;
        subs.forEach((s) => s(g.features));
      })
      .catch(() => {});
    return () => {
      subs.delete(cb);
    };
  }, []);

  return features;
}
