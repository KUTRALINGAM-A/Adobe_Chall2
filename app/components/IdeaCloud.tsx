import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Upload, FileText, Grid, List, Search, Plus, Eye, Download, ChevronLeft, ChevronRight, 
  BookOpen, BookOpenCheck, GripVertical, MessageCircle, Send, Bot, User, X, Minimize2, Maximize2,
  Move, Square, Circle, Diamond, Triangle, ArrowRight, Palette, Save, Image, Trash2, Copy,
  ZoomIn, ZoomOut, RotateCcw, MousePointer, Type, Layers, Settings, Sparkles,CheckCircle, AlertTriangle, Zap,CheckCircle2
} from 'lucide-react';

// Gemini API Configuration
const GEMINI_API_KEY = 'AIzaSyA4vvBvLJqeWe6SiVBf0Od79JmbBHHdFBU';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';


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
}

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface CanvasNode {
  id: string;
  type: 'rectangle' | 'circle' | 'diamond' | 'triangle' | 'text' | 'process' | 'decision' | 'start-end';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  fontSize: number;
  borderWidth: number;
  borderRadius: number;
  shadow: boolean;
  gradient: boolean;
}

interface Connection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPoint: { x: number; y: number };
  toPoint: { x: number; y: number };
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
  arrowType: 'none' | 'arrow' | 'circle' | 'diamond';
}

interface Canvas {
  id: string;
  name: string;
  nodes: CanvasNode[];
  connections: Connection[];
  createdDate: string;
  lastModified: string;
}

interface EnhancedGeminiAnalysis {
  flowchartIdeas?: Array<{
    title: string;
    description: string;
    steps: string[];
    applicability: string;
  }>;
  keyInsights?: string[];
  improvementSuggestions?: string[];
  implementationSteps?: Array<{
    phase: string;
    actions: string[];
    timeline: string;
    dependencies: string[];
  }>;
  riskAssessment?: Array<{
    risk: string;
    impact: string;
    mitigation: string;
  }>;
  resourceRequirements?: string[];
  successMetrics?: string[];
  nextActions?: string[];
}

type Tool = 'select' | 'rectangle' | 'circle' | 'diamond' | 'triangle' | 'text' | 'connection' | 'pan';

