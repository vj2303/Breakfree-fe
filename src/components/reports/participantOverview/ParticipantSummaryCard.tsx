"use client";

import React from 'react';
import { Building2, Calendar, CreditCard, Mail, User, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { initials } from './scoring';

export interface ParticipantSummaryCardProps {
  name: string;
  participantCode: string;
  cohort: string;
  department: string;
  manager: string;
  email: string;
  assessmentDates: string;
  /** Completion of the assessment centre, drives the status chip. */
  status: 'Completed' | 'In Progress' | 'Not Started';
}

const STATUS_STYLES: Record<ParticipantSummaryCardProps['status'], string> = {
  Completed: 'bg-emerald-50 text-emerald-700',
  'In Progress': 'bg-amber-50 text-amber-700',
  'Not Started': 'bg-gray-100 text-gray-600',
};

function MetaField({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="truncate text-sm font-semibold text-black" title={value}>
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

export default function ParticipantSummaryCard({
  name,
  participantCode,
  cohort,
  department,
  manager,
  email,
  assessmentDates,
  status,
}: ParticipantSummaryCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-lg font-bold text-violet-700">
          {initials(name)}
        </span>
        <h2 className="text-2xl font-bold text-black">{name}</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
        >
          {status}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-gray-100 pt-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetaField icon={CreditCard} label="Participant ID" value={participantCode} />
        <MetaField icon={Users} label="Cohort / Batch" value={cohort} />
        <MetaField icon={Building2} label="BU / Department" value={department} />
        <MetaField icon={User} label="Manager / Team Leader" value={manager} />
        <MetaField icon={Mail} label="Email" value={email} />
        <MetaField icon={Calendar} label="Date of Assessment" value={assessmentDates} />
      </div>
    </div>
  );
}
