import React, { useState, useEffect } from "react";

type EditablePopupProps = {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onSave: (updatedContent: string) => void;
};

const EditablePopup: React.FC<EditablePopupProps> = ({ isOpen, onClose, content, onSave }) => {
  const [editedContent, setEditedContent] = useState(content);

  // Update `editedContent` when `content` prop changes
  useEffect(() => {
    if (isOpen) {
      setEditedContent(content);
    }
  }, [content, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-[600px] p-6 rounded-lg shadow-lg relative">
        <button
          className="absolute top-4 right-8 text-gray-500 hover:text-gray-800"
          onClick={onClose}
        >
          Close
        </button>
        <h2 className="text-xl font-bold mb-4">Edit Response</h2>
        <textarea
          className="w-full h-[200px] p-4 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-300"
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
        ></textarea>
        <div className="flex justify-end gap-4 mt-4">
          <button
            className="bg-gray-300 text-gray-800 py-2 px-4 rounded hover:bg-gray-400"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            onClick={() => {
              onSave(editedContent);
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditablePopup;
