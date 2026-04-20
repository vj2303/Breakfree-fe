'use client'
import Button from '@/components/ui/Button';
import { ArrowDownToLine, Copy, Pencil, Share2, Expand, ArrowUp } from 'lucide-react';
import Loader from '@/components/ui/Loader';
import axios from 'axios';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from "docx";
import Popup from '@/components/Popup'
import FullScreenPopup from '@/components/FullScreenPopUp';
import EditablePopup from '@/components/EditablePopup';
// import { Tooltip } from 'react-tooltip';

type ChatBoxProps = {
  userName: string;
  img: string;
  message: string;
  isPrompt: boolean | undefined;
  isMarkdown: boolean | undefined;
};

type Chat = {
  prompt: string;
  response: string;
};


type MessengerInputProps = {
  handleAddPrompt: (text: string) => void;
};

export default function ChatContainer({ selectedPrompt }: { selectedPrompt: string }) {
  const [chat, setChat] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [fullScreenContent, setFullScreenContent] = useState("");
  const [isEditablePopupOpen, setIsEditablePopupOpen] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "auto",
    });
  }, [chat]);

  useEffect(() => {
    // This will trigger the API call whenever `selectedPrompt` changes
    if (selectedPrompt) {
      handleAddPrompt(selectedPrompt, true);
    }
  }, [selectedPrompt]); // Added `selectedPrompt` as a dependency to the effect


  const handleAddPrompt = async (text: string, isFirst?: boolean) => {
    console.log("Sending prompt to API:", text);

    if (isFirst) {
      setChat(() => [{ prompt: text, response: "" }]);
    } else {
      setChat((prevChat) => [...prevChat, { prompt: text, response: "" }]);
    }

    // Add user's prompt to chat first
    setLoading(true);

    try {
      // API call to /chat endpoint
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/chat`,
        { user_input: text },  // API expects { "user_input": "string" }
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      console.log("API Response:", res.data);

      // Correcting the way we extract response from the API
      if (res.data && res.data.response) {
        setChat((prevChat) => [
          ...prevChat.slice(0, -1), // Remove last empty response
          { prompt: text, response: res.data.response }, // Store actual API response
        ]);
      } else {
        console.error("Error: API response is missing expected data.");
        setChat((prevChat) => [
          ...prevChat.slice(0, -1),
          { prompt: text, response: "Could not load response" },
        ]);
      }
    } catch (error) {
      console.error("Error generating response:", error);
      setChat((prevChat) => [
        ...prevChat.slice(0, -1),
        { prompt: text, response: "Could not load response" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadResponse = async (response: string) => {
    try {
      const doc = new Document({
        sections: [
          {
            children: response.split("\n").map((line) => {
              return new Paragraph({
                children: [
                  new TextRun({
                    text: line.replace(/[*_`]/g, ""), // Strip Markdown characters
                    bold: line.startsWith("**"),
                    italics: line.startsWith("_"),
                    break: 1,
                  }),
                ],
              });
            }),
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, "response.docx");
      console.log("Document created successfully");
    } catch (error) {
      console.error("Error generating the document:", error);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    // Remove Markdown syntax using regex
    const plainText = text
      .replace(/(\*\*|__)(.*?)\1/g, "$2") // Bold
      .replace(/(\*|_)(.*?)\1/g, "$2") // Italic
      .replace(/`(.*?)`/g, "$1") // Inline code
      .replace(/~~(.*?)~~/g, "$1") // Strikethrough
      .replace(/#+\s/g, "") // Headers
      .replace(/\[(.*?)\]\(.*?\)/g, "$1") // Links
      .replace(/!\[(.*?)\]\(.*?\)/g, "$1") // Images
      .replace(/>\s/g, "") // Blockquotes
      .replace(/\n/g, " ") // Newlines
      .trim();

    navigator.clipboard.writeText(plainText)
      .then(() => {
        console.log("Copied to clipboard successfully!");
      })
      .catch((error) => {
        console.error("Failed to copy to clipboard:", error);
      });
  };

  const handleEditClick = (content: string, index: number) => {
    setEditableContent(content);
    setEditingIndex(index);
    setIsEditablePopupOpen(true);
  };

  const handleSaveEdit = (updatedContent: string) => {
    if (editingIndex !== null) {
      const updatedChat = [...chat];
      updatedChat[editingIndex].response = updatedContent;
      setChat(updatedChat);
    }
  };

  const handleShareClick = (content: string) => {
    setFullScreenContent(content); // Set the content to be shared
    setIsPopupOpen(true); // Open the popup
  };

  return (
    <div className="max-w-[1200px] mt-[100px] bg-[#F9FBFF] mx-auto py-[42px] px-[10px]">
      {chat.map((ele, i) => (
        <div key={i} className="flex flex-col gap-[30px] mb-[90px]">

          {/* User's prompt */}
          <ChatBox message={ele.prompt} userName={'User'} img={'/dummyAvatar.jpg'} isPrompt={true} isMarkdown={false} />

          {/* AI's response */}
          <ChatBox message={ele.response} userName={'AI response'} img={'/logo.png'} isPrompt={false} isMarkdown={true} />

          {ele.response && (
            <div className="flex ml-1 gap-2 pb-[100px]">
              <ArrowDownToLine
                className="cursor-pointer text-[#A7A1A1] bg-[#F8FAFF] p-1"
                data-tooltip-id="download-tooltip"
                data-tooltip-content="Download"
                onClick={() => handleDownloadResponse(ele.response.toString())}
              />
              {/* <Tooltip id="download-tooltip" /> */}

              <Copy
                className="cursor-pointer bg-[#F8FAFF] p-1 rounded-md text-[#A7A1A1]"
                data-tooltip-id="copy-tooltip"
                data-tooltip-content="Copy"
                onClick={() => handleCopyToClipboard(ele.response.toString())}
              />
              {/* <Tooltip id="copy-tooltip" /> */}

              <Pencil
                className="cursor-pointer bg-[#F8FAFF] p-1 rounded-md text-[#A7A1A1]"
                data-tooltip-id="edit-tooltip"
                data-tooltip-content="Edit"
                onClick={() => handleEditClick(ele.response.toString(), i)}
              />
              {/* <Tooltip id="edit-tooltip" /> */}

              <Share2
                className="cursor-pointer bg-[#F8FAFF] p-1 rounded-md text-[#A7A1A1]"
                data-tooltip-id="share-tooltip"
                data-tooltip-content="Share"
                onClick={() => handleShareClick(ele.response.toString())}
              />
              {/* <Tooltip id="share-tooltip" /> */}

              <Expand
                className="cursor-pointer bg-[#F8FAFF] p-1 rounded-md text-[#A7A1A1]"
                data-tooltip-id="expand-tooltip"
                data-tooltip-content="Expand"
                onClick={() => {
                  setFullScreenContent(ele.response.toString());
                  setIsFullScreenOpen(true);
                }}
              />
              {/* <Tooltip id="expand-tooltip" /> */}
            </div>
          )}

        </div>
      ))}
      {loading && <Loader />}
      <MessengerInput handleAddPrompt={handleAddPrompt} />
      <Popup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        content={fullScreenContent} // Pass the response content here
      />

      <FullScreenPopup isOpen={isFullScreenOpen} onClose={() => setIsFullScreenOpen(false)} content={fullScreenContent} />
      <EditablePopup
        isOpen={isEditablePopupOpen}
        onClose={() => setIsEditablePopupOpen(false)}
        content={editableContent}
        onSave={handleSaveEdit}
      />
    </div>
  );
}

