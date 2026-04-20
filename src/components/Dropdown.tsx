"use client";
import { ChevronDown, ChevronUp } from "lucide-react";
import React, { ReactNode, useState } from "react";

interface Option {
  label: string;
  value: string | number;
}

interface DropdownProps {
  name: string;
  label: string;
  options: Option[];
  isHorizontal?: boolean;
  img?: ReactNode;
  onChange: (name: string, value: string | number) => void;
}

const Dropdown: React.FC<DropdownProps> = ({
  name,
  label,
  options,
  isHorizontal = false,
  img,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Option | null>(null);

  const handleChange = (name: string, option: Option) => {
    onChange(name, option.value);
    setSelected(option);
    setIsOpen(false);
  };

  return (
    <div className="relative flex flex-col flex-1 border-2 rounded-lg bg-[#ffffff] min-w-[200px] p-4 hover:border-[rgb(0,255,255)]">
      {/* Header Section */}
      <span
        className={`${
          isHorizontal ? "flex items-center gap-[20px]" : "flex flex-col gap-[50px]"
        } cursor-pointer`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {img}
        <span className="flex justify-between items-center w-full font-semibold">
          <p className="w-max text-black">{selected?.label || label}</p>
          {isOpen ? <ChevronUp /> : <ChevronDown />}
        </span>
      </span>

      {/* Dropdown List */}
      {isOpen && (
        <ul
          className="absolute left-0 top-full mt-2 w-full max-h-[160px] overflow-y-auto bg-white border rounded-lg shadow-lg z-50"
          style={{
            transition: "opacity 0.3s ease, transform 0.3s ease",
          }}
        >
          {options.map((option) => (
            <li
              key={option.value}
              className="p-2 cursor-pointer transition-all text-[#000] duration-200 ease-in-out hover:scale-105 hover:font-semibold"
              onClick={() => handleChange(name, option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dropdown;
