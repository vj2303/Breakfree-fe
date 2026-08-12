'use client';

import { ArrowDown, ArrowUp, Star, Target, TrendingUp, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { KPI_TILES, type KpiTileData } from '../data';

const ICONS: Record<string, LucideIcon> = {
  overall: Users,
  readiness: TrendingUp,
  gaps: Target,
  hipo: Star,
};

/** Small trend line. Points are 0-1; y is flipped so 1 sits at the top. */
function Sparkline({ points }: { points: number[] }) {
  const width = 64;
  const height = 26;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${((1 - p) * height).toFixed(1)}`)
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KpiTile({ tile }: { tile: KpiTileData }) {
  const Icon = ICONS[tile.id] ?? Users;
  const DeltaIcon = tile.trend === 'up' ? ArrowUp : ArrowDown;
  const deltaClass = tile.trend === 'up' ? 'text-gray-700' : 'text-red-600';

  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
        <Icon size={20} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-gray-500">{tile.label}</p>
        <p className="mt-0.5 flex items-baseline gap-1">
          <span className="text-3xl font-semibold leading-none text-gray-900">{tile.value}</span>
          {tile.unit && <span className="text-sm text-gray-400">{tile.unit}</span>}
        </p>
        <p className={`mt-1.5 flex items-center gap-1 text-xs ${deltaClass}`}>
          <DeltaIcon size={13} />
          {tile.delta}
          <span className="text-gray-400">vs previous period</span>
        </p>
      </div>

      <span className="mt-1 text-gray-300">
        <Sparkline points={tile.spark} />
      </span>
    </div>
  );
}

export default function KpiRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {KPI_TILES.map((tile) => (
        <KpiTile key={tile.id} tile={tile} />
      ))}
    </div>
  );
}
