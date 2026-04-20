'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
// Removed unused icons
import Loader from '@/components/ui/Loader';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import Popup from '@/components/Popup';
import FullScreenPopup from '@/components/FullScreenPopUp';
import EditablePopup from '@/components/EditablePopup';
// import ChatBox from './ChatBox';
// import MessengerInput from './MessengerInput';

type ChatMessage = {
  userName: string;
  message: string;
  img: string;
  isPrompt: boolean;
  isMarkdown: boolean;
};

interface ChatContainerProps {
  Feedback?: string;
}

export default function ChatContainer({ Feedback }: ChatContainerProps) {
  const [chats, setChats] = useState<ChatMessage[]>([]); // Stores chat messages
  const [loading, setLoading] = useState(false); // Loader for API response
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [fullScreenContent, setFullScreenContent] = useState('');
  const [isEditablePopupOpen, setIsEditablePopupOpen] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Add new user message & AI response to chat
  const handleAddPrompt = (message: string) => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      userName: 'You',
      message,
      img: '/dummyAvatar.jpg',
      isPrompt: true,
      isMarkdown: false,
    };

    setChats((prevChats) => [...prevChats, userMessage]);
    setLoading(true); // Show loader while fetching AI response

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        userName: 'AI Evaluator',
        message: `Here's an analysis for: **${message}** \n\n- AI-generated insights will appear here.`,
        img: '/logo.png',
        isPrompt: false,
        isMarkdown: true,
      };

      setChats((prevChats) => [...prevChats, aiResponse]);
      setLoading(false); // Hide loader once response is received
    }, 1500);
  };

  // Handle response download
  const handleDownloadResponse = async (response: string) => {
    try {
      const doc = new Document({
        sections: [
          {
            children: response.split('\n').map((line) => {
              return new Paragraph({
                children: [
                  new TextRun({
                    text: line.replace(/[*_`]/g, ''), // Strip Markdown characters
                    bold: line.startsWith('**'),
                    italics: line.startsWith('_'),
                    break: 1,
                  }),
                ],
              });
            }),
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, 'response.docx');
      console.log('Document created successfully');
    } catch (error) {
      console.error('Error generating the document:', error);
    }
  };

  // Handle copy response
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => console.log('Copied to clipboard successfully!'))
      .catch((error) => console.error('Failed to copy to clipboard:', error));
  };

  // Handle response editing
  const handleEditClick = (content: string, index: number) => {
    setEditableContent(content);
    setEditingIndex(index);
    setIsEditablePopupOpen(true);
  };

  // Handle saving edited response
  const handleSaveEdit = (updatedContent: string) => {
    if (editingIndex !== null) {
      const updatedChats = [...chats];
      updatedChats[editingIndex].message = updatedContent;
      setChats(updatedChats);
    }
  };

  // Handle sharing response
  const handleShareClick = (content: string) => {
    setFullScreenContent(content);
    setIsPopupOpen(true);
  };

  // Handle expanding response
  const handleExpandClick = (content: string) => {
    setFullScreenContent(content);
    setIsFullScreenOpen(true);
  };

  // useEffect(()=>{
  //   handleAddPrompt(Feedback)
  // }, [Feedback])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Chat Messages */}
      <div className="flex flex-col gap-[10px] mb-[40px] overflow-y-auto flex-1 px-[10px] py-[42px]">
  {/* Initial AI Evaluation Message */}
  {Feedback && (
    <div className="flex justify-start">
      <ChatBox
        userName="AI Evaluator"
        message={Feedback}
        img="/logo.png"
        isPrompt={false}
        isMarkdown={true} // Enable Markdown
        showActions={true} // Pass action buttons
        onDownload={handleDownloadResponse}
        onCopy={handleCopyToClipboard}
        onEdit={handleEditClick}
        onShare={handleShareClick}
        onExpand={handleExpandClick}
      />
    </div>
  )}

  {/* Render User & AI Chat Messages */}
  {chats.map((chat, index) => (
    <div key={index} className={chat.userName === 'AI Evaluator' ? "flex justify-start" : "flex justify-end ml-[500px]"}>
      <ChatBox
        userName={chat.userName}
        message={chat.message}
        img={chat.img}
        isPrompt={chat.isPrompt}
        isMarkdown={chat.isMarkdown}
        showActions={!chat.isPrompt} // Show actions only for AI messages
        onDownload={handleDownloadResponse}
        onCopy={handleCopyToClipboard}
        onEdit={handleEditClick}
        onShare={handleShareClick}
        onExpand={handleExpandClick}
        index={index}
      />
    </div>
  ))}

  {/* Show Loader While Waiting for AI Response */}
  {loading && <Loader />}
</div>


      {/* Chat Input Box */}
      <MessengerInput handleAddPrompt={handleAddPrompt} />

      {/* Popups */}
      <Popup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} content={fullScreenContent} />
      <FullScreenPopup isOpen={isFullScreenOpen} onClose={() => setIsFullScreenOpen(false)} content={fullScreenContent} />
      <EditablePopup isOpen={isEditablePopupOpen} onClose={() => setIsEditablePopupOpen(false)} content={editableContent} onSave={handleSaveEdit} />
    </div>
  );
}


interface ChatBoxProps {
  userName: string;
  message: string;
  img: string;
  isPrompt: boolean;
  isMarkdown: boolean;
  showActions?: boolean;
  onDownload?: (content: string) => void;
  onCopy?: (content: string) => void;
  onEdit?: (content: string, index: number) => void;
  onShare?: (content: string) => void;
  onExpand?: (content: string) => void;
  index?: number;
}

const ChatBox = ({ userName, message, img, isPrompt, isMarkdown }: ChatBoxProps) => {
  return (
    <div className={`flex items-start gap-[10px] p-[10px] rounded-[20px] ${isPrompt ? 'bg-[#ffffff] w-[60%] self-end' : ''}`}>
      <Image width={50} height={50} src={img} alt="user" className={isPrompt ? 'order-2 rounded-full flex-shrink-0' : 'rounded-full flex-shrink-0'} />
      <span className="min-w-0 flex-1">
        <p className="font-bold text-xl text-black">{userName}</p>
        {isMarkdown ? (
          <div className="overflow-x-auto text-black">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{message}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-[16px] break-words text-black">{message}</p>
        )}
      </span>
    </div>
  );
};



interface MessengerInputProps {
  handleAddPrompt: (message: string) => void;
}

const MessengerInput = ({ handleAddPrompt }: MessengerInputProps) => {
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    if (!message.trim()) return;
    handleAddPrompt(message);
    setMessage(''); // Clear input field after sending
  };

  return (
    <div className="absolute bottom-5 left-[40%] transform -translate-x-1/2 w-[50%]  z-10 bg-[#ffffff] border-[1px] border-gray-500 rounded-lg p-2 flex gap-2">
      <input
        type="text"
        className="outline-none flex-grow min-w-0 text-black"
        value={message}
        placeholder="Type your message here..."
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
      />
      <Button bg="dark-blue" text="white" size="sm" onClick={handleSendMessage}>
        <p className='text-black'>search</p>
      </Button>
    </div>
  );
};







