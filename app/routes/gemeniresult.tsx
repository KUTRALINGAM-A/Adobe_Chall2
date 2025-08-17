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

let adobePreviewPromise: any = null;

// IndexedDB wrapper for better storage
class DocumentStorage {
  private dbName = 'ConnectingDotsDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('documents')) {
          const store = db.createObjectStore('documents', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  async saveDocument(doc: Document): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      const request = store.put(doc);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllDocuments(): Promise<Document[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deleteDocument(id: number): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      const request = store.delete(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

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
  fileData?: ArrayBuffer;
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

  // IndexedDB storage instance
  const storage = useRef(new DocumentStorage());

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
      if (window.pdfjsLib) {
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


  useEffect(() => {
  // Adobe PDF Embed API
  const adobeScript = document.createElement('script');
  adobeScript.src = 'https://documentservices.adobe.com/view-sdk/viewer.js';
  adobeScript.async = true;
  document.body.appendChild(adobeScript);

  // PDF.js for text extraction
  const pdfScript = document.createElement('script');
  pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  pdfScript.async = true;
  pdfScript.onload = () => {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  };
  document.head.appendChild(pdfScript);

  return () => {
    // Cleanup scripts
    if (document.body.contains(adobeScript)) {
      document.body.removeChild(adobeScript);
    }
    if (document.head.contains(pdfScript)) {
      document.head.removeChild(pdfScript);
    }
  };
}, []);



  // Load documents from IndexedDB on component mount
 useEffect(() => {
  const loadDocuments = async () => {
    try {
      await storage.current.init();
      const savedDocuments = await storage.current.getAllDocuments();
      
      // Reconstruct blob URLs for viewing
      const reconstructedDocuments = savedDocuments.map((doc) => {
        if (doc.fileData && !doc.url.startsWith('blob:')) {
          const blob = new Blob([doc.fileData], { type: 'application/pdf' });
          const file = new File([blob], doc.name, { type: 'application/pdf' });
          return {
            ...doc,
            file,
            url: URL.createObjectURL(blob)
          };
        }
        return doc;
      });
      
      setDocuments(reconstructedDocuments);
    } catch (error) {
      console.error('Error loading documents from IndexedDB:', error);
    }
  };
  
  loadDocuments();
}, []);

  // Upload mode selection and file upload handlers
  const handleUploadModeSelect = (mode: UploadMode): void => {
    setUploadMode(mode);
    if (mode && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

const handleFileUpload = async (event) => {
  if (!event.target.files || !uploadMode) return;
  
  const files = Array.from(event.target.files);
  setIsUploading(true);

  try {
    const newDocuments = await Promise.all(
      files.map(async (file) => {
        // Convert file to ArrayBuffer for storage
        const arrayBuffer = await file.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);

        const document = {
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadDate: new Date().toISOString(),
          status: uploadMode === 'read' ? 'read' : 'new',
          file: file, // Original file object
          url: blobUrl, // Blob URL for viewing
          fileData: arrayBuffer // Raw data for persistence
        };

        // Save to IndexedDB
        await storage.current.saveDocument(document);
        return document;
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


class DocumentStorage {
  private dbName = 'ConnectingDotsDB';
  private version = 1;
  private db = null;

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('documents')) {
          const store = db.createObjectStore('documents', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  async saveDocument(doc) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      const request = store.put(doc);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllDocuments() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}

  // Extract text from PDF
const extractTextFromPDF = async (file) => {
  try {
    if (!window.pdfjsLib) {
      throw new Error('PDF.js not loaded');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => item.str)
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
${combinedContent.substring(0, 30000)} // Limit content size

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
  "confidence": 90
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
const openPdfViewer = async (document) => {
  setIsLoadingPdf(true);
  setViewingPdf(document);

  // Update document status to 'read'
  setDocuments(prev => prev.map(doc => 
    doc.id === document.id ? { ...doc, status: 'read' } : doc
  ));
  
  // Update in IndexedDB
  try {
    const updatedDoc = { ...document, status: 'read' };
    await storage.current.saveDocument(updatedDoc);
  } catch (error) {
    console.error('Error updating document status:', error);
  }

  // Clear previous viewer
  const viewerContainer = window.document.getElementById('adobe-dc-view');
  if (viewerContainer) {
    viewerContainer.innerHTML = '';
  }

  setTimeout(() => {
    if (window.AdobeDC) {
      try {
        const adobeDCView = new window.AdobeDC.View({
          clientId: "82a5500aa5d945049893aec8a2514446", // Replace with your client ID
          divId: "adobe-dc-view"
        });

        // Get PDF URL - try multiple sources
        let pdfUrl = document.url;
        if (!pdfUrl || !pdfUrl.startsWith('blob:')) {
          if (document.file && document.file instanceof File) {
            pdfUrl = URL.createObjectURL(document.file);
          } else if (document.fileData) {
            const blob = new Blob([document.fileData], { type: 'application/pdf' });
            pdfUrl = URL.createObjectURL(blob);
          } else {
            throw new Error('No file data available for PDF viewing');
          }
        }

        // Configure and load PDF viewer
        adobePreviewPromise = adobeDCView.previewFile(
          {
            content: { location: { url: pdfUrl } },
            metaData: { fileName: document.name }
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
            defaultViewMode: "FIT_WIDTH"
          }
        );

      } catch (error) {
        console.error('Error creating Adobe viewer:', error);
        alert('Error loading PDF viewer: ' + error.message);
      }
    }
    
    setIsLoadingPdf(false);
  }, 500);
};

  // Close PDF viewer
  const closePdfViewer = (): void => {
    setViewingPdf(null);
    const viewerContainer = window.document.getElementById('adobe-dc-view');
    if (viewerContainer) {
      viewerContainer.innerHTML = '';
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

  const handleDeleteDocument = async (e: React.MouseEvent, documentId: number) => {
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        // Delete from IndexedDB
        await storage.current.deleteDocument(documentId);
        
        // Update state
        setDocuments(prev => {
          const updated = prev.filter(doc => doc.id !== documentId);
          
          const docToDelete = prev.find(doc => doc.id === documentId);
          if (docToDelete?.url && docToDelete.url.startsWith('blob:')) {
            URL.revokeObjectURL(docToDelete.url);
          }
          
          return updated;
        });

        if (viewingPdf?.id === documentId) {
          setViewingPdf(null);
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Error deleting document. Please try again.');
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

  // Filter documents based on search and filter
  const filteredDocuments = documents.filter((doc: Document) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || doc.status === filterType;
    return matchesSearch && matchesFilter;
  });

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
                    
                    {/* Enhanced Upload Options */}
                    <div className="space-y-3">
  {isUploading ? (
    <div className="border-2 border-dashed border-purple-300 rounded-xl p-6 text-center bg-white">
      <div className="animate-pulse">
        <Upload className="mx-auto h-12 w-12 text-purple-400 mb-3" />
        <p className="text-sm text-gray-600">Uploading {uploadMode} documents...</p>
        <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
          <div className="processing-gradient h-2 rounded-full w-3/4"></div>
        </div>
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
        <p className="text-xs text-gray-500">Documents you have already read</p>
      </button>

      <button
        onClick={() => handleUploadModeSelect('new')}
        className="w-full border-2 border-dashed border-blue-300 rounded-xl p-4 text-center hover:border-blue-400 transition-all duration-200 cursor-pointer bg-white group hover:scale-105 hover:shadow-md"
      >
        <BookOpen className="mx-auto h-8 w-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform duration-200" />
        <p className="text-md font-medium text-gray-900 mb-1">Upload Unread PDFs</p>
        <p className="text-xs text-gray-500">New documents to read later</p>
      </button>
    </>
  )}

  <input
    ref={fileInputRef}
    type="file"
    multiple
    accept="application/pdf"
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
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setFilterType('all')}
                          className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                            filterType === 'all' 
                              ? 'bg-purple-100 text-purple-800 scale-105' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          All ({documents.length})
                        </button>
                        <button
                          onClick={() => setFilterType('new')}
                          className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                            filterType === 'new' 
                              ? 'bg-blue-100 text-blue-800 scale-105' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Unread PDFs - documents you haven't read yet"
                        >
                          Unread ({documents.filter((d: Document) => d.status === 'new').length})
                        </button>
                        <button
                          onClick={() => setFilterType('read')}
                          className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                            filterType === 'read' 
                              ? 'bg-green-100 text-green-800 scale-105' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Read PDFs - documents you have already read"
                        >
                          Read ({documents.filter((d: Document) => d.status === 'read').length})
                        </button>
                      </div>

                      <div className="flex space-x-1">
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`p-1 rounded transition-all duration-200 ${
                            viewMode === 'grid' 
                              ? 'bg-purple-100 text-purple-600 scale-110' 
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <Grid className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={`p-1 rounded transition-all duration-200 ${
                            viewMode === 'list' 
                              ? 'bg-purple-100 text-purple-600 scale-110' 
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <List className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                    {filteredDocuments.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">
                          {documents.length === 0 
                            ? "No documents uploaded yet" 
                            : "No documents match your search"
                          }
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {documents.length === 0 
                            ? "Choose upload option above to get started" 
                            : "Try adjusting your search or filters"
                          }
                        </p>
                      </div>
                    ) : (
                      <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-4' : 'space-y-2'}>
  {filteredDocuments.map((doc) => (
    <div
      key={doc.id}
      className="cursor-pointer rounded-lg border transition-all duration-200 hover:shadow-sm p-3 group border-gray-200 bg-white hover:border-gray-300"
      onClick={() => (doc.file || doc.fileData) && openPdfViewer(doc)}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
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
        <div className="flex-1 min-w-0">
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
          <p className="text-xs text-gray-400 mt-1">Added {formatDate(doc.uploadDate)}</p>
        </div>
      </div>
    </div>
  ))}
</div>
                    )}
                  </div>
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
                    <textarea
                      placeholder="Paste or type your search query here... (e.g., 'project management best practices', 'software development lifecycle', etc.)"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                    />
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
                      {selectedSections.length > 0 && (
                        <button
                          onClick={() => generateAnalysis(selectedSections)}
                          disabled={isAnalyzing}
                          className="px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-md text-xs font-medium hover:from-purple-600 hover:to-blue-600 disabled:opacity-50"
                        >
                          {isAnalyzing ? 'Analyzing...' : `Analyze ${selectedSections.length}`}
                        </button>
                      )}
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
              {selectedSections.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
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
                  <button
                    onClick={() => generateAnalysis(selectedSections)}
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
                        <span>Generate Analysis</span>
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