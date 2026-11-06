import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Sparkles, CheckCircle2, FileWarning, Camera } from 'lucide-react';
import { SampleImage } from '../types';
import { SAMPLE_IMAGES } from '../data/samples';

interface UploadSectionProps {
  selectedFile: File | null;
  previewUrl: string | null;
  onFileSelect: (file: File) => void;
  onSampleSelect: (sample: SampleImage) => void;
  selectedSampleId: string | null;
  onDetect: () => void;
  isProcessing: boolean;
  separateWalls: boolean;
  onToggleSeparateWalls: (val: boolean) => void;
  errorMessage: string | null;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  selectedFile,
  previewUrl,
  onFileSelect,
  onSampleSelect,
  selectedSampleId,
  onDetect,
  isProcessing,
  separateWalls,
  onToggleSeparateWalls,
  errorMessage
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const validateAndHandleFile = (file: File) => {
    setValidationError(null);
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];

    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    const hasValidMime = validMimes.includes(file.type);

    if (!hasValidExt && !hasValidMime) {
      setValidationError('Please upload a valid JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setValidationError(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 10 MB limit.`);
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndHandleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndHandleFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Box with Light Teal Tint and Dashed Border */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-7 sm:p-9 text-center transition-all duration-200 ${
          isDragging
            ? 'border-[#087E8B] bg-[#def2f4] scale-[1.005] shadow-card-hover'
            : 'border-[#8ed1d9] bg-[#f0f9fa]/75 hover:bg-[#def2f4]/60 hover:border-[#087E8B] shadow-subtle'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />
        {/* Mobile camera capture input */}
        <input
          type="file"
          ref={cameraInputRef}
          onChange={handleFileInputChange}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white text-[#087E8B] border border-[#bee5e9] flex items-center justify-center shadow-sm">
            <Upload className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-semibold text-[#202A35]">
              Upload Interior Room Photograph
            </h3>
            <p className="text-xs sm:text-sm text-[#718096] mt-1 font-normal">
              Drag & drop image here, or select from your computer / gallery
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-[#087E8B] hover:bg-[#066873] text-white text-xs sm:text-sm font-medium rounded-xl shadow-sm transition-all flex items-center space-x-2"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Browse Files</span>
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="px-4 py-2.5 bg-white hover:bg-[#F7F7F2] text-[#202A35] border border-[#E7E7E0] text-xs sm:text-sm font-medium rounded-xl transition-all sm:hidden flex items-center space-x-1.5 shadow-subtle"
            >
              <Camera className="w-4 h-4 text-[#718096]" />
              <span>Camera</span>
            </button>
          </div>

          <div className="text-[11px] text-[#718096]">
            Supports JPG, JPEG, PNG, WEBP up to 10 MB. High-resolution photos provide optimal segmentation accuracy.
          </div>
        </div>
      </div>

      {/* Validation or Backend Error Alert */}
      {(validationError || errorMessage) && (
        <div className="p-4 rounded-xl bg-rose-50/90 border border-rose-200 flex items-start space-x-3 text-rose-800 text-xs sm:text-sm shadow-subtle">
          <FileWarning className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-900">Attention</p>
            <p className="mt-0.5 text-rose-700">{validationError || errorMessage}</p>
          </div>
        </div>
      )}

      {/* Selected Image Preview & Action Controls */}
      {previewUrl && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E7E7E0] shadow-card flex flex-col md:flex-row items-center justify-between gap-4 transition-all">
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#F7F7F2] border border-[#E7E7E0] flex-shrink-0 shadow-inner">
              <img
                src={previewUrl}
                alt="Selected preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#22A06B] flex-shrink-0" />
                <span className="text-sm font-semibold text-[#202A35] truncate">
                  {selectedFile ? selectedFile.name : 'Sample Interior'}
                </span>
              </div>
              <p className="text-xs text-[#718096] mt-0.5">
                {selectedFile
                  ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI detection`
                  : 'Verified interior sample ready for surface analysis'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 w-full md:w-auto justify-end">
            <label className="flex items-center space-x-2 text-xs text-[#718096] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={separateWalls}
                onChange={e => onToggleSeparateWalls(e.target.checked)}
                className="rounded border-[#E7E7E0] text-[#087E8B] focus:ring-[#087E8B] w-4 h-4"
              />
              <span className="text-[#202A35] font-medium">Separate wall planes</span>
            </label>

            <button
              type="button"
              onClick={onDetect}
              disabled={isProcessing}
              className={`px-6 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-white shadow-md flex items-center space-x-2 transition-all ${
                isProcessing
                  ? 'bg-teal-400 cursor-not-allowed'
                  : 'bg-[#087E8B] hover:bg-[#066873] shadow-teal-600/20 active:scale-95'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Detecting walls and floor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Detect Walls & Floor</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Preset Sample Gallery */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-semibold text-[#202A35] tracking-wide uppercase">
            Or select a verified sample interior
          </h4>
          <span className="text-xs text-[#718096] font-medium">6 verified room spaces</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {SAMPLE_IMAGES.map(sample => {
            const isSelected = selectedSampleId === sample.id;
            return (
              <button
                key={sample.id}
                type="button"
                onClick={() => onSampleSelect(sample)}
                className={`group relative rounded-2xl overflow-hidden border text-left transition-all duration-200 bg-white flex flex-col ${
                  isSelected
                    ? 'ring-2 ring-[#087E8B] border-transparent shadow-card-hover'
                    : 'border-[#E7E7E0] hover:border-[#8ed1d9] hover:shadow-card'
                }`}
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#F7F7F2] relative">
                  <img
                    src={sample.thumbnailUrl}
                    alt={sample.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/60 text-white backdrop-blur-sm tracking-wide">
                    {sample.category}
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-[#202A35] truncate" title={sample.title}>
                    {sample.title}
                  </p>
                  <p className="text-[10px] text-[#718096] truncate mt-0.5">
                    {sample.source}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
