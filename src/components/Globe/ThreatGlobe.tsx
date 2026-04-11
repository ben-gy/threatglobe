import { useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import type { LatestData, Pair, CategoryGroup } from '../../types';
import { GROUP_COLOURS } from '../../utils/colours';
import { getCountry } from '../../utils/countries';

interface Props {
  latest: LatestData | null;
  selectedCountry: string | null;
  bilateralTarget: string | null;
  filterGroup: CategoryGroup | 'all';
  onCountryClick: (iso2: string) => void;
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
}

interface PointDatum {
  lat: number;
  lng: number;
  size: number;
  color: string;
  country: string;
  inbound: number;
  outbound: number;
}

export default function ThreatGlobe({
  latest,
  selectedCountry,
  bilateralTarget,
  filterGroup,
  onCountryClick,
}: Props) {
  const globeRef = useRef<any>(null);
  const [countries, setCountries] = useState<any[]>([]);
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handle = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  // Load Natural Earth country polygons (GeoJSON, no topojson dependency)
  useEffect(() => {
    let cancelled = false;
    fetch('/data/world-countries.geojson')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((g) => {
        if (!cancelled) setCountries(g.features);
      })
      .catch(() => {
        // Fallback to CDN
        fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
          .then((r) => r.json())
          .then((g) => {
            if (!cancelled) setCountries(g.features);
          })
          .catch(() => {});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Configure globe once it mounts
  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls?.();
    if (controls) {
      controls.enableZoom = true;
      controls.enableDamping = true;
      controls.autoRotate = !selectedCountry;
      controls.autoRotateSpeed = 0.35;
      controls.minDistance = 170;
      controls.maxDistance = 600;
    }
  }, [globeRef.current, selectedCountry]);

  // Compute max attack volume for log-scale thickness
  const { arcs, points } = useMemo(() => {
    if (!latest) return { arcs: [], points: [] };
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

    const maxCount = Math.max(1, ...pairs.map((p) => p.count));
    const arcs: ArcDatum[] = [];
    for (const p of pairs) {
      const src = getCountry(p.src);
      const tgt = getCountry(p.tgt);
      if (!src || !tgt) continue;
      arcs.push({
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
      });
    }
    // Limit for performance
    arcs.sort((a, b) => b.count - a.count);
    const limited = arcs.slice(0, selectedCountry ? 80 : 200);

    // Country glow points
    const points: PointDatum[] = [];
    const allCountries = new Set<string>([
      ...Object.keys(latest.inboundByCountry),
      ...Object.keys(latest.outboundByCountry),
    ]);
    const maxInbound = Math.max(1, ...Object.values(latest.inboundByCountry));
    for (const iso2 of allCountries) {
      const meta = getCountry(iso2);
      if (!meta) continue;
      const inbound = latest.inboundByCountry[iso2] || 0;
      const outbound = latest.outboundByCountry[iso2] || 0;
      const intensity = Math.min(1, (inbound / maxInbound) ** 0.6);
      points.push({
        lat: meta.lat,
        lng: meta.lon,
        size: 0.15 + intensity * 0.6,
        color: intensity > 0 ? `rgba(255,${Math.round(180 - intensity * 120)},${Math.round(80 - intensity * 60)},${0.3 + intensity * 0.5})` : 'rgba(59,130,246,0.3)',
        country: iso2,
        inbound,
        outbound,
      });
    }
    void maxCount;
    return { arcs: limited, points };
  }, [latest, selectedCountry, bilateralTarget, filterGroup]);

  const maxArcCount = useMemo(() => Math.max(1, ...arcs.map((a) => a.count)), [arcs]);

  // When a country is selected, ease the globe camera toward it
  useEffect(() => {
    if (!globeRef.current || !selectedCountry) return;
    const meta = getCountry(selectedCountry);
    if (!meta) return;
    globeRef.current.pointOfView(
      { lat: meta.lat, lng: meta.lon, altitude: bilateralTarget ? 2.2 : 1.8 },
      1400
    );
  }, [selectedCountry, bilateralTarget]);

  const selectedFeatures = useMemo(() => new Set([selectedCountry, bilateralTarget].filter(Boolean) as string[]), [selectedCountry, bilateralTarget]);

  // Inbound volume per ISO-2 used for polygon glow
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
        atmosphereColor="#3B82F6"
        atmosphereAltitude={0.18}
        polygonsData={countries}
        polygonAltitude={(d: any) => (selectedFeatures.has(isoOf(d)) ? 0.025 : 0.008)}
        polygonCapColor={(d: any) => {
          const iso = isoOf(d);
          const inbound = inboundByIso2[iso] || 0;
          if (selectedFeatures.has(iso)) return 'rgba(59,130,246,0.6)';
          const t = Math.min(1, (inbound / maxInbound) ** 0.5);
          const r = Math.round(27 + t * 200);
          const g = Math.round(40 + t * 60);
          const b = Math.round(56 + t * 40);
          return `rgba(${r},${g},${b},${0.55 + t * 0.3})`;
        }}
        polygonSideColor={() => 'rgba(40,50,70,0.4)'}
        polygonStrokeColor={() => '#2a3a4a'}
        polygonLabel={(d: any) => {
          const iso = isoOf(d);
          const inbound = inboundByIso2[iso] || 0;
          const outbound = latest?.outboundByCountry[iso] || 0;
          const name = d.properties?.name || d.properties?.NAME || iso;
          return `<div class="tooltip">
            <div style="font-weight:600">${name}</div>
            <div style="color:#9CA3AF;font-size:11px">
              Inbound: <b style="color:#FF6B35">${inbound.toLocaleString()}</b>
              · Outbound: <b style="color:#06D6A0">${outbound.toLocaleString()}</b>
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
        arcStroke={(d: any) => 0.3 + Math.min(2.5, Math.log(d.count + 1) / Math.log(maxArcCount + 1) * 2.5)}
        arcAltitudeAutoScale={0.4}
        arcDashLength={0.35}
        arcDashGap={0.15}
        arcDashAnimateTime={(d: any) => 2500 + Math.random() * 1500}
        arcDashInitialGap={() => Math.random()}
        arcLabel={(d: any) => `<div class="tooltip">
          <div><b>${d.src}</b> → <b>${d.tgt}</b></div>
          <div style="color:#9CA3AF;font-size:11px">${d.count.toLocaleString()} attacks · ${d.group}</div>
        </div>`}
        pointsData={points}
        pointLat={(d: any) => d.lat}
        pointLng={(d: any) => d.lng}
        pointAltitude={0}
        pointRadius={(d: any) => d.size}
        pointColor={(d: any) => d.color}
        pointResolution={4}
      />
    </div>
  );
}

// Extract an ISO-2 code from a GeoJSON feature. Natural Earth features have
// ISO_A2 / ISO_A2_EH in properties. France / Norway in NE have ISO_A2 set to "-99",
// so we fall back to name and ADMIN/ADM0_A3 lookups.
function isoOf(d: any): string {
  if (!d || !d.properties) return '';
  const p = d.properties;
  const direct = (p.ISO_A2_EH && p.ISO_A2_EH !== '-99' && p.ISO_A2_EH) ||
                 (p.ISO_A2 && p.ISO_A2 !== '-99' && p.ISO_A2) ||
                 p.WB_A2 || p.POSTAL;
  if (direct && direct.length === 2) return direct;
  const name: string = (p.NAME || p.name || p.ADMIN || '').toLowerCase();
  const byName = NAME_TO_ISO2[name];
  if (byName) return byName;
  // Use ISO_N3 numeric fallback
  const num = p.ISO_N3 || p.UN_A3 || d.id;
  return NUM_TO_ISO2[num] || '';
}

// UN M49 numeric → ISO-2 for the ~100 countries shown on the globe. world-atlas uses
// these numeric codes as feature ids. Non-exhaustive but covers everything the dataset hits.
const NUM_TO_ISO2: Record<string, string> = {
  '004':'AF','008':'AL','012':'DZ','024':'AO','032':'AR','036':'AU','040':'AT','044':'BS','048':'BH','050':'BD','051':'AM','052':'BB','056':'BE','068':'BO','070':'BA','072':'BW','076':'BR','084':'BZ','090':'SB','096':'BN','100':'BG','104':'MM','108':'BI','112':'BY','116':'KH','120':'CM','124':'CA','140':'CF','144':'LK','148':'TD','152':'CL','156':'CN','170':'CO','178':'CG','180':'CD','188':'CR','191':'HR','192':'CU','196':'CY','203':'CZ','204':'BJ','208':'DK','214':'DO','218':'EC','222':'SV','226':'GQ','231':'ET','232':'ER','233':'EE','242':'FJ','246':'FI','250':'FR','262':'DJ','266':'GA','268':'GE','270':'GM','276':'DE','288':'GH','300':'GR','320':'GT','324':'GN','328':'GY','332':'HT','340':'HN','348':'HU','352':'IS','356':'IN','360':'ID','364':'IR','368':'IQ','372':'IE','376':'IL','380':'IT','384':'CI','388':'JM','392':'JP','398':'KZ','400':'JO','404':'KE','408':'KP','410':'KR','414':'KW','417':'KG','418':'LA','422':'LB','426':'LS','428':'LV','430':'LR','434':'LY','440':'LT','442':'LU','450':'MG','454':'MW','458':'MY','466':'ML','478':'MR','484':'MX','496':'MN','498':'MD','499':'ME','504':'MA','508':'MZ','512':'OM','516':'NA','524':'NP','528':'NL','540':'NC','548':'VU','554':'NZ','558':'NI','562':'NE','566':'NG','578':'NO','586':'PK','591':'PA','598':'PG','600':'PY','604':'PE','608':'PH','616':'PL','620':'PT','624':'GW','626':'TL','630':'PR','634':'QA','642':'RO','643':'RU','646':'RW','682':'SA','686':'SN','688':'RS','694':'SL','702':'SG','703':'SK','704':'VN','705':'SI','706':'SO','710':'ZA','716':'ZW','724':'ES','728':'SS','729':'SD','732':'EH','748':'SZ','752':'SE','756':'CH','760':'SY','762':'TJ','764':'TH','768':'TG','780':'TT','784':'AE','788':'TN','792':'TR','795':'TM','800':'UG','804':'UA','807':'MK','818':'EG','826':'GB','834':'TZ','840':'US','854':'BF','858':'UY','860':'UZ','862':'VE','887':'YE','894':'ZM',
};

const NAME_TO_ISO2: Record<string, string> = {
  'united states of america':'US','united states':'US','russia':'RU','china':'CN','germany':'DE','france':'FR',
  'united kingdom':'GB','netherlands':'NL','canada':'CA','brazil':'BR','india':'IN','japan':'JP','australia':'AU',
  'south korea':'KR','singapore':'SG','turkey':'TR','poland':'PL','ukraine':'UA','italy':'IT','spain':'ES',
  'south africa':'ZA','iran':'IR','indonesia':'ID','mexico':'MX','vietnam':'VN','thailand':'TH','taiwan':'TW',
  'hong kong':'HK','switzerland':'CH','sweden':'SE','finland':'FI','norway':'NO','denmark':'DK','belgium':'BE',
  'austria':'AT','portugal':'PT','ireland':'IE','greece':'GR','romania':'RO','hungary':'HU','czechia':'CZ',
};
