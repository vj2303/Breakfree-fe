'use client';

import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  setValue: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  setValue,
  min = 0,
  max = 10,
  step = 1,
}) => {
  return (
    <div className="mt-6">
      <label htmlFor={label.toLowerCase()} className="font-medium text-black block mb-2">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          id={label.toLowerCase()}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full accent-[#476181] cursor-pointer"
        />
        <span className="bg-[#476181] text-white px-3 py-1 rounded-lg text-sm">
          {value}
        </span>
      </div>
    </div>
  );
};

export default Slider;
