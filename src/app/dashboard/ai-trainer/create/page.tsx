"use client";
import React, { useState } from "react";
import CreateContainer from "./CreateContainer";
import Responses from "./ResponsesContainer";
import ChatContainer from "./ChatContainer";
import axios from "axios";

type Prompt = {
  content_type: string;
  audience_type: string;
  delivery_method: string;
  content_theme: string;
  target_industry: string;
};

type PromptResponse = {
  summary: string;
};

// Define the API response structure
type ApiResponse = {
  prompts: Record<string, string>[];
};

// Define the structure for prompt data
type PromptData = Prompt;

const Page = () => {
  const [currentPage, setCurrentPage] = useState<string>("create");
  const [prompts, setPrompts] = useState<PromptResponse[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<Prompt>({
    content_type: "",
    audience_type: "",
    delivery_method: "",
    content_theme: "",
    target_industry: "",
  });

  // Handle dropdown changes - Updated to accept string | number
  const handleChange = (name: string, value: string | number) => {
    setPrompt({ ...prompt, [name]: String(value) }); // Convert to string
  };

  // API Call to Fetch Prompts
  const handleGetPrompts = async (data?: PromptData) => {
    setIsLoading(true);
    setCurrentPage("res");

    try {
      const res = await axios.post<ApiResponse>(
        `${process.env.NEXT_PUBLIC_BASE_URL}/generate-prompts`,
        data || prompt,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      console.log("API Response:", res.data); // Debugging API response

      // Process and format response
      if (res.data && res.data.prompts) {
        const formattedPrompts = res.data.prompts.map((item: Record<string, string>, index: number) => {
          const summaryKey = `summary${index + 1}`;
          return {
            summary: item[summaryKey] || "No summary available",
          };
        });

        setPrompts(formattedPrompts);
      } else {
        setPrompts([]);
        alert("No valid prompts received from the API");
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
      alert("Could not generate responses");
      setPrompts([]);
      setCurrentPage("create");
    } finally {
      setIsLoading(false);
    }
  };

  // Wrapper function for CreateContainer that matches expected signature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleGetPromptsFromCreate = (_promptString: string) => {
    // Since CreateContainer passes a string but we need to use current prompt state,
    // we'll ignore the string parameter and use the current prompt state
    handleGetPrompts(prompt);
  };

  // Handle selecting a prompt
  const handleSelectPrompt = (selected: string) => {
    setSelectedPrompt(selected);
    setCurrentPage("chat");
  };

  return (
    <div className="h-full">
      {currentPage === "create" ? (
        <CreateContainer
          handleGetPrompts={handleGetPromptsFromCreate} // Use wrapper function
          prompt={prompt}
          handleChange={handleChange}
        />
      ) : currentPage === "res" ? (
        <Responses
          prompts={prompts}
          handleSelectPrompt={handleSelectPrompt}
          isLoading={isLoading}
          prompt={prompt}
          handleChange={handleChange}
          handleGetPrompts={handleGetPrompts}
        />
      ) : currentPage === "chat" && selectedPrompt ? (
        <ChatContainer selectedPrompt={selectedPrompt} />
      ) : null}
    </div>
  );
};

export default Page;