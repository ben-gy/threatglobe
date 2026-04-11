import type { CategoryGroup } from '../../types';
import { GROUP_COLOURS, GROUP_LABELS } from '../../utils/colours';

interface Props {
  filter: CategoryGroup | 'all';
  onChange: (f: CategoryGroup | 'all') => void;
  categoryCounts?: Record<string, number>;
}

const GROUPS: (CategoryGroup | 'all')[] = ['all', 'brute', 'ddos', 'malware', 'scan', 'web'];

export default function FilterChips({ filter, onChange }: Props) {
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex flex-wrap justify-center gap-2 max-w-[90vw]">
      {GROUPS.map((g) => {
        const active = filter === g;
        const label = g === 'all' ? 'All attacks' : GROUP_LABELS[g];
        const colour = g === 'all' ? '#3B82F6' : GROUP_COLOURS[g];
        return (
          <button
            key={g}
            onClick={() => onChange(g)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all backdrop-blur-sm border"
            style={{
              background: active ? `${colour}33` : 'rgba(17,24,39,0.7)',
              borderColor: active ? colour : 'rgba(42,58,74,0.8)',
              color: active ? '#fff' : '#9CA3AF',
            }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
              style={{ background: colour }}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}
