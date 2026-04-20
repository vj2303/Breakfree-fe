"use client";
import { List } from "lucide-react";
import { Toggle } from "./Toogle";
import {
  Heading1,
  Heading2,
  Heading3,
  Code,
  Bold,
  Italic,
  Strikethrough,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Highlighter,
  Upload,
  Table2,
  Plus,
  Minus,
} from "lucide-react";
import { ListOrdered } from "lucide-react";
import { Editor } from "@tiptap/react";

// Define the props interface
interface ToolBarProps {
  editor: Editor | null;
}

export default function ToolBar({ editor }: ToolBarProps) {
  if (!editor) return null;

  // Function to add an image
  const addImage = () => {
    const url = window.prompt("URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  // Function to handle text size using inline styles
  const handleTextSize = (size: string) => {
    const selection = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(selection.from, selection.to);
    
    if (selectedText) {
      // If text is selected, wrap it in a span with font size
      editor.chain().focus().insertContent(`<span style="font-size: ${size}">${selectedText}</span>`).run();
    } else {
      // If no text selected, just insert a span that user can type into
      editor.chain().focus().insertContent(`<span style="font-size: ${size}">Text</span>`).run();
    }
  };

  // Function to handle document upload
  const handleDocumentUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt";
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const textContent = reader.result;
          if (typeof textContent === "string") {
            editor.chain().focus().insertContent(textContent).run();
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const Options = [
    {
      icon: <Heading1 className="size-4" />,
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      pressed: editor.isActive("heading", { level: 1 }),
    },
    {
      icon: <Heading2 className="size-4" />,
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      pressed: editor.isActive("heading", { level: 2 }),
    },
    {
      icon: <Heading3 className="size-4" />,
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      pressed: editor.isActive("heading", { level: 3 }),
    },
    {
      icon: <Bold className="size-4" />,
      onClick: () => editor.chain().focus().toggleBold().run(),
      pressed: editor.isActive("bold"),
    },
    {
      icon: <Italic className="size-4" />,
      onClick: () => editor.chain().focus().toggleItalic().run(),
      pressed: editor.isActive("italic"),
    },
    {
      icon: <Strikethrough className="size-4" />,
      onClick: () => editor.chain().focus().toggleStrike().run(),
      pressed: editor.isActive("strike"),
    },
    {
      icon: <AlignLeft className="size-4" />,
      onClick: () => editor.chain().focus().setTextAlign("left").run(),
      pressed: editor.isActive({ textAlign: "left" }),
    },
    {
      icon: <AlignCenter className="size-4" />,
      onClick: () => editor.chain().focus().setTextAlign("center").run(),
      pressed: editor.isActive({ textAlign: "center" }),
    },
    {
      icon: <AlignRight className="size-4" />,
      onClick: () => editor.chain().focus().setTextAlign("right").run(),
      pressed: editor.isActive({ textAlign: "right" }),
    },
    {
      icon: <List className="size-4" />,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      pressed: editor.isActive("bulletList"),
    },
    {
      icon: <ListOrdered className="size-4" />,
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      pressed: editor.isActive("orderedList"),
    },
    // Table buttons - only show if table extension is available
    ...(function() {
      try {
        // Check if table commands are available by trying to access them
        const testCommand = editor.can().insertTable;
        if (testCommand !== undefined) {
          return [
            {
              icon: <Table2 className="size-4" />,
              onClick: () => {
                try {
                  if (editor.isActive("table")) {
                    editor.chain().focus().deleteTable().run();
                  } else {
                    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                  }
                } catch (e) {
                  console.warn("Table extension not available");
                }
              },
              pressed: editor.isActive("table"),
            },
            {
              icon: <Plus className="size-4" />,
              onClick: () => {
                try {
                  if (editor.isActive("table")) {
                    editor.chain().focus().addColumnAfter().run();
                  }
                } catch (e) {
                  console.warn("Table extension not available");
                }
              },
              pressed: false,
            },
            {
              icon: <Minus className="size-4" />,
              onClick: () => {
                try {
                  if (editor.isActive("table")) {
                    editor.chain().focus().deleteColumn().run();
                  }
                } catch (e) {
                  console.warn("Table extension not available");
                }
              },
              pressed: false,
            },
          ];
        }
      } catch (e) {
        // Table extension not available
      }
      return [];
    })(),
    {
      icon: <Code className="size-4" />,
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
      pressed: editor.isActive("code"),
    },
    {
      icon: <Highlighter className="size-4" />,
      onClick: () => editor.chain().focus().toggleHighlight().run(),
      pressed: editor.isActive("highlight"),
    },
    {
      icon: <Upload className="size-4" />,
      onClick: () => addImage(),
      pressed: editor.isActive("image"),
    },
    // Text Size Options - Using inline styles
    {
      icon: <span style={{ fontSize: "14px" }}>S</span>,
      onClick: () => handleTextSize("14px"),
      pressed: false,
    },
    {
      icon: <span style={{ fontSize: "18px" }}>M</span>,
      onClick: () => handleTextSize("18px"),
      pressed: false,
    },
    {
      icon: <span style={{ fontSize: "24px" }}>L</span>,
      onClick: () => handleTextSize("24px"),
      pressed: false,
    },
    // Document Upload Option
    {
      icon: <Upload className="size-4" />,
      onClick: () => handleDocumentUpload(),
      pressed: false,
    },
  ];

  return (
    <div className="border rounded-md p-1.5 mb-1 bg-[#ffffff] text-black space-x-1 sticky top-10 z-50">
      {Options.map((option, i) => (
        <Toggle
          key={i}
          size="sm"
          pressed={option.pressed}
          onPressedChange={option.onClick}
        >
          {option.icon}
        </Toggle>
      ))}
    </div>
  );
}