const IdeaCloud: React.FC = () => {
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
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizingNode, setResizingNode] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [initialSize, setInitialSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [initialMousePos, setInitialMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showInstructions, setShowInstructions] = useState<boolean>(true);
  const [viewingPdf, setViewingPdf] = useState<Document | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
const [pdfTextExtracted, setPdfTextExtracted] = useState('');

  // Gemini AI specific state
  const [isGeminiAnalyzing, setIsGeminiAnalyzing] = useState<boolean>(false);
  const [geminiAnalysis, setGeminiAnalysis] = useState<EnhancedGeminiAnalysis | null>(null);
  const [showGeminiResults, setShowGeminiResults] = useState<boolean>(false);

  // Canvas specific state
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [currentCanvas, setCurrentCanvas] = useState<Canvas | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>('select');
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [showNodeEditor, setShowNodeEditor] = useState<boolean>(false);
  const [editingNode, setEditingNode] = useState<CanvasNode | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [tempConnection, setTempConnection] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const libraryResizerRef = useRef<HTMLDivElement>(null);
  const chatResizerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<SVGSVGElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

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
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      script.onload = () => {
       if (window.pdfjsLib?.GlobalWorkerOptions) {
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

  // Load existing documents from localStorage (simulating persistence from first page)
useEffect(() => {
  const loadDocumentsFromStorage = async () => {
    const savedDocuments = localStorage.getItem('uploadedDocuments');
    console.log('=== DEBUG: Loading documents from localStorage ===');
    console.log('Raw localStorage data:', savedDocuments);
    
    if (savedDocuments) {
      try {
        const parsedDocuments = JSON.parse(savedDocuments);
        console.log('Parsed documents:', parsedDocuments);
        
        // Process documents to ensure file objects are properly handled
        const processedDocuments = await Promise.all(
          parsedDocuments.map(async (doc: any) => {
            // If document has a URL but no file, try to fetch it
            if (doc.url && !doc.file) {
              try {
                const response = await fetch(doc.url);
                if (response.ok) {
                  const blob = await response.blob();
                  const file = new File([blob], doc.name, { type: doc.type || 'application/pdf' });
                  return { ...doc, file };
                }
              } catch (fetchError) {
                console.warn('Could not fetch file from URL:', doc.url, fetchError);
              }
            }
            return doc;
          })
        );
        
        setDocuments(processedDocuments);
        console.log('Processed documents:', processedDocuments);
      } catch (error) {
        console.error('Error loading documents:', error);
        setDocuments([]);
      }
    } else {
      console.log('No documents in localStorage');
      setDocuments([]);
    }
  };

  loadDocumentsFromStorage();

  // Create a default canvas
  const defaultCanvas: Canvas = {
    id: 'default',
    name: 'My First Canvas',
    nodes: [],
    connections: [],
    createdDate: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };
  setCanvases([defaultCanvas]);
  setCurrentCanvas(defaultCanvas);
}, []);

  const EnhancedGeminiResultsModal: React.FC<{
    analysis: EnhancedGeminiAnalysis;
    onClose: () => void;
    jobTitle: string;
    userQuery: string;
  }> = ({ analysis, onClose, jobTitle, userQuery }) => (
    <div className="fixed inset-0 bg-transparent z-[60] flex items-center justify-center p-4">

      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Sparkles className="h-6 w-6 mr-2 text-purple-600" />
                AI Process Assistant for {jobTitle}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Comprehensive analysis for: "{userQuery}"
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
          {/* Flowchart Ideas Section */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
              <Layers className="h-5 w-5 mr-2" />
              Flowchart Ideas & Process Designs
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {analysis.flowchartIdeas?.map((idea, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">{idea.title}</h4>
                  <p className="text-sm text-gray-700 mb-3">{idea.description}</p>
                  <div className="mb-3">
                    <strong className="text-xs text-blue-600">Process Steps:</strong>
                    <ul className="text-xs text-gray-600 mt-1 space-y-1">
                      {idea.steps.map((step, stepIndex) => (
                        <li key={stepIndex} className="flex items-start space-x-1">
                          <span className="text-blue-500">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-2 rounded text-xs text-blue-800">
                    <strong>Why relevant:</strong> {idea.applicability}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Implementation Steps */}
          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Implementation Roadmap
            </h3>
            <div className="space-y-4">
              {analysis.implementationSteps?.map((phase, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-green-800">{phase.phase}</h4>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      {phase.timeline}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong className="text-green-700">Actions:</strong>
                      <ul className="text-gray-600 mt-1 space-y-1">
                        {phase.actions.map((action, actionIndex) => (
                          <li key={actionIndex} className="flex items-start space-x-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <strong className="text-green-700">Dependencies:</strong>
                    <ul className="text-gray-600 mt-1 space-y-1">
  {Array.isArray(phase.dependencies) && phase.dependencies.length > 0 ? (
    phase.dependencies.map((dep, depIndex) => (
      <li key={depIndex} className="flex items-start space-x-1">
        <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
        <span>{dep}</span>
      </li>
    ))
  ) : (
    <li className="text-gray-400 italic">No dependencies</li>
  )}
</ul>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="bg-yellow-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Risk Assessment & Mitigation
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {analysis.riskAssessment?.map((risk, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-yellow-800">{risk.risk}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      risk.impact === 'High' ? 'bg-red-100 text-red-700' :
                      risk.impact === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {risk.impact} Impact
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong className="text-yellow-700">Mitigation:</strong> {risk.mitigation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Items */}
          <div className="bg-purple-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              Next Actions
            </h3>
            <div className="space-y-3">
              {analysis.nextActions?.map((action, index) => (
                <div key={index} className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-purple-200">
                  <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-700">{action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Add this function to extract text from PDF
const extractPdfText = async (file: File): Promise<string> => {
  try {
    // Check if file exists and is valid
    if (!file || !(file instanceof File)) {
      throw new Error('Invalid file object provided');
    }

    // Check if PDF.js library is loaded
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) {
      console.error('PDF.js library not loaded');
      return `PDF.js library not available. File: ${file.name}, Size: ${file.size} bytes.`;
    }
    
    console.log('Extracting text from:', file.name, 'Size:', file.size);
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useSystemFonts: true,
      disableFontFace: false
    }).promise;
    
    let fullText = '';
    const numPages = pdf.numPages;
    
    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .filter((text: string) => text.trim().length > 0)
          .join(' ');
        
        if (pageText.trim()) {
          fullText += `\n--- Page ${i} ---\n${pageText.trim()}\n`;
        }
      } catch (pageError) {
        console.warn(`Error extracting text from page ${i}:`, pageError);
        fullText += `\n--- Page ${i} ---\n[Error extracting text from this page]\n`;
      }
    }
    
    if (fullText.trim()) {
      console.log('Successfully extracted text, length:', fullText.length);
      return fullText;
    } else {
      return `No text content found in ${file.name}. This might be a scanned PDF or contain only images.`;
    }
    
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    return `Unable to extract text from ${file.name}. Error: ${error instanceof Error ? error.message : 'Unknown error'}. File size: ${file?.size || 'unknown'} bytes.`;
  }
};

const analyzeWithGemini = async (
  sections: { documentName: string; title: string; content: string; accuracy: number; pageNumber: number }[],
  jobTitle: string,
  userQuery: string,
  pdfContent?: string
) => {
  setIsGeminiAnalyzing(true);

  try {
    // Use the extracted PDF content if available, otherwise use sections
    let documentContent = '';
    let documentSource = '';
    
    if (pdfContent && pdfContent.trim() && 
        !pdfContent.startsWith('Unable to extract') && 
        !pdfContent.startsWith('Failed to extract') &&
        !pdfContent.startsWith('PDF.js library not available')) {
      
      // Use actual PDF content
      documentContent = pdfContent.substring(0, 15000); // Increased limit for more context
      documentSource = viewingPdf?.name || 'PDF Document';
      console.log('Using extracted PDF content for analysis, length:', documentContent.length);
      
    } else if (sections && sections.length > 0) {
      // Fallback to sections if PDF extraction failed
      documentContent = sections.map(s =>
        `${s.title}: ${s.content}`
      ).join('\n\n');
      documentSource = sections[0]?.documentName || 'Document';
      console.log('Using sections for analysis, sections count:', sections.length);
    } else {
      // No content available
      throw new Error('No document content available for analysis');
    }

    const prompt = `You are an expert business process analyst and flowchart designer specializing in document-based process improvement.

CONTEXT:
- User Role: ${jobTitle}
- Query: "${userQuery}"
- Document: ${documentSource}
- Content Length: ${documentContent.length} characters

DOCUMENT CONTENT TO ANALYZE:
${documentContent}

CRITICAL INSTRUCTIONS:
1. Base ALL suggestions EXCLUSIVELY on the specific content provided above
2. Quote specific sections, procedures, or processes mentioned in the document
3. Reference actual page numbers, section titles, or specific details from the content
4. Do not provide generic advice - everything must be tied to the actual document content
5. If the document discusses specific procedures, processes, or workflows, focus on those
6. Identify actual bottlenecks, inefficiencies, or improvement opportunities mentioned in the text
7. Reference specific stakeholders, departments, or systems mentioned in the document

Provide comprehensive analysis in this exact JSON format:

{
  "flowchartIdeas": [
    {
      "title": "Process name/title extracted from the document",
      "description": "Detailed description based on actual procedures/processes described in the document",
      "steps": ["Actual step 1 from document", "Actual step 2 from document", "Actual step 3 from document"],
      "applicability": "Why this specific process from the document is relevant for ${jobTitle}, citing specific document sections"
    },
    {
      "title": "Alternative process/workflow identified in the document", 
      "description": "Another workflow approach found in the document content",
      "steps": ["Document-specific step 1", "Document-specific step 2"],
      "applicability": "Different use case found in the document for ${jobTitle}"
    }
  ],
  "keyInsights": [
    "Critical insight directly extracted from the document with specific reference",
    "Important pattern or issue specifically mentioned in the document",
    "Best practice or recommendation explicitly stated in the document content"
  ],
  "improvementSuggestions": [
    "Specific improvement suggestion based on problems/inefficiencies mentioned in the document",
    "Technology or tool recommendation that addresses specific issues described in the content",
    "Process optimization based on actual gaps identified in the document"
  ],
  "implementationSteps": [
    {
      "phase": "Phase name based on document structure or process stages mentioned",
      "actions": ["Action based on document recommendations", "Another document-specific action"],
      "timeline": "Timeline estimate based on complexity mentioned in document",
      "dependencies": ["Specific dependencies or prerequisites mentioned in the document"]
    },
    {
      "phase": "Next phase from document analysis", 
      "actions": ["Implementation action derived from document content", "Document-specific next step"],
      "timeline": "Realistic timeframe based on document complexity",
      "dependencies": ["Actual prerequisites identified in the document content"]
    }
  ],
  "riskAssessment": [
    {
      "risk": "Specific risk or challenge mentioned in the document",
      "impact": "High/Medium/Low based on document context",
      "mitigation": "Mitigation strategy based on solutions suggested in the document or addressing document-specific issues"
    }
  ],
  "resourceRequirements": [
    "Human resources specifically mentioned in the document",
    "Technology/tools/systems referenced in the document content", 
    "Budget considerations based on costs/resources discussed in the document",
    "Training requirements for specific skills/processes mentioned in the document"
  ],
  "successMetrics": [
    "KPI or success measure mentioned in the document",
    "Performance indicator based on goals/objectives stated in the content",
    "Timeline milestone derived from document timelines or deadlines"
  ],
  "nextActions": [
    "Immediate next step based on document recommendations for ${jobTitle}",
    "Short-term action derived from document priorities",
    "Medium-term goal based on document strategic objectives"
  ]
}

IMPORTANT: Every single suggestion must reference specific content from the provided document. Do not include generic business advice. If you cannot find relevant content for a section, indicate "No specific information found in document" rather than providing generic content.`;

    console.log('Sending enhanced prompt to Gemini, prompt length:', prompt.length);

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more focused, factual responses
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 4096,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('Gemini response received, length:', generatedText.length);
    console.log('First 500 chars:', generatedText.substring(0, 500));
    
    let analysis;
    try {
      const cleanedText = generatedText.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw response:', generatedText);
      
      // Enhanced fallback with document-specific information
      analysis = {
        flowchartIdeas: [
          {
            title: `Document-Based Process Analysis for ${documentSource}`,
            description: `Analysis based on content from ${documentSource}. The document contains ${Math.round(documentContent.length/100)} content units that require systematic review and process mapping.`,
            steps: [
              "Extract key processes and procedures from the document",
              "Map stakeholders and responsibilities mentioned in the content",
              "Identify decision points and workflow branches described",
              "Document inputs, outputs, and dependencies referenced",
              "Create flowchart based on documented processes"
            ],
            applicability: `This analysis is specifically tailored to the processes and procedures found in ${documentSource}, making it directly relevant for ${jobTitle} workflow optimization.`
          }
        ],
        keyInsights: [
          `Document analysis reveals ${documentContent.split('\n').length} distinct sections requiring attention`,
          `The content contains specific processes and procedures relevant to ${jobTitle} responsibilities`,
          `Key stakeholders, systems, and dependencies are mentioned throughout the document`,
          `Multiple decision points and workflow branches can be identified in the content`
        ],
        improvementSuggestions: [
          `Systematically extract all process steps mentioned in ${documentSource}`,
          `Create visual workflows for each major process described in the document`,
          `Identify automation opportunities for repetitive tasks mentioned in the content`,
          `Standardize procedures based on best practices found in the document`
        ],
        implementationSteps: [
          {
            phase: "Document Analysis & Process Extraction",
            actions: [
              `Thoroughly review all ${Math.round(documentContent.length/1000)}k characters of content`,
              "Extract and categorize all process-related information",
              "Identify stakeholders, systems, and tools mentioned"
            ],
            timeline: "1-2 weeks depending on document complexity",
            dependencies: [
              `Complete access to ${documentSource} and related materials`,
              "Subject matter expert availability for clarification",
              "Process mapping tools and templates"
            ]
          },
          {
            phase: "Process Design & Validation",
            actions: [
              "Create detailed flowcharts for each identified process",
              "Validate process flows with stakeholders mentioned in document",
              "Test and refine workflows based on document specifications"
            ],
            timeline: "2-3 weeks",
            dependencies: [
              "Completed document analysis phase",
              "Stakeholder availability for validation sessions",
              "Access to systems and tools referenced in the document"
            ]
          }
        ],
        riskAssessment: [
          {
            risk: "Document content may be incomplete or outdated",
            impact: "High",
            mitigation: `Verify information with current stakeholders and cross-reference with other documentation related to ${documentSource}`
          },
          {
            risk: "Complex processes may be oversimplified in documentation",
            impact: "Medium", 
            mitigation: "Conduct detailed interviews with process owners to capture nuances not documented"
          }
        ],
        resourceRequirements: [
          `Subject matter experts familiar with processes described in ${documentSource}`,
          "Process mapping and flowchart creation tools",
          "Time allocation for thorough document analysis and stakeholder interviews",
          "Access to systems and tools referenced in the document content"
        ],
        successMetrics: [
          "Percentage of document processes successfully mapped to flowcharts",
          "Stakeholder validation scores for process accuracy",
          "Reduction in process ambiguity through clear documentation",
          "Implementation success rate of document-derived workflows"
        ],
        nextActions: [
          `Begin systematic review of ${documentSource} content sections`,
          "Schedule stakeholder interviews for process validation",
          "Set up process mapping workspace with appropriate tools",
          "Create timeline for complete process documentation project"
        ]
      };
    }

    setGeminiAnalysis(analysis);
    setShowGeminiResults(true);

  } catch (error) {
    console.error('Enhanced Gemini API error:', error);
    alert(`Failed to analyze document: Please ensure the PDF is properly loaded and try again.`);
  } finally {
    setIsGeminiAnalyzing(false);
  }
};


  // Enhanced chatbot with Gemini integration
const getBotResponse = async (message: string): Promise<string> => {
  try {
    const lowerMessage = message.toLowerCase();

    // Extract canvas context
    const canvasContext = currentCanvas
      ? `Current canvas: ${currentCanvas.name} with ${currentCanvas.nodes.length} nodes and ${currentCanvas.connections.length} connections`
      : 'No active canvas';

    // Use extracted PDF content with validation
    const pdfContent = pdfTextExtracted && pdfTextExtracted.trim() && 
                      !pdfTextExtracted.startsWith('Unable to extract') && 
                      !pdfTextExtracted.startsWith('Failed to extract')
                      ? pdfTextExtracted 
                      : '';

    const pdfContextInfo = viewingPdf 
      ? `PDF Document: ${viewingPdf.name} (${pdfContent ? 'text extracted' : 'no text available'})`
      : 'No PDF document open';

    // Create enhanced prompt with better context handling
    const prompt = `
      You are an expert flowchart and process design assistant helping with IdeaCloud.
      
      USER MESSAGE: "${message}"
      
      CURRENT CONTEXT:
      - ${canvasContext}
      - ${pdfContextInfo}
      
      ${pdfContent ? `
      PDF DOCUMENT CONTENT (first 8000 chars):
      ${pdfContent.substring(0, 8000)}
      
      Based on this document content, provide specific advice and reference relevant sections when answering the user's question.
      ` : 'No document content available - provide general flowchart and process design guidance.'}

      Provide helpful, specific advice about flowchart creation, process design, or canvas management. 
      If PDF content is available, reference specific information from the document.
      Keep responses concise but informative (under 200 words).
    `;

    console.log('Making request to Gemini API with PDF context...');
    console.log('PDF content length:', pdfContent.length);

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300,
      }
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      return `API Error (${response.status}): Unable to process request. Please try again.`;
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (aiResponse) {
      return aiResponse.trim();
    } else {
      return "I received a response but couldn't extract the content. Please try again.";
    }
    
  } catch (error) {
    console.error('Chat bot error:', error);
    return "I'm having trouble processing your request. Please check your connection and try again.";
  }
};

const sendContentSnippet = (content: string, title: string = "PDF Content") => {
  if (!content || !content.trim()) {
    alert('No content available to send');
    return;
  }

  // Add as a chat message
  const contentMessage: ChatMessage = {
    id: `content-${Date.now()}`,
    type: 'bot',
    content: `📄 **${title}**\n\n${content.substring(0, 500)}${content.length > 500 ? '...\n\n[Content truncated - full content available in PDF]' : ''}`,
    timestamp: new Date()
  };
  
  setChatMessages(prev => [...prev, contentMessage]);
  
  // Optionally, create a node on canvas with the content
  if (currentCanvas && content.length < 100) {
    const newNode = createNode('rectangle', 300, 200);
    newNode.text = content.substring(0, 50) + (content.length > 50 ? '...' : '');
    newNode.backgroundColor = '#fef3c7';
    newNode.borderColor = '#f59e0b';
    
    const updatedCanvas = {
      ...currentCanvas,
      nodes: [...currentCanvas.nodes, newNode],
      lastModified: new Date().toISOString()
    };
    
    setCurrentCanvas(updatedCanvas);
    setCanvases(prev => prev.map(c => c.id === updatedCanvas.id ? updatedCanvas : c));
  }
  
  // Show chat if hidden
  if (!showChat) {
    setShowChat(true);
  }
};

  // Resizing functionality
const handleLibraryMouseMove = useCallback((e: MouseEvent) => {
  if (!isResizingLibrary || !containerRef.current) return;
  
  requestAnimationFrame(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;
    
    // Adjust constraints when PDF is open
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

  const handleResizeMouseDown = (e: React.MouseEvent, nodeId: string, handle: string) => {
    e.stopPropagation();
    const node = currentCanvas?.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const coords = getCanvasCoordinates(e);
    setIsResizing(true);
    setResizingNode(nodeId);
    setResizeHandle(handle);
    setInitialSize({ width: node.width, height: node.height });
    setInitialMousePos(coords);
  };

  const handleResizeMouseMove = (e: React.MouseEvent) => {
    if (!isResizing || !resizingNode || !currentCanvas) return;
    
    const coords = getCanvasCoordinates(e);
    const deltaX = coords.x - initialMousePos.x;
    const deltaY = coords.y - initialMousePos.y;
    
    let newWidth = initialSize.width;
    let newHeight = initialSize.height;
    
    switch (resizeHandle) {
      case 'se': // bottom-right
        newWidth = Math.max(50, initialSize.width + deltaX);
        newHeight = Math.max(30, initialSize.height + deltaY);
        break;
      case 'sw': // bottom-left
        newWidth = Math.max(50, initialSize.width - deltaX);
        newHeight = Math.max(30, initialSize.height + deltaY);
        break;
      case 'ne': // top-right
        newWidth = Math.max(50, initialSize.width + deltaX);
        newHeight = Math.max(30, initialSize.height - deltaY);
        break;
      case 'nw': // top-left
        newWidth = Math.max(50, initialSize.width - deltaX);
        newHeight = Math.max(30, initialSize.height - deltaY);
        break;
    }
    
    const updatedNodes = currentCanvas.nodes.map(node => {
      if (node.id === resizingNode) {
        let newX = node.x;
        let newY = node.y;
        
        // Adjust position for left/top handles
        if (resizeHandle?.includes('w')) {
          newX = node.x - (newWidth - node.width);
        }
        if (resizeHandle?.includes('n')) {
          newY = node.y - (newHeight - node.height);
        }
        
        return { ...node, width: newWidth, height: newHeight, x: newX, y: newY };
      }
      return node;
    });
    
    const updatedCanvas = {
      ...currentCanvas,
      nodes: updatedNodes,
      lastModified: new Date().toISOString()
    };
    
    setCurrentCanvas(updatedCanvas);
    setCanvases(prev => prev.map(c => c.id === updatedCanvas.id ? updatedCanvas : c));
  };

  const handleResizeMouseUp = () => {
    setIsResizing(false);
    setResizingNode(null);
    setResizeHandle(null);
  };

  // Mouse wheel zoom functionality
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Only zoom when mouse is over the canvas area
      const target = e.target as Element;
      const canvasContainer = canvasRef.current?.parentElement;
      if (!canvasContainer?.contains(target)) return;

      e.preventDefault();
      
      const zoomIntensity = 0.1;
      const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
      
      setZoom(prevZoom => {
        const newZoom = Math.min(Math.max(prevZoom + delta, 0.5), 2);
        return newZoom;
      });
    };

    // Add wheel event listener to the canvas container
    const canvasContainer = canvasRef.current?.parentElement;
    if (canvasContainer) {
      canvasContainer.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        canvasContainer.removeEventListener('wheel', handleWheel);
      };
    }
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

  useEffect(() => {
    if (isResizingLibrary) {
      document.addEventListener('mousemove', handleLibraryMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    } else if (isResizingChat) {
      document.addEventListener('mousemove', handleChatMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    } else {
      document.removeEventListener('mousemove', handleLibraryMouseMove);
      document.removeEventListener('mousemove', handleChatMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleLibraryMouseMove);
      document.removeEventListener('mousemove', handleChatMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizingLibrary, isResizingChat, handleLibraryMouseMove, handleChatMouseMove, handleMouseUp]);

  // Canvas functionality
  const createNode = (type: CanvasNode['type'], x: number, y: number): CanvasNode => {
    const nodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const baseNode = {
      id: nodeId,
      type,
      x,
      y,
      text: 'New Node',
      textColor: '#1f2937',
      fontSize: 14,
      borderWidth: 2,
      shadow: true,
      gradient: false
    };

    switch (type) {
      case 'rectangle':
      case 'process':
        return {
          ...baseNode,
          width: 120,
          height: 60,
          backgroundColor: '#dbeafe',
          borderColor: '#3b82f6',
          borderRadius: 8
        };
      case 'circle':
      case 'start-end':
        return {
          ...baseNode,
          width: 100,
          height: 100,
          backgroundColor: '#dcfce7',
          borderColor: '#22c55e',
          borderRadius: 50
        };
      case 'diamond':
      case 'decision':
        return {
          ...baseNode,
          width: 100,
          height: 80,
          backgroundColor: '#fef3c7',
          borderColor: '#f59e0b',
          borderRadius: 0
        };
      case 'triangle':
        return {
          ...baseNode,
          width: 100,
          height: 80,
          backgroundColor: '#fce7f3',
          borderColor: '#ec4899',
          borderRadius: 0
        };
      default:
        return {
          ...baseNode,
          width: 120,
          height: 60,
          backgroundColor: '#f3f4f6',
          borderColor: '#6b7280',
          borderRadius: 4
        };
    }
  };

  const addNode = (type: CanvasNode['type']) => {
    if (!currentCanvas) return;
    
    const canvasCenter = {
      x: 400 + Math.random() * 200,
      y: 200 + Math.random() * 200
    };
    
    const newNode = createNode(type, canvasCenter.x, canvasCenter.y);
    
    const updatedCanvas = {
      ...currentCanvas,
      nodes: [...currentCanvas.nodes, newNode],
      lastModified: new Date().toISOString()
    };
    
    setCurrentCanvas(updatedCanvas);
    setCanvases(prev => prev.map(c => c.id === updatedCanvas.id ? updatedCanvas : c));
    setSelectedTool('select');
  };

  const deleteSelectedNodes = () => {
    if (!currentCanvas || selectedNodes.length === 0) return;
    
    const updatedCanvas = {
      ...currentCanvas,
      nodes: currentCanvas.nodes.filter(node => !selectedNodes.includes(node.id)),
      connections: currentCanvas.connections.filter(conn => 
        !selectedNodes.includes(conn.fromNodeId) && !selectedNodes.includes(conn.toNodeId)
      ),
      lastModified: new Date().toISOString()
    };
    
    setCurrentCanvas(updatedCanvas);
    setCanvases(prev => prev.map(c => c.id === updatedCanvas.id ? updatedCanvas : c));
    setSelectedNodes([]);
  };

  const duplicateSelectedNodes = () => {
    if (!currentCanvas || selectedNodes.length === 0) return;
    
    const selectedNodesData = currentCanvas.nodes.filter(node => selectedNodes.includes(node.id));
    const duplicatedNodes = selectedNodesData.map(node => ({
      ...node,
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: node.x + 50,
      y: node.y + 50
    }));
    
    const updatedCanvas = {
      ...currentCanvas,
      nodes: [...currentCanvas.nodes, ...duplicatedNodes],
      lastModified: new Date().toISOString()
    };
    
    setCurrentCanvas(updatedCanvas);
    setCanvases(prev => prev.map(c => c.id === updatedCanvas.id ? updatedCanvas : c));
    setSelectedNodes(duplicatedNodes.map(n => n.id));
  };
const exportCanvas = () => {
  if (!canvasRef.current || !currentCanvas) return;
  
  // Get the canvas container dimensions (visible area)
  const canvasContainer = canvasRef.current.parentElement;
  if (!canvasContainer) return;
  
  const containerRect = canvasContainer.getBoundingClientRect();
  const visibleWidth = containerRect.width;
  const visibleHeight = containerRect.height;
  
  // Calculate what's visible considering zoom and pan
  const visibleArea = {
    left: -panOffset.x / zoom,
    top: -panOffset.y / zoom,
    right: (-panOffset.x + visibleWidth) / zoom,
    bottom: (-panOffset.y + visibleHeight) / zoom
  };
  
  // Create canvas with visible dimensions
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = visibleWidth;
  canvas.height = visibleHeight;
  
  if (!ctx) return;
  
  // Fill background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid pattern matching the visible area
  ctx.strokeStyle = '#f3f4f6';
  ctx.lineWidth = 1;
  
  // Calculate grid offset based on pan
  const gridSize = 20 * zoom;
  const offsetX = panOffset.x % gridSize;
  const offsetY = panOffset.y % gridSize;
  
  // Draw vertical grid lines
  for (let x = offsetX; x <= canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  // Draw horizontal grid lines
  for (let y = offsetY; y <= canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  
  // Apply zoom and pan transformations
  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(panOffset.x / zoom, panOffset.y / zoom);
  
  // Draw connections that are visible
  ctx.lineWidth = 2 / zoom; // Adjust line width for zoom
  currentCanvas.connections.forEach(conn => {
    const fromNode = currentCanvas.nodes.find(n => n.id === conn.fromNodeId);
    const toNode = currentCanvas.nodes.find(n => n.id === conn.toNodeId);
    
    if (!fromNode || !toNode) return;
    
    const fromCenter = {
      x: fromNode.x + fromNode.width / 2,
      y: fromNode.y + fromNode.height / 2
    };
    const toCenter = {
      x: toNode.x + toNode.width / 2,
      y: toNode.y + toNode.height / 2
    };
    
    // Check if connection is in visible area
    const connectionBounds = {
      left: Math.min(fromCenter.x, toCenter.x),
      right: Math.max(fromCenter.x, toCenter.x),
      top: Math.min(fromCenter.y, toCenter.y),
      bottom: Math.max(fromCenter.y, toCenter.y)
    };
    
    if (connectionBounds.right >= visibleArea.left && 
        connectionBounds.left <= visibleArea.right &&
        connectionBounds.bottom >= visibleArea.top && 
        connectionBounds.top <= visibleArea.bottom) {
      
      ctx.strokeStyle = conn.color || '#6b7280';
      ctx.beginPath();
      ctx.moveTo(fromCenter.x, fromCenter.y);
      ctx.lineTo(toCenter.x, toCenter.y);
      ctx.stroke();
      
      // Draw arrow
      const dx = toCenter.x - fromCenter.x;
      const dy = toCenter.y - fromCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        const unitX = dx / distance;
        const unitY = dy / distance;
        
        const arrowLength = 10 / zoom;
        const angle = Math.atan2(dy, dx);
        
        ctx.beginPath();
        ctx.moveTo(toCenter.x, toCenter.y);
        ctx.lineTo(
          toCenter.x - arrowLength * Math.cos(angle - Math.PI / 6),
          toCenter.y - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(toCenter.x, toCenter.y);
        ctx.lineTo(
          toCenter.x - arrowLength * Math.cos(angle + Math.PI / 6),
          toCenter.y - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    }
  });
  
  // Draw nodes that are visible
  currentCanvas.nodes.forEach(node => {
    // Check if node is in visible area
    if (node.x + node.width >= visibleArea.left && 
        node.x <= visibleArea.right &&
        node.y + node.height >= visibleArea.top && 
        node.y <= visibleArea.bottom) {
      
      ctx.fillStyle = node.backgroundColor;
      ctx.strokeStyle = node.borderColor;
      ctx.lineWidth = node.borderWidth / zoom;
      
      // Draw shape based on type
      switch (node.type) {
        case 'circle':
        case 'start-end':
          ctx.beginPath();
          ctx.ellipse(
            node.x + node.width / 2,
            node.y + node.height / 2,
            node.width / 2,
            node.height / 2,
            0, 0, 2 * Math.PI
          );
          ctx.fill();
          ctx.stroke();
          break;
          
        case 'diamond':
        case 'decision':
          const centerX = node.x + node.width / 2;
          const centerY = node.y + node.height / 2;
          ctx.beginPath();
          ctx.moveTo(centerX, node.y);
          ctx.lineTo(node.x + node.width, centerY);
          ctx.lineTo(centerX, node.y + node.height);
          ctx.lineTo(node.x, centerY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
          
        case 'triangle':
          const triCenterX = node.x + node.width / 2;
          ctx.beginPath();
          ctx.moveTo(triCenterX, node.y);
          ctx.lineTo(node.x + node.width, node.y + node.height);
          ctx.lineTo(node.x, node.y + node.height);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
          
        default:
          // Rectangle with border radius
          if (node.borderRadius > 0) {
            const radius = Math.min(node.borderRadius, node.width / 2, node.height / 2);
            ctx.beginPath();
            ctx.moveTo(node.x + radius, node.y);
            ctx.lineTo(node.x + node.width - radius, node.y);
            ctx.quadraticCurveTo(node.x + node.width, node.y, node.x + node.width, node.y + radius);
            ctx.lineTo(node.x + node.width, node.y + node.height - radius);
            ctx.quadraticCurveTo(node.x + node.width, node.y + node.height, node.x + node.width - radius, node.y + node.height);
            ctx.lineTo(node.x + radius, node.y + node.height);
            ctx.quadraticCurveTo(node.x, node.y + node.height, node.x, node.y + node.height - radius);
            ctx.lineTo(node.x, node.y + radius);
            ctx.quadraticCurveTo(node.x, node.y, node.x + radius, node.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillRect(node.x, node.y, node.width, node.height);
            ctx.strokeRect(node.x, node.y, node.width, node.height);
          }
      }
      
      // Draw text
      ctx.fillStyle = node.textColor;
      ctx.font = `500 ${node.fontSize / zoom}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Handle text wrapping
      const words = node.text.split(/\s+/).filter(word => word.length > 0);
      if (words.length === 0) return;
      
      const maxWidth = Math.max(20, node.width - 16);
      const lineHeight = (node.fontSize / zoom) * 1.2;
      const lines = [];
      let currentLine = words[0];
      
      for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const testMetrics = ctx.measureText(testLine);
        
        if (testMetrics.width > maxWidth && currentLine !== '') {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);
      
      const maxLines = Math.floor((node.height - 8) / lineHeight);
      const displayLines = lines.slice(0, Math.max(1, maxLines));
      
      if (lines.length > maxLines && maxLines > 0) {
        let lastLine = displayLines[displayLines.length - 1];
        const ellipsis = '...';
        let testLine = lastLine + ellipsis;
        let testMetrics = ctx.measureText(testLine);
        
        while (testMetrics.width > maxWidth && lastLine.length > 1) {
          lastLine = lastLine.substring(0, lastLine.length - 1).trim();
          testLine = lastLine + ellipsis;
          testMetrics = ctx.measureText(testLine);
        }
        
        displayLines[displayLines.length - 1] = testLine;
      }
      
      const totalTextHeight = (displayLines.length - 1) * lineHeight;
      const textBlockHeight = totalTextHeight + (node.fontSize / zoom);
      const startY = node.y + Math.max(4, (node.height - textBlockHeight) / 2 + (node.fontSize / zoom) / 2);
      
      displayLines.forEach((line, index) => {
        const lineY = startY + index * lineHeight;
        
        if (lineY >= node.y + (node.fontSize / zoom) / 2 && 
            lineY <= node.y + node.height - (node.fontSize / zoom) / 2) {
          
          let finalLine = line;
          let metrics = ctx.measureText(finalLine);
          
          if (metrics.width > maxWidth) {
            const ellipsis = '...';
            const ellipsisWidth = ctx.measureText(ellipsis).width;
            
            while (metrics.width > maxWidth - ellipsisWidth && finalLine.length > 1) {
              finalLine = finalLine.substring(0, finalLine.length - 1).trim();
              metrics = ctx.measureText(finalLine);
            }
            
            if (finalLine.length > 0) {
              finalLine += ellipsis;
            } else {
              finalLine = '...';
            }
          }
          
          ctx.fillText(
            finalLine,
            node.x + node.width / 2,
            lineY
          );
        }
      });
    }
  });
  
  ctx.restore();
  
  // Download the image
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentCanvas.name.replace(/\s+/g, '_')}_visible.png`;
      link.click();
      URL.revokeObjectURL(url);
    }
  });
};

  // Fixed mouse event handlers for canvas
  const getCanvasCoordinates = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;
    
    return { x, y };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!currentCanvas) return;
    
    const coords = getCanvasCoordinates(e);
    
    // Check if clicking on a node
    const clickedNode = currentCanvas.nodes.find(node => {
      return coords.x >= node.x && coords.x <= node.x + node.width &&
             coords.y >= node.y && coords.y <= node.y + node.height;
    });

    if (selectedTool === 'connection') {
      if (clickedNode) {
        if (!connectionStart) {
          setConnectionStart(clickedNode.id);
          const nodeCenter = {
            x: clickedNode.x + clickedNode.width / 2,
            y: clickedNode.y + clickedNode.height / 2
          };
          setTempConnection({
            start: nodeCenter,
            end: coords
          });
        } else if (connectionStart !== clickedNode.id) {
          // Create connection
          const startNode = currentCanvas.nodes.find(n => n.id === connectionStart);
          if (startNode) {
           const newConnection: Connection = {
              id: `conn-${Date.now()}`,
              fromNodeId: connectionStart,
              toNodeId: clickedNode.id,
              fromPoint: {
                x: startNode.x + startNode.width / 2,
                y: startNode.y + startNode.height / 2
              },
              toPoint: {
                x: clickedNode.x + clickedNode.width / 2,
                y: clickedNode.y + clickedNode.height / 2
              },
              color: '#6b7280',
              width: 2,
              style: 'solid',
              arrowType: 'arrow'
            };
            
            const updatedCanvas = {
              ...currentCanvas,
              connections: [...currentCanvas.connections, newConnection],
              lastModified: new Date().toISOString()
            };
            
            setCurrentCanvas(updatedCanvas);
            setCanvases(prev => prev.map(c => c.id === updatedCanvas.id ? updatedCanvas : c));
          }
          
          setConnectionStart(null);
          setTempConnection(null);
        }
      } else {
        setConnectionStart(null);
        setTempConnection(null);
      }
      return;
    }

    if (selectedTool === 'select' && clickedNode) {
      setSelectedNodes([clickedNode.id]);
      setIsDragging(true);
      setDragOffset({
        x: coords.x - clickedNode.x,
        y: coords.y - clickedNode.y
      });
    } else {
      setSelectedNodes([]);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoordinates(e);
    
    // Handle resizing first
    if (isResizing) {
      handleResizeMouseMove(e);
      return;
    }
    
    if (tempConnection) {
      setTempConnection(prev => prev ? {
        ...prev,
        end: coords
      } : null);
    }
    
    if (isDragging && selectedNodes.length > 0 && currentCanvas) {
      const newX = coords.x - dragOffset.x;
      const newY = coords.y - dragOffset.y;
      
      const updatedNodes = currentCanvas.nodes.map(node => {
        if (selectedNodes.includes(node.id)) {
          return { ...node, x: newX, y: newY };
        }
        return node;
      });
      
      // Update connections
      const updatedConnections = currentCanvas.connections.map(conn => {
        const fromNode = updatedNodes.find(n => n.id === conn.fromNodeId);
        const toNode = updatedNodes.find(n => n.id === conn.toNodeId);
        
        if (fromNode || toNode) {
          return {
            ...conn,
            fromPoint: fromNode ? {
              x: fromNode.x + fromNode.width / 2,
              y: fromNode.y + fromNode.height / 2
            } : conn.fromPoint,
            toPoint: toNode ? {
              x: toNode.x + toNode.width / 2,
              y: toNode.y + toNode.height / 2
            } : conn.toPoint
          };
        }
        return conn;
      });
      
      const updatedCanvas = {
        ...currentCanvas,
        nodes: updatedNodes,
        connections: updatedConnections,
        lastModified: new Date().toISOString()
      };
      
      setCurrentCanvas(updatedCanvas);
      setCanvases(prev => prev.map(c => c.id === updatedCanvas.id ? updatedCanvas : c));
    }
  };

  const handleCanvasMouseUp = () => {
    if (isResizing) {
      handleResizeMouseUp();
      return;
    }
    setIsDragging(false);
  };

  // Text editing functions
  const handleNodeDoubleClick = (node: CanvasNode) => {
    if (selectedTool === 'select') {
      setEditingNode(node);
      setEditingText(node.text);
    }
  };

  const updateNodeText = () => {
    if (!editingNode || !currentCanvas) return;
    
    const updatedNodes = currentCanvas.nodes.map(node => 
      node.id === editingNode.id 
        ? { ...node, text: editingText }
        : node
    );
    
    const updatedCanvas = {
      ...currentCanvas,
      nodes: updatedNodes,
      lastModified: new Date().toISOString()
    };
    
    setCurrentCanvas(updatedCanvas);
    setCanvases(prev => prev.map(c => c.id === updatedCanvas.id ? updatedCanvas : c));
    setEditingNode(null);
    setEditingText('');
  };

  const cancelTextEdit = () => {
    setEditingNode(null);
    setEditingText('');
  };

  const toggleDocumentLibrary = () => {
    if (viewingPdf) {
      setViewingPdf(null);
    }
    setShowDocumentLibrary(!showDocumentLibrary);
  };

  const toggleChat = () => {
    if (!showChat) {
      setShowChat(true);
      setIsChatMinimized(false);
      const welcomeMessage: ChatMessage = {
        id: `welcome-${Date.now()}`,
        type: 'bot',
        content: `Hello! I'm here to help you with your IdeaCloud canvas "${currentCanvas?.name}". I can assist with flowchart creation, suggest improvements, or help you organize your ideas. What would you like to work on?`,
        timestamp: new Date()
      };
      setChatMessages([welcomeMessage]);
    } else {
      setShowChat(!showChat);
    }
  };

  const toggleChatMinimize = () => setIsChatMinimized(!isChatMinimized);

  const sendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    const messageToProcess = currentMessage;
    setCurrentMessage('');
    setIsTyping(true);

    try {
      const botResponse = await getBotResponse(messageToProcess);
      setTimeout(() => {
        const botMessage: ChatMessage = {
          id: `bot-${Date.now()}`,
          type: 'bot',
          content: botResponse,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 1000);
    } catch (error) {
      console.error('Error getting bot response:', error);
      setTimeout(() => {
        const errorMessage: ChatMessage = {
          id: `bot-${Date.now()}`,
          type: 'bot',
          content: "I apologize, but I'm having trouble processing your request right now. Please try again later.",
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, errorMessage]);
        setIsTyping(false);
      }, 1000);
    }
  };

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

const openPdfViewer = async (document: Document): Promise<void> => {
  console.log('=== DEBUG: Opening PDF ===');
  console.log('Document object:', document);
  console.log('Document URL:', document.url);
  console.log('Document file:', document.file);
  console.log('Adobe SDK available:', !!window.AdobeDC);

  setIsLoadingPdf(true);
  setViewingPdf(document);

  // Clear any old viewer instance
  const viewerContainer = window.document.getElementById('adobe-dc-view');
  if (viewerContainer) {
    viewerContainer.innerHTML = '';
    console.log('Cleared viewer container');
  }

  // Extract PDF text with better error handling
  if (document.file && document.file instanceof File) {
    console.log('Starting PDF text extraction...');
    try {
      const extractedText = await extractPdfText(document.file);
      setPdfTextExtracted(extractedText);
      console.log('PDF text extraction completed. Length:', extractedText.length);
      console.log('First 200 chars:', extractedText.substring(0, 200));
    } catch (err) {
      console.error('Error extracting PDF text:', err);
      setPdfTextExtracted(`Failed to extract text: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  } else if (document.url) {
    // Try to fetch the file from URL and then extract text
    console.log('Attempting to fetch PDF from URL for text extraction...');
    try {
      const response = await fetch(document.url);
      if (response.ok) {
        const blob = await response.blob();
        const file = new File([blob], document.name, { type: 'application/pdf' });
        const extractedText = await extractPdfText(file);
        setPdfTextExtracted(extractedText);
        console.log('PDF text extraction from URL completed');
      } else {
        setPdfTextExtracted(`Could not fetch PDF from URL: ${response.status} ${response.statusText}`);
      }
    } catch (fetchError) {
      console.error('Error fetching PDF from URL:', fetchError);
      setPdfTextExtracted(`Error fetching PDF: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
    }
  } else {
    console.warn('No file or URL available for text extraction');
    setPdfTextExtracted('No file data available for text extraction');
  }

  // Initialize Adobe PDF viewer
  setTimeout(() => {
    console.log('Adobe SDK check after timeout:', !!window.AdobeDC);

    if (window.AdobeDC) {
      try {
        const adobeDCView = new window.AdobeDC.View({
          clientId: "82a5500aa5d945049893aec8a2514446",
          divId: "adobe-dc-view"
        });

        console.log('Adobe DC View created successfully');

        const viewerConfig = {
          embedMode: "SIZED_CONTAINER",
          showAnnotationTools: true,
          showLeftHandPanel: false,
          showDownloadPDF: true,
          showPrintPDF: true,
          showZoomControl: true,
          enableSearchAPIs: true,
          includePDFAnnotations: true,
          defaultViewMode: "FIT_WIDTH"
        };

        if (document.url && document.url.trim() !== '') {
          console.log('Using document URL:', document.url);
          adobeDCView.previewFile({
            content: { location: { url: document.url } },
            metaData: { fileName: document.name }
          }, viewerConfig);
        } else if (document.file instanceof File) {
          console.log('Creating blob URL from file');
          const blobUrl = URL.createObjectURL(document.file);
          adobeDCView.previewFile({
            content: { location: { url: blobUrl } },
            metaData: { fileName: document.name }
          }, viewerConfig);
        } else {
          console.error('No valid URL or file found in document');
          alert('No PDF data found in this document');
        }

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

 const filteredDocuments: Document[] = documents.filter((doc: Document) => {
  const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
  return matchesSearch;
});

  const renderNode = (node: CanvasNode) => {
    const isSelected = selectedNodes.includes(node.id);
    const baseStyle = {
      fill: node.gradient ? `url(#gradient-${node.id})` : node.backgroundColor,
      stroke: isSelected ? '#ef4444' : node.borderColor,
      strokeWidth: isSelected ? 3 : node.borderWidth,
      filter: node.shadow ? 'url(#shadow)' : 'none',
      cursor: selectedTool === 'select' ? 'move' : 'pointer'
    };

    let shape;
    switch (node.type) {
      case 'circle':
      case 'start-end':
        shape = (
          <ellipse
            cx={node.x + node.width / 2}
            cy={node.y + node.height / 2}
            rx={node.width / 2}
            ry={node.height / 2}
            style={baseStyle}
          />
        );
        break;
      case 'diamond':
      case 'decision':
        const centerX = node.x + node.width / 2;
        const centerY = node.y + node.height / 2;
        shape = (
          <polygon
            points={`${centerX},${node.y} ${node.x + node.width},${centerY} ${centerX},${node.y + node.height} ${node.x},${centerY}`}
            style={baseStyle}
          />
        );
        break;
      case 'triangle':
        const triCenterX = node.x + node.width / 2;
        shape = (
          <polygon
            points={`${triCenterX},${node.y} ${node.x + node.width},${node.y + node.height} ${node.x},${node.y + node.height}`}
            style={baseStyle}
          />
        );
        break;
      default:
        shape = (
          <rect
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            rx={node.borderRadius}
            style={baseStyle}
          />
        );
    }

    return (
      <g 
        key={node.id} 
        onDoubleClick={() => handleNodeDoubleClick(node)}
        className="canvas-node"
      >
        {node.gradient && (
          <defs>
            <linearGradient id={`gradient-${node.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={node.backgroundColor} />
              <stop offset="100%" stopColor={node.borderColor} stopOpacity="0.3" />
            </linearGradient>
          </defs>
        )}
        {shape}
        <foreignObject
          x={node.x + 5}
          y={node.y + 5}
          width={node.width - 10}
          height={node.height - 10}
          pointerEvents="none"
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: `${node.fontSize}px`,
              fontWeight: '500',
              color: node.textColor,
              textAlign: 'center',
              overflow: 'hidden',
              wordBreak: 'break-word',
              lineHeight: '1.2',
              padding: '2px'
            }}
          >
            {node.text}
          </div>
        </foreignObject>
        {/* Resize handles - only show when selected */}
        {isSelected && (
          <g>
            <rect
              x={node.x + node.width - 4}
              y={node.y + node.height - 4}
              width="8"
              height="8"
              fill="#ef4444"
              stroke="#fff"
              strokeWidth="1"
              rx="2"
              style={{ cursor: 'se-resize' }}
              onMouseDown={(e) => handleResizeMouseDown(e, node.id, 'se')}
            />
            <rect
              x={node.x - 4}
              y={node.y + node.height - 4}
              width="8"
              height="8"
              fill="#ef4444"
              stroke="#fff"
              strokeWidth="1"
              rx="2"
              style={{ cursor: 'sw-resize' }}
              onMouseDown={(e) => handleResizeMouseDown(e, node.id, 'sw')}
            />
            <rect
              x={node.x + node.width - 4}
              y={node.y - 4}
              width="8"
              height="8"
              fill="#ef4444"
              stroke="#fff"
              strokeWidth="1"
              rx="2"
              style={{ cursor: 'ne-resize' }}
              onMouseDown={(e) => handleResizeMouseDown(e, node.id, 'ne')}
            />
            <rect
              x={node.x - 4}
              y={node.y - 4}
              width="8"
              height="8"
              fill="#ef4444"
              stroke="#fff"
              strokeWidth="1"
              rx="2"
              style={{ cursor: 'nw-resize' }}
              onMouseDown={(e) => handleResizeMouseDown(e, node.id, 'nw')}
            />
          </g>
        )}
      </g>
    );
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
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .canvas-node {
          cursor: grab;
          transition: all 0.2s ease;
        }
        
        .toolbar-button {
          transition: all 0.2s ease;
        }
        
        .toolbar-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}</style>

      <div className="min-h-screen bg-gray-50">
        {/* Gemini Analysis Results Modal */}
        {showGeminiResults && geminiAnalysis && (
          <EnhancedGeminiResultsModal
            analysis={geminiAnalysis}
            onClose={() => setShowGeminiResults(false)}
            jobTitle="Process Designer"
            userQuery="Flowchart Analysis"
          />
        )}

        {/* Navigation Bar */}
        <nav className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <Palette className="h-6 w-6 text-purple-600" />
                <span className="text-xl font-bold text-gray-900">IdeaCloud</span>
              </div>
              
              {/* Navigation Links */}
              <nav className="flex space-x-8">
                <a href="/" className="text-gray-500 hover:text-red-600 px-3 py-2 text-sm font-medium">Documents</a>
                <a href="/ideacloud" className="text-gray-900 hover:text-red-600 px-3 py-2 text-sm font-medium border-b-2 border-red-600">IdeaCloud</a>
                <a href="/connectdots" className="text-gray-500 hover:text-red-600 px-3 py-2 text-sm font-medium">GetWhatMatters</a>
                <a href="/getwhatmatters" className="text-gray-500 hover:text-red-600 px-3 py-2 text-sm font-medium">ConnectingDots</a>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleChat}
                className="inline-flex items-center px-3 py-2 border border-purple-300 shadow-sm text-sm leading-4 font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 hover:scale-105"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {showChat ? "Hide Assistant" : "Show Assistant"}
              </button>
              <a
                href="https://github.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-2 border border-gray-200 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-all duration-200"
              >
                <Bot className="h-4 w-4 mr-2" />
                GitHub
              </a>
            </div>
          </div>
        </nav>

        <div ref={containerRef} className="flex h-[calc(100vh-64px)] relative">
          {/* Left Sidebar - Document Library OR PDF Viewer */}
          {showDocumentLibrary && (
            <div 
              className="bg-white border-r border-gray-200 flex flex-col relative transition-all duration-300 ease-out"
              style={{ width: `${libraryWidth}px` }}
            >
              {viewingPdf ? (
                // PDF Viewer Mode
                <>
                  <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={closePdfViewer}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-all duration-200"
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back to Library
                      </button>
                      <button
                        onClick={toggleDocumentLibrary}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center space-x-1 bg-white border border-gray-200 shadow-sm"
                        title="Hide PDF"
                      >
                        <ChevronLeft className="h-4 w-4 text-gray-600" />
                        <span className="text-xs text-gray-600">Hide</span>
                      </button>
                    </div>
                    <div className="mt-2">
                      <span className="text-sm font-medium text-gray-900">{viewingPdf.name}</span>
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
                </>
              ) : (
                // Document Library Mode
                <>
                  <button
                    onClick={toggleDocumentLibrary}
                    className="absolute top-4 right-4 z-10 p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center space-x-1 bg-white border border-gray-200 shadow-sm"
                    title="Hide Library"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-600" />
                    <span className="text-xs text-gray-600">Hide</span>
                  </button>
                  
                  {/* Canvas Management */}
                  <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">My Canvases</h1>
                    
                    <button
                      onClick={() => {
                        const newCanvas: Canvas = {
                          id: `canvas-${Date.now()}`,
                          name: `Canvas ${canvases.length + 1}`,
                          nodes: [],
                          connections: [],
                          createdDate: new Date().toISOString(),
                          lastModified: new Date().toISOString()
                        };
                        setCanvases(prev => [...prev, newCanvas]);
                        setCurrentCanvas(newCanvas);
                      }}
                      className="w-full border-2 border-dashed border-purple-300 rounded-xl p-4 text-center hover:border-purple-400 transition-all duration-200 cursor-pointer bg-white group hover:scale-105 hover:shadow-md mb-4"
                    >
                      <Plus className="mx-auto h-8 w-8 text-purple-500 mb-2 group-hover:scale-110 transition-transform duration-200" />
                      <p className="text-md font-medium text-gray-900 mb-1">New Canvas</p>
                      <p className="text-xs text-gray-500">Create a new flowchart</p>
                    </button>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {canvases.map((canvas) => (
                        <div
                          key={canvas.id}
                          onClick={() => setCurrentCanvas(canvas)}
                          className={`cursor-pointer rounded-lg border transition-all duration-200 p-3 ${
                            currentCanvas?.id === canvas.id 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Layers className="h-4 w-4 text-purple-600" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{canvas.name}</p>
                              <p className="text-xs text-gray-500">{canvas.nodes.length} nodes</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PDF Documents */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">Reference PDFs</h3>
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search PDFs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {filteredDocuments.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No PDFs available</p>
                        <p className="text-xs text-gray-400">Upload documents in the main page</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            onClick={() => openPdfViewer(doc)}
                            className="cursor-pointer rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all duration-200 p-3"
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  doc.status === 'new' ? 'bg-blue-100' : 'bg-green-100'
                                }`}>
                                  {doc.status === 'new' ? (
                                    <BookOpen className="h-4 w-4 text-blue-600" />
                                  ) : (
                                    <BookOpenCheck className="h-4 w-4 text-green-600" />
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                                <p className="text-xs text-gray-500">Reference material</p>
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
                onClick={toggleDocumentLibrary}
                className="p-3 rounded-lg hover:bg-gray-100 transition-all duration-200 flex items-center space-x-2 bg-white border border-gray-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                title="Show Library"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
                <span className="text-sm text-gray-600">Show Library</span>
              </button>
            </div>
          )}

          {/* Main Canvas Area */}
          <div className="flex-1 bg-gray-100 transition-all duration-300 ease-out flex flex-col">
            {/* Canvas Toolbar */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {currentCanvas?.name || 'Untitled Canvas'}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {currentCanvas?.nodes.length || 0} nodes
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Tool Selection */}
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setSelectedTool('select')}
                    className={`p-2 rounded transition-colors ${
                      selectedTool === 'select' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Select Tool"
                  >
                    <MousePointer className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => addNode('rectangle')}
                    className="p-2 rounded transition-colors text-gray-600 hover:text-gray-900"
                    title="Add Rectangle"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => addNode('circle')}
                    className="p-2 rounded transition-colors text-gray-600 hover:text-gray-900"
                    title="Add Circle"
                  >
                    <Circle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => addNode('diamond')}
                    className="p-2 rounded transition-colors text-gray-600 hover:text-gray-900"
                    title="Add Diamond"
                  >
                    <Diamond className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => addNode('triangle')}
                    className="p-2 rounded transition-colors text-gray-600 hover:text-gray-900"
                    title="Add Triangle"
                  >
                    <Triangle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSelectedTool('connection')}
                    className={`p-2 rounded transition-colors ${
                      selectedTool === 'connection' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Connection Tool"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="w-px h-8 bg-gray-300"></div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={duplicateSelectedNodes}
                    disabled={selectedNodes.length === 0}
                    className="p-2 rounded transition-colors text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Duplicate Selected"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={deleteSelectedNodes}
                    disabled={selectedNodes.length === 0}
                    className="p-2 rounded transition-colors text-gray-600 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete Selected"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="w-px h-8 bg-gray-300"></div>

                {/* Zoom Controls */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}
                    className="p-2 rounded transition-colors text-gray-600 hover:text-gray-900"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
                    className="p-2 rounded transition-colors text-gray-600 hover:text-gray-900"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setZoom(1);
                      setPanOffset({ x: 0, y: 0 });
                    }}
                    className="p-2 rounded transition-colors text-gray-600 hover:text-gray-900"
                    title="Reset View"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>

                <div className="w-px h-8 bg-gray-300"></div>

                {/* Export and AI Analysis */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={exportCanvas}
                    className="inline-flex items-center px-3 py-2 border border-purple-300 shadow-sm text-sm leading-4 font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 hover:scale-105"
                  >
                    <Image className="h-4 w-4 mr-2" />
                    Export PNG
                  </button>
                  
                  {/* AI Analysis Button */}
                  <button
                    onClick={() => {
                      if (currentCanvas && currentCanvas.nodes.length > 0) {
                        const canvasData = {
                          name: currentCanvas.name,
                          nodes: currentCanvas.nodes.length,
                          connections: currentCanvas.connections.length,
                          description: `Canvas with ${currentCanvas.nodes.length} nodes and ${currentCanvas.connections.length} connections`
                        };
                        const handleAIAnalysis = () => {
  if (viewingPdf && pdfTextExtracted && 
      !pdfTextExtracted.startsWith('Unable to extract') && 
      !pdfTextExtracted.startsWith('Failed to extract')) {
    
    // Use PDF content for analysis
    console.log('Analyzing with PDF content, length:', pdfTextExtracted.length);
    analyzeWithGemini(
      [{
        documentName: viewingPdf.name,
        title: "PDF Document Analysis",
        content: pdfTextExtracted.substring(0, 1000), // Preview for sections
        accuracy: 100,
        pageNumber: 1
      }],
      "Process Designer",
      `Analyze the processes and procedures in ${viewingPdf.name} and create actionable flowchart recommendations`,
      pdfTextExtracted // Pass full PDF content
    );
  } else if (currentCanvas && currentCanvas.nodes.length > 0) {
    // Fallback to canvas analysis
    const canvasData = {
      name: currentCanvas.name,
      nodes: currentCanvas.nodes.length,
      connections: currentCanvas.connections.length,
      description: `Canvas with ${currentCanvas.nodes.length} nodes and ${currentCanvas.connections.length} connections`,
      nodeDetails: currentCanvas.nodes.map(node => ({
        type: node.type,
        text: node.text,
        position: { x: node.x, y: node.y }
      }))
    };
    
    analyzeWithGemini(
      [{
        documentName: currentCanvas.name,
        title: "Canvas Analysis",
        content: `Canvas Structure: ${JSON.stringify(canvasData, null, 2)}`,
        accuracy: 100,
        pageNumber: 1
      }],
      "Process Designer",
      "Analyze my current canvas structure and suggest process improvements"
    );
  } else {
    alert('Please open a PDF document or create some nodes on your canvas first to get meaningful analysis.');
  }
};
                        analyzeWithGemini(
                          [{
                            documentName: currentCanvas.name,
                            title: "Canvas Analysis",
                            content: JSON.stringify(canvasData),
                            accuracy: 100,
                            pageNumber: 1
                          }],
                          "Process Designer",
                          "Analyze my flowchart and suggest improvements"
                        );
                      } else {
                        alert('Please create some nodes first to analyze your canvas.');
                      }
                    }}
                    disabled={isGeminiAnalyzing || !currentCanvas?.nodes.length}
                   className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isGeminiAnalyzing ? 'Analyzing...' : 'AI Analysis'}
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative overflow-hidden">
  <div
    className="w-full h-full cursor-crosshair"
    style={{
      backgroundImage: `
        radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0),
        linear-gradient(45deg, transparent 24%, rgba(0,0,0,.05) 25%, rgba(0,0,0,.05) 26%, transparent 27%, transparent 74%, rgba(0,0,0,.05) 75%, rgba(0,0,0,.05) 76%, transparent 77%, transparent)
      `,
      backgroundSize: '20px 20px',
      backgroundPosition: `${panOffset.x}px ${panOffset.y}px`
    }}
  >
    <svg
      ref={canvasRef}
      width="100%"
      height="100%"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: '0 0'
      }}
    >
      {/* Shadow Filter Definition */}
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="4" floodOpacity="0.2" />
        </filter>
        {/* Arrowhead Marker Definition */}
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
        </marker>
      </defs>

      {/* Render connections */}
      {currentCanvas?.connections.map((conn) => {
        const fromNode = currentCanvas.nodes.find(n => n.id === conn.fromNodeId);
        const toNode = currentCanvas.nodes.find(n => n.id === conn.toNodeId);

        if (!fromNode || !toNode) return null;

        const fromCenter = {
          x: fromNode.x + fromNode.width / 2,
          y: fromNode.y + fromNode.height / 2
        };
        const toCenter = {
          x: toNode.x + toNode.width / 2,
          y: toNode.y + toNode.height / 2
        };

        const dx = toCenter.x - fromCenter.x;
        const dy = toCenter.y - fromCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return null;

        const unitX = dx / distance;
        const unitY = dy / distance;

        const fromEdge = {
          x: fromCenter.x + unitX * (fromNode.width / 2),
          y: fromCenter.y + unitY * (fromNode.height / 2)
        };

        const toEdge = {
          x: toCenter.x - unitX * (toNode.width / 2),
          y: toCenter.y - unitY * (toNode.height / 2)
        };

        return (
          <g key={conn.id}>
            <line
              x1={fromEdge.x}
              y1={fromEdge.y}
              x2={toEdge.x}
              y2={toEdge.y}
              stroke={conn.color || '#6b7280'}
              strokeWidth={conn.width || 2}
              strokeDasharray={
                conn.style === 'dashed' ? '5,5' :
                conn.style === 'dotted' ? '2,2' :
                'none'
              }
              markerEnd="url(#arrowhead)"  // Using marker for arrowhead
            />
          </g>
        );
      })}

      {/* Render temporary connection line */}
      {tempConnection && (
        <line
          x1={tempConnection.start.x}
          y1={tempConnection.start.y}
          x2={tempConnection.end.x}
          y2={tempConnection.end.y}
          stroke="#6b7280"
          strokeWidth="2"
          strokeDasharray="5,5"
          markerEnd="url(#arrowhead)"  // Marker for arrowhead as well
          opacity="0.7"
        />
      )}

      {/* Render nodes */}
      {currentCanvas?.nodes.map(renderNode)}
    </svg>

    {/* Instructions overlay */}
    {showInstructions && currentCanvas && currentCanvas.nodes.length === 0 && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center border border-gray-200 animate-fade-in">
          <Sparkles className="h-12 w-12 text-purple-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to IdeaCloud!</h3>
          <p className="text-gray-600 mb-4">Start building your flowchart:</p>
          <ul className="text-sm text-gray-600 space-y-2 mb-4 text-left">
            <li>• Click shape buttons in the toolbar to add nodes</li>
            <li>• Use the connection tool to link nodes</li>
            <li>• Double-click nodes to edit text</li>
            <li>• Drag to move, resize handles to adjust size</li>
          </ul>
          <button
            onClick={() => setShowInstructions(false)}
            className="text-purple-600 text-sm hover:text-purple-800 pointer-events-auto"
          >
            Got it, let's start!
          </button>
        </div>
      </div>
    )}

    {/* Text editing modal */}
    {editingNode && (
      <div className="absolute inset-0 bg-transparent flex items-center justify-center z-50">
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Node Text</h3>
          <textarea
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={3}
            placeholder="Enter text for this node..."
            autoFocus
            onFocus={(e) => e.target.select()} // SELECT ALL TEXT ON FOCUS
          />
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={cancelTextEdit}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={updateNodeText}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Connection mode indicator */}
    {selectedTool === 'connection' && (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-10">
        Connection Mode: Click nodes to connect them
      </div>
    )}
  </div>
</div>

          </div>

          {/* Right Sidebar - Chat Assistant */}
          {showChat && (
            <>
              {/* Chat Resizer */}
              <div
                ref={chatResizerRef}
                className={`w-2 bg-gray-100 hover:bg-gray-300 cursor-col-resize flex items-center justify-center transition-all duration-150 ${
                  isResizingChat ? 'bg-purple-300 w-3' : ''
                }`}
                onMouseDown={handleChatMouseDown}
              >
                <GripVertical className={`h-6 w-6 text-gray-400 transition-all duration-150 ${
                  isResizingChat ? 'text-purple-600 scale-110' : ''
                }`} />
              </div>

              <div 
                className="bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ease-out"
                style={{ width: `${chatWidth}px` }}
              >
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-gray-900">AI Assistant</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={toggleChatMinimize}
                        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                        title={isChatMinimized ? "Expand" : "Minimize"}
                      >
                        {isChatMinimized ? (
                          <Maximize2 className="h-4 w-4 text-gray-600" />
                        ) : (
                          <Minimize2 className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                      <button
                        onClick={() => setShowChat(false)}
                        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                        title="Close"
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
                      className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-280px)]"
                    >
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex items-start space-x-2 max-w-[80%] ${
                            message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                          }`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              message.type === 'user' 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {message.type === 'user' ? (
                                <User className="h-3 w-3" />
                              ) : (
                                <Bot className="h-3 w-3" />
                              )}
                            </div>
                            <div className={`rounded-lg px-3 py-2 ${
                              message.type === 'user'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              <p className={`text-xs mt-1 ${
                                message.type === 'user' ? 'text-purple-200' : 'text-gray-500'
                              }`}>
                                {formatTime(message.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Typing indicator */}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="flex items-start space-x-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs">
                              <Bot className="h-3 w-3" />
                            </div>
                            <div className="bg-gray-100 rounded-lg px-3 py-2">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chat Input */}
                    <div className="border-t border-gray-200 p-4">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={currentMessage}
                          onChange={(e) => setCurrentMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Ask about flowcharts, processes, or canvas design..."
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                          disabled={isTyping}
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!currentMessage.trim() || isTyping}
                          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default IdeaCloud;