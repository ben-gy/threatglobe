import { useState } from 'react';
import ThreatGlobe from './components/Globe/ThreatGlobe';
import FlatMap from './components/Map/FlatMap';
import TickerBar from './components/TickerBar';
import FilterChips from './components/Sidebar/FilterChips';
import CountryPanel from './components/Sidebar/CountryPanel';
import Modal from './components/Modal';
import PortHeatmap from './pages/PortHeatmap';
import Stats from './pages/Stats';
import IpLookup from './pages/IpLookup';
import About from './pages/About';
import LivePopover from './components/LivePopover';
import { useRealtimeData } from './hooks/useRealtimeData';
import type { CategoryGroup } from './types';

type ViewMode = 'globe' | 'flat';
type ModalKey = null | 'ports' | 'stats' | 'lookup' | 'about';

export default function App() {
  const { data: latest, newPairKeys, lastUpdated } = useRealtimeData();
  const [view, setView] = useState<ViewMode>('globe');
  const [filter, setFilter] = useState<CategoryGroup | 'all'>('all');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [bilateralTarget, setBilateralTarget] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKey>(null);
  const [liveOpen, setLiveOpen] = useState(false);

  const handleCountryClick = (iso2: string) => {
    if (selectedCountry && iso2 !== selectedCountry) {
      setBilateralTarget(iso2);
      return;
    }
    setSelectedCountry(iso2);
    setBilateralTarget(null);
  };

  const closePanel = () => {
    setSelectedCountry(null);
    setBilateralTarget(null);
  };

  const freshness = (() => {
    if (!latest?.generatedAt) return { label: 'STAND BY', cls: 'text-muted' };
    const age = Date.now() - new Date(latest.generatedAt).getTime();
    const mins = Math.round(age / 60000);
    if (mins < 90) return { label: 'LIVE', cls: 'text-success' };
    if (mins < 240) return { label: `${mins}M`, cls: 'text-secondary' };
    return { label: `${Math.round(mins / 60)}H`, cls: 'text-danger' };
  })();

  return (
    <div className="h-screen w-screen relative">
      {/* Map / Globe */}
      <div className="absolute inset-0">
        {view === 'globe' ? (
          <ThreatGlobe
            latest={latest}
            selectedCountry={selectedCountry}
            bilateralTarget={bilateralTarget}
            filterGroup={filter}
            onCountryClick={handleCountryClick}
            newPairKeys={newPairKeys}
          />
        ) : (
          <FlatMap
            latest={latest}
            selectedCountry={selectedCountry}
            bilateralTarget={bilateralTarget}
            filterGroup={filter}
            onCountryClick={handleCountryClick}
            newPairKeys={newPairKeys}
          />
        )}
      </div>

      {/* Top header */}
      <header className="absolute top-0 inset-x-0 z-30 px-5 py-3 flex items-center justify-between bg-bg/85 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3">
          <div className="relative h-2.5 w-2.5 rounded-full bg-accent">
            <div className="absolute inset-0 rounded-full radar-dot" />
          </div>
          <div>
            <h1 className="text-[12px] font-bold tracking-[2px] text-primary leading-none">THREATGLOBE</h1>
            <div className="text-[9px] tracking-[1.5px] text-muted uppercase mt-0.5 font-mono">
              Global Cyber Threat Observatory
            </div>
          </div>
        </div>

        {/* View toggle */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-panel border border-border rounded p-0.5">
          <button
            onClick={() => setView('globe')}
            className={`px-3 py-1.5 text-[10px] font-bold tracking-[1.5px] rounded-sm transition-colors ${
              view === 'globe' ? 'bg-accent/20 text-primary' : 'text-secondary hover:text-primary'
            }`}
          >
            GLOBE
          </button>
          <button
            onClick={() => setView('flat')}
            className={`px-3 py-1.5 text-[10px] font-bold tracking-[1.5px] rounded-sm transition-colors ${
              view === 'flat' ? 'bg-accent/20 text-primary' : 'text-secondary hover:text-primary'
            }`}
          >
            FLAT
          </button>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <button onClick={() => setModal('ports')} className="chip">PORTS</button>
          <button onClick={() => setModal('stats')} className="chip">STATS</button>
          <button onClick={() => setModal('lookup')} className="chip">LOOKUP</button>
          <button onClick={() => setModal('about')} className="chip">ABOUT</button>
          <div className="ml-3 relative">
            <button
              onClick={() => setLiveOpen((v) => !v)}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className={`h-1.5 w-1.5 rounded-full ${freshness.label === 'LIVE' ? 'live-dot' : 'bg-muted'}`} />
              <span className={`text-[10px] font-mono font-bold tracking-[1.5px] ${freshness.cls}`}>{freshness.label}</span>
            </button>
            {liveOpen && <LivePopover onClose={() => setLiveOpen(false)} generatedAt={latest?.generatedAt} />}
          </div>
        </div>
      </header>

      {/* Filter chips floating */}
      <FilterChips filter={filter} onChange={setFilter} categoryCounts={latest?.categoryCounts} />

      {/* Bottom ticker */}
      <TickerBar latest={latest} newCount={newPairKeys.size} />

      {/* Built by */}
      <div className="absolute bottom-3 right-5 z-20 text-[10px] text-muted">
        Built by{' '}
        <a
          href="https://benrichardson.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="chicago-font text-secondary hover:text-primary"
        >
          benrichardson.dev
        </a>
      </div>

      {/* Country side panel */}
      {selectedCountry && (
        <CountryPanel
          country={selectedCountry}
          bilateral={bilateralTarget}
          onSelectTarget={(t) => setBilateralTarget(t)}
          onClose={closePanel}
          onClearBilateral={() => setBilateralTarget(null)}
        />
      )}

      {/* Modals */}
      <Modal title="Port Heatmap" open={modal === 'ports'} onClose={() => setModal(null)} maxWidth={920}>
        <PortHeatmap />
      </Modal>
      <Modal title="Leaderboards & Stats" open={modal === 'stats'} onClose={() => setModal(null)} maxWidth={1000}>
        <Stats />
      </Modal>
      <Modal title="IP Lookup" open={modal === 'lookup'} onClose={() => setModal(null)} maxWidth={640}>
        <IpLookup />
      </Modal>
      <Modal title="About / Data Sources" open={modal === 'about'} onClose={() => setModal(null)} maxWidth={960}>
        <About />
      </Modal>
    </div>
  );
}