const ChatBox = ({ userName, message, img, isPrompt, isMarkdown }: ChatBoxProps) => {
  return (
    <div className={`flex items-start gap-[10px] p-[10px] rounded-[20px] ${isPrompt ? "bg-[#ffffff] w-[80%] self-end" : ""}`}>
      <Image width={50} height={50} src={img.toString()} alt="user" className={isPrompt ? "order-2 rounded-full" : "rounded-full"} />
      <span>
        <p className="font-bold text-xl text-[#233141]">{userName}</p>
        {isMarkdown ? (
          <div className="text-[#233141]">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{message.toString()}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-[16px] text-[#233141]">{message}</p>
        )}
      </span>
    </div>
  );
};

const MessengerInput = ({ handleAddPrompt }: MessengerInputProps) => {
  const [message, setMessage] = useState("");

  const handleAskGemini = () => {
    setMessage("");
    handleAddPrompt(message);
  };

  return (
    <label htmlFor="messenger" className='border-[1px] border-gray-300  rounded-xl p-2 flex gap-2 fixed bottom-5 w-[80%] z-10 bg-[#ffffff] '>
      <input
        type="text"
        name='messenger'
        id='messenger'
        className='outline-none flex-grow text-[#233141] placeholder:text-gray-500'
        value={message}
        placeholder='Type your text here'
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button bg={"dark-blue"} text='white' size={"sm"} onClick={handleAskGemini}>
        {/* <Image width={20} height={20} alt='send' src={"/Vector.png"} /> */}
        <ArrowUp size={20} color='#000' />
      </Button>

    </label>
  );
};