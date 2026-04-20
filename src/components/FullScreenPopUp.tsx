// components/FullScreenPopup.tsx
import React from "react";

type FullScreenPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  content: string;
};

const FullScreenPopup: React.FC<FullScreenPopupProps> = ({ isOpen, onClose, content }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-[800px] h-[90vh] overflow-y-auto p-6 rounded-lg shadow-lg animate-fade-in">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
          onClick={onClose}
        >
          Close
        </button>
        <h2 className="text-2xl font-bold mb-4">AI Response</h2>
        <p className="text-lg whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
};

export default FullScreenPopup;
