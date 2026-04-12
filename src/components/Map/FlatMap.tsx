import { useEffect, useMemo, useRef, useState } from 'react';
import { geoNaturalEarth1, geoPath, geoInterpolate } from 'd3-geo';
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

  useEffect(() => {
    const handle = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  // Build a Natural Earth projection that fits the viewport while preserving the
  // recognisable distortion. We pad slightly so labels don't clip the edge.
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

  // Inbound volume per ISO for fill intensity
  const inboundByIso = latest?.inboundByCountry || {};
  const maxInbound = useMemo(
    () => Math.max(1, ...Object.values(inboundByIso)),
    [inboundByIso]
  );

  // Filtered pairs
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
    pairs = pairs.slice(0, selectedCountry ? 100 : 500);
    return pairs.map((p) => ({ ...p, key: `${p.src}|${p.tgt}|${p.category}` }));
  }, [latest, filterGroup, selectedCountry, bilateralTarget]);

  const maxArcCount = useMemo(() => Math.max(1, ...arcs.map((a) => a.count)), [arcs]);

  // Helper to draw a great-circle path between two ISO countries.
  // Detects anti-meridian wraps and splits the path so we don't get a horizontal
  // line stretching across the whole map.
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
        // Anti-meridian wrap — start a new segment
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
          {/* Subtle inner shadow gradient for landmasses */}
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
            const stroke = GROUP_COLOURS[arc.group];
            const opacity = 0.55 + Math.min(0.4, (Math.log(arc.count + 1) / Math.log(maxArcCount + 1)) * 0.4);
            const width = isNew ? 1.4 : 0.5 + Math.min(0.6, (Math.log(arc.count + 1) / Math.log(maxArcCount + 1)) * 0.6);
            return (
              <path
                key={arc.key}
                d={path}
                fill="none"
                stroke={stroke}
                strokeWidth={width}
                strokeLinecap="round"
                opacity={opacity}
                style={isNew ? { filter: `drop-shadow(0 0 4px ${stroke})` } : undefined}
              />
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

      {hover && (
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
    </div>
  );
}
