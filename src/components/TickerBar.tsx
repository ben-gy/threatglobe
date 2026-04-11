import type { LatestData } from '../types';
import { flag, countryName } from '../utils/countries';

interface Props {
  latest: LatestData | null;
}

export default function TickerBar({ latest }: Props) {
  if (!latest) {
    return (
      <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-bg/95 to-transparent pt-6 pb-3 px-4 pointer-events-none">
        <div className="max-w-6xl mx-auto text-center text-secondary text-sm font-mono">Loading latest threat data…</div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-bg/95 via-bg/60 to-transparent pt-8 pb-4 px-4 pointer-events-none">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm font-mono">
        <span className="text-primary">
          <b className="text-cat-brute">{latest.totalAttacks.toLocaleString()}</b>{' '}
          <span className="text-secondary">attacks / last hour</span>
        </span>
        <span className="text-secondary">·</span>
        <span>
          <span className="text-secondary">Top source:</span>{' '}
          <b className="text-primary">{flag(latest.topSource || '')} {countryName(latest.topSource || '')}</b>
        </span>
        <span className="text-secondary">·</span>
        <span>
          <span className="text-secondary">Top target:</span>{' '}
          <b className="text-primary">{flag(latest.topTarget || '')} {countryName(latest.topTarget || '')}</b>
        </span>
        {latest.topPort ? (
          <>
            <span className="text-secondary">·</span>
            <span>
              <span className="text-secondary">Top port:</span>{' '}
              <b className="text-cat-scan">{latest.topPort}</b>
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
