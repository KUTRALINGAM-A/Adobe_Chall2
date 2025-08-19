import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Upload, FileText, Grid, List, Search, Plus, Eye, Download, ChevronLeft, ChevronRight, 
  BookOpen, BookOpenCheck, GripVertical, MessageCircle, Send, Bot, User, X, Minimize2, Maximize2,
  Move, Square, Circle, Diamond, Triangle, ArrowRight, Palette, Save, Image, Trash2, Copy,
  ZoomIn, ZoomOut, RotateCcw, MousePointer, Type, Layers, Settings, Play, Volume2, VolumeX,
  Target, Brain, Zap, ExternalLink, CheckCircle, Clock, TrendingUp, Briefcase, AlertCircle,Building,Lightbulb,Star,Globe,Award,Users,Sparkles, CheckCircle2, AlertTriangle, Info, FileDown} from 'lucide-react';


// Add Gemini API configuration after the API_BASE_URL constant
const GEMINI_API_KEY = 'AIzaSyA4vvBvLJqeWe6SiVBf0Od79JmbBHHdFBU';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

// Adobe DC View type declaration


let adobePreviewPromise: any = null;
// API Configuration
const API_BASE_URL = 'http://localhost:8000';

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

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  type: 'start' | 'process' | 'decision' | 'end';
  x: number;
  y: number;
  width: number;
  height: number;
  connections: string[];
}

interface RelevantSection {
  id: string;
  title: string;
  content: string;
  documentName: string;
  accuracy: number;
  pageNumber: number;
  section: string;
  relevanceReason: string;
}


interface PDFTextItem {
  str: string;
  dir?: string;
  width?: number;
  height?: number;
  transform?: number[];
  fontName?: string;
}

interface PDFTextContent {
  items: (PDFTextItem | string)[];
}


interface ProcessFlowResult {
  flowchart: ProcessStep[];
  sections: RelevantSection[];
  confidence: number;
  processing_time: number;
  metadata?: {
    job_title: string;
    user_query: string;
    documents_processed: number;
    total_sections_found: number;
    analysis_timestamp: string;
  };
}

const ConnectingDots: React.FC = () => {
  // State from original document manager
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showDocumentLibrary, setShowDocumentLibrary] = useState<boolean>(true);
  const [libraryWidth, setLibraryWidth] = useState<number>(400);
  const [chatWidth, setChatWidth] = useState<number>(350);
  const [isResizingLibrary, setIsResizingLibrary] = useState<boolean>(false);
  const [isResizingChat, setIsResizingChat] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [isChatMinimized, setIsChatMinimized] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [viewingPdf, setViewingPdf] = useState<Document | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [svgDimensions, setSvgDimensions] = useState({ width: 1000, height: 800 });
  const [currentFactIndex, setCurrentFactIndex] = useState<number>(0);
  const [showDetailedModal, setShowDetailedModal] = useState<boolean>(false);
const [detailedModalView, setDetailedModalView] = useState<'flow' | 'sections'>('flow');
const [geminiAnalysis, setGeminiAnalysis] = useState<GeminiAnalysis | null>(null);
const [isGeminiAnalyzing, setIsGeminiAnalyzing] = useState(false);
const [showGeminiResults, setShowGeminiResults] = useState(false);
const [analysisResults, setAnalysisResults] = useState(null);
const [showAnalysisResults, setShowAnalysisResults] = useState(false);
const [topMatchingSections, setTopMatchingSections] = useState([]);

const [showMainResults, setShowMainResults] = useState<boolean>(false);
const [isMainResultsLoading, setIsMainResultsLoading] = useState<boolean>(false);

  // ConnectingDots specific state
  const [jobTitle, setJobTitle] = useState<string>('');
  const [userQuery, setUserQuery] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processResult, setProcessResult] = useState<ProcessFlowResult | null>(null);
  const [selectedSection, setSelectedSection] = useState<RelevantSection | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showInstructions, setShowInstructions] = useState<boolean>(true);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // File input ref for manual upload
  const fileInputRef = useRef<HTMLInputElement>(null);
let adobePreviewPromise: any = null; 
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const libraryResizerRef = useRef<HTMLDivElement>(null);
  const chatResizerRef = useRef<HTMLDivElement>(null);
  const flowchartRef = useRef<SVGSVGElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);


  // Add this Adobe facts array at the top of the file
const ADOBE_FACTS = [
  {
    icon: <Building className="h-5 w-5 text-red-500" />,
    title: "Founded in 1982",
    description: "Adobe was founded by John Warnock and Charles Geschke in a garage in Mountain View, California."
  },
  {
    icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
    title: "PostScript Revolution",
    description: "Adobe's PostScript language revolutionized desktop publishing and made modern printing possible."
  },
  {
    icon: <Star className="h-5 w-5 text-purple-500" />,
    title: "Creative Cloud Ecosystem",
    description: "Over 26 million Creative Cloud subscribers worldwide trust Adobe for their creative workflows."
  },
  {
    icon: <Globe className="h-5 w-5 text-blue-500" />,
    title: "PDF Changed the World",
    description: "Portable Document Format (PDF) was created by Adobe and is now an ISO standard used globally."
  },
  {
    icon: <Award className="h-5 w-5 text-green-500" />,
    title: "Industry Leader",
    description: "Adobe holds over 10,000 patents and is recognized as one of the most innovative companies."
  },
  {
    icon: <Users className="h-5 w-5 text-indigo-500" />,
    title: "Fortune 500 Company",
    description: "Adobe serves millions of customers from individuals to Fortune 500 enterprises worldwide."
  }
];
const AdobeFactsLoader = () => {
  const currentFact = ADOBE_FACTS[currentFactIndex];

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
      <div className="w-full max-w-4xl px-6">
        {/* Main Processing Animation */}
        <div className="text-center mb-8">
          <div className="relative w-32 h-32 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-red-200 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-red-300 rounded-full animate-pulse"></div>
            <div className="absolute inset-6 processing-gradient rounded-full flex items-center justify-center">
              <Brain className="h-12 w-12 text-white animate-pulse" />
            </div>
          </div>

          <h2 className="text-3xl font-bold processing-gradient bg-clip-text text-transparent">
            Analyzing Your Documents
          </h2>
          <div className="flex items-center justify-center space-x-2 text-lg text-gray-600 mt-4">
            <Zap className="h-5 w-5 text-yellow-500 animate-pulse" />
            <span>ConnectingDots AI is processing your workflow...</span>
          </div>
        </div>

        {/* Fact Box */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-red-100 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Did You Know?</h3>
          <p className="text-gray-600 mb-4">{currentFact.title}</p>
          <p className="text-gray-700">{currentFact.description}</p>
        </div>
      </div>
    </div>
  );
};

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

  // Add this after the Adobe SDK useEffect
  useEffect(() => {
   const script = document.createElement('script');
   script.src = 'pdfjs-5.4.54-dist/build/pdf.mjs'; // Use forward slashes
   script.type = 'module'; // Add this for .mjs files
   script.async = true;
   script.onload = () => {
     if (window.pdfjsLib?.GlobalWorkerOptions) {
       window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-5.4.54-dist/build/pdf.worker.mjs';
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
  let interval: NodeJS.Timeout;
  if (isProcessing) {
    interval = setInterval(() => {
      setCurrentFactIndex((prev) => (prev + 1) % ADOBE_FACTS.length);
    }, 4000);
  }
  return () => {
    if (interval) clearInterval(interval);
  };
}, [isProcessing]);

  // Enhanced document loading with proper file reconstruction
useEffect(() => {
  const savedDocuments = localStorage.getItem('uploadedDocuments');
  console.log('=== DEBUG: Loading documents from localStorage ===');
  console.log('Raw localStorage data:', savedDocuments);
  
  if (savedDocuments) {
    try {
      const parsedDocuments = JSON.parse(savedDocuments);
      console.log('Parsed documents:', parsedDocuments);
      
      // Enhanced document reconstruction
      const reconstructedDocuments = parsedDocuments.map((doc: any) => {
        let reconstructedDoc = { ...doc };
        
        // Handle documents from the second code (base64 URLs)
        if (doc.url && doc.url.startsWith('data:application/pdf;base64,')) {
          try {
            console.log(`Reconstructing PDF from base64: ${doc.name}`);
            
            // Convert base64 to ArrayBuffer
            const base64Data = doc.url.split(',')[1];
            const binaryString = atob(base64Data);
            const arrayBuffer = new ArrayBuffer(binaryString.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            
            for (let i = 0; i < binaryString.length; i++) {
              uint8Array[i] = binaryString.charCodeAt(i);
            }
            
            // Create File object
            const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
            const file = new File([blob], doc.name, { type: 'application/pdf' });
            
            // Create new blob URL for Adobe viewer
            const newBlobUrl = URL.createObjectURL(file);
            
            reconstructedDoc.file = file;
            reconstructedDoc.fileData = arrayBuffer;
            reconstructedDoc.url = newBlobUrl;
            
            console.log(`Successfully reconstructed from base64: ${doc.name}`);
          } catch (error) {
            console.error(`Failed to reconstruct from base64 for ${doc.name}:`, error);
          }
        }
        // Handle documents with fileData array
        else if (doc.fileData && Array.isArray(doc.fileData)) {
          try {
            console.log(`Reconstructing file from fileData array: ${doc.name}`);
            
            const arrayBuffer = new Uint8Array(doc.fileData).buffer;
            const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
            const file = new File([blob], doc.name, { type: 'application/pdf' });
            
            reconstructedDoc.file = file;
            reconstructedDoc.fileData = arrayBuffer;
            
            // Create new blob URL
            if (reconstructedDoc.url && reconstructedDoc.url.startsWith('blob:')) {
              URL.revokeObjectURL(reconstructedDoc.url);
            }
            reconstructedDoc.url = URL.createObjectURL(file);
            
            console.log(`Successfully reconstructed from fileData: ${doc.name}`);
          } catch (error) {
            console.error(`Failed to reconstruct from fileData for ${doc.name}:`, error);
          }
        }
        
        return reconstructedDoc;
      });
      
      console.log('Reconstructed documents:', reconstructedDocuments);
      setDocuments(reconstructedDocuments);
      
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    }
  } else {
    console.log('No documents in localStorage');
    setDocuments([]);
  }
}, []);


  // Check API status
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
          setApiStatus('online');
        } else {
          setApiStatus('offline');
        }
      } catch (error) {
        setApiStatus('offline');
        console.warn('API health check failed:', error);
      }
    };

    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // File upload handler
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = event.target.files;
  if (!files) return;

  const newDocuments: Document[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.type === 'application/pdf') {
      try {
        const fileData = await file.arrayBuffer();
        const url = URL.createObjectURL(file);
        
        const newDocument: Document = {
          id: Date.now() + i,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadDate: new Date().toISOString(),
          status: 'new',
          file: file,
          url: url,
          fileData: fileData
        };

        newDocuments.push(newDocument);
        console.log(`Processed file: ${file.name}`);
        
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }
  }

  if (newDocuments.length > 0) {
    setDocuments(prev => {
      const updated = [...prev, ...newDocuments];
      
      // Save to localStorage with proper serialization
      try {
        const toSave = updated.map(doc => ({
          ...doc,
          // Convert ArrayBuffer to Array for JSON serialization
          fileData: doc.fileData ? Array.from(new Uint8Array(doc.fileData as ArrayBuffer)) : undefined,
          // Don't save the File object directly, we'll reconstruct it
          file: null
        }));
        
        localStorage.setItem('uploadedDocuments', JSON.stringify(toSave));
        console.log(`Saved ${updated.length} documents to localStorage`);
      } catch (error) {
        console.warn('Failed to save documents to localStorage:', error);
      }
      
      return updated;
    });
  }

  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
};
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date utility function
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };



