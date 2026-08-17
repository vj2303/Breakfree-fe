'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MoreVertical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  /** Swaps the icon for a spinner and blocks the item while an action runs. */
  loading?: boolean;
  /** Optional caption under the label, for actions that need a hint. */
  description?: string;
  tone?: 'default' | 'danger';
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  /** Accessible name for the trigger. */
  label?: string;
  align?: 'left' | 'right';
  className?: string;
}

/**
 * Overflow menu for secondary row actions — keeps the primary buttons visible
 * without crowding the row. Closes on outside click, Escape, or selection.
 */
export default function ActionMenu({
  items,
  label = 'More actions',
  align = 'right',
  className = '',
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (items.length === 0) return null;

  const busy = items.some((item) => item.loading);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
          open
            ? 'border-gray-400 bg-gray-100 text-black'
            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'
        }`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MoreVertical className="h-4 w-4" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute top-[calc(100%+6px)] z-30 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isDisabled = item.disabled || item.loading;
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={isDisabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  item.tone === 'danger'
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center">
                  {item.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    Icon && <Icon className="h-4 w-4" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  {item.description && (
                    <span className="block text-xs text-gray-500">{item.description}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
