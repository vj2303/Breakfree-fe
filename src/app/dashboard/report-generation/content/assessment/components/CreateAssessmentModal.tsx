'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { InteractiveActivityType, AssessmentType } from '../types/assessment';

const INTERACTIVE_ACTIVITY_TYPES: { value: InteractiveActivityType; label: string }[] = [
  { value: 'GD', label: 'Group Discussion (GD)' },
  { value: 'ROLEPLAY', label: 'Roleplay' },
  { value: 'CASE_STUDY', label: 'Case Study' },
];

interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: AssessmentType;
  onSubmit?: (data: {
    name: string;
    description: string;
    interactiveActivityType?: InteractiveActivityType;
  }) => void;
}

const CreateAssessmentModal: React.FC<CreateAssessmentModalProps> = ({ 
  isOpen, 
  onClose, 
  activeTab = 'case-study',
  onSubmit 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    interactiveActivityType: 'CASE_STUDY' as InteractiveActivityType,
  });

  const isInboxActivity = activeTab === 'inbox-activity';
  const modalTitle = isInboxActivity ? 'Create Inbox Activity' : 'Create New Assessment';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isInboxActivity) {
      // For inbox activity, don't include interactiveActivityType
      onSubmit?.({
        name: formData.name,
        description: formData.description,
      });
    } else {
      onSubmit?.(formData);
    }
    
    // Reset form
    setFormData({
      name: '',
      description: '',
      interactiveActivityType: 'CASE_STUDY',
    });
    
    onClose();
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      name: '',
      description: '',
      interactiveActivityType: 'CASE_STUDY',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{modalTitle}</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={isInboxActivity ? "Enter inbox activity name" : "Enter assessment name"}
              required
            />
          </div>

          {/* Only show Activity Type selector for Interactive Activities, not for Inbox Activity */}
          {!isInboxActivity && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activity Type
              </label>
              <select
                value={formData.interactiveActivityType}
                onChange={(e) => setFormData({ ...formData, interactiveActivityType: e.target.value as InteractiveActivityType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                required
              >
                {INTERACTIVE_ACTIVITY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Use this space to put in a brief description of the activity, the intended group or audience and the batch. This will be displayed on the card in the main screen"
              required
            />
          </div>
          
          <div className="flex justify-center">
            <button
              type="submit"
              className="bg-gray-800 text-white px-8 py-2 rounded-full hover:bg-gray-900 transition-colors"
            >
              Done
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAssessmentModal;