import React, { useState } from 'react';
import { Key, X, ExternalLink, Check, RotateCcw } from 'lucide-react';
import { getAdobeClientId, setAdobeClientId, DEFAULT_ADOBE_CLIENT_ID } from '~/utils/adobeConfig';

interface AdobeKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
}

export const AdobeKeyModal: React.FC<AdobeKeyModalProps> = ({ isOpen, onClose, onKeySaved }) => {
  const [keyInput, setKeyInput] = useState(() => getAdobeClientId());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setAdobeClientId(keyInput.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      if (onKeySaved) onKeySaved();
      onClose();
    }, 800);
  };

  const handleReset = () => {
    setAdobeClientId(DEFAULT_ADOBE_CLIENT_ID);
    setKeyInput(DEFAULT_ADOBE_CLIENT_ID);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      if (onKeySaved) onKeySaved();
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-fade-in relative border border-gray-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 bg-red-100 text-red-600 rounded-lg">
            <Key className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Adobe PDF Embed API Key</h3>
            <p className="text-xs text-gray-500">Configure Client ID for your domain</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 mb-4 text-xs text-amber-900 leading-relaxed">
          <p className="font-semibold mb-1">Why is this needed?</p>
          <p>
            Adobe requires each domain (e.g. <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">kutralingam-a.github.io</code>) to have an authorized Client ID.
          </p>
          <div className="mt-2 pt-2 border-t border-amber-200/60">
            <a
              href="https://developer.adobe.com/document-services/apis/pdf-embed/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-red-600 hover:text-red-700 font-semibold"
            >
              Get Free Client ID on Adobe Console <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </a>
            <p className="text-[11px] text-gray-500 mt-1">
              Set application domain to: <strong>kutralingam-a.github.io</strong>
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Client ID (API Key)
          </label>
          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste your 32-character Client ID"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none font-mono"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Reset to default
          </button>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`px-4 py-1.5 text-xs font-medium text-white rounded-lg flex items-center ${
                savedSuccess ? 'bg-green-600' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" /> Saved! Reloading...
                </>
              ) : (
                'Save Key'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdobeKeyModal;
