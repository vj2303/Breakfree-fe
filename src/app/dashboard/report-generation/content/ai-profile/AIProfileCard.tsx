// AIProfileCard.tsx
import React, { useState } from 'react';
import { AIProfileCardProps } from './types';

export const AIProfileCard: React.FC<AIProfileCardProps> = ({
  profile,
  onEdit,
  onDelete
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleEdit = () => {
    setShowDropdown(false);
    onEdit(profile);
  };

  const handleDelete = () => {
    setShowDropdown(false);
    onDelete(profile.id);
  };

  return (
    <div className="bg-gray-50/20 border border-gray-200 rounded-lg p-4 relative">
      {/* Header with three dots */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{profile.title}</h3>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[100px]">
              <button
                onClick={handleEdit}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile details */}
      <div className="space-y-2 mb-4">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Model:</span> {profile.model}
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium">Temperature:</span> {profile.temperature}
        </div>
      </div>

      {/* AI Profile tag */}
      <div className="flex justify-between items-center">
        <button className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
          view more
        </button>
        <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
          AI Profile
        </span>
      </div>
    </div>
  );
};