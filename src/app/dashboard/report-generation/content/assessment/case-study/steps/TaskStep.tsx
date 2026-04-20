'use client';

import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import Editor from '@/components/Editor';
import { Task } from '../CaseStudyAssessment';

interface TaskStepProps {
  tasks: Task[];
  currentTask: Task;
  setCurrentTask: (task: Task) => void;
  onTaskSelect: (task: Task) => void;
  onAddNew: () => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (task: Task) => void;
}

const TaskStep: React.FC<TaskStepProps> = ({
  tasks,
  currentTask,
  setCurrentTask,
  onTaskSelect,
  onAddNew,
  onDeleteTask,
  onAddTask
}) => {
  const updateCurrentTask = (field: keyof Task, value: string | boolean | number) => {
    setCurrentTask({
      ...currentTask,
      [field]: value
    });
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-black">Task</h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-black">Exercise Time (Min)</span>
              <input 
                type="number" 
                value={currentTask.exerciseTime}
                onChange={(e) => updateCurrentTask('exerciseTime', parseInt(e.target.value))}
                className="w-16 px-2 py-1 border rounded text-black"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-black">Reading Time (Min)</span>
              <input 
                type="number" 
                value={currentTask.readingTime}
                onChange={(e) => updateCurrentTask('readingTime', parseInt(e.target.value))}
                className="w-16 px-2 py-1 border rounded text-black"
              />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-black">Title</label>
          <input 
            type="text" 
            value={currentTask.title}
            onChange={(e) => updateCurrentTask('title', e.target.value)}
            placeholder="Card Sorting"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
          />
        </div>

        <Editor
          content={currentTask.content}
          onChange={(value) => updateCurrentTask('content', value)}
        />

        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2 text-black">Response Document</h3>
          <select 
            value={currentTask.responseType}
            onChange={(e) => updateCurrentTask('responseType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
          >
            <option value="">Select Type</option>
            <option value="document">Document</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
          <div className="mt-2">
            <label className="flex items-center gap-2 text-sm">
              <input 
                type="checkbox" 
                checked={currentTask.isMandatory}
                onChange={(e) => updateCurrentTask('isMandatory', e.target.checked)}
              />
              <span className="text-black">Mark as mandatory field</span>
            </label>
          </div>
        </div>
      </div>

      <div className="w-80">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-black">All Tasks</h3>
            <button 
              onClick={() => {
                onAddTask(currentTask);
                onAddNew();
              }}
              className="flex items-center text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Task
            </button>
          </div>
          
          <div className="space-y-2">
            {tasks.map((task) => (
              <div 
                key={task.id}
                className={`p-3 rounded border-l-4 cursor-pointer transition-colors ${
                  currentTask.id === task.id 
                    ? 'bg-blue-50 border-blue-500' 
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => onTaskSelect(task)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-black">{task.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Exercise: {task.exerciseTime}min | Reading: {task.readingTime}min
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.responseType && (
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded text-black">
                          {task.responseType}
                        </span>
                      )}
                      {task.isMandatory && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskSelect(task);
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Edit2 className="w-3 h-3 text-gray-500" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
                          onDeleteTask(task.id);
                        }
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Trash2 className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskStep;