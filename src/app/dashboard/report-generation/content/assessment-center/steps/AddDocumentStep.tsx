import React, { useEffect, useRef, useState } from "react";
import { useAssessmentForm } from '../create/context';
import { Trash2, UploadCloud, FileText } from "lucide-react";

// Define a type for uploaded files
type UploadedFile = {
  name: string;
  size: number;
  url: string;
  // When editing, an existing documentUrl will not have a File instance
  file?: File;
};

const AddDocumentStep = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialMount = useRef(true);
  const context = useAssessmentForm();
  if (!context) {
    throw new Error('AddDocumentStep must be used within AssessmentFormContext');
  }
  const { updateFormData, formData } = context;

  // Initialise from existing formData.document or an existing documentUrl (edit mode)
  const [files, setFiles] = useState<UploadedFile[]>(() => {
    if (formData.document) {
      return [{
        name: formData.document.name,
        size: formData.document.size,
        url: URL.createObjectURL(formData.document),
        file: formData.document,
      }];
    }
    if (formData.existingDocumentUrl) {
      return [{
        name: 'Existing document',
        size: 0,
        url: formData.existingDocumentUrl,
      }];
    }
    return [];
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
        file,
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files).map(file => ({
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
        file,
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  useEffect(() => {
    // Skip on initial mount — avoids clearing a document that was already set in context
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const file = files[0]?.file || null;
    updateFormData('document', file);
    try {
      console.log('[Assessment Center][AddDocument] document:', file ? { name: file.name, size: file.size } : null);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // Log when step is saved/next is clicked
  useEffect(() => {
    const handleStepSave = () => {
      try {
        const file = files[0]?.file || null;
        console.log('=== ADD DOCUMENT STEP SAVED ===');
        console.log('Current document:', file ? { name: file.name, size: file.size, type: file.type } : null);
        console.log('Files count:', files.length);
        console.log('Step validation:', {
          hasDocument: file !== null,
          documentName: file?.name || 'None',
          documentSize: file?.size || 0,
          documentType: file?.type || 'None'
        });
      } catch {}
    };

    // Listen for step save events
    window.addEventListener('step-save', handleStepSave);
    return () => window.removeEventListener('step-save', handleStepSave);
  }, [files]);

  const handleDelete = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const formatSize = (size: number) => {
    if (!size) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold text-black">Add Document</h2>
        <span className="text-black text-lg font-bold">?</span>
      </div>
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition mb-2 bg-white"
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        <UploadCloud className="w-10 h-10 text-gray-400 mb-2" />
        <span className="text-lg text-gray-700">Click to choose files or <span className="text-blue-700 underline">browse</span></span>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx"
        />
      </div>
      <div className="text-gray-400 text-sm mb-6">Add Document in Pdf, or Word Doc</div>
      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-black mb-4">Added Document</h3>
          <div className="bg-white border rounded-xl p-4 flex items-center gap-4 max-w-lg">
            <FileText className="w-8 h-8 text-gray-400" />
            <div className="flex-1">
              <div className="font-semibold text-black">{files[0].name}</div>
              {files[0].size > 0 && (
                <div className="text-gray-500 text-xs">{formatSize(files[0].size)}</div>
              )}
              <a
                href={files[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 text-sm underline mt-1 block"
              >
                Click to view
              </a>
            </div>
            <button
              className="text-red-500 hover:bg-red-50 rounded p-2"
              onClick={() => handleDelete(0)}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddDocumentStep;