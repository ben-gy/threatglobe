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
    if (mins < 90) return { label: 'LIVE', cls: 'text-live' };
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
          <div className="ml-3 flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full ${freshness.label === 'LIVE' ? 'live-dot' : 'bg-muted'}`} />
            <span className={`text-[10px] font-mono font-bold tracking-[1.5px] ${freshness.cls}`}>{freshness.label}</span>
            <a
              href="https://github.com/ben-gy/threatglobe"
              target="_blank"
              rel="noreferrer"
              className="ml-2 text-secondary hover:text-primary"
              aria-label="GitHub"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 .2C3.58.2 0 3.78 0 8.2c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8.2c0-4.42-3.58-8-8-8z" />
              </svg>
            </a>
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
