import React from 'react';

const RecentContentCard = () => {
  // Array of dummy texts
  const dummyTexts = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."
  ];

  return (
    <div className="flex flex-wrap gap-4">
      {dummyTexts.map((text, index) => (
        <div
          key={index}
          className="bg-white px-4 max-w-[31%] pr-[38px] pl-[22px] pt-[42px] pb-[26px] rounded-xl  shadow-md"
        >
          <p className="text-center">{text}</p>
        </div>
      ))}
    </div>
  );
};

export default RecentContentCard;






