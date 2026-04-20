import React, { useState } from "react";
import { Edit2, Trash2 } from "lucide-react";
import Editor from "@/components/Editor";
import { useAuth } from "@/context/AuthContext";

interface Scenario {
  id: string | number; // Updated to match ScenarioType
  title: string;
  content: string;
  exerciseTime: number;
  readingTime: number;
  documents: { id: string; name: string; url: string; size: number; type: string }[];
}

interface ScenarioStepProps {
  scenarios: Scenario[];
  currentScenario: Scenario;
  setCurrentScenario: React.Dispatch<React.SetStateAction<Scenario>>;
  onScenarioSelect: (scenario: Scenario) => void;
  onAddNew: () => void;
  onAddScenario: (scenario: Scenario) => void;
  onDeleteScenario: (id: string | number) => void; // Updated to match the function signature
}

const ScenarioStep: React.FC<ScenarioStepProps> = ({
  scenarios,
  currentScenario,
  setCurrentScenario,
  onScenarioSelect,
  onAddNew,
  onAddScenario,
  onDeleteScenario
}) => {
  const { token } = useAuth();
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  const updateCurrentScenario = <K extends keyof Scenario>(field: K, value: Scenario[K]) => {
    setCurrentScenario((prev) => ({
      ...prev,
      [field]: value,
    }));
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
        formData.append('folder', 'inbox-activity-documents');

        // Upload file to server
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to upload file');
        }
        
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
      const currentContent = currentScenario.content || '';
      // Remove the file link from content (simple regex match)
      const linkPattern = new RegExp(`<p><a[^>]*>📎 ${docToRemove.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/a><\\/p>`, 'gi');
      const updatedContent = currentContent.replace(linkPattern, '');
      updateCurrentScenario('content', updatedContent);
    }
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

        <Editor
          content={currentScenario.content}
          onChange={(value) => updateCurrentScenario('content', value)}
        />

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2 text-black">Attach Documents</label>
          <div
            className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => document.getElementById('scenario-file-input')?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="text-gray-500 mb-2">📁</div>
            <p className="text-sm text-black">
              Click to choose files or <span className="text-blue-600 hover:underline">browse</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">or drag and drop files here</p>
            <input
              id="scenario-file-input"
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.csv"
              onChange={handleFileUpload}
            />
          </div>

          {uploadingFiles.size > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              Uploading {uploadingFiles.size} file{uploadingFiles.size > 1 ? 's' : ''}...
            </div>
          )}

          {(currentScenario.documents && currentScenario.documents.length > 0) && (
            <div className="mt-4 space-y-2">
              {currentScenario.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded bg-white">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-gray-500">📄</span>
                    <div className="flex-1">
                      <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline font-medium"
                      >
                        {doc.name}
                      </a>
                      <p className="text-xs text-gray-500">{Math.round(doc.size / 1024)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeDocument(doc.id)}
                    className="text-xs text-red-600 hover:underline px-2 py-1 hover:bg-red-50 rounded"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
                    {(scenario.exerciseTime > 0 || scenario.readingTime > 0) && (
                      <p className="text-xs text-gray-600 mt-1">
                        Exercise: {scenario.exerciseTime}min | Reading: {scenario.readingTime}min
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onScenarioSelect(scenario);
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Edit2 className="w-3 h-3 text-gray-500" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this scenario? This action cannot be undone.')) {
                          onDeleteScenario(scenario.id);
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

export default ScenarioStep;