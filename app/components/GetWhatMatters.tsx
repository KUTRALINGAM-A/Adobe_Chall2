declare global {
  interface Window {
    AdobeDC?: {
      View: new (config: { clientId: string; divId: string }) => any;
      Enum?: {
        CallbackType?: {
          PREVIEW_SELECTION_END?: string;
          EVENT_LISTENER?: string;
          TEXT_SELECTION_END?: string;
        };
      };
    };
    pdfjsLib?: {
      getDocument: (src: any) => any;
      GlobalWorkerOptions?: {
        workerSrc: string;
      };
    };
    
  }
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Upload, FileText, Grid, List, Search, Plus, Eye, Download, ChevronLeft, ChevronRight, 
  BookOpen, BookOpenCheck, GripVertical, MessageCircle, Send, Bot, User, X, Minimize2, Maximize2,
  Move, Square, Circle, Diamond, Triangle, ArrowRight, Palette, Save, Image, Trash2, Copy,
  ZoomIn, ZoomOut, RotateCcw, MousePointer, Type, Layers, Settings, Play, Volume2, VolumeX,
  Target, Brain, Zap, ExternalLink, CheckCircle, Clock, TrendingUp, Briefcase, AlertCircle,
  Building, Lightbulb, Star, Globe, Award, Users, Sparkles, CheckCircle2, AlertTriangle, 
  Info, Pause, SkipForward, SkipBack, Headphones, Mic, FileSearch, Bookmark, Quote
} from 'lucide-react';

// Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyA4vvBvLJqeWe6SiVBf0Od79JmbBHHdFBU';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';




let adobePreviewPromise: any = null;

// Type definitions
interface Document {
  id: number;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  status: 'new' | 'read';
  file: File | null;
  url: string;
  fileData?: ArrayBuffer | number[];
}

interface RelevantSection {
  id: string;
  title: string;
  content: string;
  documentName: string;
  pageNumber: number;
  relevanceScore: number;
  context: string;
  sectionType: string;
  matchedKeywords: string[];
}

interface GeminiAnalysis {
  keyTakeaways: string[];
  didYouKnowFacts: string[];
  contradictionsCounterpoints: string[];
  examples: string[];
  crossDocumentInspirations: string[];
  audioScript: string;
  confidence: number;
  unreadPdfSummary: string; // Add this new field
}

interface AudioState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  isGenerating: boolean;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'new' | 'read';
type UploadMode = 'read' | 'new' | null;

const ConnectingTheDots: React.FC = () => {
  // State management
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [relevantSections, setRelevantSections] = useState<RelevantSection[]>([]);
  const [selectedSections, setSelectedSections] = useState<RelevantSection[]>([]);
  const [geminiAnalysis, setGeminiAnalysis] = useState<GeminiAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  // Upload and view states
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Layout state
  const [showDocumentLibrary, setShowDocumentLibrary] = useState<boolean>(true);
  const [libraryWidth, setLibraryWidth] = useState<number>(400);
  const [searchWidth, setSearchWidth] = useState<number>(350);
  const [isResizingLibrary, setIsResizingLibrary] = useState<boolean>(false);
  const [isResizingSearch, setIsResizingSearch] = useState<boolean>(false);
  const [showSearchPanel, setShowSearchPanel] = useState<boolean>(true);
  const [selectedPdfText, setSelectedPdfText] = useState<string>('');
  // PDF viewer state
  const [viewingPdf, setViewingPdf] = useState<Document | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  
  // Audio state
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    isGenerating: false
  });

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const libraryResizerRef = useRef<HTMLDivElement>(null);
  const searchResizerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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

  // PDF.js initialization
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib?.GlobalWorkerOptions) {
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

  // Load documents from localStorage on component mount
  useEffect(() => {
    const savedDocuments = localStorage.getItem('uploadedDocuments');
    if (savedDocuments) {
      try {
        const parsedDocuments = JSON.parse(savedDocuments);
        const reconstructedDocuments = parsedDocuments.map((doc: any) => {
          let reconstructedDoc = { ...doc };
          
          // Reconstruct from base64 URL if available
          if (doc.url && doc.url.startsWith('data:application/pdf;base64,')) {
            try {
              const base64Data = doc.url.split(',')[1];
              const binaryString = atob(base64Data);
              const arrayBuffer = new ArrayBuffer(binaryString.length);
              const uint8Array = new Uint8Array(arrayBuffer);
              
              for (let i = 0; i < binaryString.length; i++) {
                uint8Array[i] = binaryString.charCodeAt(i);
              }
              
              const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
              const file = new File([blob], doc.name, { type: 'application/pdf' });
              const newBlobUrl = URL.createObjectURL(file);
              
              reconstructedDoc.file = file;
              reconstructedDoc.fileData = arrayBuffer;
              reconstructedDoc.url = newBlobUrl;
            } catch (error) {
              console.error(`Failed to reconstruct from base64 for ${doc.name}:`, error);
            }
          } else if (doc.fileData && Array.isArray(doc.fileData)) {
            try {
              const arrayBuffer = new Uint8Array(doc.fileData).buffer;
              const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
              const file = new File([blob], doc.name, { type: 'application/pdf' });
              
              reconstructedDoc.file = file;
              reconstructedDoc.fileData = arrayBuffer;
              
              if (reconstructedDoc.url && reconstructedDoc.url.startsWith('blob:')) {
                URL.revokeObjectURL(reconstructedDoc.url);
              }
              reconstructedDoc.url = URL.createObjectURL(file);
            } catch (error) {
              console.error(`Failed to reconstruct from fileData for ${doc.name}:`, error);
            }
          }
          
          return reconstructedDoc;
        });
        
        setDocuments(reconstructedDocuments);
      } catch (error) {
        console.error('Error loading documents:', error);
        setDocuments([]);
      }
    }
  }, []);

  // Save documents to localStorage whenever documents change
  useEffect(() => {
    if (documents.length > 0) {
      try {
        const documentsToSave = documents.map(doc => ({
          ...doc,
          // Convert file data to base64 URL for persistent storage
          url: doc.file ? doc.url : doc.url, // Keep existing URL structure
          fileData: doc.fileData ? Array.from(new Uint8Array(doc.fileData as ArrayBuffer)) : undefined,
          file: null // Don't store the actual File object
        }));
        
        localStorage.setItem('uploadedDocuments', JSON.stringify(documentsToSave));
      } catch (error) {
        console.warn('Failed to save documents to localStorage:', error);
      }
    }
  }, [documents]);

  // Upload mode selection and file upload handlers
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

    try {
      const newDocuments: Document[] = await Promise.all(
        files.map(async (file: File) => {
          // Convert file to base64 for persistent storage
          const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });

          // Also get array buffer for processing
          const arrayBuffer = await file.arrayBuffer();
          const blobUrl = URL.createObjectURL(file);

          return {
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            uploadDate: new Date().toISOString(),
            status: uploadMode === 'read' ? 'read' : 'new',
            file: file,
            url: base64Data, // Store base64 for persistence
            fileData: arrayBuffer
          };
        })
      );

      setTimeout(() => {
        setDocuments(prev => [...prev, ...newDocuments]);
        setIsUploading(false);
        setUploadMode(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 1500);
    } catch (error) {
      console.error('Error uploading files:', error);
      setIsUploading(false);
      setUploadMode(null);
    }
  };

  // Extract text from PDF
  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      if (!window.pdfjsLib) {
        throw new Error('PDF.js not loaded');
      }

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
const pdf = await window.pdfjsLib!.getDocument({ data: uint8Array }).promise;

      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += `\n--- Page ${pageNum} ---\n${pageText}`;
      }

      return fullText;
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      return `Error extracting text from ${file.name}`;
    }
  };

  // Search for relevant content
  const searchRelevantContent = async () => {
    if (!searchText.trim() || documents.length === 0) {
      alert('Please enter search text and ensure documents are uploaded');
      return;
    }

    setIsSearching(true);
    
    try {
      const validDocuments = documents.filter(doc => doc.file);
      if (validDocuments.length === 0) {
        alert('No valid PDF files found. Please upload some PDFs.');
        return;
      }

      // Extract text from all PDFs
      const documentContents = await Promise.all(
        validDocuments.map(async (doc) => {
          const text = await extractTextFromPDF(doc.file!);
          return {
            name: doc.name,
            content: text,
            size: text.length
          };
        })
      );

      // Use Gemini to find relevant sections
      const relevantSections = await findRelevantSections(documentContents, searchText);
      setRelevantSections(relevantSections);
      
    } catch (error) {
      console.error('Error searching content:', error);
      alert('Error searching content: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSearching(false);
    }
  };

  // Find relevant sections using Gemini
  const findRelevantSections = async (
    documentContents: { name: string; content: string; size: number }[],
    searchQuery: string
  ): Promise<RelevantSection[]> => {
    const combinedContent = documentContents.map(doc => 
      `=== DOCUMENT: ${doc.name} ===\n${doc.content}`
    ).join('\n\n');

    const prompt = `You are analyzing documents to find the most relevant sections for a specific search query.

SEARCH QUERY: "${searchQuery}"

DOCUMENT CONTENTS:
${combinedContent.substring(0, 100000)} // Limit content size

TASK: Find the top 5 most relevant sections that best match the search query.

For each relevant section, provide:
1. A descriptive title
2. The actual content (2-3 sentences)
3. The document name it came from
4. Estimated page number (if mentioned in content)
5. Relevance score (0-100)
6. Context explaining why it's relevant
7. Section type (e.g., "Process", "Definition", "Example", etc.)
8. Key matched keywords

Please respond with ONLY a valid JSON array in this format:
[
  {
    "id": "section_1",
    "title": "Descriptive title for this section",
    "content": "The actual relevant content from the document (2-3 sentences)",
    "documentName": "Document filename",
    "pageNumber": 1,
    "relevanceScore": 95,
    "context": "Explanation of why this section is relevant to the search query",
    "sectionType": "Process",
    "matchedKeywords": ["keyword1", "keyword2", "keyword3"]
  }
]`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2000,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      const cleanedText = generatedText.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedText);
      
    } catch (error) {
      console.error('Error finding relevant sections:', error);
      return [];
    }
  };

  // Generate comprehensive analysis with Gemini
