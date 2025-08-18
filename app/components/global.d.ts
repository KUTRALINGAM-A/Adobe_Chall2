// Fixed implementation for PDF selection-based search
// Add this to your global.d.ts file or at the top of your component

declare global {
  interface Window {
    AdobeDC?: {
      View: new (config: { clientId: string; divId: string }) => {
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
        ) => Promise<{
          getAPIs: () => Promise<{
            getSelectedContent: () => Promise<{
              data: Array<{ Text: string }>;
            }>;
            gotoLocation: (pageNumber: number) => Promise<void>;
          }>;
        }>;

        registerCallback: (
          type: string,
          callback: (event?: any) => void,
          options?: any
        ) => void;
      };

      // Fixed Enum structure with correct callback types
      Enum?: {
        CallbackType?: {
          PREVIEW_SELECTION_END?: string;
          EVENT_LISTENER?: string;
          TEXT_SELECTION_END?: string;
        };
      };
    };

    pdfjsLib?: {
      getDocument: (src: string | Uint8Array | { data: Uint8Array }) => any;
      GlobalWorkerOptions?: {
        workerSrc: string;
      };
    };
  }
}