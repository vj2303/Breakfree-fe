'use client';
import React from 'react';
import { cva } from 'class-variance-authority';

type ButtonProps = {
  bg: "transparent" | "dark-blue" | "light-blue" | "white" | "dark-bg";
  text?: "white" | "gray" | "black";
  size?: "sm" | "md" | "lg";
  type?: "submit" | "reset" | "button";
  onClick: () => void;
  border?: string;
  children?: React.ReactNode;
  disabled?: boolean; // ← Add this line
};

const Button = ({ bg, text, size, type, onClick, border, children, ...props }: ButtonProps) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`${buttonVariants({ bg, text, size })} ${border || 'border border-gray-300'}`} // Use custom border if provided, otherwise use default
      {...props}
    >
      {children}
    </button>
  );
};

const buttonVariants = cva(
  "flex items-center justify-center gap-[10px] font-bold text-[17px] py-[10px] px-[24px] cursor-pointer rounded-full transition-all duration-200",
  {
    variants: {
      text: {
        white: "text-white",
        gray: "text-gray-500",
        black: "text-black"
      },
      size: {
        sm: "px-[24px]",
        md: "px-[30px]",
        lg: "px-[50px]"
      },
      bg: {
        transparent: "bg-transparent",
        "dark-blue": "bg-steel-blue",
        "light-blue": "bg-dusk-blue",
        white: "bg-white",
        "dark-bg": "bg-[#233141]"
      }
    },
    defaultVariants: {
      text: "gray",
      bg: "transparent",
      size: "md"
    }
  }
);

export default Button;