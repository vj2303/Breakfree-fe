"use client";

import React from 'react';
import { ChevronRight } from 'lucide-react';

interface ParticipantData {
  id: string;
  userCode: string;
  name: string;
  email: string;
  designation: string;
  contactNo: string;
  managerName: string;
}

interface GroupData {
  id: string;
  name: string;
  participants: ParticipantData[];
}

interface GroupsListProps {
  groups: GroupData[];
  onGroupSelect: (group: GroupData) => void;
}

const GroupsList: React.FC<GroupsListProps> = ({ groups, onGroupSelect }) => {
  const totalParticipants = groups.reduce(
    (sum, group) => sum + (group.participants?.length || 0),
    0
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-3 pt-4">
        <div>
          <h3 className="text-base font-semibold text-black">Groups</h3>
          <p className="mt-0.5 text-xs text-gray-600">Select a group to view participants</p>
        </div>
        {groups.length > 0 && (
          <p className="text-xs text-gray-600">
            <span className="tabular-nums font-medium text-black">{groups.length}</span> group
            {groups.length !== 1 ? 's' : ''} ·{' '}
            <span className="tabular-nums font-medium text-black">{totalParticipants}</span>{' '}
            participant{totalParticipants !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {groups.length > 0 ? (
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] font-medium text-gray-600">
                <th className="pb-2.5">Group</th>
                <th className="w-32 pb-2.5">Participants</th>
                <th className="w-10 pb-2.5" />
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const count = group.participants?.length || 0;
                return (
                  <tr
                    key={group.id}
                    onClick={() => onGroupSelect(group)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onGroupSelect(group);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`View participants in ${group.name}`}
                    className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="py-3 text-sm font-medium text-black">{group.name}</td>
                    <td className="py-3 text-sm tabular-nums text-gray-600">
                      {count} participant{count !== 1 ? 's' : ''}
                    </td>
                    <td className="py-3 text-right text-gray-400">
                      <ChevronRight size={16} className="inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 pb-6 pt-2 text-center text-sm text-gray-600">No groups available</div>
      )}
    </div>
  );
};

export default GroupsList;