const generateAnalysis = async (sections: RelevantSection[]) => {
  setIsAnalyzing(true);
  
  try {
    const sectionsContent = sections.map(section => 
      `Title: ${section.title}\nContent: ${section.content}\nDocument: ${section.documentName}\nContext: ${section.context}`
    ).join('\n\n---\n\n');

    // Check for unread PDFs
    const unreadPdfs = documents.filter(doc => doc.status === 'new' && (doc.file || doc.fileData));
    let unreadPdfAnalysis = '';
    
    if (unreadPdfs.length > 0) {
      // Extract text from unread PDFs and search for similar content
      const unreadContents = await Promise.all(
        unreadPdfs.map(async (doc) => {
          const text = await extractTextFromPDF(doc.file!);
          return {
            name: doc.name,
            content: text
          };
        })
      );
      
      const unreadCombinedContent = unreadContents.map(doc => 
        `=== UNREAD DOCUMENT: ${doc.name} ===\n${doc.content}`
      ).join('\n\n');

      const unreadPrompt = `Analyze these UNREAD documents for content related to the search query "${searchText}" and selected sections:

SELECTED SECTIONS CONTEXT:
${sectionsContent}

UNREAD DOCUMENTS:
${unreadCombinedContent.substring(0, 50000)}

Task: For each unread document, determine if there are sections relevant to the search query "${searchText}". 
If relevant sections exist, provide a brief summary. If no relevant content exists, state that clearly.

Respond with a brief analysis for each unread document in this format:
"Document Name: [Brief summary of relevant content OR 'No relevant content found for this search query']"`;

      try {
        const unreadResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: unreadPrompt }] }],
            generationConfig: {
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1000,
            }
          })
        });

        if (unreadResponse.ok) {
          const unreadData = await unreadResponse.json();
          unreadPdfAnalysis = unreadData.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to analyze unread PDFs';
        }
      } catch (error) {
        console.error('Error analyzing unread PDFs:', error);
        unreadPdfAnalysis = 'Error occurred while analyzing unread PDFs';
      }
    } else {
      unreadPdfAnalysis = 'No unread PDFs found in your library';
    }

    const prompt = `Based on these selected relevant sections from documents, provide a comprehensive analysis:

SELECTED SECTIONS:
${sectionsContent}

ORIGINAL SEARCH QUERY: "${searchText}"

Please analyze these sections and provide:

1. KEY TAKEAWAYS (3-5 main insights)
2. DID YOU KNOW FACTS (3-4 interesting/surprising facts)
3. CONTRADICTIONS/COUNTERPOINTS (2-3 opposing views or conflicts)
4. EXAMPLES (2-3 concrete examples from the content)
5. CROSS-DOCUMENT INSPIRATIONS (2-3 connections between different documents)
6. AUDIO SCRIPT (A engaging 2-minute podcast-style script for audio overview)

Please respond with ONLY a valid JSON object in this format:
{
  "keyTakeaways": [
    "Key insight 1 with specific details",
    "Key insight 2 with actionable information",
    "Key insight 3 with important context"
  ],
  "didYouKnowFacts": [
    "Interesting fact 1 that might surprise readers",
    "Fascinating detail 2 from the documents",
    "Notable point 3 worth highlighting"
  ],
  "contradictionsCounterpoints": [
    "Contradiction 1: Different viewpoints found in the documents",
    "Counterpoint 2: Opposing perspectives or conflicting information"
  ],
  "examples": [
    "Concrete example 1 from the documents",
    "Practical example 2 showing real application"
  ],
  "crossDocumentInspirations": [
    "Connection 1: How insights from document A relate to document B",
    "Inspiration 2: Cross-document pattern or theme discovered"
  ],
  "audioScript": "A engaging, conversational 2-minute script that could be read as a podcast episode, covering the key insights in an interesting way. Include natural transitions and make it sound like a knowledgeable host discussing the findings.",
  "confidence": 90,
  "unreadPdfSummary": "${unreadPdfAnalysis.replace(/"/g, '\\"')}"
}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 3000,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const cleanedText = generatedText.replace(/```json\n?|\n?```/g, '').trim();
    const analysis = JSON.parse(cleanedText);
    
    setGeminiAnalysis(analysis);
    
  } catch (error) {
    console.error('Error generating analysis:', error);
    alert('Error generating analysis: ' + (error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    setIsAnalyzing(false);
  }
};

  // Handle section selection
  const toggleSectionSelection = (section: RelevantSection) => {
    setSelectedSections(prev => {
      const isSelected = prev.find(s => s.id === section.id);
      if (isSelected) {
        return prev.filter(s => s.id !== section.id);
      } else {
        return [...prev, section];
      }
    });
  };

  // Navigate to section in PDF
  const navigateToSection = async (section: RelevantSection) => {
    const docInfo = documents.find(doc => doc.name === section.documentName);
    if (docInfo && (docInfo.file || docInfo.fileData)) {
      await openPdfViewer(docInfo);

      setTimeout(async () => {
        try {
          if (adobePreviewPromise) {
            const viewer = await adobePreviewPromise;
            const apis = await viewer.getAPIs();
            await apis.gotoLocation(section.pageNumber);
            showNavigationAlert(section);
          }
        } catch (error) {
          console.error("Navigation error:", error);
        }
      }, 1500);
    } else {
      alert(`Document "${section.documentName}" is not available. Please re-upload the document.`);
    }
  };

  // Open PDF viewer
const openPdfViewer = async (document: Document): Promise<void> => {
  setIsLoadingPdf(true);
  setDocuments(prev => prev.map(doc => 
    doc.id === document.id ? { ...doc, status: 'read' } : doc
  ));
  setViewingPdf(document);

  if (!showDocumentLibrary) {
    setShowDocumentLibrary(true);
  }

  const viewerContainer = window.document.getElementById('adobe-dc-view');
  if (viewerContainer) {
    viewerContainer.innerHTML = '';
  }

  setTimeout(() => {
    if (!window.AdobeDC) {
      console.error("Adobe SDK not available");
      alert("Adobe PDF SDK not loaded. Please refresh the page.");
      return;
    }

    try {
      const adobeDCView = new window.AdobeDC.View({
        clientId: "82a5500aa5d945049893aec8a2514446",
        divId: "adobe-dc-view",
      });

      let pdfUrl = document.url;

      if (!pdfUrl || pdfUrl.trim() === "") {
        if (document.file && document.file instanceof File) {
          pdfUrl = URL.createObjectURL(document.file);
        } else if (document.fileData) {
          try {
            let arrayBuffer: ArrayBuffer;
            if (Array.isArray(document.fileData)) {
              arrayBuffer = new Uint8Array(document.fileData).buffer;
            } else {
              arrayBuffer = document.fileData as ArrayBuffer;
            }

            const blob = new Blob([arrayBuffer], { type: "application/pdf" });
            pdfUrl = URL.createObjectURL(blob);
          } catch (error) {
            console.error("Failed to create blob URL from fileData:", error);
            throw new Error("Could not create PDF URL from file data");
          }
        } else {
          throw new Error("No file data available for PDF viewing");
        }
      }

      const previewFilePromise = adobeDCView.previewFile(
        {
          content: { location: { url: pdfUrl } },
          metaData: { fileName: document.name },
        },
        {
          embedMode: "SIZED_CONTAINER",
          showAnnotationTools: true,
          showLeftHandPanel: false,
          showDownloadPDF: true,
          showPrintPDF: true,
          showZoomControl: true,
          enableSearchAPIs: true,
          includePDFAnnotations: true,
          defaultViewMode: "FIT_WIDTH",
        }
      );

      // Enhanced callback setup with multiple fallback methods
      previewFilePromise.then(async (viewer: any) => {
        try {
          console.log("PDF viewer loaded, setting up selection callbacks...");
          
          // Store the viewer reference globally for debugging
          (window as any).__adobeViewer = viewer;

          // Method 1: Try with proper enum constants
          if (window.AdobeDC?.Enum?.CallbackType?.PREVIEW_SELECTION_END) {
            console.log("Setting up callback with PREVIEW_SELECTION_END enum...");
            adobeDCView.registerCallback(
              window.AdobeDC.Enum.CallbackType.PREVIEW_SELECTION_END,
              async function(event?: any) {
                console.log("Selection callback triggered (enum method):", event);
                await handleSelectionCallback(viewer);
              },
              { enableFilePreviewEvents: true }
            );
          }

          // Method 2: Try with string constants (more reliable)
          const callbackTypes = [
            'PREVIEW_SELECTION_END',
            'TEXT_SELECTION_END', 
            'SELECTION_END'
          ];

          for (const callbackType of callbackTypes) {
            try {
              console.log(`Registering callback for: ${callbackType}`);
              adobeDCView.registerCallback(
                callbackType,
                async function(event?: any) {
                  console.log(`Selection callback triggered (${callbackType}):`, event);
                  await handleSelectionCallback(viewer);
                },
                { enableFilePreviewEvents: true }
              );
            } catch (error) {
              console.warn(`Failed to register ${callbackType} callback:`, error);
            }
          }

          // Method 3: Event listener approach
          if (window.AdobeDC?.Enum?.CallbackType?.EVENT_LISTENER) {
            console.log("Setting up event listener callback...");
            adobeDCView.registerCallback(
              window.AdobeDC.Enum.CallbackType.EVENT_LISTENER,
              async function(event: any) {
                console.log("Event listener triggered:", event);
                if (event && (
                  event.type === 'PREVIEW_SELECTION_END' || 
                  event.type === 'TEXT_SELECTION_END' ||
                  event.type === 'SELECTION_END'
                )) {
                  console.log(`Handling selection event: ${event.type}`);
                  await handleSelectionCallback(viewer);
                }
              },
              { enableFilePreviewEvents: true }
            );
          }

          // Method 4: Direct polling as backup (most reliable fallback)
          let isPolling = false;
          const startPolling = () => {
            if (isPolling) return;
            isPolling = true;
            
            console.log("Starting selection polling as fallback...");
            const pollForSelection = async () => {
              try {
                const apis = await viewer.getAPIs();
                const result = await apis.getSelectedContent();
                
                if (result && result.data && result.data.length > 0) {
                  const selectedText = result.data[0].Text?.trim();
                  if (selectedText && selectedText.length > 5) { // Minimum text length
                    console.log("Polling detected selection:", selectedText);
                    isPolling = false; // Stop polling temporarily
                    showSelectionNotification(selectedText);
                    await triggerSearchWithSelectedText(selectedText);
                    
                    // Resume polling after a delay
                    setTimeout(() => { isPolling = false; }, 2000);
                    return;
                  }
                }
                
                if (isPolling) {
                  setTimeout(pollForSelection, 1000); // Poll every second
                }
              } catch (error) {
                // Silent error - polling will continue
                if (isPolling) {
                  setTimeout(pollForSelection, 1000);
                }
              }
            };
            
            setTimeout(pollForSelection, 2000); // Start after PDF loads
          };

          // Start polling after a delay to let PDF fully load
          setTimeout(startPolling, 3000);

          // Method 5: Manual trigger button as ultimate fallback
          setTimeout(() => {
            addManualSelectionButton(viewer);
          }, 2000);

        } catch (error) {
          console.error("Error setting up PDF selection callbacks:", error);
        }
      }).catch(() => {
        console.error("Error loading PDF preview:");
      });

      setIsLoadingPdf(false);
    } catch (error) {
      console.error("Error creating Adobe viewer:", error);
      alert("Error loading PDF viewer: " + (error instanceof Error ? error.message : "Unknown error"));
      setIsLoadingPdf(false);
    }
  }, 500);
};

const addManualSelectionButton = (viewer: any) => {
  const viewerContainer = document.getElementById('adobe-dc-view');
  if (!viewerContainer) return;

  // Remove existing button if any
  const existingButton = document.getElementById('manual-selection-btn');
  if (existingButton) existingButton.remove();

  const button = document.createElement('button');
  button.id = 'manual-selection-btn';
  button.innerHTML = `
    <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    Get Selected Text
  `;
  button.className = `
    fixed top-20 left-1/2 transform -translate-x-1/2 z-50
    bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg
    flex items-center text-sm font-medium transition-all duration-200
    hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500
  `;
  
  button.onclick = async () => {
    try {
      console.log("Manual selection button clicked");
      await handleSelectionCallback(viewer);
    } catch (error) {
      console.error("Manual selection failed:", error);
      alert("Unable to get selected text. Try selecting text again.");
    }
  };

  document.body.appendChild(button);

  // Auto-hide button after 10 seconds
  setTimeout(() => {
    if (button && document.body.contains(button)) {
      button.style.opacity = '0.7';
      button.style.transform = 'translate(-50%, -50%) scale(0.9)';
    }
  }, 10000);
};

// Enhanced selection notification


const showSelectionNotification = (selectedText: string) => {
  // Remove any existing notifications
  const existingNotifications = document.querySelectorAll('.selection-notification');
  existingNotifications.forEach(n => n.remove());

  const notification = document.createElement('div');
  notification.className = 'selection-notification fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white p-4 rounded-lg shadow-xl z-50 max-w-md animate-fade-in';
  notification.innerHTML = `
    <div class="flex items-start space-x-3">
      <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
      <div class="flex-1">
        <h4 class="font-semibold">Text Selected & Searching!</h4>
        <p class="text-sm text-green-100 mt-1">
          "${selectedText.substring(0, 60)}${selectedText.length > 60 ? '...' : ''}"
        </p>
        <p class="text-xs text-green-200 mt-2">
          🔍 Finding relevant sections across all documents...
        </p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="text-green-200 hover:text-white">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
        </svg>
      </button>
    </div>
  `;

  document.body.appendChild(notification);

  // Remove notification after 5 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.opacity = '0';
      notification.style.transform = 'translate(-50%, -10px) scale(0.95)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }
  }, 5000);
};

const handleSelectionCallback = async (viewer: any) => {
  try {
    console.log("Processing text selection...");
    const apis = await viewer.getAPIs();
    const selectedContent = await apis.getSelectedContent();
    
    console.log("Selected content result:", selectedContent);
    
    let selectedText = '';
    
    // Try different ways to extract the selected text based on API response format
    if (selectedContent) {
      // Method 1: Direct data property (what we're seeing in console)
      if (typeof selectedContent.data === 'string') {
        selectedText = selectedContent.data.trim();
        console.log("Extracted text (method 1):", selectedText);
      }
      // Method 2: Array format with Text property
      else if (selectedContent.data && Array.isArray(selectedContent.data) && selectedContent.data.length > 0) {
        if (selectedContent.data[0].Text) {
          selectedText = selectedContent.data[0].Text.trim();
          console.log("Extracted text (method 2):", selectedText);
        } else if (typeof selectedContent.data[0] === 'string') {
          selectedText = selectedContent.data[0].trim();
          console.log("Extracted text (method 3):", selectedText);
        }
      }
      // Method 3: Check if selectedContent itself has text
      else if (selectedContent.text) {
        selectedText = selectedContent.text.trim();
        console.log("Extracted text (method 4):", selectedText);
      }
    }
    
    console.log("Final extracted text:", selectedText);
    
    if (selectedText && selectedText.length > 3) { // Minimum meaningful text
      showSelectionNotification(selectedText);
      await triggerSearchWithSelectedText(selectedText);
    } else {
      console.log("Selected text too short or empty, length:", selectedText?.length);
    }
  } catch (error) {
    console.error("Error processing selection:", error);
  }
};

  // Close PDF viewer
  const closePdfViewer = (): void => {
    setViewingPdf(null);
    const viewerContainer = window.document.getElementById('adobe-dc-view');
    if (viewerContainer) {
      viewerContainer.innerHTML = '';
    }
  };

 const triggerSearchWithSelectedText = async (selectedText: string) => {
  if (!selectedText || selectedText.trim().length === 0) {
    console.log('No text selected');
    return;
  }

  // Clean up the selected text
  const cleanedText = selectedText.trim();
  
  // Validate text length
  if (cleanedText.length < 3) {
    console.log('Selected text too short for meaningful search');
    return;
  }

  console.log('Triggering search with selected text:', cleanedText);
  
  // Set the search text
  setSearchText(cleanedText);
  setSelectedPdfText(cleanedText);
  
  // Show search panel if hidden
  if (!showSearchPanel) {
    setShowSearchPanel(true);
  }

  // Auto-trigger the search
  if (documents.filter(d => d.file).length > 0) {
    setIsSearching(true);
    
    try {
      const validDocuments = documents.filter(doc => doc.file);
      
      // Extract text from all PDFs
      const documentContents = await Promise.all(
        validDocuments.map(async (doc) => {
          const text = await extractTextFromPDF(doc.file!);
          return {
            name: doc.name,
            content: text,
            size: text.length
          };
        })
      );

      // Use Gemini to find relevant sections
      const relevantSections = await findRelevantSections(documentContents, cleanedText);
      setRelevantSections(relevantSections);
      
      // Show success notification
      if (relevantSections.length > 0) {
        setTimeout(() => {
          const successNotification = document.createElement('div');
          successNotification.className = 'fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-lg shadow-lg z-50 animate-fade-in';
          successNotification.innerHTML = `
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm">Found ${relevantSections.length} relevant sections!</span>
            </div>
          `;
          document.body.appendChild(successNotification);
          
          setTimeout(() => {
            if (document.body.contains(successNotification)) {
              document.body.removeChild(successNotification);
            }
          }, 3000);
        }, 1000);
      }
      
    } catch (error) {
      console.error('Error searching content:', error);
      alert('Error searching content: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSearching(false);
    }
  }
};



  // Show navigation alert
  const showNavigationAlert = (section: RelevantSection) => {
    const navigationAlert = window.document.createElement('div');
    navigationAlert.className =
      'fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
    navigationAlert.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 
            00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 
            00-1.414 1.414l2 2a1 1 0 
            001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
        </div>
        <div>
          <h4 class="font-semibold">Found Section</h4>
          <p class="text-sm text-blue-100 mt-1">
            ${section.documentName}<br>
            Page ${section.pageNumber} • ${section.relevanceScore}% match
          </p>
        </div>
      </div>`;
    window.document.body.appendChild(navigationAlert);
    setTimeout(() => {
      if (window.document.body.contains(navigationAlert)) {
        window.document.body.removeChild(navigationAlert);
      }
    }, 5000);
  };

  // Audio functions
  const generateAndPlayAudio = async () => {
    if (!geminiAnalysis?.audioScript) return;

    setAudioState(prev => ({ ...prev, isGenerating: true }));

    try {
      // Stop any existing speech
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(geminiAnalysis.audioScript);
      utterance.rate = 0.85;
      utterance.pitch = 1;
      utterance.volume = 0.9;

      // Set voice (try to get a good English voice)
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.includes('Natural')
      ) || voices.find(voice => voice.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setAudioState(prev => ({
          ...prev,
          isPlaying: true,
          isPaused: false,
          isGenerating: false
        }));
      };

      utterance.onend = () => {
        setAudioState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          isGenerating: false
        }));
      };

      utterance.onerror = () => {
        setAudioState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          isGenerating: false
        }));
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);

    } catch (error) {
      console.error('Error generating audio:', error);
      setAudioState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const pauseAudio = () => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setAudioState(prev => ({ ...prev, isPaused: true, isPlaying: false }));
    }
  };

  const resumeAudio = () => {
    if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setAudioState(prev => ({ ...prev, isPaused: false, isPlaying: true }));
    }
  };

  const stopAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setAudioState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentTime: 0
    }));
  };

  // Utility functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    else if (days === 1) return 'Yesterday';
    else if (days < 7) return `${days} days ago`;
    else return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const handleDeleteDocument = (e: React.MouseEvent, documentId: number) => {
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this document?')) {
      setDocuments(prev => {
        const updated = prev.filter(doc => doc.id !== documentId);
        
        const docToDelete = prev.find(doc => doc.id === documentId);
        if (docToDelete?.url && docToDelete.url.startsWith('blob:')) {
          URL.revokeObjectURL(docToDelete.url);
        }
        
        try {
          const toSave = updated.map(doc => ({
            ...doc,
            fileData: doc.fileData ? Array.from(new Uint8Array(doc.fileData as ArrayBuffer)) : undefined,
            file: null
          }));
          
          localStorage.setItem('uploadedDocuments', JSON.stringify(toSave));
        } catch (error) {
          console.warn('Failed to save documents to localStorage:', error);
        }
        
        return updated;
      });

      if (viewingPdf?.id === documentId) {
        setViewingPdf(null);
      }
    }
  };

  const calculateContentWidth = (): string => {
    let width = '100%';
    
    if (showDocumentLibrary && showSearchPanel) {
      width = `calc(100% - ${libraryWidth + searchWidth + 16}px)`;
    } else if (showDocumentLibrary && !showSearchPanel) {
      width = `calc(100% - ${libraryWidth + 8}px)`;
    } else if (!showDocumentLibrary && showSearchPanel) {
      width = `calc(100% - ${searchWidth + 8}px)`;
    }
    
    return width;
  };

  // Resizing functionality
  const handleLibraryMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingLibrary || !containerRef.current) return;
    
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      
      const minWidth = viewingPdf ? 400 : 300;
      const maxWidth = viewingPdf ? containerRect.width * 0.7 : containerRect.width * 0.5;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setLibraryWidth(newWidth);
      }
    });
  }, [isResizingLibrary, viewingPdf]);

  const handleSearchMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingSearch || !containerRef.current) return;
    
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      
      const minWidth = 300;
      const maxWidth = containerRect.width * 0.4;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSearchWidth(newWidth);
      }
    });
  }, [isResizingSearch]);

  const handleLibraryMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLibrary(true);
  }, []);

  const handleSearchMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSearch(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsResizingLibrary(false);
    setIsResizingSearch(false);
  }, []);

  // Add mouse event listeners
  useEffect(() => {
    if (isResizingLibrary) {
      document.addEventListener('mousemove', handleLibraryMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    if (isResizingSearch) {
      document.addEventListener('mousemove', handleSearchMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleLibraryMouseMove);
      document.removeEventListener('mousemove', handleSearchMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLibrary, isResizingSearch, handleLibraryMouseMove, handleSearchMouseMove, handleMouseUp]);

  return (
    <>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-pulse-slow { animation: pulse 2s ease-in-out infinite; }
        
        .processing-gradient {
          background: linear-gradient(-45deg, #ee7724, #d8363a, #dd3675, #b44593);
          background-size: 400% 400%;
          animation: gradient 4s ease infinite;
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .scrollbar-thin { scrollbar-width: thin; }
        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <div className="min-h-screen bg-gray-50">
        {/* Navigation Bar */}
        <nav className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <Brain className="h-6 w-6 text-purple-600" />
                <span className="text-xl font-bold text-gray-900">GetWhatMatters</span>
              </div>
              
              <nav className="flex space-x-8">
                <a href="/" className="text-gray-500 hover:text-red-600 px-3 py-2 text-sm font-medium">Documents</a>
                <a href="/ideacloud" className="text-gray-500 hover:text-red-600 px-3 py-2 text-sm font-medium">IdeaCloud</a>
                <a href="/connectdots" className="text-gray-500 hover:text-red-600 px-3 py-2 text-sm font-medium">GetWhatMatters</a>
                <a href="/getwhatmatters" className="text-gray-900 hover:text-red-600 px-3 py-2 text-sm font-medium border-b-2 border-red-600">ConnectingDots</a>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSearchPanel(!showSearchPanel)}
                className="inline-flex items-center px-3 py-2 border border-purple-300 shadow-sm text-sm leading-4 font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 hover:scale-105"
              >
                <FileSearch className="h-4 w-4 mr-2" />
                {showSearchPanel ? "Hide Search" : "Show Search"}
              </button>
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
              <button
                onClick={() => setShowDocumentLibrary(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center space-x-1 bg-white border border-gray-200 shadow-sm"
                title="Hide Library"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
                <span className="text-xs text-gray-600">Hide</span>
              </button>
              
              {viewingPdf ? (
                /* PDF Viewer in Left Panel */
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={closePdfViewer}
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Back to Document Library"
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-600" />
                      </button>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        viewingPdf.status === 'new' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        {viewingPdf.status === 'new' ? (
                          <BookOpen className="h-4 w-4 text-blue-600" />
                        ) : (
                          <BookOpenCheck className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">{viewingPdf.name}</h2>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(viewingPdf.size)} • Added {formatDate(viewingPdf.uploadDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 relative overflow-hidden">
                    {isLoadingPdf && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-20">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                          <p className="text-sm text-gray-600">Loading PDF...</p>
                        </div>
                      </div>
                    )}
                    <div 
                      id="adobe-dc-view" 
                      className="w-full h-full min-h-[500px]" 
                      style={{ 
                        transition: 'width 0.2s ease-out',
                        overflow: 'hidden'
                      }}
                    ></div>
                  </div>
                </div>
              ) : (
                /* Document Library */
                <>
                  <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                      <FileSearch className="h-6 w-6 mr-2 text-blue-600" />
                      Document Library
                    </h1>
                    <p className="text-sm text-gray-600 mb-4">Upload PDFs to search and analyze content</p>
                    
                   
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                    {documents.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No documents uploaded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {documents.map((doc: Document) => (
                          <div
                            key={doc.id}
                            className={`cursor-pointer rounded-lg border transition-all duration-200 hover:shadow-sm p-3 group ${
                              (viewingPdf as Document | null)?.id === doc.id
                                ? 'border-purple-500 bg-purple-50 shadow-sm' 
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div 
                                className="flex-shrink-0"
                                onClick={() => (doc.file || doc.fileData) && openPdfViewer(doc)}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  (doc.file || doc.fileData) ? 
                                    (doc.status === 'new' ? 'bg-blue-100' : 'bg-green-100') : 
                                    'bg-red-100'
                                }`}>
                                  {(doc.file || doc.fileData) ? (
                                    doc.status === 'new' ? (
                                      <BookOpen className="h-4 w-4 text-blue-600" />
                                    ) : (
                                      <BookOpenCheck className="h-4 w-4 text-green-600" />
                                    )
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                  )}
                                </div>
                              </div>
                              <div 
                                className="flex-1 min-w-0"
                                onClick={() => (doc.file || doc.fileData) && openPdfViewer(doc)}
                              >
                                <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-xs text-gray-500">{formatFileSize(doc.size)}</span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    (doc.file || doc.fileData) ? 
                                      (doc.status === 'new' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800') :
                                      'bg-red-100 text-red-800'
                                  }`}>
                                    {(doc.file || doc.fileData) ? (doc.status === 'new' ? 'Unread' : 'Read') : 'Unavailable'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {(doc.file || doc.fileData) && (
                                  <button
                                    onClick={() => openPdfViewer(doc)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                    title="View PDF"
                                  >
                                    <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => handleDeleteDocument(e, doc.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
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

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </>
              )}
            </div>
          )}

          {/* Library Resizer */}
          {showDocumentLibrary && (
            <div
              ref={libraryResizerRef}
              className={`w-2 bg-gray-100 hover:bg-gray-300 cursor-col-resize flex items-center justify-center transition-all duration-150 ${
                isResizingLibrary ? 'bg-purple-300 w-3' : ''
              }`}
              onMouseDown={handleLibraryMouseDown}
            >
              <GripVertical className={`h-6 w-6 text-gray-400 transition-all duration-150 ${
                isResizingLibrary ? 'text-purple-600 scale-110' : ''
              }`} />
            </div>
          )}

          {/* Show Library Button when hidden */}
          {!showDocumentLibrary && (
            <div className="absolute top-20 left-4 z-10 animate-fade-in">
              <button
                onClick={() => setShowDocumentLibrary(true)}
                className="p-3 rounded-lg hover:bg-gray-100 transition-all duration-200 flex items-center space-x-2 bg-white border border-gray-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                title="Show Library"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
                <span className="text-sm text-gray-600">Show Library</span>
              </button>
            </div>
          )}

          {/* Main Content Area */}
          <div 
            className="flex-1 bg-gray-100 transition-all duration-300 ease-out flex flex-col"
            style={{ width: calculateContentWidth() }}
          >
            {/* Main Analysis Display */}
            <div className="flex-1 overflow-y-auto p-6">
              {isSearching ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Searching Documents</h2>
                    <p className="text-gray-600">Analyzing content for relevant sections...</p>
                  </div>
                </div>
              ) : isAnalyzing ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating Analysis</h2>
                    <p className="text-gray-600">Creating insights from selected sections...</p>
                  </div>
                </div>
              ) : geminiAnalysis ? (
                /* Analysis Results Display */
                <div className="max-w-6xl mx-auto">
                  <div className="mb-8 text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Analysis Results</h1>
                    <p className="text-gray-600">
                      Insights from {selectedSections.length} selected sections • Search: "{searchText}"
                    </p>
                    
                    {/* Audio Controls */}
                    <div className="flex items-center justify-center space-x-4 mt-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                      <div className="flex items-center space-x-2">
                        <Headphones className="h-5 w-5 text-purple-600" />
                        <span className="font-medium text-gray-900">Audio Overview</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {audioState.isGenerating ? (
                          <button disabled className="p-2 bg-gray-100 rounded-lg cursor-not-allowed">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                          </button>
                        ) : audioState.isPlaying ? (
                          <>
                            <button
                              onClick={pauseAudio}
                              className="p-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                            >
                              <Pause className="h-4 w-4 text-purple-600" />
                            </button>
                            <button
                              onClick={stopAudio}
                              className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                            >
                              <Square className="h-4 w-4 text-red-600" />
                            </button>
                          </>
                        ) : audioState.isPaused ? (
                          <>
                            <button
                              onClick={resumeAudio}
                              className="p-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                            >
                              <Play className="h-4 w-4 text-green-600" />
                            </button>
                            <button
                              onClick={stopAudio}
                              className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                            >
                              <Square className="h-4 w-4 text-red-600" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={generateAndPlayAudio}
                            className="p-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                          >
                            <Play className="h-4 w-4 text-purple-600" />
                          </button>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {audioState.isPlaying ? 'Playing...' : 
                         audioState.isPaused ? 'Paused' : 
                         audioState.isGenerating ? 'Generating...' : 'Ready to play'}
                      </span>
                    </div>
                  </div>

                  {/* Analysis Grid */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Key Takeaways */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <Target className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Key Takeaways</h3>
                          <p className="text-sm text-gray-500">Main insights from your search</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {geminiAnalysis.keyTakeaways?.map((takeaway: string, index: number) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                              {index + 1}
                            </div>
                            <p className="text-blue-900 text-sm leading-relaxed">{takeaway}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Did You Know Facts */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                          <Lightbulb className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Did You Know?</h3>
                          <p className="text-sm text-gray-500">Interesting facts discovered</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {geminiAnalysis.didYouKnowFacts?.map((fact: string, index: number) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                              {index + 1}
                            </div>
                            <p className="text-yellow-900 text-sm leading-relaxed">{fact}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Contradictions/Counterpoints */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Contradictions & Counterpoints</h3>
                          <p className="text-sm text-gray-500">Conflicting viewpoints found</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {geminiAnalysis.contradictionsCounterpoints?.map((contradiction: string, index: number) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                              {index + 1}
                            </div>
                            <p className="text-red-900 text-sm leading-relaxed">{contradiction}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Examples */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                          <Quote className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Examples</h3>
                          <p className="text-sm text-gray-500">Concrete examples from documents</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {geminiAnalysis.examples?.map((example: string, index: number) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                              {index + 1}
                            </div>
                            <p className="text-green-900 text-sm leading-relaxed">{example}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cross-Document Inspirations */}
                  <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Cross-Document Inspirations</h3>
                        <p className="text-sm text-gray-500">Connections discovered across documents</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {geminiAnalysis.crossDocumentInspirations?.map((inspiration: string, index: number) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                            {index + 1}
                          </div>
                          <p className="text-purple-900 text-sm leading-relaxed">{inspiration}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {geminiAnalysis.unreadPdfSummary && (
  <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <div className="flex items-center mb-4">
      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
        <BookOpen className="h-5 w-5 text-orange-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Unread PDFs Analysis</h3>
        <p className="text-sm text-gray-500">Relevant content in your unread documents</p>
      </div>
    </div>
    <div className="bg-orange-50 rounded-lg p-4">
      <p className="text-orange-900 text-sm leading-relaxed whitespace-pre-line">
        {geminiAnalysis.unreadPdfSummary}
      </p>
    </div>
  </div>
)}

                </div>
              ) : (
                /* Welcome Screen */
                <div className="flex items-center justify-center h-full">
                  <div className="text-center bg-white bg-opacity-90 p-8 rounded-xl shadow-lg max-w-2xl mx-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                      <FileSearch className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">ConnectingTheDots</h3>
                    <div className="text-gray-600 space-y-4 text-left">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
                        <div className="space-y-2 text-sm">
                          <p>• Upload your PDF documents to build your knowledge base</p>
                          <p>• Paste or type your search text in the right panel</p>
                          <p>• AI finds the top 5 most relevant sections across all documents</p>
                          <p>• Select sections to generate comprehensive insights</p>
                          <p>• Listen to AI-generated podcast-style audio overviews</p>
                        </div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-900 mb-2">Analysis Features:</h4>
                        <div className="space-y-2 text-sm">
                          <p>• Key takeaways from selected content</p>
                          <p>• "Did you know?" interesting facts</p>
                          <p>• Contradictions and counterpoints</p>
                          <p>• Real examples from your documents</p>
                          <p>• Cross-document connections and inspirations</p>
                          <p>• Audio podcast overview of findings</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-400">
                      <span>Powered by</span>
                      <span className="font-semibold text-purple-600">Gemini AI + Advanced Text Search</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search Resizer */}
          {showSearchPanel && (
            <div
              ref={searchResizerRef}
              className={`w-2 bg-gray-100 hover:bg-gray-300 cursor-col-resize flex items-center justify-center transition-all duration-150 ${
                isResizingSearch ? 'bg-blue-300 w-3' : ''
              }`}
              onMouseDown={handleSearchMouseDown}
            >
              <GripVertical className={`h-6 w-6 text-gray-400 transition-all duration-150 ${
                isResizingSearch ? 'text-blue-600 scale-110' : ''
              }`} />
            </div>
          )}

          {/* Right Sidebar - Search Panel */}
          {showSearchPanel && (
            <div 
              className="bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ease-out"
              style={{ width: `${searchWidth}px` }}
            >
              {/* Search Header */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Content Search</h3>
                      <p className="text-xs text-gray-500">Find relevant sections</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSearchPanel(false)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Close Search"
                  >
                    <X className="h-4 w-4 text-gray-600" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Text
                    </label>
                   <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Search Text
    {selectedPdfText && (
      <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
        From PDF Selection
      </span>
    )}
  </label>
  <textarea
    placeholder="Paste or type your search query here... (e.g., 'project management best practices', 'software development lifecycle', etc.)"
    value={searchText}
    onChange={(e) => {
      setSearchText(e.target.value);
      // Clear the PDF selection indicator if user manually changes text
      if (e.target.value !== selectedPdfText) {
        setSelectedPdfText('');
      }
    }}
    rows={4}
    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none transition-all duration-200 ${
      selectedPdfText ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
    }`}
  />
  {selectedPdfText && (
    <p className="text-xs text-blue-600 mt-1 flex items-center">
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      Text automatically populated from PDF selection
    </p>
  )}
</div>
                  </div>
                  <button
                    onClick={searchRelevantContent}
                    disabled={isSearching || !searchText.trim() || documents.filter(d => d.file).length === 0}
                    className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                      isSearching
                        ? 'processing-gradient text-white cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {isSearching ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        <span>Find Relevant Sections</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Relevant Sections */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {relevantSections.length > 0 && (
                  <div className="p-4 border-b border-gray-200">
                   <div className="flex items-center justify-between mb-3">
  <h4 className="text-sm font-semibold text-gray-900">
    Top Relevant Sections ({relevantSections.length})
  </h4>
  <button
    onClick={() => generateAnalysis(selectedSections)}
    disabled={isAnalyzing}
    className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
      !isAnalyzing
        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600'
        : 'bg-gray-400 text-white cursor-not-allowed'
    }`}
  >
    {isAnalyzing ? 'Analyzing...' : selectedSections.length > 0 ? `Analyze ${selectedSections.length}` : 'Analyze All'}
  </button>
</div>
                  </div>
                )}

                <div className="p-4 space-y-4">
                  {relevantSections.map((section, index) => (
                    <div
                      key={section.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                        selectedSections.find(s => s.id === section.id)
                          ? 'border-purple-500 bg-purple-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            section.relevanceScore >= 90 ? 'bg-green-500' :
                            section.relevanceScore >= 80 ? 'bg-blue-500' :
                            section.relevanceScore >= 70 ? 'bg-yellow-500' : 'bg-orange-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            section.relevanceScore >= 90 ? 'bg-green-100 text-green-700' :
                            section.relevanceScore >= 80 ? 'bg-blue-100 text-blue-700' :
                            section.relevanceScore >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {section.relevanceScore}%
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSectionSelection(section);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              selectedSections.find(s => s.id === section.id)
                                ? 'bg-purple-100 text-purple-600'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={selectedSections.find(s => s.id === section.id) ? 'Remove from analysis' : 'Add to analysis'}
                          >
                            <Bookmark className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToSection(section);
                            }}
                            className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            title="Go to PDF section"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div onClick={() => toggleSectionSelection(section)}>
                        <h5 className="font-semibold text-gray-900 text-sm mb-2">{section.title}</h5>
                        <p className="text-gray-700 text-xs leading-relaxed mb-3">{section.content}</p>
                        
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Document:</span>
                            <span className="font-medium text-blue-600 truncate ml-2">{section.documentName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Location:</span>
                            <span className="font-medium text-purple-600">Page {section.pageNumber}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Type:</span>
                            <span className="font-medium text-green-600">{section.sectionType}</span>
                          </div>
                        </div>

                        {section.matchedKeywords && section.matchedKeywords.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-gray-100">
                            <div className="flex flex-wrap gap-1">
                              {section.matchedKeywords.slice(0, 3).map((keyword, i) => (
                                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-600 italic">{section.context}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {relevantSections.length === 0 && searchText && !isSearching && (
                    <div className="text-center py-8">
                      <Search className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No relevant sections found</p>
                      <p className="text-xs text-gray-400 mt-1">Try refining your search query</p>
                    </div>
                  )}

                  {documents.filter(d => d.file).length === 0 && (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No documents available</p>
                      <p className="text-xs text-gray-400 mt-1">Upload PDFs to start searching</p>
                    </div>
                  )}

                  {!searchText && documents.filter(d => d.file).length > 0 && (
                    <div className="text-center py-8">
                      <Search className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Enter search text above</p>
                      <p className="text-xs text-gray-400 mt-1">Describe what you're looking for</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Sections Summary */}
             {relevantSections.length > 0 && (
  <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
    {selectedSections.length > 0 ? (
      <>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">
            {selectedSections.length} section{selectedSections.length > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setSelectedSections([])}
            className="text-xs text-red-600 hover:text-red-700"
          >
            Clear all
          </button>
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {selectedSections.slice(0, 3).map((section, i) => (
            <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs truncate max-w-20">
              {section.title}
            </span>
          ))}
          {selectedSections.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
              +{selectedSections.length - 3} more
            </span>
          )}
        </div>
      </>
    ) : (
      <div className="mb-3">
        <span className="text-sm font-medium text-gray-700">
          No sections selected - will analyze all {relevantSections.length} sections
        </span>
      </div>
    )}
    <button
      onClick={() => generateAnalysis(selectedSections.length > 0 ? selectedSections : relevantSections)}
      disabled={isAnalyzing}
      className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
    >
      {isAnalyzing ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Analyzing...</span>
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          <span>
            {selectedSections.length > 0 
              ? `Generate Analysis (${selectedSections.length})`
              : `Generate Analysis (All ${relevantSections.length})`
            }
          </span>
        </>
      )}
    </button>
  </div>
)}
            </div>
          )}

          {/* Show Search Button when hidden */}
          {!showSearchPanel && (
            <div className="absolute top-20 right-4 z-10 animate-fade-in">
              <button
                onClick={() => setShowSearchPanel(true)}
                className="p-3 rounded-lg hover:bg-gray-100 transition-all duration-200 flex items-center space-x-2 bg-white border border-gray-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                title="Show Search Panel"
              >
                <span className="text-sm text-gray-600">Show Search</span>
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ConnectingTheDots;