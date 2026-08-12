"use client";

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** Small suffix rendered next to the value, e.g. "%". */
  unit?: string;
  /** Supporting line under the value. */
  caption?: string;
}

/**
 * Headline metric tile. Monochrome by design — it inherits the existing admin palette
 * (black value, gray-600 supporting text, gray-100 icon well) rather than introducing colour.
 */
const StatTile: React.FC<StatTileProps> = ({ icon: Icon, label, value, unit, caption }) => (
  <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
      <Icon size={20} />
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs font-medium text-gray-600">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1">
        <span className="text-3xl font-semibold leading-none text-black">{value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </p>
      {caption && <p className="mt-1.5 truncate text-xs text-gray-600">{caption}</p>}
    </div>
  </div>
);

export default StatTile;
