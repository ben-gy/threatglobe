import { useEffect, useMemo, useRef, useState } from 'react';
import { geoNaturalEarth1, geoPath, geoInterpolate } from 'd3-geo';
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

export default function FlatMap({
  latest,
  selectedCountry,
  bilateralTarget,
  filterGroup,
  onCountryClick,
  newPairKeys,
}: Props) {
  const features = useCountriesGeo();
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [hover, setHover] = useState<{ iso: string; x: number; y: number; name: string } | null>(null);
  const [arcHover, setArcHover] = useState<{ key: string; x: number; y: number } | null>(null);
  const [selectedArc, setSelectedArc] = useState<string | null>(null);

  useEffect(() => {
    const handle = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  // Clear arc selection when country/filter changes
  useEffect(() => { setSelectedArc(null); }, [selectedCountry, bilateralTarget, filterGroup]);

  const projection = useMemo(() => {
    const proj = geoNaturalEarth1();
    const collection = features.length > 0 ? { type: 'FeatureCollection' as const, features } : null;
    if (collection) {
      proj.fitExtent(
        [[20, 56], [size.w - 20, size.h - 60]],
        collection as any
      );
    } else {
      proj.scale(Math.min(size.w, size.h * 2) / 6.2).translate([size.w / 2, size.h / 2]);
    }
    return proj;
  }, [features, size.w, size.h]);

  const pathFn = useMemo(() => geoPath(projection), [projection]);

  const inboundByIso = latest?.inboundByCountry || {};
  const maxInbound = useMemo(
    () => Math.max(1, ...Object.values(inboundByIso)),
    [inboundByIso]
  );

  const arcs = useMemo(() => {
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
    return pairs.map((p) => ({ ...p, key: `${p.src}|${p.tgt}|${p.category}` }));
  }, [latest, filterGroup, selectedCountry, bilateralTarget]);

  const maxArcCount = useMemo(() => Math.max(1, ...arcs.map((a) => a.count)), [arcs]);

  const buildArcPath = (srcIso: string, tgtIso: string): string | null => {
    const a = getCountry(srcIso);
    const b = getCountry(tgtIso);
    if (!a || !b) return null;
    const interp = geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
    const N = 48;
    const segments: [number, number][][] = [[]];
    let prev: [number, number] | null = null;
    const wrapThreshold = size.w * 0.55;
    for (let i = 0; i <= N; i++) {
      const ll = interp(i / N);
      const proj = projection(ll as [number, number]);
      if (!proj) continue;
      if (prev && Math.abs(proj[0] - prev[0]) > wrapThreshold) {
        segments.push([]);
      }
      segments[segments.length - 1].push(proj);
      prev = proj;
    }
    return segments
      .filter((s) => s.length > 1)
      .map((seg) => seg.map((q, j) => `${j === 0 ? 'M' : 'L'}${q[0]},${q[1]}`).join(''))
      .join(' ');
  };

  // Compute total arc length for dash animation
  const arcLength = (srcIso: string, tgtIso: string): number => {
    const a = getCountry(srcIso);
    const b = getCountry(tgtIso);
    if (!a || !b) return 200;
    const p1 = projection([a.lon, a.lat]);
    const p2 = projection([b.lon, b.lat]);
    if (!p1 || !p2) return 200;
    return Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2);
  };

  const selectedSet = useMemo(
    () => new Set([selectedCountry, bilateralTarget].filter(Boolean) as string[]),
    [selectedCountry, bilateralTarget]
  );

  const onPolygonHover = (e: React.MouseEvent, d: any) => {
    const iso = isoOf(d);
    if (!iso) {
      setHover(null);
      return;
    }
    const rect = svgRef.current?.getBoundingClientRect();
    setHover({
      iso,
      x: e.clientX - (rect?.left || 0),
      y: e.clientY - (rect?.top || 0),
      name: d.properties?.NAME || d.properties?.name || iso,
    });
  };

  const onArcHover = (e: React.MouseEvent, key: string) => {
    const rect = svgRef.current?.getBoundingClientRect();
    setArcHover({
      key,
      x: e.clientX - (rect?.left || 0),
      y: e.clientY - (rect?.top || 0),
    });
  };

  return (
    <div className="globe-container relative">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        style={{ background: 'var(--bg-primary)' }}
      >
        <defs>
          <radialGradient id="map-glow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(34, 211, 238, 0.06)" />
            <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
          </radialGradient>
        </defs>

        <rect width={size.w} height={size.h} fill="url(#map-glow)" />

        {/* Country polygons */}
        <g className="countries">
          {features.map((d, i) => {
            const iso = isoOf(d);
            const inbound = inboundByIso[iso] || 0;
            const isSel = selectedSet.has(iso);
            const intensity = Math.min(1, (inbound / maxInbound) ** 0.55);
            const fill = isSel
              ? 'rgba(59, 130, 246, 0.5)'
              : `rgba(${Math.round(21 + intensity * 130)}, ${Math.round(28 + intensity * 60)}, ${Math.round(44 + intensity * 50)}, 1)`;
            const pathD = pathFn(d as any);
            if (!pathD) return null;
            return (
              <path
                key={iso || i}
                d={pathD}
                fill={fill}
                stroke="#1e2d45"
                strokeWidth={0.5}
                style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
                onClick={() => iso && onCountryClick(iso)}
                onMouseMove={(e) => onPolygonHover(e, d)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </g>

        {/* Arcs */}
        <g className="arcs">
          {arcs.map((arc) => {
            const path = buildArcPath(arc.src, arc.tgt);
            if (!path) return null;
            const isNew = newPairKeys.has(arc.key);
            const isSelected = selectedArc === arc.key;
            const isDimmed = selectedArc && !isSelected;
            const stroke = isDimmed ? 'rgba(100,100,120,0.15)' : GROUP_COLOURS[arc.group];
            const t = Math.log(arc.count + 1) / Math.log(maxArcCount + 1);
            const opacity = isDimmed ? 0.15 : 0.55 + Math.min(0.4, t * 0.4);
            const width = isDimmed ? 0.3 : isNew ? 1.4 : 0.5 + Math.min(0.9, t * 0.9);
            const len = arcLength(arc.src, arc.tgt);
            const dashLen = Math.max(6, len * 0.15);
            const dashGap = Math.max(4, len * 0.08);
            const dur = isDimmed ? 0 : (isNew ? 1.5 : 3);
            return (
              <g key={arc.key}>
                {/* Invisible wider hit area for hover/click */}
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={Math.max(8, width * 4)}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedArc((prev) => (prev === arc.key ? null : arc.key))}
                  onMouseMove={(e) => onArcHover(e, arc.key)}
                  onMouseLeave={() => setArcHover(null)}
                />
                <path
                  d={path}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={width}
                  strokeLinecap="round"
                  opacity={opacity}
                  strokeDasharray={isDimmed ? 'none' : `${dashLen} ${dashGap}`}
                  style={{
                    ...(isNew && !isDimmed ? { filter: `drop-shadow(0 0 4px ${stroke})` } : {}),
                    pointerEvents: 'none',
                    ...(dur > 0 ? {
                      animation: `arc-flow ${dur}s linear infinite`,
                      ['--arc-dash' as any]: `${dashLen + dashGap}px`,
                    } : {}),
                  }}
                />
              </g>
            );
          })}
        </g>

        {/* Source country dots */}
        <g className="points">
          {Object.entries(latest?.outboundByCountry || {}).map(([iso, n]) => {
            const meta = getCountry(iso);
            if (!meta) return null;
            const p = projection([meta.lon, meta.lat]);
            if (!p) return null;
            const r = 1 + Math.min(2.5, Math.log(n + 1) / 3);
            return (
              <circle
                key={iso}
                cx={p[0]}
                cy={p[1]}
                r={r}
                fill="#22d3ee"
                opacity={0.6}
              />
            );
          })}
        </g>
      </svg>

      {/* Country hover tooltip */}
      {hover && !arcHover && (
        <div
          className="tooltip"
          style={{
            position: 'absolute',
            left: hover.x + 12,
            top: hover.y + 12,
            zIndex: 5,
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
            {hover.name}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
            Inbound: {(inboundByIso[hover.iso] || 0).toLocaleString()} · Outbound:{' '}
            {(latest?.outboundByCountry[hover.iso] || 0).toLocaleString()}
          </div>
        </div>
      )}

      {/* Arc hover tooltip */}
      {arcHover && (() => {
        const arc = arcs.find((a) => a.key === arcHover.key);
        if (!arc) return null;
        const srcMeta = getCountry(arc.src);
        const tgtMeta = getCountry(arc.tgt);
        const catLabel = CATEGORY_LABELS[arc.category] || `Cat ${arc.category}`;
        const groupLabel = GROUP_LABELS[arc.group] || arc.group;
        const color = GROUP_COLOURS[arc.group];
        return (
          <div
            className="tooltip"
            style={{
              position: 'absolute',
              left: arcHover.x + 12,
              top: arcHover.y + 12,
              zIndex: 5,
              minWidth: 180,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-sans)', marginBottom: 4 }}>
              {srcMeta?.name || arc.src} <span style={{ color }}>→</span> {tgtMeta?.name || arc.tgt}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 8px', fontSize: 10, color: '#8896ab' }}>
              <span>Attacks</span><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{arc.count.toLocaleString()}</span>
              <span>Category</span><span style={{ color: 'var(--text-primary)' }}>{catLabel}</span>
              <span>Group</span><span style={{ color, fontWeight: 600 }}>{groupLabel}</span>
            </div>
            <div style={{ marginTop: 4, color: '#556178', fontSize: 9 }}>Click to isolate</div>
          </div>
        );
      })()}

      {/* Selected arc detail panel */}
      {selectedArc && (() => {
        const arc = arcs.find((a) => a.key === selectedArc);
        if (!arc) return null;
        const srcMeta = getCountry(arc.src);
        const tgtMeta = getCountry(arc.tgt);
        const catLabel = CATEGORY_LABELS[arc.category] || `Cat ${arc.category}`;
        const groupLabel = GROUP_LABELS[arc.group] || arc.group;
        const color = GROUP_COLOURS[arc.group];
        return (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-panel border border-border rounded-lg p-4 font-mono text-[11px] shadow-2xl min-w-[260px]">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-bold font-sans text-primary">
                {srcMeta?.name || arc.src} <span style={{ color }}>→</span> {tgtMeta?.name || arc.tgt}
              </div>
              <button onClick={() => setSelectedArc(null)} className="text-muted hover:text-primary text-lg leading-none">&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-muted">Attacks</span>
              <span className="text-primary font-bold">{arc.count.toLocaleString()}</span>
              <span className="text-muted">Category</span>
              <span className="text-primary">{catLabel}</span>
              <span className="text-muted">Group</span>
              <span style={{ color }} className="font-bold">{groupLabel}</span>
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