const extractRelevantContent = async (documents: Document[], analysis: GeminiAnalysis, jobTitle: string, userQuery: string) => {
  let extractedContent = `
EXTRACTED INSIGHTS DOCUMENT
Generated by GetWhatMatters AI

Analysis Date: ${new Date().toLocaleDateString()}
Role: ${jobTitle}
Query: "${userQuery}"
Confidence: ${analysis.documentSummary?.confidence || 0}%
Documents Analyzed: ${analysis.documentSummary?.totalDocuments || 0}

${'='.repeat(80)}

KEY INSIGHTS:
${analysis.keyInsights?.map((insight, i) => `${i + 1}. ${insight}`).join('\n') || 'No key insights available'}

${'='.repeat(80)}

ADDITIONAL RELEVANT POINTS:
${analysis.additionalPoints?.map((point, i) => `${i + 1}. ${point}`).join('\n') || 'No additional points available'}

${'='.repeat(80)}

PROCESS STEPS:
${analysis.processSteps?.map((step, i) => `${i + 1}. ${step}`).join('\n') || 'No process steps available'}

${'='.repeat(80)}

RECOMMENDATIONS:
${analysis.recommendations?.map((rec, i) => `${i + 1}. ${rec}`).join('\n') || 'No recommendations available'}

${'='.repeat(80)}

GAPS & OPPORTUNITIES:
${analysis.gapsAndOpportunities?.map((gap, i) => `${i + 1}. ${gap}`).join('\n') || 'No gaps identified'}

${'='.repeat(80)}

DOCUMENT SUMMARY:
${analysis.documentSummary?.relevantSections?.map((section, i) => `${i + 1}. ${section}`).join('\n') || 'No document summary available'}

${'='.repeat(80)}

EXTRACTED CONTENT FROM SOURCE DOCUMENTS:
`;

  // Extract relevant sections from original PDFs with better error handling
  try {
    console.log(`Starting content extraction from ${documents.length} documents`);
    
    for (const doc of documents) {
      if (doc.file) {
        extractedContent += `\n\n--- CONTENT FROM: ${doc.name} ---\n`;
        console.log(`Processing document: ${doc.name}`);
        
        try {
          // Extract full text from PDF
          const fullText = await extractTextFromPDF(doc.file);
          console.log(`Extracted ${fullText.length} characters from ${doc.name}`);
          
          if (fullText && fullText.length > 0 && !fullText.startsWith('Error') && !fullText.startsWith('No readable text')) {
            // Simple relevance filtering based on query keywords
            const queryKeywords = userQuery.toLowerCase()
              .split(/\s+/)
              .filter(word => word.length > 3)
              .map(word => word.replace(/[^\w]/g, '')); // Remove special characters
            
            console.log('Query keywords:', queryKeywords);
            
            // Split into sentences and paragraphs
            const sentences = fullText.split(/[.!?]+/).filter(sentence => sentence.trim().length > 20);
            const paragraphs = fullText.split(/\n\s*\n/).filter(p => p.trim().length > 50);
            
            console.log(`Found ${sentences.length} sentences and ${paragraphs.length} paragraphs`);
            
            // Find relevant sentences based on keyword matching
            const relevantSentences = sentences.filter(sentence => {
              const lowerSentence = sentence.toLowerCase();
              return queryKeywords.some(keyword => lowerSentence.includes(keyword.toLowerCase()));
            });
            
            console.log(`Found ${relevantSentences.length} relevant sentences`);
            
            if (relevantSentences.length > 0) {
              // Use relevant sentences (limit to avoid too much text)
              const selectedSentences = relevantSentences.slice(0, 15);
              extractedContent += selectedSentences.join('. ') + '.';
              extractedContent += `\n\n[Showing ${selectedSentences.length} most relevant sentences from ${relevantSentences.length} matches]`;
            } else if (paragraphs.length > 0) {
              // If no keyword matches, include first few paragraphs
              const selectedParagraphs = paragraphs.slice(0, 3);
              extractedContent += selectedParagraphs.join('\n\n');
              extractedContent += `\n\n[Showing first 3 paragraphs - no specific keyword matches found]`;
            } else if (sentences.length > 0) {
              // Fallback to first few sentences
              const selectedSentences = sentences.slice(0, 5);
              extractedContent += selectedSentences.join('. ') + '.';
              extractedContent += `\n\n[Showing first 5 sentences as fallback]`;
            } else {
              // Last resort - show first 1000 characters
              extractedContent += fullText.substring(0, 1000);
              if (fullText.length > 1000) {
                extractedContent += '\n\n[Content truncated - showing first 1000 characters]';
              }
            }
          } else {
            // Handle extraction errors or empty content
            extractedContent += fullText || `[Could not extract readable text from ${doc.name}]`;
          }
        } catch (docError) {
          console.error(`Error processing document ${doc.name}:`, docError);
          extractedContent += `\n[Error processing ${doc.name}: ${docError instanceof Error ? docError.message : 'Unknown error'}]`;
        }
        
        extractedContent += '\n' + '='.repeat(60);
      }
    }
  } catch (error) {
    console.error('Error in content extraction:', error);
    extractedContent += '\n\n[Error: Could not extract detailed content from source documents]';
    extractedContent += `\nError details: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  extractedContent += `\n\n${'='.repeat(80)}\n\nEnd of Extracted Document\nGenerated by GetWhatMatters AI - ${new Date().toISOString()}`;

  return extractedContent;
};



const createAndDownloadPDFEnhanced = async (content: string, filename: string) => {
  try {
    // Check if jsPDF is available
    if (window.jsPDF) {
      const { jsPDF } = window.jsPDF;
      const doc = new jsPDF();
      
      // Set font and add content
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(content, 180);
      
      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.height;
      
     splitText.forEach((line: string) => {
  if (yPosition > pageHeight - 20) {
    doc.addPage();
    yPosition = 20;
  }
  doc.text(line, 15, yPosition);
  yPosition += 5;
});

      
      // Download PDF
      doc.save(filename.replace('.txt', '.pdf'));
      return true;
    } else {
      // Fallback to text file
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return true;
    }
  } catch (error) {
    console.error('Error creating PDF:', error);
    return false;
  }
};




const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    if (!window.pdfjsLib) {
      throw new Error('PDF.js not loaded');
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
const pdf = await window.pdfjsLib!.getDocument({ data: uint8Array }).promise;

    let fullText = '';

    console.log(`Extracting text from ${file.name} - ${pdf.numPages} pages`);

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent: PDFTextContent = await page.getTextContent();
        
        // Extract text items and join them
        const pageText = textContent.items
          .map((item: PDFTextItem | string) => {
            // Handle different item types that PDF.js might return
            if (typeof item === 'string') {
              return item;
            } else if (item && typeof item.str === 'string') {
              return item.str;
            }
            return '';
          })
          .filter((text: string) => text.trim().length > 0) // Now text is properly typed as string
          .join(' ');
        
        if (pageText.trim().length > 0) {
          fullText += `\n\nPage ${pageNum}:\n${pageText}\n`;
          console.log(`Page ${pageNum}: extracted ${pageText.length} characters`);
        } else {
          console.warn(`Page ${pageNum}: No text found`);
        }
      } catch (pageError) {
        console.error(`Error extracting text from page ${pageNum}:`, pageError);
        fullText += `\n\n[Error extracting text from page ${pageNum}]\n`;
      }
    }

    console.log(`Total text extracted from ${file.name}: ${fullText.length} characters`);
    
    if (fullText.trim().length === 0) {
      return `No readable text found in ${file.name}. This PDF might contain only images or be password protected.`;
    }

    return fullText.trim();
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return `Error extracting text from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};


// 1. ADD PROPER ERROR HANDLING AND RETRY LOGIC
// Replace the analyzeDocumentsWithGemini function with this:

const analyzeDocumentsWithGemini = async (
  documentContents: { name: string; content: string; size: number }[],
  jobTitle: string,
  userQuery: string
) => {
  setIsGeminiAnalyzing(true);
  setIsMainResultsLoading(true);
  setShowMainResults(true);

  try {
    const BATCH_SIZE = 2; // REDUCED from 3 to avoid rate limits
    const batchAnalyses: any[] = [];
    
    console.log(`Starting batch analysis of ${documentContents.length} documents in groups of ${BATCH_SIZE}`);
    
    // Step 1: Analyze documents in batches with longer delays
    for (let i = 0; i < documentContents.length; i += BATCH_SIZE) {
      const batch = documentContents.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(documentContents.length / BATCH_SIZE);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} with ${batch.length} documents`);
      
      const progressMessage: ChatMessage = {
        id: `progress-${Date.now()}-${batchNumber}`,
        type: 'bot',
        content: `🔄 Analyzing batch ${batchNumber}/${totalBatches} (${batch.length} documents)...`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, progressMessage]);

      const batchAnalysis = await analyzeBatch(batch, jobTitle, userQuery, batchNumber);
      batchAnalyses.push({
        batchNumber,
        documents: batch.map(doc => doc.name),
        analysis: batchAnalysis
      });
      
      // INCREASED delay between batches to prevent rate limiting
      if (i + BATCH_SIZE < documentContents.length) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds instead of 1
      }
    }

    console.log(`Completed ${batchAnalyses.length} batch analyses. Starting final synthesis...`);
    
    const synthesisMessage: ChatMessage = {
      id: `synthesis-${Date.now()}`,
      type: 'bot',
      content: `✅ Batch analysis complete! Now synthesizing insights from all ${documentContents.length} documents...`,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, synthesisMessage]);

    // WAIT before synthesis to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));

    const finalAnalysis = await synthesizeBatchResults(batchAnalyses, jobTitle, userQuery, documentContents.length);
    
    setGeminiAnalysis(finalAnalysis);

    const welcomeMessage: ChatMessage = {
      id: `welcome-final-${Date.now()}`,
      type: 'bot',
      content: `🎉 **Comprehensive Multi-Batch Analysis Complete!**

📊 **Analysis Overview:**
• Total documents analyzed: ${documentContents.length}
• Processed in ${batchAnalyses.length} batches of up to ${BATCH_SIZE} documents each
• Key insights synthesized: ${finalAnalysis.keyInsights?.length || 0}
• Cross-document patterns identified: ${finalAnalysis.crossDocumentFindings?.length || 0}
• Final recommendations: ${finalAnalysis.recommendations?.length || 0}
• Overall confidence: ${finalAnalysis.documentSummary?.confidence || 85}%

**Query:** "${userQuery}"
**Role Context:** ${jobTitle}

The analysis combines insights from all batches to provide you with the most comprehensive understanding of your documents. How can I help you explore these results further?`,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, welcomeMessage]);
    setShowChat(true);

  } catch (error) {
    console.error('Batch analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // BETTER ERROR HANDLING with fallback
    const fallbackMessage: ChatMessage = {
      id: `error-${Date.now()}`,
      type: 'bot',
      content: `❌ **Analysis Failed**: ${errorMessage}

This might be due to:
• API rate limits (wait a few minutes and try again)
• Server overload (503 error)
• Network connectivity issues

**Fallback Options:**
• Reduce the number of documents
• Try analyzing smaller batches
• Wait 5-10 minutes before retrying

Would you like me to attempt a simplified analysis instead?`,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, fallbackMessage]);
    setShowChat(true);
    
    // Don't show alert, show error in chat instead
  } finally {
    setIsGeminiAnalyzing(false);
    setIsMainResultsLoading(false);
  }
};

// 2. ADD RETRY LOGIC TO BATCH ANALYSIS
// Replace the analyzeBatch function with this:


const handleExtractPDF = async () => {
  if (!geminiAnalysis) {
    alert('No analysis results available. Please run an analysis first.');
    return;
  }

  try {
    // Show loading state
    const button = document.getElementById('extract-pdf-btn');
    if (button) {
      button.textContent = 'Extracting...';
      button.style.opacity = '0.6';
    }

    // Extract relevant content
    const extractedContent = await extractRelevantContent(
      documents, 
      geminiAnalysis, 
      jobTitle, 
      userQuery
    );

    // Create filename
    const timestamp = new Date().toISOString().split('T')[0];
    const cleanJobTitle = jobTitle.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `extracted_insights_${cleanJobTitle}_${timestamp}.txt`;

    // Download the file
    const success = await createAndDownloadPDFEnhanced(extractedContent, filename);
    
    if (success) {
      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
      successMessage.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          <span>Insights extracted successfully!</span>
        </div>`;
      document.body.appendChild(successMessage);
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 3000);
    } else {
      alert('Failed to extract PDF. Please try again.');
    }

  } catch (error) {
    console.error('Error extracting PDF:', error);
    alert('Error extracting insights: ' );
  } finally {
    // Reset button state
    const button = document.getElementById('extract-pdf-btn');
    if (button) {
      button.textContent = 'Extract Insights PDF';
      button.style.opacity = '1';
    }
  }
};



