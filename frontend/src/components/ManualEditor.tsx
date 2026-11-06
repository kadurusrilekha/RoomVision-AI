import React, { useRef, useState, useEffect } from 'react';
import { Paintbrush, Eraser, RotateCcw, Download, Palette } from 'lucide-react';
import { DetectionResponse } from '../types';

interface ManualEditorProps {
  originalImageUrl?: string;
  result: DetectionResponse;
}

export const ManualEditor: React.FC<ManualEditorProps> = ({ result }) => {
  const [activeSurface, setActiveSurface] = useState<'wall' | 'floor'>('wall');
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [brushSize, setBrushSize] = useState<number>(20);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize mask on canvas
  const loadMaskToCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maskBase64 = activeSurface === 'wall'
      ? result.wall.mask_png_base64
      : result.floor.mask_png_base64;

    const img = new Image();
    img.src = `data:image/png;base64,${maskBase64}`;
    img.onload = () => {
      canvas.width = img.naturalWidth || result.image.width;
      canvas.height = img.naturalHeight || result.image.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setUndoStack([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };
  };

  useEffect(() => {
    loadMaskToCanvas();
  }, [activeSurface, result]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setUndoStack(prev => [...prev.slice(-10), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const undo = () => {
    if (undoStack.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newStack = [...undoStack];
    newStack.pop(); // Remove current
    const previous = newStack[newStack.length - 1];
    ctx.putImageData(previous, 0, 0);
    setUndoStack(newStack);
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    saveState();
    draw(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== 'mousedown') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);

    if (tool === 'brush') {
      ctx.fillStyle = '#FFFFFF'; // White (255) for detected surface
      ctx.fill();
    } else {
      ctx.fillStyle = '#000000'; // Black (0) for background
      ctx.fill();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const downloadCorrectedMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `corrected_${activeSurface}_mask.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E7E7E0] p-5 sm:p-6 shadow-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E7E0] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-[#087E8B]" />
            <h3 className="text-sm font-bold text-[#202A35]">Manual Mask Refinement Tool</h3>
          </div>
          <p className="text-xs text-[#718096] mt-0.5 font-normal">
            Fine-tune edges, paint missed patches, or erase false segments using interactive brush & eraser
          </p>
        </div>

        <button
          type="button"
          onClick={downloadCorrectedMask}
          className="px-4 py-2 bg-[#087E8B] hover:bg-[#066873] text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center space-x-2 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Corrected Mask</span>
        </button>
      </div>

      {/* Editor Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Surface Selector (Wall in Blue #2878E5, Floor in Green #22A06B) */}
        <div className="flex items-center space-x-1 bg-[#F7F7F2] border border-[#E7E7E0] p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSurface('wall')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeSurface === 'wall'
                ? 'bg-[#2878E5] text-white shadow-sm'
                : 'text-[#718096] hover:text-[#202A35]'
            }`}
          >
            Wall Mask
          </button>
          <button
            type="button"
            onClick={() => setActiveSurface('floor')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeSurface === 'floor'
                ? 'bg-[#22A06B] text-white shadow-sm'
                : 'text-[#718096] hover:text-[#202A35]'
            }`}
          >
            Floor Mask
          </button>
        </div>

        {/* Tool Selector */}
        <div className="flex items-center space-x-1 bg-[#F7F7F2] border border-[#E7E7E0] p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTool('brush')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
              tool === 'brush'
                ? 'bg-white text-[#087E8B] shadow-sm'
                : 'text-[#718096] hover:text-[#202A35]'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Brush (White)</span>
          </button>
          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
              tool === 'eraser'
                ? 'bg-white text-[#087E8B] shadow-sm'
                : 'text-[#718096] hover:text-[#202A35]'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Eraser (Black)</span>
          </button>
        </div>

        {/* Brush Size */}
        <div className="flex items-center space-x-2 text-xs text-[#202A35] px-3 py-1.5 bg-[#F7F7F2] rounded-xl border border-[#E7E7E0]">
          <span className="text-[11px] font-semibold text-[#718096]">Size</span>
          <input
            type="range"
            min="4"
            max="60"
            value={brushSize}
            onChange={e => setBrushSize(Number(e.target.value))}
            className="w-20 h-1.5 bg-[#E7E7E0] rounded-lg cursor-pointer accent-[#087E8B]"
          />
          <span className="w-6 text-[11px] font-mono text-[#718096]">{brushSize}px</span>
        </div>

        {/* Undo and Reset */}
        <button
          type="button"
          onClick={undo}
          disabled={undoStack.length <= 1}
          className="p-2 bg-[#F7F7F2] hover:bg-[#EDEFEA] border border-[#E7E7E0] disabled:opacity-40 rounded-xl text-[#202A35] transition-all shadow-subtle"
          title="Undo last stroke"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={loadMaskToCanvas}
          className="px-3 py-1.5 text-xs text-[#718096] hover:text-[#202A35] font-semibold transition-colors"
        >
          Reset Mask
        </button>
      </div>

      {/* Canvas Area */}
      <div className="relative border border-[#E7E7E0] rounded-2xl overflow-hidden bg-[#202A35] flex items-center justify-center shadow-inner">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="max-h-[50vh] w-auto cursor-crosshair object-contain block"
        />
      </div>
      <div className="text-[11px] text-[#718096] text-center font-medium">
        White = Detected Surface (255) • Black = Background / Non-surface (0)
      </div>
    </div>
  );
};
