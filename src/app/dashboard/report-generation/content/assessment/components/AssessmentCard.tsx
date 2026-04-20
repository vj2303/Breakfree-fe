'use client';

import React, { useState } from 'react';
import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Assessment, InteractiveActivityType } from '../types/assessment';

interface AssessmentCardProps {
  assessment: Assessment;
  onEdit?: (assessment: Assessment) => void;
  onPreview?: (id: string) => void;
  onRemove?: (id: string) => void;
}

const getActivityTypeBadge = (type?: InteractiveActivityType) => {
  switch (type) {
    case 'GD':
      return { label: 'Group Discussion', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'ROLEPLAY':
      return { label: 'Roleplay', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'CASE_STUDY':
      return { label: 'Case Study', color: 'bg-green-50 text-green-700 border-green-200' };
    default:
      return null;
  }
};

const AssessmentCard: React.FC<AssessmentCardProps> = ({ 
  assessment, 
  onEdit, 
  onRemove 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const activityTypeBadge = getActivityTypeBadge(assessment.interactiveActivityType);

  const handleEdit = () => {
    onEdit?.(assessment);
    setShowDropdown(false);
  };

  const handleRemove = () => {
    onRemove?.(assessment.id);
    setShowDropdown(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 relative">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">{assessment.title}</h3>
            {activityTypeBadge && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded border ${activityTypeBadge.color}`}>
                {activityTypeBadge.label}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">{assessment.description}</p>
          <p className="text-xs text-gray-500">Created on {assessment.createdOn}</p>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
          
          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[120px] z-20">
                <button 
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                
                <button 
                  onClick={handleRemove}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="flex gap-6 text-sm">
        <div>
          <span className="text-gray-600">Allotted to </span>
          <span className="text-blue-600 font-medium">({assessment.allottedTo})</span>
        </div>
        <div>
          <span className="text-gray-600">Attempted By </span>
          <span className="text-blue-600 font-medium">({assessment.attemptedBy})</span>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
          {assessment.description}
      </div>
    </div>
  );
};

export default AssessmentCard;


