import React from "react";
import Image from "next/image";
import { Download } from "lucide-react";
import { jsPDF } from "jspdf";

type PopupProps = {
  isOpen: boolean;
  onClose: () => void;
  content: string; // AI response content
};

const Popup: React.FC<PopupProps> = ({ isOpen, onClose, content }) => {
  const handleDownloadPDF = () => {
    if (!content) {
      alert("No content available to export!");
      return;
    }

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height; // Height of a single page
    const pageWidth = doc.internal.pageSize.width; // Width of a single page
    const margin = 10; // Margin from the edges
    const lineHeight = 10; // Line height for text
    let cursorY = margin; // Tracks the current height of the content
    const lines = doc.splitTextToSize(content, pageWidth - 2 * margin); // Wrap text to fit page width

    lines.forEach((line: string) => {
      if (cursorY + lineHeight > pageHeight - margin) {
        doc.addPage(); // Add a new page if the content exceeds the current page
        cursorY = margin; // Reset cursor to the top of the new page
      }
      doc.text(line, margin, cursorY); // Add text line to the current position
      cursorY += lineHeight; // Move the cursor down
    });

    doc.save("response.pdf");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[300px] shadow-lg">
        <h2 className="text-xl font-bold mb-4">Share this content</h2>
        <div className="flex justify-between">
          <div className="flex flex-col">
            <Image 
              src="/evaluate.png" 
              alt="Evaluate" 
              width={50} 
              height={50}
            />
            <h2 className="text-black">Evaluate</h2>
          </div>
          <div className="flex flex-col">
            <h2
              className="text-black cursor-pointer"
              onClick={handleDownloadPDF}
            >
              <Download />
              Download
            </h2>
          </div>
        </div>
        <button
          className="mt-4 w-full text-gray-600 hover:text-gray-900"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default Popup;