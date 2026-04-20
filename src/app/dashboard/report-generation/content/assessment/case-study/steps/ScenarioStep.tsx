'use client';

import React, { useState } from 'react';
import { Edit2, Trash2, FileText, File, FileSpreadsheet } from 'lucide-react';
import Editor from '@/components/Editor';
import { useAuth } from '@/context/AuthContext';

type Document = {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
};

type Scenario = {
  id: string;
  title: string;
  description: string;
  content: string;
  exerciseTime: number;
  readingTime: number;
  documents: Document[];
};

interface ScenarioStepProps {
  scenarios: Scenario[];
  currentScenario: Scenario;
  setCurrentScenario: (scenario: Scenario) => void;
  onScenarioSelect: (scenario: Scenario) => void;
  onAddNew: () => void;
  onDeleteScenario: (id: string) => void;
  onAddScenario: (scenario: Scenario) => void;
}

const ScenarioStep: React.FC<ScenarioStepProps> = ({
  scenarios,
  currentScenario,
  setCurrentScenario,
  onScenarioSelect,
  onAddNew,
  onDeleteScenario,
  onAddScenario
}) => {
  const { token } = useAuth();
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  const updateCurrentScenario = <K extends keyof Scenario>(field: K, value: Scenario[K]) => {
    setCurrentScenario({
      ...currentScenario,
      [field]: value
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Process each file
    for (const file of Array.from(files)) {
      const fileId = Math.random().toString(36).substr(2, 9);
      setUploadingFiles(prev => new Set(prev).add(fileId));

      try {
        // Create FormData for upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'case-study-documents');

        // Upload file to server
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload file');
        }

        const result = await response.json();
        
        if (result.success && result.data) {
          const fileUrl = result.data.url;
          const fileName = result.data.fileName || file.name;
          
          // Create document entry
          const newDocument = {
            id: fileId,
            name: fileName,
            url: fileUrl,
            size: file.size,
            type: file.type
          };

          // Add to documents list
          updateCurrentScenario('documents', [
            ...(currentScenario.documents || []),
            newDocument
          ]);

          // Embed file link in content
          const fileLink = `<p><a href="${fileUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">📎 ${fileName}</a></p>`;
          const currentContent = currentScenario.content || '';
          updateCurrentScenario('content', currentContent + fileLink);
        } else {
          throw new Error(result.message || 'Upload failed');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        alert(`Failed to upload ${file.name}. Please try again.`);
      } finally {
        setUploadingFiles(prev => {
          const next = new Set(prev);
          next.delete(fileId);
          return next;
        });
      }
    }

    // Reset file input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const syntheticEvent = {
        target: { files }
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(syntheticEvent);
    }
  };

  const removeDocument = (id: string) => {
    const docToRemove = currentScenario.documents?.find(doc => doc.id === id);
    
    // Remove from documents list
    updateCurrentScenario('documents', 
      (currentScenario.documents || []).filter(doc => doc.id !== id)
    );

    // Remove file link from content if it exists
    if (docToRemove) {
      const fileName = docToRemove.name;
      // Remove the link HTML that contains this filename
      const currentContent = currentScenario.content || '';
      const linkPattern = new RegExp(`<p><a[^>]*>📎 ${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</a></p>`, 'gi');
      const updatedContent = currentContent.replace(linkPattern, '');
      updateCurrentScenario('content', updatedContent);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-black">Scenario Description</h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-black">Exercise Time (Min)</span>
              <input 
                type="number" 
                value={currentScenario.exerciseTime}
                onChange={(e) => updateCurrentScenario('exerciseTime', parseInt(e.target.value))}
                className="w-16 px-2 py-1 border rounded text-black"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-black">Reading Time (Min)</span>
              <input 
                type="number" 
                value={currentScenario.readingTime}
                onChange={(e) => updateCurrentScenario('readingTime', parseInt(e.target.value))}
                className="w-16 px-2 py-1 border rounded text-black"
              />
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-black">Title</label>
          <input 
            type="text" 
            value={currentScenario.title}
            onChange={(e) => updateCurrentScenario('title', e.target.value)}
            placeholder="Inventory"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-black">Description</label>
          <textarea
            value={currentScenario.description}
            onChange={(e) => updateCurrentScenario('description', e.target.value)}
            placeholder="Enter scenario description"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
            rows={2}
          />
        </div>

        <Editor
          content={currentScenario.content}
          onChange={(value) => updateCurrentScenario('content', value)}
        />

        <div 
          className="mt-6 p-6 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:bg-gray-50 transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <input
            id="file-upload"
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          />
          <div className="text-gray-500 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-sm text-black">
            Drag & drop files here or <span className="text-blue-600 hover:underline">browse</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Supports PDF, Word, Excel, PowerPoint, Text (Max 10MB)
          </p>
          {uploadingFiles.size > 0 && (
            <p className="text-xs text-blue-600 mt-2">
              Uploading {uploadingFiles.size} file(s)...
            </p>
          )}
        </div>

        {/* Uploaded Documents List */}
        {(currentScenario.documents?.length || 0) > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Uploaded Documents</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {currentScenario.documents?.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <div className="p-1 bg-blue-100 rounded">
                      <DocumentIcon type={doc.type} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{doc.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(doc.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDocument(doc.id);
                    }}
                    className="text-gray-400 hover:text-red-500"
                    title="Remove document"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-80">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-black">All Scenarios</h3>
            <button 
              onClick={() => {
                onAddScenario(currentScenario);
                onAddNew();
              }}
              className="flex items-center text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Scenario
            </button>
          </div>

          <div className="space-y-2">
            {scenarios.map((scenario) => (
              <div 
                key={scenario.id}
                className={`p-3 rounded border-l-4 cursor-pointer transition-colors ${
                  currentScenario.id === scenario.id 
                    ? 'bg-blue-50 border-blue-500' 
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => onScenarioSelect(scenario)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-black">{scenario.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Exercise: {scenario.exerciseTime}min | Reading: {scenario.readingTime}min
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onScenarioSelect(scenario);
                      }}
                      className={`p-1 rounded ${currentScenario.id === scenario.id ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-gray-500'}`}
                      title={currentScenario.id === scenario.id ? 'Editing this scenario' : 'Edit this scenario'}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this scenario? This action cannot be undone.')) {
                          onDeleteScenario(scenario.id);
                        }
                      }}
                      className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-gray-500"
                      title="Delete scenario"
                    >
                      <Trash2 className="w-3 h-3" />
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

// Component to display appropriate file icon based on file type
const DocumentIcon = ({ type }: { type: string }) => {
  if (type.includes('pdf')) {
    return <FileText className="h-4 w-4 text-red-500" />;
  } else if (type.includes('word') || type.includes('document')) {
    return <FileText className="h-4 w-4 text-blue-500" />;
  } else if (type.includes('spreadsheet') || type.includes('excel')) {
    return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
  } else if (type.includes('presentation') || type.includes('powerpoint')) {
    return <File className="h-4 w-4 text-orange-500" />;
  } else {
    return <File className="h-4 w-4 text-gray-500" />;
  }
};

export default ScenarioStep;