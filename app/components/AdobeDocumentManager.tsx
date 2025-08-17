import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileText, Grid, List, Search, Plus, Eye, Download, ChevronLeft, ChevronRight, BookOpen, BookOpenCheck, GripVertical, MessageCircle, Send, Bot, User, X, Minimize2, Maximize2, Trash2 } from 'lucide-react';

interface GeminiConfig {
  apiKey: string;
  model: string;
}

interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiRequest {
  contents: GeminiMessage[];
  generationConfig?: {
    temperature: number;
    maxOutputTokens: number;
  };
}

// Type definitions
interface Document {
  id: number;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  status: 'new' | 'read';
  file: File;
  url: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'new' | 'read';
type UploadMode = 'read' | 'new' | null;

// Adobe DC View type declaration
declare global {
  interface Window {
    AdobeDC?: {
      View: new (config: {
        clientId: string;
        divId: string;
      }) => {
        previewFile: (
          fileConfig: {
            content: { location: { url: string } };
            metaData: { fileName: string };
          },
          viewerConfig: {
            embedMode: string;
            showAnnotationTools: boolean;
            showLeftHandPanel: boolean;
            showDownloadPDF: boolean;
            showPrintPDF: boolean;
            showZoomControl: boolean;
            enableSearchAPIs: boolean;
            includePDFAnnotations: boolean;
            defaultViewMode: string;
          }
        ) => void;
      };
    };
    pdfjsLib?: any;
  }
}

const AdobeDocumentManager: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPdf, setSelectedPdf] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showDocumentLibrary, setShowDocumentLibrary] = useState<boolean>(true);
  const [uploadMode, setUploadMode] = useState<UploadMode>(null);
  const [libraryWidth, setLibraryWidth] = useState<number>(400);
  const [chatWidth, setChatWidth] = useState<number>(350);
  const [isResizingLibrary, setIsResizingLibrary] = useState<boolean>(false);
  const [isResizingChat, setIsResizingChat] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [isChatMinimized, setIsChatMinimized] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const libraryResizerRef = useRef<HTMLDivElement>(null);
  const chatResizerRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);




  // Fixed configuration - REPLACE WITH YOUR API KEY
  const [geminiConfig, setGeminiConfig] = useState<GeminiConfig>({
    apiKey: 'AIzaSyA4vvBvLJqeWe6SiVBf0Od79JmbBHHdFBU', // Replace with your actual API key
    model: 'gemini-2.0-flash-exp'
  });
  
  const [pdfContent, setPdfContent] = useState<string>('');
  const [isExtractingText, setIsExtractingText] = useState<boolean>(false);
  const [extractionProgress, setExtractionProgress] = useState<number>(0);

  // Load PDF.js library
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        // Set worker source
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Adobe PDF Embed API initialization
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://documentservices.adobe.com/view-sdk/viewer.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

useEffect(() => {
  if (documents.length > 0) {
    localStorage.setItem('uploadedDocuments', JSON.stringify(documents));
  }
}, [documents]);

