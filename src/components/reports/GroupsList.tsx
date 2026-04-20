"use client";

import React from 'react';

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
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-base font-semibold text-black">Groups</h3>
        <p className="text-sm text-gray-600 mt-1">Select a group to view participants</p>
      </div>

      <div className="p-4">
        {groups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => onGroupSelect(group)}
                className="border border-gray-200 rounded-lg p-4 hover:border-black hover:bg-gray-50 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-black">{group.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {group.participants?.length || 0} participant{group.participants?.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-black">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-gray-600">
            No groups available
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupsList;

