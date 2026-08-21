"use client";

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** Highlights the primary action with a violet outline. */
  primary?: boolean;
}

export interface QuickActionsCardProps {
  actions: QuickAction[];
  /** Optional secondary link rendered under the grid. */
  footerAction?: { label: string; onSelect: () => void };
}

export default function QuickActionsCard({ actions, footerAction }: QuickActionsCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-black">Quick actions</h2>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={action.onSelect}
              className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                action.primary
                  ? 'border-violet-500 bg-violet-50/40 hover:bg-violet-50'
                  : 'border-gray-200 bg-gray-50/60 hover:bg-gray-100'
              }`}
            >
              <Icon className={`h-5 w-5 ${action.primary ? 'text-violet-600' : 'text-gray-600'}`} />
              <span className="text-sm font-semibold text-black">{action.label}</span>
            </button>
          );
        })}
      </div>

      {footerAction && (
        <button
          type="button"
          onClick={footerAction.onSelect}
          className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-black"
        >
          {footerAction.label}
        </button>
      )}
    </div>
  );
}
