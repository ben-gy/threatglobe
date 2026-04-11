import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import GlobeView from './pages/GlobeView';
import PortHeatmap from './pages/PortHeatmap';
import Stats from './pages/Stats';
import IpLookup from './pages/IpLookup';
import About from './pages/About';
import { useJson } from './hooks/useDataLoader';
import type { LatestData } from './types';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'bg-accent/20 text-primary' : 'text-secondary hover:text-primary hover:bg-white/5'
  }`;

export default function App() {
  const { data: latest } = useJson<LatestData>('/data/latest.json');
  const loc = useLocation();
  const isGlobe = loc.pathname === '/';

  const freshness = (() => {
    if (!latest?.generatedAt) return { label: 'loading', dot: 'bg-secondary' };
    const age = Date.now() - new Date(latest.generatedAt).getTime();
    const mins = Math.round(age / 60000);
    if (mins < 90) return { label: `${mins}m ago`, dot: 'bg-success' };
    if (mins < 240) return { label: `${mins}m ago`, dot: 'bg-yellow-500' };
    return { label: `${Math.round(mins / 60)}h ago`, dot: 'bg-danger' };
  })();

  return (
    <div className="h-screen w-screen relative">
      <nav
        className={`absolute top-0 inset-x-0 z-30 flex items-center justify-between px-5 py-3 ${
          isGlobe ? 'bg-gradient-to-b from-bg/80 to-transparent' : 'bg-surface/80 border-b border-border'
        } backdrop-blur-sm`}
      >
        <NavLink to="/" className="flex items-center gap-2">
          <div className="relative h-5 w-5 rounded-full bg-accent/30 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-accent" />
            <div className="absolute inset-0 rounded-full border border-accent/50 radar-dot" />
          </div>
          <span className="font-semibold tracking-tight">ThreatGlobe</span>
          <span className="text-xs text-secondary font-mono hidden sm:inline">Global Cyber Threat Observatory</span>
        </NavLink>
        <div className="flex items-center gap-1">
          <NavLink to="/" end className={linkClass}>Globe</NavLink>
          <NavLink to="/ports" className={linkClass}>Ports</NavLink>
          <NavLink to="/stats" className={linkClass}>Stats</NavLink>
          <NavLink to="/lookup" className={linkClass}>Lookup</NavLink>
          <NavLink to="/about" className={linkClass}>About</NavLink>
        </div>
        <div className="flex items-center gap-3 text-xs text-secondary">
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full glow-pulse ${freshness.dot}`} />
            <span className="font-mono">{freshness.label}</span>
          </div>
          <a
            href="https://github.com/ben-gy/threatglobe"
            target="_blank"
            rel="noreferrer"
            className="hover:text-primary"
            aria-label="GitHub repository"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 .2C3.58.2 0 3.78 0 8.2c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8.2c0-4.42-3.58-8-8-8z"/>
            </svg>
          </a>
        </div>
      </nav>

      <main className={isGlobe ? 'absolute inset-0' : 'absolute inset-0 pt-14 overflow-auto scrollbar-thin'}>
        <Routes>
          <Route path="/" element={<GlobeView latest={latest} />} />
          <Route path="/ports" element={<PortHeatmap />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/lookup" element={<IpLookup />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
    </div>
  );
}
