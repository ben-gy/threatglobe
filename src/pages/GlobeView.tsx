import { useState } from 'react';
import ThreatGlobe from '../components/Globe/ThreatGlobe';
import TickerBar from '../components/TickerBar';
import FilterChips from '../components/Sidebar/FilterChips';
import CountryPanel from '../components/Sidebar/CountryPanel';
import type { LatestData, CategoryGroup } from '../types';

interface Props {
  latest: LatestData | null;
}

export default function GlobeView({ latest }: Props) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [bilateralTarget, setBilateralTarget] = useState<string | null>(null);
  const [filter, setFilter] = useState<CategoryGroup | 'all'>('all');

  const handleCountryClick = (iso2: string) => {
    if (selectedCountry && iso2 !== selectedCountry) {
      setBilateralTarget(iso2);
      return;
    }
    setSelectedCountry(iso2);
    setBilateralTarget(null);
  };

  const handleClose = () => {
    setSelectedCountry(null);
    setBilateralTarget(null);
  };

  return (
    <>
      <ThreatGlobe
        latest={latest}
        selectedCountry={selectedCountry}
        bilateralTarget={bilateralTarget}
        filterGroup={filter}
        onCountryClick={handleCountryClick}
      />
      <FilterChips filter={filter} onChange={setFilter} categoryCounts={latest?.categoryCounts} />
      <TickerBar latest={latest} />
      {selectedCountry && (
        <CountryPanel
          country={selectedCountry}
          bilateral={bilateralTarget}
          onSelectTarget={(t) => setBilateralTarget(t)}
          onClose={handleClose}
          onClearBilateral={() => setBilateralTarget(null)}
        />
      )}
    </>
  );
}
