// app/page.tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';
import {AlertCircle, Download, Wand2, X} from 'lucide-react';
import ReactMarkdown from "react-markdown";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import remarkGfm from 'remark-gfm';


interface Block {
    id: string;
    type: 'paragraph';
    content: string;
    metadata?: Record<string, unknown>;
}

interface DocumentState {
    blocks: Block[];
}

interface Selection {
    startBlockId: string | null;
    endBlockId: string | null;
    startOffset: number;
    endOffset: number;
    selectedText: string;
    hasSelection: boolean;
}
interface DocRenderProps {
    documentBlocks: Block[];
    setDocumentBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
}

export default function DocRender({ documentBlocks, setDocumentBlocks }: DocRenderProps) {
    const [documentState, setDocumentState] = useState<DocumentState>({
        blocks: documentBlocks || [] // Add fallback to empty array
    });

// Sync with parent component
    useEffect(() => {
        setDocumentState({ blocks: documentBlocks || [] }); // Add fallback here too
    }, [documentBlocks]);

    const [selection, setSelection] = useState<Selection>({
        startBlockId: null,
        endBlockId: null,
        startOffset: 0,
        endOffset: 0,
        selectedText: '',
        hasSelection: false
    });

    const [aiCommand, setAiCommand] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCommandBox, setShowCommandBox] = useState(false);
    const [error, setError] = useState('');

    const documentRef = useRef<HTMLDivElement>(null);

    // Handle text selection
    const handleMouseUp = () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        const selectedText = sel.toString().trim();
        if (!selectedText) {
            setShowCommandBox(false);
            setSelection(prev => ({ ...prev, hasSelection: false }));
            return;
        }

        const range = sel.getRangeAt(0);

        // Find which blocks are involved
        let startBlock = range.startContainer as HTMLElement;
        let endBlock = range.endContainer as HTMLElement;

        // Traverse up to find the block element
        while (startBlock && !(startBlock as HTMLElement).dataset?.blockId) {
            startBlock = startBlock.parentElement as HTMLElement;
        }
        while (endBlock && !(endBlock as HTMLElement).dataset?.blockId) {
            endBlock = endBlock.parentElement as HTMLElement;
        }

        if (!(startBlock as HTMLElement)?.dataset?.blockId || !(endBlock as HTMLElement)?.dataset?.blockId) return;

        // Calculate offsets within the block
        const startBlockId = (startBlock as HTMLElement).dataset.blockId!;
        const endBlockId = (endBlock as HTMLElement).dataset.blockId!;

        // For simplicity, we'll get the text content and find offsets
        const startBlockContent = documentState.blocks.find(b => b.id === startBlockId)?.content || '';
        const endBlockContent = documentState.blocks.find(b => b.id === endBlockId)?.content || '';

        let startOffset = 0;
        let endOffset = endBlockContent.length;

        // Calculate precise offsets
        if (startBlockId === endBlockId) {
            startOffset = startBlockContent.indexOf(selectedText);
            if (startOffset === -1) startOffset = 0;
            endOffset = startOffset + selectedText.length;
        }

        setSelection({
            startBlockId,
            endBlockId,
            startOffset,
            endOffset,
            selectedText,
            hasSelection: true
        });

        setShowCommandBox(true);
    };

    // Apply AI edit to document
    const applyEdit = (newText: string) => {
        const { startBlockId, endBlockId, startOffset, endOffset } = selection;

        setDocumentState(prev => {
            const newBlocks = [...prev.blocks];

            // Single block edit (most common case)
            if (startBlockId === endBlockId) {
                const blockIndex = newBlocks.findIndex(b => b.id === startBlockId);
                if (blockIndex === -1) return prev;

                const block = newBlocks[blockIndex];
                const before = block.content.substring(0, startOffset);
                const after = block.content.substring(endOffset);

                newBlocks[blockIndex] = {
                    ...block,
                    content: before + newText + after
                };
            } else {
                // Multi-block edit - merge into single block for simplicity
                const startBlockIndex = newBlocks.findIndex(b => b.id === startBlockId);
                const endBlockIndex = newBlocks.findIndex(b => b.id === endBlockId);

                if (startBlockIndex === -1 || endBlockIndex === -1) return prev;

                const startBlock = newBlocks[startBlockIndex];
                const endBlock = newBlocks[endBlockIndex];

                const before = startBlock.content.substring(0, startOffset);
                const after = endBlock.content.substring(endOffset);

                newBlocks[startBlockIndex] = {
                    ...startBlock,
                    content: before + newText + after
                };

                // Remove blocks in between
                newBlocks.splice(startBlockIndex + 1, endBlockIndex - startBlockIndex);
            }

            setDocumentBlocks(newBlocks); // Sync with parent
            return { blocks: newBlocks };
        });

        // Clear selection and command
        setShowCommandBox(false);
        setAiCommand('');
        window.getSelection()?.removeAllRanges();
    };

    // Handle AI command using the API route
    const handleAIEdit = async () => {
        if (!aiCommand.trim() || !selection.selectedText) return;

        setIsProcessing(true);
        setError('');

        try {
            const response = await fetch('/api/docrender', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    selectedText: selection.selectedText,
                    command: aiCommand
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            applyEdit(data.editedText);
        } catch (err) {
            setError('Failed to process AI command. Please try again.');
            console.error('AI Edit Error:', err);
        } finally {
            setIsProcessing(false);
        }
    };


    // Export to PDF matching the preview
    // Export to PDF matching the preview
    const exportToPDF = async () => {
        const printWindow = window.open('', '', 'width=800,height=600');
        if (printWindow) {
            // Get the rendered HTML from the document
            const documentContent = documentRef.current?.innerHTML || '';

            printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Document</title>
          <meta charset="UTF-8">
          <link href="https://fonts.googleapis.com/css2?family=Gochi+Hand&display=swap" rel="stylesheet">
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css">
          <style>
          
            @page { 
              size: A4; 
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
            }
            body {
             -webkit-font-smoothing: antialiased;
             -moz-osx-font-smoothing: grayscale;
              text-rendering: geometricPrecision;
              font-family: 'Gochi Hand', cursive !important;
              font-size: 12px;
              line-height: 1.8;
              background-color: #030712 !important;
              color: #D8A1A1;
              max-width: 21cm;
              margin: 0 auto;
              padding: 2cm;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            /* Markdown element styling matching your preview */
            p { 
              color: #D8A1A1 !important;
              margin-bottom: 1rem;
              line-height: 1.75;
            }
            
            strong {
              color: #F2B8A2 !important;
              font-weight: 600;
            }
            
            em {
              color: #C7C7C7 !important;
              font-style: italic;
            }
            
            h1 {
              color: #6EE7E7 !important;
              font-size: 1.875rem;
              font-weight: 700;
              margin-bottom: 1rem;
            }
            
            h2 {
              color: #A7F3D0 !important;
              font-size: 1.5rem;
              font-weight: 600;
              margin-bottom: 0.75rem;
            }
            
            h3 {
              color: #C4B5FD !important;
              font-size: 1.25rem;
              font-weight: 500;
              margin-bottom: 0.5rem;
            }
            
            ul {
              color: #D28ADB !important;
              list-style-type: disc;
              list-style-position: inside;
              margin-bottom: 1rem;
            }
            
            ol {
              color: #D1696F !important;
              list-style-type: decimal;
              list-style-position: inside;
              margin-bottom: 1rem;
            }
            
            li {
              margin-left: 0.5rem;
              margin-bottom: 0.25rem;
              color: inherit !important;
            }
            
            blockquote {
              border-left: 4px solid #5FB3A2 !important;
              padding-left: 1rem;
              font-style: italic;
              color: #9DB8A0 !important;
              margin-bottom: 1rem;
            }
            
            code {
              background-color: #111827 !important;
              color: #93C5FD !important;
              padding: 0.125rem 0.375rem;
              border-radius: 0.25rem;
              font-size: 0.875rem;
              font-family: monospace;
            }
            
            pre {
              background-color: #0B1220 !important;
              color: #BFC5CC !important;
              padding: 1rem;
              border-radius: 0.5rem;
              overflow-x-auto;
              margin-bottom: 1rem;
            }
            
            pre code {
              background-color: transparent !important;
              padding: 0;
            }
            
            a {
              color: #6EE7E7 !important;
              text-decoration: underline;
              text-underline-offset: 4px;
            }
            
            a:hover {
              color: #93C5FD !important;
            }
            
            hr {
              border: none;
              border-top: 1px solid #1F2937 !important;
              margin: 1.5rem 0;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 1rem;
              border: 1px solid #374151 !important;
            }
            
            thead {
              background-color: #1F2937 !important;
            }
            
            th {
              padding: 0.5rem 1rem;
              text-align: left;
              color: #A7F3D0 !important;
              font-weight: 600;
              border: 1px solid #374151 !important;
            }
            
            td {
              padding: 0.5rem 1rem;
              color: #D8A1A1 !important;
              border: 1px solid #374151 !important;
            }
            
            tr {
              border-bottom: 1px solid #374151 !important;
            }
            
            .mb-6 {
              margin-bottom: 1.5rem;
            }
            
            /* KaTeX styling */
            .katex {
              font-size: 1.1em;
            }
            
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body {
                background-color: #030712 !important;
              }
            }
          </style>
        </head>
        <body>
          ${documentContent}
        </body>
      </html>
    `);
            await printWindow.document.fonts.ready;
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-neutral-900 text-neutral-100 overflow-y-auto scrollbar-hide rounded-2xl border-l-2">
            <div className="max-w-4xl mx-auto">

                        <button
                            onClick={exportToPDF}
                            className="flex items-center gap-2 bg-blue-400 text-white px-4 py-2 h-12 w-12 hover:bg-gray-700 transition rounded-full top-12 absolute opacity-70 right-30"
                        >
                            <Download size={20} />
                        </button>

                {/* Command Box */}
                {showCommandBox && (
                    <div className=" rounded-lg shadow-xl p-4 mb-4 border-2 border-blue-500">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 text-blue-600">
                                <Wand2 size={20} />
                                <span className="font-semibold">AI Command</span>
                            </div>
                            <button
                                onClick={() => {
                                    setShowCommandBox(false);
                                    setAiCommand('');
                                    setError('');
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-2">
                            <div className="text-sm text-gray-600 mb-2">
                                Selected: &quot;{selection.selectedText.substring(0, 50)}
                                {selection.selectedText.length > 50 ? '...' : ''}&quot;
                            </div>
                        </div>

                        <input
                            type="text"
                            value={aiCommand}
                            onChange={(e) => setAiCommand(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAIEdit()}
                            placeholder="e.g., make it more formal, add emojis, translate to Spanish..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isProcessing}
                        />

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm mb-3">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleAIEdit}
                            disabled={isProcessing || !aiCommand.trim()}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Processing...' : 'Apply AI Edit'}
                        </button>
                    </div>
                )}

                {/* Document Preview */}
                <div className="flex-1 p-8 overflow-auto">
                    <div
                        className="bg-gray-950 mx-auto shadow-2xl"
                        style={{
                            maxWidth: '21cm',
                            width: '100%',
                            minHeight: '29.7cm',
                            padding: '2cm',
                            fontFamily: 'Gochi Hand, cursive'
                        }}
                    >
                        <div
                            ref={documentRef}
                            onMouseUp={handleMouseUp}
                            className="prose max-w-none "
                            style={{ fontSize: '12px', lineHeight: '1.8' }}
                        >
                            {documentState.blocks.length === 0 ? (
                                <div className="text-gray-400 text-center mt-20">
                                    Chat with AI to generate document content
                                </div>
                            ) : (
                                documentState.blocks.map((block) => {
                                    const processedContent = block.content
                                        .replace(/\\\[/g, '$$')  // Converts \[ to $$
                                        .replace(/\\]/g, '$$')  // Converts \] to $$
                                        .replace(/\\\(/g, '$')   // Converts \( to $
                                        .replace(/\\\)/g, '$');
                                    return (
                                        <div
                                            key={block.id}
                                            data-block-id={block.id}
                                            className="mb-6 select-text cursor-text"
                                        >
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ children }) => (
                                                        <p className="text-[#D8A1A1] mb-4 leading-relaxed">
                                                            {children}
                                                        </p>
                                                    ),

                                                    strong: ({ children }) => (
                                                        <strong className="text-[#F2B8A2] font-semibold">
                                                            {children}
                                                        </strong>
                                                    ),

                                                    em: ({ children }) => (
                                                        <em className="text-[#C7C7C7] italic">
                                                            {children}
                                                        </em>
                                                    ),

                                                    h1: ({ children }) => (
                                                        <h1 className="text-[#6EE7E7] text-3xl font-bold mb-4">
                                                            {children}
                                                        </h1>
                                                    ),

                                                    h2: ({ children }) => (
                                                        <h2 className="text-[#A7F3D0] text-2xl font-semibold mb-3">
                                                            {children}
                                                        </h2>
                                                    ),

                                                    h3: ({ children }) => (
                                                        <h3 className="text-[#C4B5FD] text-xl font-medium mb-2">
                                                            {children}
                                                        </h3>
                                                    ),

                                                    ul: ({ children }) => (
                                                        <ul className="list-disc list-inside text-[#D28ADB] mb-4 space-y-1">
                                                            {children}
                                                        </ul>
                                                    ),

                                                    ol: ({ children }) => (
                                                        <ol className="list-decimal list-inside text-[#D1696F] mb-4 space-y-1">
                                                            {children}
                                                        </ol>
                                                    ),

                                                    li: ({ children }) => (
                                                        <li className="ml-2">
                                                            {children}
                                                        </li>
                                                    ),

                                                    blockquote: ({ children }) => (
                                                        <blockquote className="border-l-4 border-[#5FB3A2] pl-4 italic text-[#9DB8A0] mb-4">
                                                            {children}
                                                        </blockquote>
                                                    ),

                                                    code: ({ children }) => (
                                                        <code className="bg-[#111827] text-[#93C5FD] px-1.5 py-0.5 rounded text-sm">
                                                            {children}
                                                        </code>
                                                    ),

                                                    pre: ({ children }) => (
                                                        <pre className="bg-[#0B1220] text-[#BFC5CC] p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
                                                    ),

                                                    a: ({ children, href }) => (
                                                        <a
                                                            href={href}
                                                            className="text-[#6EE7E7] underline underline-offset-4 hover:text-[#93C5FD] transition-colors"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {children}
                                                        </a>
                                                    ),

                                                    hr: () => (
                                                        <hr className="border-[#1F2937] my-6" />
                                                    ),
                                                    table: ({ children }) => (
                                                        <div className="overflow-x-auto mb-4">
                                                            <table className="min-w-full border-collapse border border-[#374151]">
                                                                {children}
                                                            </table>
                                                        </div>
                                                    ),

                                                    thead: ({ children }) => (
                                                        <thead className="bg-[#1F2937]">
                                                        {children}
                                                        </thead>
                                                    ),

                                                    tbody: ({ children }) => (
                                                        <tbody>
                                                        {children}
                                                        </tbody>
                                                    ),

                                                    tr: ({ children }) => (
                                                        <tr className="border-b border-[#374151]">
                                                            {children}
                                                        </tr>
                                                    ),

                                                    th: ({ children }) => (
                                                        <th className="px-4 py-2 text-left text-[#A7F3D0] font-semibold border border-[#374151]">
                                                            {children}
                                                        </th>
                                                    ),

                                                    td: ({ children }) => (
                                                        <td className="px-4 py-2 text-[#D8A1A1] border border-[#374151]">
                                                            {children}
                                                        </td>
                                                    ),
                                                }}
                                                remarkPlugins={[remarkMath, remarkGfm]}
                                                rehypePlugins={[[rehypeKatex, { output: 'html' }]]}
                                            >
                                                {processedContent}
                                            </ReactMarkdown>
                                        </div>
                                    )
                                }

                                    )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}