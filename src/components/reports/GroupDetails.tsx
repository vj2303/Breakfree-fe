"use client";

import React from 'react';
import { Search, ArrowLeft } from 'lucide-react';

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

interface GroupDetailsProps {
  group: GroupData;
  participants: ParticipantData[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onParticipantSelect: (participant: ParticipantData) => void;
  onBack: () => void;
}

const GroupDetails: React.FC<GroupDetailsProps> = ({
  group,
  participants,
  searchValue,
  onSearchChange,
  onParticipantSelect,
  onBack,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center text-black hover:text-gray-600 mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="text-sm font-medium">{group.name}</span>
        </button>
        <h3 className="text-base font-semibold text-black">Group details</h3>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by participant name"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black bg-white"
          />
        </div>
        <button className="text-sm text-black hover:text-gray-600 font-medium ml-3">
          View All
        </button>
      </div>

      {/* Participants Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-black">User code</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-black">Name</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-black">E-mail</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-black">Designation</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-black">Contact no.</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-black">Manager Name</th>
            </tr>
          </thead>
          <tbody>
            {participants.length > 0 ? (
              participants.map((participant) => (
                <tr
                  key={participant.id}
                  className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onParticipantSelect(participant)}
                >
                  <td className="py-3 px-4 text-sm text-black">{participant.userCode}</td>
                  <td className="py-3 px-4 text-sm text-black">{participant.name}</td>
                  <td className="py-3 px-4 text-sm text-black">{participant.email}</td>
                  <td className="py-3 px-4 text-sm text-black">{participant.designation}</td>
                  <td className="py-3 px-4 text-sm text-black">{participant.contactNo}</td>
                  <td className="py-3 px-4 text-sm text-black">{participant.managerName}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-gray-600">
                  No participants found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GroupDetails;

