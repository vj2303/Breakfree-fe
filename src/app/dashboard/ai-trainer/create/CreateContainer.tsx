"use client";

import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import Header from './Header';
import Dropdown from '@/components/Dropdown';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import SettingsPopUp from '@/components/SettingsPopUp';
import {
  audienceTypeOptions,
  contentTypeOptions,
  deliveryMethodOptions,
  outputTypeOptions,
  industryTypeOptions
} from '@/constants/options';

// Define the Prompt type to match what's being passed from the parent
type Prompt = {
  content_type: string;
  audience_type: string;
  delivery_method: string;
  content_theme: string;
  target_industry: string;
};

interface CreateContainerProps {
  handleGetPrompts: (prompt: string) => void;
  prompt: Prompt; // Changed from string to Prompt object
  handleChange: (name: string, value: string | number) => void;
}

const CreateContainer: React.FC<CreateContainerProps> = ({ 
  handleGetPrompts, 
  prompt, 
  handleChange 
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const toggleSettingsModal = () => {
    setIsSettingsOpen((prev) => !prev);
  };

  // Convert the prompt object to a string when calling handleGetPrompts
  const handleGenerateClick = () => {
    const promptString = JSON.stringify(prompt);
    handleGetPrompts(promptString);
  };

  return (
    <>
      <div className="flex flex-col items-center gap-[32px] max-w-[1300px] mx-auto h-full overflow-y-auto px-4 py-6">
        <button onClick={toggleSettingsModal} className='flex items-center justify-center self-end mb-4  text-white p-2 rounded-lg '>
            <SlidersHorizontal size={30} className='text-black cursor-pointer' />
          </button>
        <div className="items-center justify-center flex">
          <Header />
       
        </div>
        <div className="flex items-start gap-[20px] flex-wrap w-full">
          {/* Dropdowns */}
          <Dropdown
              img={<Image src="/Icons/typeOfContentIcon.png" alt="Type of Content Icon" width={32} height={32} />}
              options={contentTypeOptions}
              name="content_type"
              label="Type Of Content"
              onChange={handleChange}
            />

          <Dropdown
            img={<Image src="/Icons/typeOfAudience.png" alt="Type of Audience Icon" width={32} height={32} />}
            options={audienceTypeOptions}
            name="audience_type"
            label="Type Of Audience"
            onChange={handleChange}
          />
          <Dropdown
            img={<Image src="/Icons/DeliveryMethod.png" alt="Delivery Method Icon" width={32} height={32} />}
            options={deliveryMethodOptions}
            name="delivery_method"
            label="Delivery Method"
            onChange={handleChange}
          />
          <Dropdown
            img={<Image src="/Icons/ContentTheme.png" alt="Content Theme Icon" width={32} height={32} />}
            options={outputTypeOptions}
            name="content_theme"
            label="Content Theme"
            onChange={handleChange}
          />
          <Dropdown
            img={<Image src="/Icons/Icons.png" alt="Target Industry Icon" width={32} height={32} />}
            options={industryTypeOptions}
            name="target_industry"
            label="Target Industry"
            onChange={handleChange}
          />
        </div>
        {/* Generate Button */}
        <div className="mt-[10px]">
          <Button
            bg={"dark-bg"}
            text="white"
            onClick={handleGenerateClick} // Use the new handler
          >
            Generate
            <Image
              src={"/Vector.png"}
              alt="star"
              width={20}
              height={20}
              className="hover:brightness-150"
            />
          </Button>
        </div>
      </div>

      {/* Settings PopUp */}
      <SettingsPopUp isOpen={isSettingsOpen} onClose={toggleSettingsModal} />
    </>
  );
};

export default CreateContainer;