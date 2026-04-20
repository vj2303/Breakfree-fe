'use client';

import { CircleCheck, CircleX, Plus } from 'lucide-react';
import React, { useState, DragEvent, ChangeEvent } from 'react';
import Loader from './ui/Loader';
// import Papa from 'papaparse'; // Uncomment if using CSV parsing

interface UploadProps {
  onFileChange: (file: File) => void;
  uploadStatus: 'idle' | 'loading' | 'success' | 'error';
}

const Upload: React.FC<UploadProps> = ({ onFileChange, uploadStatus }) => {
  const [dragging, setDragging] = useState<boolean>(false);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    if (!file) return;

    // Uncomment and implement when needed:
    // setFileName(file.name);
    // setFilePreview(URL.createObjectURL(file));

    // Uncomment to use CSV parsing
    // if (file.name.endsWith('.csv')) {
    //   const reader = new FileReader();
    //   reader.onload = (event) => {
    //     const csvText = event.target?.result as string;
    //     const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    //     setCsvData(parsedData.data.slice(0, 5));
    //   };
    //   reader.readAsText(file);
    // } else {
    //   setCsvData(null);
    // }

    onFileChange(file);
  };

  const handleButtonClick = () => {
    const input = document.getElementById('fileInput') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  return (
    <div
      className={`flex items-center justify-center  h-[30vh] border-4 border-dashed rounded-lg ${
        dragging ? 'bg-gray-100' : 'bg-white'
      }`}
      onDragOver={handleDrag}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="text-center">
        {uploadStatus === 'loading' ? (
          <Loader />
        ) : uploadStatus === 'success' ? (
          <CircleCheck />
        ) : uploadStatus === 'error' ? (
          <CircleX />
        ) : (
          <Plus className="w-[32px] h-[32px] mx-auto" />
        )}
        <button
          className="text-blue-500 hover:underline mt-2"
          onClick={handleButtonClick}
        >
          browse
        </button>
        <input
          id="fileInput"
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default Upload;