// Load existing documents from localStorage on page load
useEffect(() => {
  const savedDocuments = localStorage.getItem('uploadedDocuments');
  if (savedDocuments) {
    try {
      const parsedDocuments = JSON.parse(savedDocuments);
      setDocuments(parsedDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }
}, []);
 


  // Add these functions after your state declarations




  // Real PDF text extraction using PDF.js
  const extractPdfText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!window.pdfjsLib) {
        reject(new Error('PDF.js library not loaded'));
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          let fullText = '';
          const totalPages = pdf.numPages;
          
          // Extract text from each page
          for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            setExtractionProgress((pageNum / totalPages) * 100);
            
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Combine text items from the page
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            
            fullText += `\n\n--- Page ${pageNum} ---\n${pageText}`;
            
            // Add a small delay to prevent UI blocking
            if (pageNum % 5 === 0) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          }
          
          setExtractionProgress(100);
          resolve(fullText.trim());
        } catch (error) {
          console.error('Error extracting PDF text:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const callGeminiAPI = async (userMessage: string, pdfContext: string): Promise<string> => {
   



    try {
      // Truncate PDF content if it's too long (Gemini has token limits)
      const maxContextLength = 30000; // Adjust based on your needs
      const truncatedContext = pdfContext.length > maxContextLength 
        ? pdfContext.substring(0, maxContextLength) + "\n\n[Content truncated due to length...]"
        : pdfContext;

      const systemPrompt = `You are a helpful AI assistant specialized in analyzing PDF documents and answering questions in a simple, easy-to-understand manner for laypeople.

IMPORTANT GUIDELINES:
1. Always explain things in simple terms that anyone can understand
2. Avoid jargon and technical terms unless necessary
3. If you must use technical terms, explain them simply
4. For translation requests, provide:
   - The translation in the requested language
   - The language name
   - 2-3 simple examples in that language
5. Answer general questions even if they're not related to the PDF
6. Keep responses concise but comprehensive
7. Use examples and analogies when helpful
8. If the PDF content seems incomplete or truncated, mention this

PDF DOCUMENT CONTENT:
${truncatedContext || 'No PDF content available - the document may not have been processed yet or may contain only images.'}

USER QUESTION: ${userMessage}

Please provide a helpful, simple, and clear response based on the PDF content and your knowledge.`;

      const requestBody: GeminiRequest = {
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiConfig.model}:generateContent?key=${geminiConfig.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Invalid response format from Gemini API');
      }
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      
      if (error instanceof Error && error.message.includes('API_KEY_INVALID')) {
        return `❌ **Invalid API Key**

Your Gemini API key appears to be invalid. Please:

1. Double-check your API key from: https://makersuite.google.com/app/apikey
2. Make sure it starts with 'AIzaSy...'
3. Verify the key is active and has proper permissions

Current key: ${geminiConfig}...`;
      }

      return `I'm sorry, I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}

This could be due to:
- Network connectivity issues
- API rate limits
- Invalid API key
- PDF content processing issues

Please try again, or ask a different question!`;
    }
  };

  // Smooth resizing with requestAnimationFrame
  const handleLibraryMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingLibrary || !containerRef.current) return;
    
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      
      const minWidth = 300;
      const maxWidth = containerRect.width * 0.5;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setLibraryWidth(newWidth);
      }
    });
  }, [isResizingLibrary]);

  const handleChatMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingChat || !containerRef.current) return;
    
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      
      const minWidth = 300;
      const maxWidth = containerRect.width * 0.4;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setChatWidth(newWidth);
      }
    });
  }, [isResizingChat]);

  const handleLibraryMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLibrary(true);
  }, []);

  const handleChatMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingChat(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsResizingLibrary(false);
    setIsResizingChat(false);
  }, []);

  // Event listeners for resizing
  useEffect(() => {
    if (isResizingLibrary) {
      document.addEventListener('mousemove', handleLibraryMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else if (isResizingChat) {
      document.addEventListener('mousemove', handleChatMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleLibraryMouseMove);
      document.removeEventListener('mousemove', handleChatMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleLibraryMouseMove);
      document.removeEventListener('mousemove', handleChatMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingLibrary, isResizingChat, handleLibraryMouseMove, handleChatMouseMove, handleMouseUp]);

  const handleUploadModeSelect = (mode: UploadMode): void => {
    setUploadMode(mode);
    if (mode && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
  if (!event.target.files || !uploadMode) return;
  
  const files = Array.from(event.target.files);
  setIsUploading(true);

  const newDocuments: Document[] = await Promise.all(
    files.map(async (file: File) => {
      // Convert file to base64 for persistent storage
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      return {
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadDate: new Date().toISOString(),
        status: uploadMode === 'read' ? 'read' : 'new',
        file: file,
        url: base64Data // Store base64 instead of blob URL
      };
    })
  );

  setTimeout(() => {
    const updatedDocuments = [...documents, ...newDocuments];
    setDocuments(updatedDocuments);
    
    // Save to localStorage so IdeaCloud can access them
    localStorage.setItem('uploadedDocuments', JSON.stringify(updatedDocuments));
    
    setIsUploading(false);
    setUploadMode(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, 1500);
};


  // Delete document function
const handleDeleteDocument = (e: React.MouseEvent, docId: number): void => {
  e.stopPropagation(); // Prevent opening the PDF when clicking delete
  
  if (window.confirm('Are you sure you want to delete this document?')) {
    const updatedDocuments = documents.filter(doc => doc.id !== docId);
    setDocuments(updatedDocuments);
    
    // Update localStorage
    localStorage.setItem('uploadedDocuments', JSON.stringify(updatedDocuments));
    
    // If the deleted document was currently selected, clear the selection
    if (selectedPdf?.id === docId) {
      setSelectedPdf(null);
      setShowChat(false);
      setChatMessages([]);
      setPdfContent('');
      
      // Clear the Adobe DC View container
      const viewerContainer = window.document.getElementById('adobe-dc-view');
      if (viewerContainer) {
        viewerContainer.innerHTML = '';
      }
    }
  }
};

const openPdfViewer = async (document: Document): Promise<void> => {
  setSelectedPdf(document);
  setIsExtractingText(true);
  setExtractionProgress(0);
  
  try {
    // Use the file directly for text extraction
    const extractedText = await extractPdfText(document.file);
    setPdfContent(extractedText);
    
    console.log('PDF text extracted successfully:', extractedText.substring(0, 200) + '...');
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    setPdfContent('Error: Could not extract text from this PDF. It may contain only images or be password-protected.');
  } finally {
    setIsExtractingText(false);
    setExtractionProgress(0);
  }
  
  // Clear previous Adobe DC View instance - Fixed DOM access
  const viewerContainer = window.document.getElementById('adobe-dc-view');
  if (viewerContainer) {
    viewerContainer.innerHTML = '';
  }

  setTimeout(() => {
    if (window.AdobeDC) {
      const adobeDCView = new window.AdobeDC.View({
        clientId: "82a5500aa5d945049893aec8a2514446",
        divId: "adobe-dc-view"
      });

      adobeDCView.previewFile({
        content: { location: { url: document.url } },
        metaData: { fileName: document.name }
      }, {
        embedMode: "SIZED_CONTAINER",
        showAnnotationTools: true,
        showLeftHandPanel: false, // Disable left panel for more space
        showDownloadPDF: true,
        showPrintPDF: true,
        showZoomControl: true,
        enableSearchAPIs: true,
        includePDFAnnotations: true,
        defaultViewMode: "FIT_WIDTH" // Better for continuous scrolling
      });
    }
  }, 100);
};

  const toggleDocumentLibrary = (): void => {
    setShowDocumentLibrary(!showDocumentLibrary);
  };

  const toggleChat = (): void => {
    if (!showChat && selectedPdf) {
      setShowChat(true);
      setIsChatMinimized(false);
      
      const welcomeMessage: ChatMessage = {
        id: `welcome-${Date.now()}`,
        type: 'bot',
        content: `Hello! I'm your AI assistant for "${selectedPdf.name}". 

I can help you with:
📖 Questions about the document content
🌍 Translations (just ask "translate X to [language]")
📝 Summaries in simple language
❓ General questions (even outside the document)

${isExtractingText ? `I'm currently reading your document... ${Math.round(extractionProgress)}% complete` : 
  pdfContent ? 'I\'ve analyzed your document and I\'m ready to help!' : 
  'I\'ve loaded your document but couldn\'t extract text. I can still help with general questions!'}

What would you like to know?`,
        timestamp: new Date()
      };
      setChatMessages([welcomeMessage]);
    } else {
      setShowChat(!showChat);
    }
  };

  const toggleChatMinimize = (): void => {
    setIsChatMinimized(!isChatMinimized);
  };

  const sendMessage = async (): Promise<void> => {
    if (!currentMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    const messageToSend = currentMessage;
    setCurrentMessage('');
    setIsTyping(true);

    try {
      // Call Gemini API with actual PDF content
      const botResponse = await callGeminiAPI(messageToSend, pdfContent);
      
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        content: botResponse,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const errorMessage: ChatMessage = {
        id: `bot-error-${Date.now()}`,
        type: 'bot',
        content: "I'm sorry, I encountered an error while processing your request. Please check your API key configuration and try again.",
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const filteredDocuments = documents.filter((doc: Document) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || doc.status === filterType;
    return matchesSearch && matchesFilter;
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFilterClick = (filter: FilterType): void => {
    setFilterType(filter);
  };

  const handleViewModeClick = (mode: ViewMode): void => {
    setViewMode(mode);
  };

  // Calculate available width for PDF viewer
  const calculatePdfWidth = (): string => {
    let totalWidth = '100%';
    let subtractWidth = 0;

    if (showDocumentLibrary) {
      subtractWidth += libraryWidth + 8;
    }
    
    if (showChat && !isChatMinimized) {
      subtractWidth += chatWidth + 8;
    }

    if (subtractWidth > 0) {
      totalWidth = `calc(100% - ${subtractWidth}px)`;
    }

    return totalWidth;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-bold text-red-600">Adobe</div>
                <div className="text-xs text-gray-500">Document Manager</div>
              </div>
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                <a href="#" className="text-gray-900 hover:text-red-600 px-3 py-2 text-sm font-medium border-b-2 border-red-600">Documents</a>
                <a href="/ideacloud" className="text-gray-500 hover:text-red-600 px-3 py-2 text-sm font-medium">IdeaCloud</a>
                <a href="/connectdots" className="text-gray-500 hover:text-red-600 px-3 py-2 text-sm font-medium">GetWhatMatters</a>
                 <a href="/getwhatmatters" className="text-gray-500 hover:text-red-600 px-3 py-2 text-sm font-medium">ConnectingDots</a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Flamingoes</span>
              {/* Chat button */}
              <button
                onClick={toggleChat}
                className={`p-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  showChat 
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } ${!selectedPdf ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={selectedPdf ? "Chat with PDF" : "Select a PDF to chat"}
                disabled={!selectedPdf}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">Chat</span>
              </button>
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-medium text-sm">AI</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div ref={containerRef} className="flex h-[calc(100vh-64px)] relative">
        {/* Left Sidebar - Document Library */}
        {showDocumentLibrary && (
          <div 
            className="bg-white border-r border-gray-200 flex flex-col relative transition-all duration-300 ease-out"
            style={{ width: `${libraryWidth}px` }}
          >
            {/* Hide Library Button */}
            <button
              onClick={toggleDocumentLibrary}
              className="absolute top-4 right-4 z-10 p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center space-x-1 bg-white border border-gray-200 shadow-sm"
              title="Hide Document Library"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
              <span className="text-xs text-gray-600">Hide</span>
            </button>
            
            {/* Upload Section */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50 flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Document Library</h1>
              
              <div className="space-y-3">
                {isUploading ? (
                  <div className="border-2 border-dashed border-red-300 rounded-xl p-6 text-center bg-white">
                    <div className="animate-pulse">
                      <Upload className="mx-auto h-12 w-12 text-red-400 mb-3" />
                      <p className="text-sm text-gray-600">Uploading {uploadMode} documents...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleUploadModeSelect('read')}
                      className="w-full border-2 border-dashed border-green-300 rounded-xl p-4 text-center hover:border-green-400 transition-all duration-200 cursor-pointer bg-white group hover:scale-105 hover:shadow-md"
                    >
                      <BookOpenCheck className="mx-auto h-8 w-8 text-green-500 mb-2 group-hover:scale-110 transition-transform duration-200" />
                      <p className="text-md font-medium text-gray-900 mb-1">Upload Read PDFs</p>
                      <p className="text-xs text-gray-500">Upload documents you have already read</p>
                    </button>

                    <button
                      onClick={() => handleUploadModeSelect('new')}
                      className="w-full border-2 border-dashed border-blue-300 rounded-xl p-4 text-center hover:border-blue-400 transition-all duration-200 cursor-pointer bg-white group hover:scale-105 hover:shadow-md"
                    >
                      <BookOpen className="mx-auto h-8 w-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform duration-200" />
                      <p className="text-md font-medium text-gray-900 mb-1">Upload Unread PDFs</p>
                      <p className="text-xs text-gray-500">Upload new documents to read later</p>
                    </button>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Search and Filters */}
            <div className="p-4 border-b border-gray-200 space-y-4 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleFilterClick('all')}
                    className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${filterType === 'all' ? 'bg-red-100 text-red-800 scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    All ({documents.length})
                  </button>
                  <button
                    onClick={() => handleFilterClick('new')}
                    className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${filterType === 'new' ? 'bg-blue-100 text-blue-800 scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    title="Unread PDFs - documents you haven't read yet"
                  >
                    Unread ({documents.filter((d: Document) => d.status === 'new').length})
                  </button>
                  <button
                    onClick={() => handleFilterClick('read')}
                    className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${filterType === 'read' ? 'bg-green-100 text-green-800 scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    title="Read PDFs - documents you have already read"
                  >
                    Read ({documents.filter((d: Document) => d.status === 'read').length})
                  </button>
                </div>

                <div className="flex space-x-1">
                  <button
                    onClick={() => handleViewModeClick('grid')}
                    className={`p-1 rounded transition-all duration-200 ${viewMode === 'grid' ? 'bg-red-100 text-red-600 scale-110' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleViewModeClick('list')}
                    className={`p-1 rounded transition-all duration-200 ${viewMode === 'list' ? 'bg-red-100 text-red-600 scale-110' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12 animate-fade-in">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {documents.length === 0 
                      ? "No documents uploaded yet" 
                      : "No documents match your search"
                    }
                  </p>
                  <p className="text-sm text-gray-400">
                    {documents.length === 0 
                      ? "Choose 'Upload Read PDFs' or 'Upload Unread PDFs' to get started" 
                      : "Try adjusting your search or filters"
                    }
                  </p>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-4' : 'space-y-2'}>
                  {filteredDocuments.map((doc: Document, index) => (
                    <div
                      key={doc.id}
                      className={`cursor-pointer rounded-lg border transition-all duration-200 hover:shadow-md hover:scale-105 transform group ${
                        selectedPdf?.id === doc.id 
                          ? 'border-red-500 bg-red-50 scale-105 shadow-md' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      } ${viewMode === 'grid' ? 'p-4' : 'p-3'}`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start space-x-3">
                        <div 
                          className="flex-shrink-0"
                          onClick={() => openPdfViewer(doc)}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
                            doc.status === 'new' ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            {doc.status === 'new' ? (
                              <BookOpen className="h-5 w-5 text-blue-600" />
                            ) : (
                              <BookOpenCheck className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                        </div>
                        <div 
                          className="flex-1 min-w-0"
                          onClick={() => openPdfViewer(doc)}
                        >
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-200 ${
                              doc.status === 'new' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {doc.status === 'new' ? 'Unread' : 'Read'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span>{formatFileSize(doc.size)}</span>
                            <span>Added {formatDate(doc.uploadDate)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => openPdfViewer(doc)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                            title="View PDF"
                          >
                            <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteDocument(e, doc.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete PDF"
                          >
                            <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Library Resizer */}
        {showDocumentLibrary && (
          <div
            ref={libraryResizerRef}
            className={`w-2 bg-gray-100 hover:bg-gray-300 cursor-col-resize flex items-center justify-center transition-all duration-150 ${
              isResizingLibrary ? 'bg-red-300 w-3' : ''
            }`}
            onMouseDown={handleLibraryMouseDown}
          >
            <GripVertical className={`h-6 w-6 text-gray-400 transition-all duration-150 ${
              isResizingLibrary ? 'text-red-600 scale-110' : ''
            }`} />
          </div>
        )}

        {/* Show Library Button when hidden */}
        {!showDocumentLibrary && (
          <div className="absolute top-20 left-4 z-10 animate-fade-in">
            <button
              onClick={toggleDocumentLibrary}
              className="p-3 rounded-lg hover:bg-gray-100 transition-all duration-200 flex items-center space-x-2 bg-white border border-gray-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              title="Show Document Library"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-600">Show Library</span>
            </button>
          </div>
        )}

        {/* PDF Viewer */}
        <div 
          className="bg-white transition-all duration-300 ease-out flex-1"
          style={{ width: calculatePdfWidth() }}
        >
          {selectedPdf ? (
            <div className="h-full flex flex-col animate-fade-in">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    selectedPdf.status === 'new' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    {selectedPdf.status === 'new' ? (
                      <BookOpen className="h-4 w-4 text-blue-600" />
                    ) : (
                      <BookOpenCheck className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{selectedPdf.name}</h2>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{formatFileSize(selectedPdf.size)} • Added {formatDate(selectedPdf.uploadDate)} • </span>
                      <span className={`${selectedPdf.status === 'new' ? 'text-blue-600' : 'text-green-600'}`}>
                        {selectedPdf.status === 'new' ? 'Unread' : 'Read'}
                      </span>
                      {isExtractingText && (
                        <span className="flex items-center space-x-2 text-blue-600">
                          <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>Extracting text... {Math.round(extractionProgress)}%</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 hover:scale-105">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </button>
                </div>
              </div>
              <div id="adobe-dc-view" className="flex-1 overflow-hidden"></div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-red-50">
              <div className="text-center animate-fade-in">
                <div className="w-32 h-32 bg-red-100 rounded-2xl mx-auto mb-6 flex items-center justify-center animate-pulse">
                  <FileText className="h-16 w-16 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a document to view</h3>
                <p className="text-gray-500 max-w-md mb-4">
                  Choose any PDF from your document library to preview it. The AI will extract and analyze the text content automatically.
                </p>
                
                <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-400">
                  <span>Powered by</span>
                  <span className="font-semibold text-red-600">Adobe PDF Embed API</span>
                  
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Resizer */}
        {showChat && !isChatMinimized && (
          <div
            ref={chatResizerRef}
            className={`w-2 bg-gray-100 hover:bg-gray-300 cursor-col-resize flex items-center justify-center transition-all duration-150 ${
              isResizingChat ? 'bg-blue-300 w-3' : ''
            }`}
            onMouseDown={handleChatMouseDown}
          >
            <GripVertical className={`h-6 w-6 text-gray-400 transition-all duration-150 ${
              isResizingChat ? 'text-blue-600 scale-110' : ''
            }`} />
          </div>
        )}

        {/* Chat Panel */}
        {showChat && (
          <div 
            className={`bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ease-out ${
              isChatMinimized ? 'w-16' : ''
            }`}
            style={{ width: isChatMinimized ? '64px' : `${chatWidth}px` }}
          >
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                {!isChatMinimized && (
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">PDF Assistant</h3>
                      <p className="text-xs text-gray-500">Ask questions about your document</p>
                      {isExtractingText && (
                        <div className="mt-2 flex items-center space-x-2 text-xs text-blue-600">
                          <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>Reading PDF content... {Math.round(extractionProgress)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex space-x-1">
                  <button
                    onClick={toggleChatMinimize}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title={isChatMinimized ? "Expand Chat" : "Minimize Chat"}
                  >
                    {isChatMinimized ? (
                      <Maximize2 className="h-4 w-4 text-gray-600" />
                    ) : (
                      <Minimize2 className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={() => setShowChat(false)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Close Chat"
                  >
                    <X className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {!isChatMinimized && (
              <>
                {/* Chat Messages */}
                <div 
                  ref={chatMessagesRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start space-x-2 max-w-[80%] ${
                        message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.type === 'user' ? 'bg-red-100' : 'bg-blue-100'
                        }`}>
                          {message.type === 'user' ? (
                            <User className="h-3 w-3 text-red-600" />
                          ) : (
                            <Bot className="h-3 w-3 text-blue-600" />
                          )}
                        </div>
                        <div className={`rounded-lg p-3 ${
                          message.type === 'user' 
                            ? 'bg-red-500 text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm whitespace-pre-line">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.type === 'user' ? 'text-red-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex items-start space-x-2 max-w-[80%]">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100">
                          <Bot className="h-3 w-3 text-blue-600" />
                        </div>
                        <div className="rounded-lg p-3 bg-gray-100">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                  <div className="flex space-x-2">
                    <input
                      ref={chatInputRef}
                      type="text"
                      placeholder="Ask about this document..."
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!currentMessage.trim() || isTyping}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* CSS Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `
      }} />
    </div>
  );
};

export default AdobeDocumentManager;