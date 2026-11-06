import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { ResultsViewer } from './components/ResultsViewer';
import { StatisticsCards } from './components/StatisticsCards';
import { DownloadSection } from './components/DownloadSection';
import { ManualEditor } from './components/ManualEditor';
import { SplashScreen } from './components/SplashScreen';
import { BackendHealth, DetectionResponse, SampleImage } from './types';
import { Layers, Sparkles, SlidersHorizontal } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const App: React.FC = () => {
  // 5-second animated splash screen state (shown once per page load)
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Backend health status
  const [health, setHealth] = useState<BackendHealth>({ status: 'initializing' });
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(true);

  // Selected file and preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);

  // Inference state
  const [separateWalls, setSeparateWalls] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<DetectionResponse | null>(null);

  // Active view tab (Results vs Manual Correction)
  const [activeTab, setActiveTab] = useState<'results' | 'manual'>('results');

  // Check health on mount
  const checkHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/health`);
      if (res.ok) {
        const data = await res.json();
        setHealth({
          status: data.status === 'healthy' ? 'healthy' : 'initializing',
          model: data.model
        });
      } else {
        setHealth({ status: 'offline' });
      }
    } catch {
      setHealth({ status: 'offline' });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  // Handle file selection from disk
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setSelectedSampleId(null);
    setErrorMessage(null);
    setDetectionResult(null);

    // Create object URL for preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  // Handle sample image selection
  const handleSampleSelect = async (sample: SampleImage) => {
    setSelectedSampleId(sample.id);
    setErrorMessage(null);
    setDetectionResult(null);

    try {
      const response = await fetch(sample.thumbnailUrl);
      const blob = await response.blob();
      const file = new File([blob], sample.filename, { type: 'image/jpeg' });
      setSelectedFile(file);
      setPreviewUrl(sample.thumbnailUrl);
    } catch (err) {
      setErrorMessage(`Failed to load sample image: ${err}`);
    }
  };

  // Trigger surface detection API
  const handleDetect = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select or upload an image first.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('separate_walls', separateWalls ? 'true' : 'false');
    formData.append('return_overlay', 'true');

    try {
      const response = await fetch(`${API_BASE}/api/v1/detect`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const msg = errorData?.message || `Server returned error (${response.status}: ${response.statusText})`;
        throw new Error(msg);
      }

      const result: DetectionResponse = await response.json();
      setDetectionResult(result);
      setActiveTab('results');
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during segmentation inference.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F2] text-[#202A35]">
      {/* 5-Second Animated Intro Splash Screen */}
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}

      {/* Header */}
      <Header
        health={health}
        isCheckingHealth={isCheckingHealth}
        onRefreshHealth={checkHealth}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Hero Banner */}
        <div className="text-center max-w-3xl mx-auto space-y-3.5">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#def2f4] border border-[#bee5e9] text-[#087E8B] text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#202A35] tracking-tight">
            Architectural Wall & Floor Detection
          </h1>
          <p className="text-sm sm:text-base text-[#718096] max-w-2xl mx-auto font-normal leading-relaxed">
            Pixel-accurate semantic surface segmentation for tile visualization, interior design, and architectural spatial planning.
          </p>
        </div>

        {/* Upload and Sample Section */}
        <UploadSection
          selectedFile={selectedFile}
          previewUrl={previewUrl}
          onFileSelect={handleFileSelect}
          onSampleSelect={handleSampleSelect}
          selectedSampleId={selectedSampleId}
          onDetect={handleDetect}
          isProcessing={isProcessing}
          separateWalls={separateWalls}
          onToggleSeparateWalls={setSeparateWalls}
          errorMessage={errorMessage}
        />

        {/* Results Area */}
        {detectionResult && previewUrl && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* View Tab Selector */}
            <div className="flex items-center justify-between border-b border-[#E7E7E0] pb-3">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('results')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-2 ${
                    activeTab === 'results'
                      ? 'bg-[#087E8B] text-white shadow-sm'
                      : 'text-[#718096] hover:text-[#202A35] bg-white border border-[#E7E7E0]'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Surface Segmentation Analysis</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-2 ${
                    activeTab === 'manual'
                      ? 'bg-[#087E8B] text-white shadow-sm'
                      : 'text-[#718096] hover:text-[#202A35] bg-white border border-[#E7E7E0]'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Manual Mask Correction</span>
                </button>
              </div>

              <div className="text-xs text-[#718096] hidden sm:block font-medium">
                Analysis ID: <span className="font-mono text-[#202A35] font-semibold">{detectionResult.request_id.slice(0, 8)}</span>
              </div>
            </div>

            {/* Tab 1: Segmentation Results & Statistics */}
            {activeTab === 'results' && (
              <div className="space-y-6">
                <StatisticsCards result={detectionResult} />
                <ResultsViewer
                  originalImageUrl={previewUrl}
                  result={detectionResult}
                />
                <DownloadSection
                  result={detectionResult}
                  originalFilename={selectedFile?.name || 'interior_detection'}
                />
              </div>
            )}

            {/* Tab 2: Manual Mask Correction */}
            {activeTab === 'manual' && (
              <ManualEditor
                originalImageUrl={previewUrl}
                result={detectionResult}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E7E7E0] bg-white mt-16 py-7">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#718096] gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[#202A35]">RoomVision AI</span>
            {/* <span>•</span> */}
          </div>
          <div className="flex items-center space-x-3 text-[#718096]">
            <span>© 2026 RoomVision AI. Smart Wall & Floor Detection.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
