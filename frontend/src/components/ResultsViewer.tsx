import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sliders, Eye, EyeOff, SplitSquareVertical } from 'lucide-react';
import { DetectionResponse } from '../types';

interface ResultsViewerProps {
  originalImageUrl: string;
  result: DetectionResponse;
}

type ViewMode = 'segmented' | 'split' | 'original' | 'wall_mask' | 'floor_mask';

export const ResultsViewer: React.FC<ResultsViewerProps> = ({
  originalImageUrl,
  result
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('segmented');
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0 to 100%
  const [opacity, setOpacity] = useState<number>(55); // 0 to 100%
  const [showWall, setShowWall] = useState<boolean>(true);
  const [showFloor, setShowFloor] = useState<boolean>(true);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Convert base64 mask strings to Image data URLs
  const wallMaskSrc = `data:image/png;base64,${result.wall.mask_png_base64}`;
  const floorMaskSrc = `data:image/png;base64,${result.floor.mask_png_base64}`;

  // Composite canvas overlay: Wall is Blue #2878E5 (RGB: 40, 120, 229), Floor is Green #22A06B (RGB: 34, 160, 107)
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = originalImageUrl;

    const wallImg = new Image();
    wallImg.src = wallMaskSrc;

    const floorImg = new Image();
    floorImg.src = floorMaskSrc;

    let loadedCount = 0;
    const checkAndDraw = () => {
      loadedCount++;
      if (loadedCount < 3) return;

      const targetW = img.naturalWidth || result.image.width;
      const targetH = img.naturalHeight || result.image.height;

      canvas.width = targetW;
      canvas.height = targetH;

      // 1. Draw original base photograph
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      // Helper to tint only positive (white > 128) binary mask pixels
      const drawTintedMask = (
        maskImage: HTMLImageElement,
        r: number,
        g: number,
        b: number,
        alphaVal: number
      ) => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = targetW;
        offCanvas.height = targetH;
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (!offCtx) return;

        // Draw binary mask (white 255 = surface, black 0 = background)
        offCtx.drawImage(maskImage, 0, 0, targetW, targetH);
        const imgData = offCtx.getImageData(0, 0, targetW, targetH);
        const d = imgData.data;

        // Tint only detected surface pixels (where red/gray value > 128)
        // Non-surface pixels are set to completely transparent (alpha = 0)
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] > 128) {
            d[i] = r;
            d[i + 1] = g;
            d[i + 2] = b;
            d[i + 3] = 255;
          } else {
            d[i + 3] = 0; // Transparent background
          }
        }

        offCtx.putImageData(imgData, 0, 0);

        // Composite tinted mask onto main canvas with user-controlled opacity
        ctx.save();
        ctx.globalAlpha = alphaVal;
        ctx.drawImage(offCanvas, 0, 0);
        ctx.restore();
      };

      const alphaNormalized = opacity / 100;

      // Draw Wall overlay in architectural Blue #2878E5 (RGB: 40, 120, 229)
      if (showWall) {
        drawTintedMask(wallImg, 40, 120, 229, alphaNormalized);
      }

      // Draw Floor overlay in architectural Green #22A06B (RGB: 34, 160, 107)
      if (showFloor) {
        drawTintedMask(floorImg, 34, 160, 107, alphaNormalized);
      }
    };

    img.onload = checkAndDraw;
    wallImg.onload = checkAndDraw;
    floorImg.onload = checkAndDraw;
  }, [originalImageUrl, wallMaskSrc, floorMaskSrc, opacity, showWall, showFloor, result]);

  useEffect(() => {
    if (viewMode === 'segmented' || viewMode === 'split') {
      renderCanvas();
    }
  }, [viewMode, renderCanvas]);

  // Drag handler for Split Slider
  const handleSliderMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    setSliderPosition(percent);
  };

  const handleMouseDown = () => setIsDraggingSlider(true);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider) handleSliderMove(e.clientX);
    };
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDraggingSlider && e.touches[0]) handleSliderMove(e.touches[0].clientX);
    };
    const handleGlobalMouseUp = () => setIsDraggingSlider(false);

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('touchmove', handleGlobalTouchMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDraggingSlider]);

  return (
    <div className="bg-white rounded-2xl border border-[#E7E7E0] p-4 sm:p-6 shadow-card space-y-6">
      {/* Control Toolbar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#E7E7E0] pb-4">
        {/* View Mode Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F7F7F2] border border-[#E7E7E0] rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('segmented')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'segmented'
                ? 'bg-white text-[#087E8B] shadow-sm'
                : 'text-[#718096] hover:text-[#202A35]'
            }`}
          >
            Overlay View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              viewMode === 'split'
                ? 'bg-white text-[#087E8B] shadow-sm'
                : 'text-[#718096] hover:text-[#202A35]'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Before / After</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('original')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'original'
                ? 'bg-white text-[#087E8B] shadow-sm'
                : 'text-[#718096] hover:text-[#202A35]'
            }`}
          >
            Original Photo
          </button>
          <button
            type="button"
            onClick={() => setViewMode('wall_mask')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'wall_mask'
                ? 'bg-white text-[#2878E5] shadow-sm'
                : 'text-[#718096] hover:text-[#202A35]'
            }`}
          >
            Wall Mask (B&W)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('floor_mask')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'floor_mask'
                ? 'bg-white text-[#22A06B] shadow-sm'
                : 'text-[#718096] hover:text-[#202A35]'
            }`}
          >
            Floor Mask (B&W)
          </button>
        </div>

        {/* Surface Toggles & Opacity Slider */}
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* Distinct Wall & Floor Toggles */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowWall(!showWall)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-all ${
                showWall
                  ? 'bg-[#eef5fd] border-[#b9d7fb] text-[#1d5db3] shadow-sm'
                  : 'bg-[#F7F7F2] border-[#E7E7E0] text-[#718096]'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#2878E5]"></span>
              <span>Walls</span>
              {showWall ? <Eye className="w-3.5 h-3.5 ml-1" /> : <EyeOff className="w-3.5 h-3.5 ml-1" />}
            </button>

            <button
              type="button"
              onClick={() => setShowFloor(!showFloor)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-all ${
                showFloor
                  ? 'bg-[#eaf7f1] border-[#a3e2c6] text-[#187a51] shadow-sm'
                  : 'bg-[#F7F7F2] border-[#E7E7E0] text-[#718096]'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#22A06B]"></span>
              <span>Floor</span>
              {showFloor ? <Eye className="w-3.5 h-3.5 ml-1" /> : <EyeOff className="w-3.5 h-3.5 ml-1" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowWall(true);
                setShowFloor(true);
              }}
              className="text-xs text-[#087E8B] hover:text-[#066873] font-semibold px-2 py-1 transition-colors"
            >
              Show both
            </button>
          </div>

          {/* Opacity Slider */}
          <div className="flex items-center space-x-2 text-xs text-[#202A35]">
            <Sliders className="w-3.5 h-3.5 text-[#718096]" />
            <span className="text-[11px] font-medium text-[#718096]">Opacity</span>
            <input
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={e => setOpacity(Number(e.target.value))}
              className="w-24 h-1.5 bg-[#E7E7E0] rounded-lg cursor-pointer accent-[#087E8B]"
            />
            <span className="w-7 text-[11px] font-mono text-[#718096]">{opacity}%</span>
          </div>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl overflow-hidden bg-[#202A35] border border-[#E7E7E0] select-none shadow-inner"
        style={{ minHeight: '360px' }}
      >
        {/* 1. Original View */}
        {viewMode === 'original' && (
          <img
            src={originalImageUrl}
            alt="Original"
            className="w-full h-auto max-h-[70vh] object-contain mx-auto block"
          />
        )}

        {/* 2. Wall Mask Only (B&W) */}
        {viewMode === 'wall_mask' && (
          <img
            src={wallMaskSrc}
            alt="Wall Mask"
            className="w-full h-auto max-h-[70vh] object-contain mx-auto block"
          />
        )}

        {/* 3. Floor Mask Only (B&W) */}
        {viewMode === 'floor_mask' && (
          <img
            src={floorMaskSrc}
            alt="Floor Mask"
            className="w-full h-auto max-h-[70vh] object-contain mx-auto block"
          />
        )}

        {/* 4. Segmented Overlay View (Dynamic Canvas) */}
        {viewMode === 'segmented' && (
          <canvas
            ref={canvasRef}
            className="w-full h-auto max-h-[70vh] object-contain mx-auto block"
          />
        )}

        {/* 5. Split Before / After Slider */}
        {viewMode === 'split' && (
          <div className="relative w-full overflow-hidden flex items-center justify-center">
            {/* Background: Segmented canvas */}
            <canvas
              ref={canvasRef}
              className="w-full h-auto max-h-[70vh] object-contain mx-auto block"
            />

            {/* Foreground: Original image clipped to slider position with subpixel alignment */}
            <img
              src={originalImageUrl}
              alt="Original unsegmented portion"
              className="absolute inset-0 w-full h-full object-contain mx-auto block pointer-events-none"
              style={{
                clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
              }}
            />

            {/* Draggable Divider Line */}
            <div
              className="absolute top-0 bottom-0 z-20 flex items-center justify-center cursor-ew-resize"
              style={{ left: `calc(${sliderPosition}% - 1px)` }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
            >
              <div className="w-0.5 h-full bg-white shadow-[0_0_8px_rgba(32,42,53,0.7)]"></div>
              <div className="absolute w-8 h-8 rounded-full bg-white shadow-card border border-[#E7E7E0] flex items-center justify-center text-[#202A35] active:scale-95 transition-transform">
                <SplitSquareVertical className="w-4 h-4 text-[#087E8B]" />
              </div>
            </div>

            {/* Viewport Boundary Labels */}
            <span className="absolute bottom-3 left-3 px-2 py-1 rounded bg-[#202A35]/80 backdrop-blur-sm text-white text-[11px] font-semibold z-10 pointer-events-none tracking-wide">
              Original
            </span>
            <span className="absolute bottom-3 right-3 px-2 py-1 rounded bg-[#202A35]/80 backdrop-blur-sm text-white text-[11px] font-semibold z-10 pointer-events-none tracking-wide">
              AI Overlay
            </span>
          </div>
        )}
      </div>

      {/* Surface Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-[#F7F7F2] p-3.5 rounded-xl border border-[#E7E7E0]">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-3.5 rounded-md bg-[#2878E5] shadow-sm border border-[#1d5db3]/30"></span>
            <span className="font-semibold text-[#202A35]">Wall Surface (Blue)</span>
            <span className="text-[#718096] text-[11px]">({result.wall.area_percent}% coverage)</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-3.5 rounded-md bg-[#22A06B] shadow-sm border border-[#187a51]/30"></span>
            <span className="font-semibold text-[#202A35]">Floor Surface (Green)</span>
            <span className="text-[#718096] text-[11px]">({result.floor.area_percent}% coverage)</span>
          </div>
        </div>

        <div className="text-[11px] text-[#718096]">
          Wall = Blue (#2878E5) • Floor = Green (#22A06B) • Mutually Exclusive
        </div>
      </div>
    </div>
  );
};
