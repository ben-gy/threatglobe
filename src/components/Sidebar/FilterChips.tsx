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
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex flex-wrap justify-center gap-1.5 max-w-[90vw]">
      {GROUPS.map((g) => {
        const active = filter === g;
        const label = g === 'all' ? 'All' : GROUP_LABELS[g];
        const colour = g === 'all' ? '#3b82f6' : GROUP_COLOURS[g];
        return (
          <button
            key={g}
            onClick={() => onChange(g)}
            className={`chip ${active ? 'active' : ''}`}
            style={active ? { borderColor: colour, color: 'var(--text-primary)' } : undefined}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: colour }}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}