const analyzeBatch = async (
  batch: { name: string; content: string; size: number }[],
  jobTitle: string,
  userQuery: string,
  batchNumber: number,
  retryCount = 0
): Promise<any> => {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [2000, 5000, 10000]; // 2s, 5s, 10s
  
  let combinedContent = '';
  const maxContentSize = 8000; // REDUCED from 10000 to stay well under limits
  let currentSize = 0;
  let documentsIncluded = 0;
  let documentsPartial = 0;
  let documentsSkipped = 0;

  // Process documents in this batch
  for (const doc of batch) {
    const docHeader = `\n\n=== BATCH ${batchNumber} - DOCUMENT ${documentsIncluded + 1}: ${doc.name} ===\n`;
    const availableSpace = maxContentSize - currentSize - docHeader.length;
    
    if (availableSpace <= 0) {
      documentsSkipped++;
      continue;
    }

    combinedContent += docHeader;
    currentSize += docHeader.length;

    if (doc.content.length <= availableSpace) {
      combinedContent += doc.content;
      currentSize += doc.content.length;
      documentsIncluded++;
    } else {
      const partialContent = doc.content.substring(0, availableSpace);
      combinedContent += partialContent + '\n[... document truncated due to size limits ...]';
      currentSize = maxContentSize;
      documentsPartial++;
      documentsIncluded++;
      break;
    }
  }

  const prompt = `You are analyzing BATCH ${batchNumber} of documents for a ${jobTitle}.

BATCH ANALYSIS REQUEST:
Role: ${jobTitle}
Query: "${userQuery}"
Batch Number: ${batchNumber}
Documents in this batch: ${batch.length}

BATCH DOCUMENT CONTENTS:
${combinedContent}

BATCH ANALYSIS INSTRUCTIONS:
1. Focus on this specific batch of ${batch.length} documents
2. Extract key insights relevant to: "${userQuery}"
3. Identify patterns within this batch
4. Note any incomplete analysis due to size limits
5. Prepare insights that can be combined with other batches

Please respond with ONLY a valid JSON object in this exact format:
{
  "batchNumber": ${batchNumber},
  "keyInsights": [
    "Specific insight 1 from this batch with document references",
    "Specific insight 2 from this batch with actionable information",
    "Specific insight 3 highlighting critical findings in this batch"
  ],
  "documentSummary": {
    "batchDocuments": ${batch.length},
    "documentsAnalyzed": ${documentsIncluded},
    "documentsPartial": ${documentsPartial},
    "documentsSkipped": ${documentsSkipped},
    "contentSize": "${Math.round(currentSize/1000)}KB"
  },
  "batchFindings": [
    "Finding 1 specific to documents in this batch",
    "Finding 2 showing patterns within this batch"
  ],
  "recommendations": [
    "Recommendation 1 based on this batch analysis",
    "Recommendation 2 for ${jobTitle} from this batch"
  ],
  "limitations": [
    ${documentsSkipped > 0 ? '"Some documents in this batch were skipped due to size limits"' : '"All batch documents were fully processed"'},
    ${documentsPartial > 0 ? '"Some documents were partially analyzed"' : '"No documents were truncated in this batch"'}
  ]
}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'ConnectingDots/1.0' // Add user agent
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1500, // REDUCED from 2000
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`API Error ${response.status}:`, errorData);
      
      if ((response.status === 429 || response.status === 503) && retryCount < MAX_RETRIES) {
        console.log(`Retrying batch ${batchNumber} in ${RETRY_DELAYS[retryCount]}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]));
        return analyzeBatch(batch, jobTitle, userQuery, batchNumber, retryCount + 1);
      }
      
      throw new Error(`API Error ${response.status}: ${response.status === 429 ? 'Rate limit exceeded' : response.status === 503 ? 'Service unavailable' : 'Request failed'}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    try {
      const cleanedText = generatedText.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedText);
    } catch (parseError) {
      console.error(`JSON parsing error for batch ${batchNumber}:`, parseError);
      
      // Return fallback structure
      return {
        batchNumber,
        keyInsights: [
          `Batch ${batchNumber}: Analyzed ${documentsIncluded} documents for ${jobTitle}`,
          `Batch ${batchNumber}: Content focus on "${userQuery}"`,
          `Batch ${batchNumber}: ${Math.round(currentSize/1000)}KB of content processed`
        ],
        documentSummary: {
          batchDocuments: batch.length,
          documentsAnalyzed: documentsIncluded,
          documentsPartial: documentsPartial,
          documentsSkipped: documentsSkipped,
          contentSize: `${Math.round(currentSize/1000)}KB`
        },
        batchFindings: [
          `Documents in batch ${batchNumber} contain relevant information for ${userQuery}`,
          `Batch ${batchNumber} processing completed with ${documentsIncluded} documents analyzed`
        ],
        recommendations: [
          `Review batch ${batchNumber} insights in context of overall analysis`,
          `Consider batch ${batchNumber} findings for ${jobTitle} workflow improvements`
        ],
        limitations: documentsSkipped > 0 || documentsPartial > 0 ? 
          ["Some documents had processing limitations"] : 
          ["All documents in this batch were fully processed"]
      };
    }
  } catch (err: unknown) {
  // Ensure we can safely check properties
  if (
    retryCount < MAX_RETRIES &&
    (
      (typeof err === "string" && err.includes("429")) || // if error is a string
      (err instanceof Error && (err.message.includes("429") || err.message.includes("503"))) // if error is an Error object
    )
  ) {
    console.log(`Retrying batch ${batchNumber} due to error:`, err);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]));
    return analyzeBatch(batch, jobTitle, userQuery, batchNumber, retryCount + 1);
  }

  throw err; // rethrow if not retryable
}

};

// 3. UPDATE SYNTHESIS FUNCTION WITH RETRY LOGIC
// Replace the synthesizeBatchResults function with this:

const synthesizeBatchResults = async (
  batchAnalyses: any[],
  jobTitle: string,
  userQuery: string,
  totalDocuments: number,
  retryCount = 0
) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [3000, 6000, 12000]; // 3s, 6s, 12s
  
  // Combine all batch results with length limits
  const synthesisContent = batchAnalyses.map(batch => 
    `=== BATCH ${batch.batchNumber} RESULTS ===
Documents: ${batch.documents.join(', ')}
Key Insights: ${(batch.analysis.keyInsights?.join(' | ') || 'No insights').substring(0, 200)}
Findings: ${(batch.analysis.batchFindings?.join(' | ') || 'No findings').substring(0, 150)}
Recommendations: ${(batch.analysis.recommendations?.join(' | ') || 'No recommendations').substring(0, 150)}

`).join('\n').substring(0, 6000); // Limit total content

  const synthesisPrompt = `You are synthesizing analysis from ${batchAnalyses.length} batches for a ${jobTitle}.

SYNTHESIS REQUEST:
Role: ${jobTitle}
Query: "${userQuery}"
Total Documents: ${totalDocuments}
Batches: ${batchAnalyses.length}

BATCH RESULTS:
${synthesisContent}

Please respond with ONLY a valid JSON object:
{
  "keyInsights": ["insight1", "insight2", "insight3"],
  "additionalPoints": ["point1", "point2", "point3"],
  "processSteps": ["step1", "step2", "step3"],
  "documentSummary": {
    "totalDocuments": ${totalDocuments},
    "batchesProcessed": ${batchAnalyses.length},
    "confidence": 85
  },
  "recommendations": ["rec1", "rec2", "rec3"],
  "crossDocumentFindings": ["finding1", "finding2"],
  "gapsAndOpportunities": ["gap1", "gap2"]
}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'ConnectingDots/1.0'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: synthesisPrompt }] }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2000, // REDUCED from 3500
        }
      })
    });

    if (!response.ok) {
      if ((response.status === 429 || response.status === 503) && retryCount < MAX_RETRIES) {
        console.log(`Retrying synthesis in ${RETRY_DELAYS[retryCount]}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]));
        return synthesizeBatchResults(batchAnalyses, jobTitle, userQuery, totalDocuments, retryCount + 1);
      }
      throw new Error(`Synthesis API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    try {
      const cleanedText = generatedText.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Synthesis JSON parsing error:', parseError);
      
      // Return comprehensive fallback
      const allInsights = batchAnalyses.flatMap(batch => batch.analysis.keyInsights || []);
      const allRecommendations = batchAnalyses.flatMap(batch => batch.analysis.recommendations || []);
      
      return {
        keyInsights: [
          `Comprehensive analysis of ${totalDocuments} documents across ${batchAnalyses.length} batches`,
          `Multi-batch processing identified insights for ${jobTitle}`,
          `Cross-batch synthesis provides unified understanding`
        ],
        additionalPoints: [
          `${batchAnalyses.length} batches processed successfully`,
          `Batch methodology ensures thorough analysis`,
          `Synthesis combines insights from multiple rounds`
        ],
        processSteps: [
          `Review synthesized findings from all ${batchAnalyses.length} batches`,
          "Implement integrated recommendations from comprehensive analysis",
          "Monitor outcomes using cross-batch insights and patterns"
        ],
        documentSummary: {
          totalDocuments: totalDocuments,
          batchesProcessed: batchAnalyses.length,
          confidence: 85
        },
        recommendations: allRecommendations.slice(0, 3).length > 0 ? 
          allRecommendations.slice(0, 3) : [
            `Implement findings from comprehensive ${totalDocuments}-document analysis`,
            `Use multi-batch insights for ${jobTitle} workflow optimization`,
            "Continue monitoring for additional patterns"
          ],
        crossDocumentFindings: [
          `Patterns identified across ${batchAnalyses.length} batches`,
          `Consistent themes from ${totalDocuments} documents`
        ],
        gapsAndOpportunities: [
          `Multi-batch analysis suggests optimization opportunities`,
          "Cross-batch patterns indicate workflow improvements"
        ]
      };
    }
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]));
      return synthesizeBatchResults(batchAnalyses, jobTitle, userQuery, totalDocuments, retryCount + 1);
    }
    throw error;
  }
};

