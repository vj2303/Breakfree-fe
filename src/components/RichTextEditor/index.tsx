"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import ToolBar from "./ToolBar";
import Heading from "@tiptap/extension-heading";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import { useEffect, useRef } from "react";

// Table extensions - import if available
// Note: Install these packages: @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

// Define the props interface
interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

// Function to parse markdown table and convert to HTML table
function parseMarkdownTable(markdown: string): string | null {
  const lines = markdown.trim().split('\n').map(line => line.trim()).filter(line => line);
  
  // Check if this looks like a markdown table (contains | separators)
  if (!lines.some(line => line.includes('|'))) {
    return null;
  }
  
  // Need at least 2 lines (header + separator or header + data)
  if (lines.length < 2) {
    return null;
  }
  
  // Parse all rows, filtering out separator rows
  const parsedRows: string[][] = [];
  
  for (const line of lines) {
    // Split by | and clean up cells
    const cells = line.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0); // Remove empty cells at start/end
    
    // Check if this is a separator row (all cells are dashes/colons)
    const isSeparator = cells.length > 0 && cells.every(cell => /^:?-+:?$/.test(cell));
    
    if (!isSeparator && cells.length > 0) {
      parsedRows.push(cells);
    }
  }
  
  if (parsedRows.length === 0) {
    return null;
  }
  
  // First row is header
  const headerRow = parsedRows[0];
  const dataRows = parsedRows.slice(1);
  
  // Determine number of columns (use max across all rows)
  const numCols = Math.max(
    headerRow.length,
    ...dataRows.map(row => row.length)
  );
  
  // Helper function to process cell content
  const processCell = (cell: string, isHeader: boolean = false): string => {
    if (!cell) return '';
    
    // Convert markdown bold (**text**) to HTML strong
    let processed = cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Preserve existing <br> tags (they might already be in the markdown)
    processed = processed.replace(/<br\s*\/?>/gi, '<br>');
    
    // Convert line breaks in markdown to <br> if not already present
    processed = processed.replace(/\n/g, '<br>');
    
    return processed;
  };
  
  // Build HTML table
  let html = '<table>';
  
  // Add header row
  html += '<thead><tr>';
  for (let i = 0; i < numCols; i++) {
    const cellContent = processCell(headerRow[i] || '', true);
    html += `<th>${cellContent}</th>`;
  }
  html += '</tr></thead>';
  
  // Add body rows
  html += '<tbody>';
  dataRows.forEach(row => {
    html += '<tr>';
    for (let i = 0; i < numCols; i++) {
      const cellContent = processCell(row[i] || '');
      html += `<td>${cellContent}</td>`;
    }
    html += '</tr>';
  });
  html += '</tbody>';
  
  html += '</table>';
  return html;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editorRef = useRef<any>(null);
  
  const extensions: any[] = [
    StarterKit,
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    Heading.configure({
      levels: [1, 2, 3],
    }),
    OrderedList.configure({
      HTMLAttributes: {
        class: "list-decimal ml-3",
      },
    }),
    BulletList.configure({
      HTMLAttributes: {
        class: "list-disc ml-3",
      },
    }),
    Highlight,
    Image.configure({
      inline: true,
    }),
  ];

  // Add table extensions if available
  if (Table && TableRow && TableCell && TableHeader) {
    extensions.push(
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "border-collapse border border-gray-400",
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: "border border-gray-400",
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: "border border-gray-400 bg-gray-100 font-semibold p-2",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-gray-400 p-2",
        },
      })
    );
  }

  const editor = useEditor({
    extensions,
    content: content,
    editorProps: {
      attributes: {
        class: "min-h-[200px] border rounded-md bg-[#ffffff] py-2 px-3 text-black prose prose-sm max-w-none [&_table]:border-collapse [&_table]:w-full [&_table]:border [&_table]:border-gray-400 [&_table_td]:border [&_table_td]:border-gray-400 [&_table_td]:p-2 [&_table_th]:border [&_table_th]:border-gray-400 [&_table_th]:p-2 [&_table_th]:bg-gray-100 [&_table_th]:font-semibold",
      },
      handlePaste: (view, event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;
        
        const text = clipboardData.getData('text/plain');
        
        // Check if pasted text is a markdown table
        const htmlTable = parseMarkdownTable(text);
        
        if (htmlTable && Table && editorRef.current) {
          // Prevent default paste
          event.preventDefault();
          
          // Directly insert the HTML table - Tiptap will parse it
          try {
            editorRef.current
              .chain()
              .focus()
              .insertContent(htmlTable)
              .run();
            
            return true;
          } catch (e) {
            console.warn('Error inserting table:', e);
            // Fall through to default paste behavior
          }
        }
        
        // Default paste behavior for non-table content
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      console.log(editor.getHTML());
      onChange(editor.getHTML());
    },
  });

  // Store editor in ref for paste handler
  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div>
      <ToolBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}