// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { LatestData } from '../types';
import { flag, countryName } from '../utils/countries';

interface Props {
  latest: LatestData | null;
  newCount?: number;
}

export default function TickerBar({ latest, newCount = 0 }: Props) {
  if (!latest) {
    return (
      <div className="absolute bottom-0 inset-x-0 z-20 px-5 py-3 pointer-events-none">
        <div className="text-center text-secondary text-[10px] font-mono tracking-[1.5px] uppercase">Loading…</div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-0 inset-x-0 z-10 pointer-events-none">
      <div className="bg-bg/85 backdrop-blur-md border-t border-border px-5 py-2.5">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[10px] font-mono tracking-[1px] uppercase">
          <Item label="Active" value={`${latest.totalAttacks.toLocaleString()}`} highlight="text-cat-brute" />
          <Sep />
          <Item label="Top src" value={`${flag(latest.topSource || '')} ${countryName(latest.topSource || '')}`} />
          <Sep />
          <Item label="Top tgt" value={`${flag(latest.topTarget || '')} ${countryName(latest.topTarget || '')}`} />
          {latest.topPort ? (
            <>
              <Sep />
              <Item label="Top port" value={String(latest.topPort)} highlight="text-cyan" />
            </>
          ) : null}
          {newCount > 0 ? (
            <>
              <Sep />
              <span className="text-live">
                <span className="font-bold">{newCount}</span> NEW
              </span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Item({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <span>
      <span className="text-muted">{label}</span>{' '}
      <span className={highlight || 'text-primary'}>{value}</span>
    </span>
  );
}

function Sep() {
  return <span className="text-muted">·</span>;
}
