import { useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import type { LatestData, Pair, CategoryGroup } from '../../types';
import { GROUP_COLOURS } from '../../utils/colours';
import { getCountry } from '../../utils/countries';
import { useCountriesGeo } from '../../hooks/useCountriesGeo';
import { isoOf } from '../../utils/iso';

interface Props {
  latest: LatestData | null;
  selectedCountry: string | null;
  bilateralTarget: string | null;
  filterGroup: CategoryGroup | 'all';
  onCountryClick: (iso2: string) => void;
  newPairKeys: Set<string>;
}

interface ArcDatum {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  count: number;
  src: string;
  tgt: string;
  group: CategoryGroup;
  category: number;
  key: string;
  isNew: boolean;
}

export default function ThreatGlobe({
  latest,
  selectedCountry,
  bilateralTarget,
  filterGroup,
  onCountryClick,
  newPairKeys,
}: Props) {
  const globeRef = useRef<any>(null);
  const features = useCountriesGeo();
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handle = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls?.();
    if (controls) {
      controls.enableZoom = true;
      controls.enableDamping = true;
      controls.autoRotate = !selectedCountry;
      controls.autoRotateSpeed = 0.2;
      controls.minDistance = 170;
      controls.maxDistance = 600;
    }
  }, [globeRef.current, selectedCountry]);

  const arcs = useMemo<ArcDatum[]>(() => {
    if (!latest) return [];
    let pairs: Pair[] = latest.pairs;
    if (filterGroup !== 'all') pairs = pairs.filter((p) => p.group === filterGroup);
    if (selectedCountry && bilateralTarget) {
      pairs = pairs.filter(
        (p) =>
          (p.src === selectedCountry && p.tgt === bilateralTarget) ||
          (p.src === bilateralTarget && p.tgt === selectedCountry)
      );
    } else if (selectedCountry) {
      pairs = pairs.filter((p) => p.src === selectedCountry || p.tgt === selectedCountry);
    }
    pairs.sort((a, b) => b.count - a.count);
    pairs = pairs.slice(0, selectedCountry ? 120 : 500);

    const out: ArcDatum[] = [];
    for (const p of pairs) {
      const src = getCountry(p.src);
      const tgt = getCountry(p.tgt);
      if (!src || !tgt) continue;
      const key = `${p.src}|${p.tgt}|${p.category}`;
      out.push({
        startLat: src.lat,
        startLng: src.lon,
        endLat: tgt.lat,
        endLng: tgt.lon,
        color: GROUP_COLOURS[p.group],
        count: p.count,
        src: p.src,
        tgt: p.tgt,
        group: p.group,
        category: p.category,
        key,
        isNew: newPairKeys.has(key),
      });
    }
    return out;
  }, [latest, selectedCountry, bilateralTarget, filterGroup, newPairKeys]);

  const maxArcCount = useMemo(() => Math.max(1, ...arcs.map((a) => a.count)), [arcs]);

  useEffect(() => {
    if (!globeRef.current || !selectedCountry) return;
    const meta = getCountry(selectedCountry);
    if (!meta) return;
    globeRef.current.pointOfView(
      { lat: meta.lat, lng: meta.lon, altitude: bilateralTarget ? 2.2 : 1.8 },
      1400
    );
  }, [selectedCountry, bilateralTarget]);

  const selectedFeatures = useMemo(
    () => new Set([selectedCountry, bilateralTarget].filter(Boolean) as string[]),
    [selectedCountry, bilateralTarget]
  );

  const inboundByIso2 = latest?.inboundByCountry || {};
  const maxInbound = useMemo(() => Math.max(1, ...Object.values(inboundByIso2)), [inboundByIso2]);

  return (
    <div className="globe-container">
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        backgroundColor="#0a0e17"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        showAtmosphere
        atmosphereColor="#22d3ee"
        atmosphereAltitude={0.14}
        polygonsData={features}
        polygonAltitude={(d: any) => (selectedFeatures.has(isoOf(d)) ? 0.018 : 0.006)}
        polygonCapColor={(d: any) => {
          const iso = isoOf(d);
          const inbound = inboundByIso2[iso] || 0;
          if (selectedFeatures.has(iso)) return 'rgba(59,130,246,0.55)';
          const t = Math.min(1, (inbound / maxInbound) ** 0.55);
          const r = Math.round(21 + t * 130);
          const g = Math.round(28 + t * 60);
          const b = Math.round(44 + t * 50);
          return `rgba(${r},${g},${b},${0.7 + t * 0.25})`;
        }}
        polygonSideColor={() => 'rgba(20,28,44,0.4)'}
        polygonStrokeColor={() => '#1e2d45'}
        polygonLabel={(d: any) => {
          const iso = isoOf(d);
          const inbound = inboundByIso2[iso] || 0;
          const outbound = latest?.outboundByCountry[iso] || 0;
          const name = d.properties?.name || d.properties?.NAME || iso;
          return `<div class="tooltip">
            <div style="font-weight:600; font-family: var(--font-sans);">${name}</div>
            <div style="color:#8896ab;font-size:10px">
              In <b style="color:#f59e0b">${inbound.toLocaleString()}</b>
              · Out <b style="color:#22d3ee">${outbound.toLocaleString()}</b>
            </div>
          </div>`;
        }}
        onPolygonClick={(d: any) => {
          const iso = isoOf(d);
          if (iso) onCountryClick(iso);
        }}
        arcsData={arcs}
        arcStartLat={(d: any) => d.startLat}
        arcStartLng={(d: any) => d.startLng}
        arcEndLat={(d: any) => d.endLat}
        arcEndLng={(d: any) => d.endLng}
        arcColor={(d: any) => [d.color, d.color]}
        arcStroke={(d: any) =>
          d.isNew
            ? 0.55
            : 0.12 + Math.min(0.32, (Math.log(d.count + 1) / Math.log(maxArcCount + 1)) * 0.32)
        }
        arcAltitudeAutoScale={0.34}
        arcDashLength={(d: any) => (d.isNew ? 0.5 : 1)}
        arcDashGap={(d: any) => (d.isNew ? 0.25 : 0)}
        arcDashAnimateTime={(d: any) => (d.isNew ? 1800 : 0)}
        arcDashInitialGap={(d: any) => (d.isNew ? Math.random() : 0)}
        arcLabel={(d: any) => `<div class="tooltip">
          <div><b>${d.src}</b> → <b>${d.tgt}</b></div>
          <div style="color:#8896ab;font-size:10px">${d.count.toLocaleString()} · ${d.group}${d.isNew ? ' · NEW' : ''}</div>
        </div>`}
      />
    </div>
  );
}
