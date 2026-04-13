import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Globe from 'react-globe.gl';
import type { LatestData, Pair, CategoryGroup } from '../../types';
import { GROUP_COLOURS, GROUP_LABELS, CATEGORY_LABELS } from '../../utils/colours';
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
  srcName: string;
  tgtName: string;
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
  const [selectedArc, setSelectedArc] = useState<string | null>(null);

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

  // Clear arc selection when country/filter changes
  useEffect(() => { setSelectedArc(null); }, [selectedCountry, bilateralTarget, filterGroup]);

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
        srcName: src.name,
        tgtName: tgt.name,
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

  const handleArcClick = useCallback((d: any) => {
    setSelectedArc((prev) => (prev === d.key ? null : d.key));
  }, []);

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
              In <b style="color:#10b981">${inbound.toLocaleString()}</b>
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
        arcColor={(d: any) => {
          if (selectedArc && d.key !== selectedArc) return ['rgba(100,100,120,0.12)', 'rgba(100,100,120,0.12)'];
          return [d.color, d.color];
        }}
        arcStroke={(d: any) => {
          if (selectedArc && d.key !== selectedArc) return 0.06;
          const base = 0.12 + Math.min(0.44, (Math.log(d.count + 1) / Math.log(maxArcCount + 1)) * 0.44);
          return d.isNew ? Math.max(base, 0.55) : base;
        }}
        arcAltitudeAutoScale={0.34}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={(d: any) => {
          if (selectedArc && d.key !== selectedArc) return 0;
          return d.isNew ? 1200 : 2400;
        }}
        arcDashInitialGap={(d: any) => Math.random()}
        onArcClick={handleArcClick}
        arcLabel={(d: any) => {
          const catLabel = CATEGORY_LABELS[d.category] || `Cat ${d.category}`;
          const groupLabel = GROUP_LABELS[d.group as CategoryGroup] || d.group;
          return `<div class="tooltip" style="min-width:180px">
            <div style="font-weight:700;font-size:12px;font-family:var(--font-sans);margin-bottom:4px">
              ${d.srcName} <span style="color:${d.color}">→</span> ${d.tgtName}
            </div>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 8px;font-size:10px;color:#8896ab">
              <span>Attacks</span><span style="color:var(--text-primary);font-weight:600">${d.count.toLocaleString()}</span>
              <span>Category</span><span style="color:var(--text-primary)">${catLabel}</span>
              <span>Group</span><span style="color:${d.color};font-weight:600">${groupLabel}</span>
            </div>
            ${d.isNew ? '<div style="margin-top:4px;color:#10b981;font-size:9px;font-weight:700;letter-spacing:1px">NEW</div>' : ''}
            <div style="margin-top:4px;color:#556178;font-size:9px">Click to isolate</div>
          </div>`;
        }}
      />

      {/* Selected arc detail panel */}
      {selectedArc && (() => {
        const arc = arcs.find((a) => a.key === selectedArc);
        if (!arc) return null;
        const catLabel = CATEGORY_LABELS[arc.category] || `Cat ${arc.category}`;
        const groupLabel = GROUP_LABELS[arc.group] || arc.group;
        return (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-panel border border-border rounded-lg p-4 font-mono text-[11px] shadow-2xl min-w-[260px]">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-bold font-sans text-primary">
                {arc.srcName} <span style={{ color: arc.color }}>→</span> {arc.tgtName}
              </div>
              <button onClick={() => setSelectedArc(null)} className="text-muted hover:text-primary text-lg leading-none">&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-muted">Attacks</span>
              <span className="text-primary font-bold">{arc.count.toLocaleString()}</span>
              <span className="text-muted">Category</span>
              <span className="text-primary">{catLabel}</span>
              <span className="text-muted">Group</span>
              <span style={{ color: arc.color }} className="font-bold">{groupLabel}</span>
              <span className="text-muted">Source</span>
              <span className="text-primary">{arc.src}</span>
              <span className="text-muted">Target</span>
              <span className="text-primary">{arc.tgt}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
