import React, { useState } from 'react';
import { Key, X, ExternalLink, Check, RotateCcw, Sparkles } from 'lucide-react';
import { getAdobeClientId, setAdobeClientId, DEFAULT_ADOBE_CLIENT_ID } from '~/utils/adobeConfig';
import { getGeminiApiKey, setGeminiApiKey, DEFAULT_GEMINI_API_KEY, getGeminiModel, setGeminiModel, DEFAULT_GEMINI_MODEL } from '~/utils/geminiConfig';

interface AdobeKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
}

export const AdobeKeyModal: React.FC<AdobeKeyModalProps> = ({ isOpen, onClose, onKeySaved }) => {
  const [activeTab, setActiveTab] = useState<'gemini' | 'adobe'>('gemini');
  const [adobeKeyInput, setAdobeKeyInput] = useState(() => getAdobeClientId());
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => getGeminiApiKey());
  const [geminiModelInput, setGeminiModelInput] = useState(() => getGeminiModel());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setAdobeClientId(adobeKeyInput.trim());
    setGeminiApiKey(geminiKeyInput.trim());
    setGeminiModel(geminiModelInput.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      if (onKeySaved) onKeySaved();
      onClose();
    }, 800);
  };

  const handleReset = () => {
    setAdobeClientId(DEFAULT_ADOBE_CLIENT_ID);
    setAdobeKeyInput(DEFAULT_ADOBE_CLIENT_ID);
    setGeminiApiKey(DEFAULT_GEMINI_API_KEY);
    setGeminiKeyInput(DEFAULT_GEMINI_API_KEY);
    setGeminiModel(DEFAULT_GEMINI_MODEL);
    setGeminiModelInput(DEFAULT_GEMINI_MODEL);
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
          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
            <Key className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">API Credentials & Settings</h3>
            <p className="text-xs text-gray-500">Configure Gemini AI & Adobe PDF APIs</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('gemini')}
            className={`py-2 px-4 text-xs font-semibold border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'gemini'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Google Gemini AI</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('adobe')}
            className={`py-2 px-4 text-xs font-semibold border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'adobe'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            <span>Adobe PDF Embed</span>
          </button>
        </div>

        {activeTab === 'gemini' && (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 mb-4 text-xs text-blue-900 leading-relaxed">
              <p className="font-semibold mb-1">Google Gemini API</p>
              <p>Powers PDF summarization, Q&A assistant, flowchart ideas, and insights.</p>
              <div className="mt-2 pt-2 border-t border-blue-200/60">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-blue-700 hover:text-blue-800 font-semibold"
                >
                  Get Free Gemini API Key on Google AI Studio <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </a>
                <p className="text-[11px] text-gray-500 mt-1">
                  Click <em>Create API key &gt; Create key in new project</em> (instant & free).
                </p>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Gemini API Key
              </label>
              <input
                type="text"
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder="Paste your Gemini API key"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Active Gemini Model
              </label>
              <select
                value={geminiModelInput}
                onChange={(e) => setGeminiModelInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="gemini-1.5-flash">gemini-1.5-flash (Recommended - Fast & Free)</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash (Latest Generation)</option>
                <option value="gemini-1.5-flash-8b">gemini-1.5-flash-8b (Lightweight & Low Latency)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (High Quality Reasoning)</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'adobe' && (
          <div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 mb-4 text-xs text-amber-900 leading-relaxed">
              <p className="font-semibold mb-1">Adobe PDF Embed API</p>
              <p>
                Adobe requires each domain (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">kutralingam-a.github.io</code>) to have an authorized Client ID.
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
                  Domain: <strong>kutralingam-a.github.io</strong>
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Adobe Client ID
              </label>
              <input
                type="text"
                value={adobeKeyInput}
                onChange={(e) => setAdobeKeyInput(e.target.value)}
                placeholder="Paste your 32-character Client ID"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none font-mono"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Reset to defaults
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
                savedSuccess ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" /> Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdobeKeyModal;
