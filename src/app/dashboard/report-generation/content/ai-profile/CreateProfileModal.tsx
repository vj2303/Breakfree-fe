// CreateProfileModal.tsx
import React, { useState, useEffect } from 'react';
import { CreateProfileModalProps } from './types';

export const CreateProfileModal: React.FC<CreateProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProfile
}) => {
  const [formData, setFormData] = useState({
    title: '',
    systemInstruction: '',
    temperature: 0.7,
    model: 'gpt-4o' as 'gpt-4o' | 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'gemini-pro'
  });

  useEffect(() => {
    if (editingProfile) {
      setFormData({
        title: editingProfile.title,
        systemInstruction: editingProfile.systemInstruction,
        temperature: editingProfile.temperature,
        model: editingProfile.model
      });
    } else {
      setFormData({
        title: '',
        systemInstruction: '',
        temperature: 0.7,
        model: 'gpt-4o'
      });
    }
  }, [editingProfile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingProfile ? 'Edit AI Profile' : 'Create New AI Profile'}
          </h2>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Save
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="AI profile Title here"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              required
            />
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Profile
            </label>
            <select
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value as 'gpt-4o' | 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'gemini-pro' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="claude-3">Claude-3</option>
              <option value="gemini-pro">Gemini Pro</option>
            </select>
          </div>

          {/* System Instruction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              System Instruction
            </label>
            <textarea
              value={formData.systemInstruction}
              onChange={(e) => setFormData({ ...formData, systemInstruction: e.target.value })}
              placeholder="AI profile Title here"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-vertical"
            />
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature
            </label>
            <div className="px-4">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.0</span>
                <span>0.2</span>
                <span>0.4</span>
                <span>0.6</span>
                <span>0.8</span>
                <span>1.0</span>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600 mt-1">
              Current: {formData.temperature}
            </div>
          </div>

        
        </form>

        {/* Custom CSS for sliders */}
        <style jsx>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #334155;
            cursor: pointer;
          }
          
          .slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #334155;
            cursor: pointer;
            border: none;
          }
        `}</style>
      </div>
    </div>
  );
};