interface GeminiAnalysis {
  keyInsights?: string[];
  factVerification?: string[];
  recommendations?: string[];
  onlineResources?: string[];
  gapsAndOpportunities?: string[];
  // ADD THESE NEW FIELDS:
  additionalPoints?: string[];
  documentSummary?: {
    totalDocuments: number;
    relevantSections: string[];
    confidence: number;
    
  };
  processSteps?: string[];
}
interface GeminiResultsModalProps {
  analysis: GeminiAnalysis;
  onClose: () => void;
  jobTitle: string;
  userQuery: string;
}

const GeminiResultsModal: React.FC<GeminiResultsModalProps> = ({
  analysis,
  onClose,
  jobTitle,
  userQuery
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Sparkles className="h-6 w-6 mr-2 text-purple-600" />
              AI-Enhanced Analysis
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Gemini AI insights for <strong>{jobTitle}</strong> • Query: "{userQuery}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
        {/* Key Insights */}
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Key Insights
          </h3>
          <div className="space-y-3">
  {analysis.keyInsights && analysis.keyInsights.length > 0 ? (
    analysis.keyInsights.map((insight: string, index: number) => (
      <div key={index} className="flex items-start space-x-2">
        <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-blue-800">{insight}</p>
      </div>
    ))
  ) : (
    <div className="text-blue-600 italic">No key insights available from the analysis.</div>
  )}
</div>
        </div>

       <div className="bg-yellow-50 p-6 rounded-lg">
  <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center">
    <AlertTriangle className="h-5 w-5 mr-2" />
    Fact Verification Notes
  </h3>
  <div className="space-y-3">
    {analysis.factVerification && analysis.factVerification.length > 0 ? (
      analysis.factVerification.map((fact: string, index: number) => (
        <div key={index} className="flex items-start space-x-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-yellow-800">{fact}</p>
        </div>
      ))
    ) : (
      <div className="text-yellow-600 italic">No fact verification notes available.</div>
    )}
  </div>
</div>

{/* Recommendations */}
<div className="bg-green-50 p-6 rounded-lg">
  <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
    <Target className="h-5 w-5 mr-2" />
    Recommendations for {jobTitle}
  </h3>
  <div className="space-y-3">
    {analysis.recommendations && analysis.recommendations.length > 0 ? (
      analysis.recommendations.map((rec: string, index: number) => (
        <div key={index} className="flex items-start space-x-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-green-800">{rec}</p>
        </div>
      ))
    ) : (
      <div className="text-green-600 italic">No specific recommendations available.</div>
    )}
  </div>
</div>

{/* Online Resources */}
<div className="bg-purple-50 p-6 rounded-lg">
  <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
    <Globe className="h-5 w-5 mr-2" />
    Related Online Resources
  </h3>
  <div className="space-y-3">
    {analysis.onlineResources && analysis.onlineResources.length > 0 ? (
      analysis.onlineResources.map((resource: string, index: number) => (
        <div key={index} className="flex items-start space-x-2">
          <ExternalLink className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <p className="text-purple-800">{resource}</p>
        </div>
      ))
    ) : (
      <div className="text-purple-600 italic">No related online resources found.</div>
    )}
  </div>
</div>

{/* Gaps and Opportunities */}
<div className="bg-indigo-50 p-6 rounded-lg">
  <h3 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center">
    <Lightbulb className="h-5 w-5 mr-2" />
    Gaps & Opportunities
  </h3>
  <div className="space-y-3">
    {analysis.gapsAndOpportunities && analysis.gapsAndOpportunities.length > 0 ? (
      analysis.gapsAndOpportunities.map((gap: string, index: number) => (
        <div key={index} className="flex items-start space-x-2">
          <Lightbulb className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <p className="text-indigo-800">{gap}</p>
        </div>
      ))
    ) : (
      <div className="text-indigo-600 italic">No identified gaps or opportunities.</div>
    )}
  </div>
</div>
      </div>
    </div>
  </div>
);


const MainResultsDisplay: React.FC<{
  analysis: GeminiAnalysis;
  jobTitle: string;
  userQuery: string;
  isLoading: boolean;
}> = ({ analysis, jobTitle, userQuery, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <AdobeFactsLoader />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analysis Results</h1>
          <p className="text-gray-600">
            AI-powered analysis for <strong>{jobTitle}</strong> • Query: "{userQuery}"
          </p>
          <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Documents: {analysis.documentSummary?.totalDocuments || 0}</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span>Confidence: {analysis.documentSummary?.confidence || 0}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-purple-500" />
              <span>Insights: {(analysis.keyInsights?.length || 0) + (analysis.additionalPoints?.length || 0)}</span>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Key Insights */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <Lightbulb className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Key Insights</h3>
                <p className="text-sm text-gray-500">Primary findings from your documents</p>
              </div>
            </div>
            <div className="space-y-4">
              {analysis.keyInsights?.map((insight: string, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <p className="text-blue-900 text-sm leading-relaxed">{insight}</p>
                </div>
              )) || (
                <div className="text-gray-500 text-center py-4 italic">No key insights available</div>
              )}
            </div>
          </div>

          {/* Additional Relevant Points */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <Star className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Additional Relevant Points</h3>
                <p className="text-sm text-gray-500">Supplementary insights and context</p>
              </div>
            </div>
            <div className="space-y-4">
              {analysis.additionalPoints?.map((point: string, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <p className="text-green-900 text-sm leading-relaxed">{point}</p>
                </div>
              )) || (
                <div className="text-gray-500 text-center py-4 italic">No additional points available</div>
              )}
            </div>
          </div>

          {/* Process Steps */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <Settings className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Process Steps</h3>
                <p className="text-sm text-gray-500">Recommended workflow actions</p>
              </div>
            </div>
            <div className="space-y-4">
              {analysis.processSteps?.map((step: string, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <p className="text-purple-900 text-sm leading-relaxed">{step}</p>
                </div>
              )) || (
                <div className="text-gray-500 text-center py-4 italic">No process steps available</div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recommendations</h3>
                <p className="text-sm text-gray-500">Actionable suggestions for {jobTitle}</p>
              </div>
            </div>
            <div className="space-y-4">
              {analysis.recommendations?.map((rec: string, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <p className="text-orange-900 text-sm leading-relaxed">{rec}</p>
                </div>
              )) || (
                <div className="text-gray-500 text-center py-4 italic">No recommendations available</div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row - Full Width Cards */}
        <div className="mt-6 space-y-6">
          {/* Document Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Document Summary</h3>
                <p className="text-sm text-gray-500">Overview of analyzed content</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                {analysis.documentSummary?.relevantSections?.map((section: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-indigo-50 rounded-lg">
                    <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <p className="text-indigo-900 text-sm leading-relaxed">{section}</p>
                  </div>
                )) || (
                  <div className="text-gray-500 text-center py-4 italic">No document summary available</div>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {analysis.documentSummary?.confidence || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Analysis Confidence</div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${analysis.documentSummary?.confidence || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gaps and Opportunities */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Gaps & Opportunities</h3>
                <p className="text-sm text-gray-500">Areas for improvement and further research</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {analysis.gapsAndOpportunities?.map((gap: string, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <p className="text-yellow-900 text-sm leading-relaxed">{gap}</p>
                </div>
              )) || (
                <div className="text-gray-500 text-center py-4 italic col-span-2">No gaps or opportunities identified</div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
  <button
    onClick={() => setShowGeminiResults(true)}
    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2"
  >
    <ExternalLink className="h-4 w-4" />
    <span>View Detailed Modal</span>
  </button>
  
  <button
    id="extract-pdf-btn"
    onClick={handleExtractPDF}
    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center space-x-2"
  >
    <FileDown className="h-4 w-4" />
    <span>Extract Insights PDF</span>
  </button>
  
  <button
    onClick={() => {
      setShowMainResults(false);
      setShowInstructions(true);
    }}
    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all duration-200 flex items-center space-x-2"
  >
    <ArrowRight className="h-4 w-4" />
    <span>New Analysis</span>
  </button>
</div>
      </div>
    </div>
  );
};



  const handleDeleteDocument = (e: React.MouseEvent, documentId: number) => {
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this document?')) {
      setDocuments(prev => {
        const updated = prev.filter(doc => doc.id !== documentId);
        
        // Clean up blob URLs to prevent memory leaks
        const docToDelete = prev.find(doc => doc.id === documentId);
        if (docToDelete?.url && docToDelete.url.startsWith('blob:')) {
          URL.revokeObjectURL(docToDelete.url);
        }
        
        // Update localStorage
        // Save to localStorage with proper serialization
try {
  const toSave = updated.map(doc => ({
    ...doc,
    // Keep the original URL if it's base64, otherwise convert fileData to array
    url: doc.url && doc.url.startsWith('data:') ? doc.url : doc.url,
    fileData: doc.fileData ? Array.from(new Uint8Array(doc.fileData as ArrayBuffer)) : undefined,
    file: null // Don't save the File object directly
  }));
  
  localStorage.setItem('uploadedDocuments', JSON.stringify(toSave));
  console.log(`Saved ${updated.length} documents to localStorage`);
} catch (error) {
  console.warn('Failed to save documents to localStorage:', error);
}
        
        return updated;
      });

      // Close PDF viewer if the deleted document was being viewed
      if (viewingPdf?.id === documentId) {
        setViewingPdf(null);
      }
    }
  };

  const calculateContentWidth = (): string => {
    let width = '100%';
    
    if (showDocumentLibrary && showChat && !isChatMinimized) {
      width = `calc(100% - ${libraryWidth + chatWidth + 16}px)`; // 16px for resizers
    } else if (showDocumentLibrary && (!showChat || isChatMinimized)) {
      width = `calc(100% - ${libraryWidth + 8}px)`; // 8px for single resizer
    } else if (!showDocumentLibrary && showChat && !isChatMinimized) {
      width = `calc(100% - ${chatWidth + 8}px)`; // 8px for single resizer
    } else if (!showDocumentLibrary && showChat && isChatMinimized) {
      width = 'calc(100% - 64px)'; // 64px for minimized chat
    }
    
    return width;
  };

  // Calculate SVG bounds
  const calculateSvgBounds = useCallback(() => {
    if (!processResult || !processResult.flowchart || processResult.flowchart.length === 0) {
      return { width: 1000, height: 800 };
    }
    
    const steps = processResult.flowchart;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    steps.forEach(step => {
      minX = Math.min(minX, step.x);
      maxX = Math.max(maxX, step.x + step.width);
      minY = Math.min(minY, step.y);
      maxY = Math.max(maxY, step.y + step.height);
    });
    
    const padding = 100;
    return {
      width: Math.max(1000, maxX - minX + padding * 2),
      height: Math.max(800, maxY - minY + padding * 2)
    };
  }, [processResult]);

  // Text-to-Speech functionality
  const speakText = (text: string) => {
    if ('speechSynthesis' in window && isVoiceEnabled) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // FIXED PDF VIEWER FUNCTION - Using working logic from second code
const openPdfViewer = async (document: Document): Promise<void> => {
  console.log('=== DEBUG: Opening PDF ===');
  console.log('Document object:', document);
  console.log('Document URL:', document.url);
  console.log('Document file:', document.file);
  
  setIsLoadingPdf(true);
  
  // Mark document as read
  
  
  // Set viewing PDF
  setViewingPdf(document);
  
  // Force show document library when opening PDF
  if (!showDocumentLibrary) {
    setShowDocumentLibrary(true);
  }
  
  // Update localStorage with read status - preserve original URL format
  
  // Clear previous Adobe DC View instance
  const viewerContainer = window.document.getElementById('adobe-dc-view');
  if (viewerContainer) {
    viewerContainer.innerHTML = '';
    console.log('Cleared viewer container');
  }
  

  setTimeout(() => {
    console.log('Adobe SDK check after timeout:', !!window.AdobeDC);
    
    if (window.AdobeDC) {
      try {
        const adobeDCView = new window.AdobeDC.View({
          clientId: "82a5500aa5d945049893aec8a2514446",
          divId: "adobe-dc-view"
        });
        
        console.log('Adobe DC View created successfully');
        
        let pdfUrl = document.url;
        
        if (!pdfUrl || pdfUrl.trim() === '') {
          console.log('No URL found, attempting to create from file/fileData');
          
          if (document.file && document.file instanceof File) {
            pdfUrl = URL.createObjectURL(document.file);
            console.log('Created new blob URL from file:', pdfUrl);
          } else if (document.fileData) {
            try {
              let arrayBuffer: ArrayBuffer;
              if (Array.isArray(document.fileData)) {
                arrayBuffer = new Uint8Array(document.fileData).buffer;
              } else {
                arrayBuffer = document.fileData as ArrayBuffer;
              }
              
              const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
              pdfUrl = URL.createObjectURL(blob);
              console.log('Created blob URL from fileData:', pdfUrl);
            } catch (error) {
              console.error('Failed to create blob URL from fileData:', error);
              throw new Error('Could not create PDF URL from file data');
            }
          } else {
            throw new Error('No file data available for PDF viewing');
          }
        } 
        else if (pdfUrl.startsWith('data:application/pdf;base64,')) {
          console.log('Using base64 data URL directly:', pdfUrl.substring(0, 50) + '...');
        }
        else if (pdfUrl.startsWith('blob:')) {
          console.log('Using existing blob URL:', pdfUrl);
        }
        else {
          console.log('Unknown URL format, attempting to recreate blob URL');
          
          if (document.file && document.file instanceof File) {
            if (pdfUrl.startsWith('blob:')) {
              URL.revokeObjectURL(pdfUrl);
            }
            pdfUrl = URL.createObjectURL(document.file);
            console.log('Recreated blob URL from file:', pdfUrl);
          } else if (document.fileData) {
            try {
              let arrayBuffer: ArrayBuffer;
              if (Array.isArray(document.fileData)) {
                arrayBuffer = new Uint8Array(document.fileData).buffer;
              } else {
                arrayBuffer = document.fileData as ArrayBuffer;
              }
              
              const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
              pdfUrl = URL.createObjectURL(blob);
              console.log('Recreated blob URL from fileData:', pdfUrl);
            } catch (error) {
              console.error('Failed to recreate blob URL from fileData:', error);
              throw new Error('Could not create PDF URL from file data');
            }
          }
        }
        
        console.log('Final PDF URL for Adobe viewer:', pdfUrl.startsWith('data:') ? pdfUrl.substring(0, 50) + '...' : pdfUrl);
        
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
        
        console.log('previewFile called successfully');
        
      } catch (error) {
        console.error('Error creating Adobe viewer:', error);
        alert('Error loading PDF viewer: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    } else {
      console.error('Adobe SDK not available');
      alert('Adobe PDF SDK not loaded. Please refresh the page.');
    }
    
    setIsLoadingPdf(false);
  }, 500);
  
};
  const closePdfViewer = (): void => {
    setViewingPdf(null);
    
    // Clear the Adobe viewer
    const viewerContainer = window.document.getElementById('adobe-dc-view');
    if (viewerContainer) {
      viewerContainer.innerHTML = '';
    }
  };


  const DetailedViewModal = ({ 
  onClose, 
  currentView,
  setCurrentView,
  processResult,
  jobTitle,
  userQuery,
  navigateToSection
}: 
{
  onClose: () => void;
  currentView: 'flow' | 'sections';
  setCurrentView: (view: 'flow' | 'sections') => void;
  processResult: ProcessFlowResult | null;
  jobTitle: string;
  userQuery: string;
  navigateToSection: (section: RelevantSection) => void;
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            {currentView === 'flow' ? (
              <>
                <Layers className="h-6 w-6 mr-2 text-purple-600" />
                Detailed Process Flow
              </>
            ) : (
              <>
                <Target className="h-6 w-6 mr-2 text-green-600" />
                Detailed Section Analysis
              </>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>
        <div className="flex space-x-4 mt-4">
          <button
            onClick={() => setCurrentView('flow')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              currentView === 'flow'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Process Flow
          </button>
          <button
            onClick={() => setCurrentView('sections')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              currentView === 'sections'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Section Analysis
          </button>
        </div>
      </div>
      
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
        {currentView === 'flow' ? (
          <div>
            <div className="mb-6 bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Process Overview</h3>
              <p className="text-blue-800">This workflow was generated specifically for your role as a <strong>{jobTitle}</strong> based on the query: "<em>{userQuery}</em>"</p>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Confidence: {processResult?.confidence}%</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>Steps: {processResult?.flowchart.length}</span>
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              {processResult?.flowchart.map((step, index) => (
                <div key={step.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                      step.type === 'start' ? 'bg-green-500' : 
                      step.type === 'end' ? 'bg-red-500' : 
                      step.type === 'decision' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h4>
                      <p className="text-gray-700 mb-2">{step.description}</p>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          step.type === 'start' ? 'bg-green-100 text-green-800' :
                          step.type === 'end' ? 'bg-red-100 text-red-800' :
                          step.type === 'decision' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {step.type.charAt(0).toUpperCase() + step.type.slice(1)}
                        </span>
                        {step.connections.length > 0 && (
                          <span className="text-xs text-gray-500">
                            → Connects to {step.connections.length} step{step.connections.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Section Analysis Overview</h3>
              <p className="text-green-800">Found <strong>{processResult?.sections.length}</strong> highly relevant sections with accuracy scores above 85%</p>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span className="flex items-center space-x-1">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span>Documents: {processResult?.metadata?.documents_processed || documents.length}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Target className="h-4 w-4 text-purple-500" />
                  <span>Avg Accuracy: {processResult ? Math.round(processResult.sections.reduce((sum, s) => sum + s.accuracy, 0) / processResult.sections.length) : 0}%</span>
                </span>
              </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              {processResult?.sections.map((section, index) => (
                <div key={section.id} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        section.accuracy >= 95 ? 'bg-green-500' :
                        section.accuracy >= 90 ? 'bg-blue-500' :
                        section.accuracy >= 85 ? 'bg-yellow-500' : 'bg-orange-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        section.accuracy >= 95 ? 'bg-green-100 text-green-700' :
                        section.accuracy >= 90 ? 'bg-blue-100 text-blue-700' :
                        section.accuracy >= 85 ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {section.accuracy}% Match
                      </div>
                    </div>
                    <button
                      onClick={() => navigateToSection(section)}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>View</span>
                    </button>
                  </div>
                  
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">{section.title}</h4>
                  <p className="text-gray-700 mb-4 leading-relaxed">{section.content}</p>
                  
                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Document:</span>
                      <span className="text-xs font-medium text-blue-600">{section.documentName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Location:</span>
                      <span className="text-xs font-medium text-purple-600">Page {section.pageNumber} • {section.section}</span>
                    </div>
                    <div className="border-t border-gray-100 pt-2">
                      <span className="text-xs text-gray-500">Why it's relevant:</span>
                      <p className="text-xs text-blue-600 italic mt-1">{section.relevanceReason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);


  // Enhanced process documents function
const processDocuments = async () => {
  if (!jobTitle.trim() || !userQuery.trim()) {
    alert('Please fill in both job title and your query');
    return;
  }

  const validDocuments = documents.filter(doc => doc.file && doc.file instanceof File);
  
  if (validDocuments.length === 0) {
    alert('No valid PDF files found. Please upload some PDFs.');
    return;
  }

  setIsProcessing(true);
  setShowInstructions(false);

  try {
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

    // Analyze with Gemini directly
    await analyzeDocumentsWithGemini(documentContents, jobTitle, userQuery);
    
  } catch (error) {
    console.error('Error processing documents:', error);
    alert('Error processing documents: ' + (error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    setIsProcessing(false);
  }
};


  // Chat with assistant
  const sendMessage = async () => {
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
      const formData = new FormData();
      formData.append('message', messageToSend);
      formData.append('context', JSON.stringify(processResult?.metadata || {}));

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        body: formData,
      });

      let botResponse = 'I apologize, but I encountered an error processing your message.';
      
      if (response.ok) {
        const result = await response.json();
        botResponse = result.response;
      } else {
        botResponse = getLocalBotResponse(messageToSend);
      }

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        content: botResponse,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, botMessage]);
      setIsTyping(false);

      if (isVoiceEnabled) {
        speakText(botMessage.content);
      }

    } catch (error) {
      console.error('Chat error:', error);
      
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        content: getLocalBotResponse(messageToSend),
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }
  };

  // Local fallback bot responses
  const getLocalBotResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('accuracy') || lowerMessage.includes('confidence')) {
      return `The analysis shows ${processResult?.confidence || 85}% confidence overall. The sections were selected based on semantic similarity, keyword matching, and context relevance to your role as a ${jobTitle}.`;
    } else if (lowerMessage.includes('section') || lowerMessage.includes('document')) {
      return `I found ${processResult?.sections.length || 0} highly relevant sections. Each section has accuracy scores above 85%. Would you like me to explain why a specific section was selected?`;
    } else if (lowerMessage.includes('process') || lowerMessage.includes('flow')) {
      return `The process flow was generated based on best practices from your documents and tailored to your query about "${userQuery}". Each step represents a critical phase in the workflow.`;
    } else if (lowerMessage.includes('improve') || lowerMessage.includes('better')) {
      return `Based on the analysis, I recommend focusing on the highest accuracy sections first. You can also try refining your query or adding more specific documents related to your task.`;
    } else {
      return `I can help you understand the process flow, explain section relevance, discuss accuracy metrics, or provide insights about the ${processResult?.sections.length || 0} sections found. What would you like to explore?`;
    }
  };

  // Navigation and UI functions
const navigateToSection = async (section: RelevantSection) => {
  setSelectedSection(section);

  const docInfo = documents.find(doc => doc.name === section.documentName);
  if (docInfo && (docInfo.file || docInfo.fileData)) {

    await openPdfViewer(docInfo);

    // Wait for viewer to load, then use API
    setTimeout(async () => {
      try {
        if (adobePreviewPromise) {
          const viewer = await adobePreviewPromise; // adobeDCView.previewFile() resolves here
          const apis = await viewer.getAPIs();

          await apis.gotoLocation(section.pageNumber); // <-- Adobe official navigation

          showNavigationAlert(section);
        } else {
          console.error("Adobe preview not ready");
        }
      } catch (error) {
        console.error("Navigation error:", error);
      }
    }, 1500);

  } else {
    alert(`Document "${section.documentName}" is not available. Please re-upload the document.`);
  }
};

function showNavigationAlert(section: RelevantSection) {
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
        <h4 class="font-semibold">Navigated Successfully</h4>
        <p class="text-sm text-blue-100 mt-1">
          Document: ${section.documentName}<br>
          Target: Page ${section.pageNumber} • ${section.section}<br>
          Match: ${section.accuracy}% accuracy
        </p>
      </div>
    </div>`;
  window.document.body.appendChild(navigationAlert);
  setTimeout(() => {
    if (window.document.body.contains(navigationAlert)) {
      window.document.body.removeChild(navigationAlert);
    }
  }, 5000);
}


  const toggleDocumentLibrary = () => {
    setShowDocumentLibrary(!showDocumentLibrary);
  };

  const toggleChat = () => {
    if (!showChat) {
      setShowChat(true);
      setIsChatMinimized(false);
    } else {
      setShowChat(!showChat);
    }
  };

  const toggleChatMinimize = () => setIsChatMinimized(!isChatMinimized);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const filteredDocuments = documents.filter((doc: Document) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Render flowchart functions
  const renderFlowchartStep = (step: ProcessStep) => {
    let shape;
    const baseStyle = {
      fill: step.type === 'start' ? '#dcfce7' : step.type === 'end' ? '#fce7f3' : step.type === 'decision' ? '#fef3c7' : '#dbeafe',
      stroke: step.type === 'start' ? '#22c55e' : step.type === 'end' ? '#ec4899' : step.type === 'decision' ? '#f59e0b' : '#3b82f6',
      strokeWidth: 2,
      cursor: 'pointer'
    };

    switch (step.type) {
      case 'start':
      case 'end':
        shape = (
          <ellipse
            cx={step.x + step.width / 2}
            cy={step.y + step.height / 2}
            rx={step.width / 2}
            ry={step.height / 2}
            style={baseStyle}
          />
        );
        break;
      case 'decision':
        const centerX = step.x + step.width / 2;
        const centerY = step.y + step.height / 2;
        shape = (
          <polygon
            points={`${centerX},${step.y} ${step.x + step.width},${centerY} ${centerX},${step.y + step.height} ${step.x},${centerY}`}
            style={baseStyle}
          />
        );
        break;
      default:
        shape = (
          <rect
            x={step.x}
            y={step.y}
            width={step.width}
            height={step.height}
            rx={8}
            style={baseStyle}
          />
        );
    }

    return (
      <g key={step.id}>
        {shape}
        <foreignObject
          x={step.x + 5}
          y={step.y + 5}
          width={step.width - 10}
          height={step.height - 10}
          pointerEvents="none"
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '600',
              color: '#1f2937',
              textAlign: 'center',
              overflow: 'hidden',
              lineHeight: '1.2',
              padding: '4px'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: '700' }}>{step.title}</div>
            {step.description && (
              <div style={{ fontSize: '9px', fontWeight: '400', marginTop: '2px', opacity: 0.8 }}>
                {step.description}
              </div>
            )}
          </div>
        </foreignObject>
      </g>
    );
  };

  const renderConnections = () => {
    if (!processResult) return null;
    
    return processResult.flowchart.map((step: ProcessStep) => 
      step.connections.map((targetId: string) => {
        const target = processResult.flowchart.find((s: ProcessStep) => s.id === targetId);
        if (!target) return null;
        
        const startX = step.x + step.width / 2;
        const startY = step.y + step.height / 2;
        const endX = target.x + target.width / 2;
        const endY = target.y + target.height / 2;
        
        return (
          <g key={`${step.id}-${targetId}`}>
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke="#6b7280"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          </g>
        );
      })
    ).flat();
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
        
        // Force Adobe viewer to resize if PDF is open
        if (viewingPdf) {
          setTimeout(() => {
            const viewerContainer = document.getElementById('adobe-dc-view');
            if (viewerContainer) {
              viewerContainer.style.width = '100%';
              viewerContainer.style.height = '100%';
              // Trigger a resize event
              window.dispatchEvent(new Event('resize'));
            }
          }, 50);
        }
      }
    });
  }, [isResizingLibrary, viewingPdf]);

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

  // Handle PDF viewer resize
  useEffect(() => {
    if (viewingPdf) {
      const handleResize = () => {
        const viewerContainer = document.getElementById('adobe-dc-view');
        if (viewerContainer) {
          // Force the Adobe viewer to recalculate its size
          viewerContainer.style.width = '100%';
          viewerContainer.style.height = '100%';
        }
      };
      
      // Debounce resize events
      let resizeTimeout: NodeJS.Timeout;
      const debouncedResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 100);
      };
      
      window.addEventListener('resize', debouncedResize);
      
      return () => {
        window.removeEventListener('resize', debouncedResize);
        clearTimeout(resizeTimeout);
      };
    }
  }, [viewingPdf]);

  // Add mouse event listeners
  useEffect(() => {
    if (isResizingLibrary) {
      document.addEventListener('mousemove', handleLibraryMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    if (isResizingChat) {
      document.addEventListener('mousemove', handleChatMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleLibraryMouseMove);
      document.removeEventListener('mousemove', handleChatMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLibrary, isResizingChat, handleLibraryMouseMove, handleChatMouseMove, handleMouseUp]);

  return (
    <>
      <style>{`
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
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-pulse-slow {
          animation: pulse 2s ease-in-out infinite;
        }
        
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

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-4 {
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .scrollbar-thin {
          scrollbar-width: thin;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
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
                <a href="/connectdots" className="text-gray-900 hover:text-red-600 px-3 py-2 text-sm font-medium border-b-2 border-red-600">GetWhatMatters</a>
                <a href="/getwhatmatters" className="text-gray-500 hover:text-red-600 px-3 py-2 text-sm font-medium">ConnectingDots</a>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md transition-all duration-200 hover:scale-105 ${
                  isVoiceEnabled 
                    ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100' 
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                {isSpeaking ? (
                  <Volume2 className="h-4 w-4 mr-2 animate-pulse" />
                ) : isVoiceEnabled ? (
                  <Volume2 className="h-4 w-4 mr-2" />
                ) : (
                  <VolumeX className="h-4 w-4 mr-2" />
                )}
                Voice {isVoiceEnabled ? 'On' : 'Off'}
              </button>
              <button
                onClick={toggleChat}
                className="inline-flex items-center px-3 py-2 border border-purple-300 shadow-sm text-sm leading-4 font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 hover:scale-105"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {showChat ? "Hide Assistant" : "Show Assistant"}
              </button>
            </div>
          </div>
        </nav>

        <div ref={containerRef} className="flex h-[calc(100vh-64px)] relative">
          {/* Left Sidebar */}
          {showDocumentLibrary && (
            <div 
              className="bg-white border-r border-gray-200 flex flex-col relative transition-all duration-300 ease-out"
              style={{ width: `${libraryWidth}px` }}
            >
              <button
                onClick={toggleDocumentLibrary}
                className="absolute top-4 right-4 z-10 p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center space-x-1 bg-white border border-gray-200 shadow-sm"
                title="Hide Library"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
                <span className="text-xs text-gray-600">Hide</span>
              </button>
              
              {/* Conditional Content - Show PDF Viewer OR Analysis Input */}
              {viewingPdf ? (
                /* PDF Viewer in Left Panel */
                <div className="flex-1 flex flex-col">
                  {/* PDF Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={closePdfViewer}
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Back to Process Analysis"
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
                    <div className="flex space-x-2">
                      <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </button>
                    </div>
                  </div>
                  
                  {/* PDF Viewer */}
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
                /* Analysis Input Section */
                <>
                  <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                      <Target className="h-6 w-6 mr-2 text-purple-600" />
                      Process Analysis
                    </h1>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Briefcase className="h-4 w-4 inline mr-1" />
                          Your Job/Role
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Project Manager, Software Developer..."
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Search className="h-4 w-4 inline mr-1" />
                          What are you looking for?
                        </label>
                        <textarea
                          placeholder="e.g., Best practices for project workflow optimization..."
                          value={userQuery}
                          onChange={(e) => setUserQuery(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                        />
                      </div>
                      
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div className="col-span-1 sm:col-span-2 flex justify-center">
    <button
      onClick={processDocuments}
      disabled={
        isProcessing ||
        !jobTitle.trim() ||
        !userQuery.trim() ||
        documents.filter((d) => d.file).length === 0
      }
      className={`py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
        isProcessing
          ? "processing-gradient text-white cursor-not-allowed"
          : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      }`}
    >
      {isProcessing ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span>Analyzing PDFs...</span>
        </>
      ) : (
        <>
          <Zap className="h-4 w-4" />
          <span>Analyze with AI</span>
        </>
      )}
    </button>
  </div>
</div>


                      {/* API Status and File Upload */}
                      <div className="text-xs text-center space-y-2">
                        {/* API Status */}
                        

                        {/* Document status */}
                        {documents.length > 0 ? (
                          <div className="space-y-1">
                            <p className="text-gray-600">
                              {documents.length} document{documents.length > 1 ? 's' : ''} loaded
                            </p>
                            <p className="text-blue-600">
                              {documents.filter(d => d.file).length} ready for analysis
                            </p>
                            {documents.filter(d => !d.file).length > 0 && (
                              <p className="text-red-600 flex items-center justify-center space-x-1">
                                <AlertCircle className="h-3 w-3" />
                                <span>{documents.filter(d => !d.file).length} need re-upload</span>
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-gray-500">No documents loaded</p>
                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              accept="application/pdf"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PDF Documents */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">Reference Documents</h3>
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-gray-400" />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                          title="Upload more PDFs"
                        >
                          <Plus className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                    {filteredDocuments.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No documents available</p>
                        
                      </div>
                    ) : (
                      <div className="space-y-2">
                       {filteredDocuments.map((doc: Document) => (
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
        {!(doc.file || doc.fileData) && (
          <p className="text-xs text-red-600 mt-1">File data lost - please re-upload</p>
        )}
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

                  {/* Hidden file input */}
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
                onClick={toggleDocumentLibrary}
                className="p-3 rounded-lg hover:bg-gray-100 transition-all duration-200 flex items-center space-x-2 bg-white border border-gray-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                title="Show Library"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
                <span className="text-sm text-gray-600">Show Library</span>
              </button>
            </div>
          )}

          {/* Main Content Area */}
{/* Main Content Area */}
<div 
  className="flex-1 bg-gray-100 transition-all duration-300 ease-out flex flex-col"
  style={{ width: calculateContentWidth() }}
>
  {/* Show processing animation when analyzing */}
  {isProcessing ? (
    <AdobeFactsLoader />
  ) : showMainResults && geminiAnalysis ? (
    /* Show Main Results */
    <MainResultsDisplay
      analysis={geminiAnalysis}
      jobTitle={jobTitle}
      userQuery={userQuery}
      isLoading={isMainResultsLoading}
    />
  ) : (
    /* Welcome Screen */
    <div className="flex-1 flex items-center justify-center">
      {showInstructions && (
        <div className="text-center bg-white bg-opacity-90 p-8 rounded-xl shadow-lg max-w-2xl mx-4 relative">
          <button
            onClick={() => setShowInstructions(false)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200 transition-colors"
            title="Hide Instructions"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Brain className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">GetWhatMatters Document Analysis</h3>
          <div className="text-gray-600 space-y-4 text-left">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
              <div className="space-y-2 text-sm">
                <p>• Upload your PDF documents and specify your job role</p>
                <p>• Describe what information you're looking for</p>
                <p>• AI extracts and analyzes content from all your documents</p>
                <p>• Get comprehensive insights and actionable recommendations</p>
                <p>• Chat with the AI assistant about your results</p>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Features:</h4>
              <div className="space-y-2 text-sm">
                <p>• AI-powered document content extraction</p>
                <p>• Smart analysis based on your role and query</p>
                <p>• Key insights + 3 additional relevant points</p>
                <p>• Voice-enabled chat assistance</p>
                <p>• No external server dependencies</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-400">
            <span>Powered by</span>
            <span className="font-semibold text-purple-600">Gemini AI + PDF.js</span>
          </div>
        </div>
      )}
    </div>
  )}
  
  {/* Keep the original modal as secondary option */}
  {showGeminiResults && geminiAnalysis && (
    <GeminiResultsModal
      analysis={geminiAnalysis}
      onClose={() => setShowGeminiResults(false)}
      jobTitle={jobTitle}
      userQuery={userQuery}
    />
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
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Analysis Assistant</h3>
                        <p className="text-xs text-gray-500">Process flow insights</p>
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
                    className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin"
                  >
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-start space-x-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.type === 'user' ? 'bg-purple-100' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                          }`}>
                            {message.type === 'user' ? (
                              <User className="h-3 w-3 text-purple-600" />
                            ) : (
                              <Bot className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div className={`rounded-lg p-3 ${
                            message.type === 'user' 
                              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p className="text-sm whitespace-pre-line">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.type === 'user' ? 'text-purple-100' : 'text-gray-500'
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
                          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-500">
                            <Bot className="h-3 w-3 text-white" />
                          </div>
                          <div className="rounded-lg p-3 bg-gray-100 flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Ask about the analysis results..."
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!currentMessage.trim() || isTyping}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
      </div>
    </>
  );
};

export default ConnectingDots;