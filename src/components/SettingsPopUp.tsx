"use client";

import React, { useState } from "react";
import Slider from "./Slider";

interface SettingsPopUpProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPopUp: React.FC<SettingsPopUpProps> = ({ isOpen, onClose }) => {
  const [temperature, setTemperature] = useState(5);
  const [selectedModel, setSelectedModel] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black-20 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[400px]">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl text-black text-center font-bold">Settings</h2>
          <button onClick={onClose} className="text-gray-600">
            ✕
          </button>
        </div>

        {/* Dropdown for Model Selection */}
        <div className="mt-4">
          <label htmlFor="model" className="font-medium text-black block mb-2">
            Select Model
          </label>
          <select
            id="model"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 ease-in-out"
          >
            <option value="" disabled>
              Select Type
            </option>
            <option value="gpt-4">GPT 4.0</option>
            <option value="gpt-3">GPT 3.0</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>

        {/* Temperature Slider */}
        <div className="mt-6">
          <Slider label="Temperature" value={temperature} setValue={setTemperature} />
        </div>

        {/* Done Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="bg-dark-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPopUp;