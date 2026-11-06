import React from 'react';
import { Download, FileImage, FileCode } from 'lucide-react';
import { DetectionResponse } from '../types';

interface DownloadSectionProps {
  result: DetectionResponse;
  originalFilename?: string;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({
  result,
  originalFilename = 'room_image'
}) => {
  const baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;

  const downloadBase64Png = (base64Str: string, suffix: string) => {
    if (!base64Str) return;
    const link = document.createElement('a');
    link.href = base64Str.startsWith('data:')
      ? base64Str
      : `data:image/png;base64,${base64Str}`;
    link.download = `${baseName}_${suffix}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJsonReport = () => {
    const reportData = {
      ...result,
      export_timestamp: new Date().toISOString(),
      surface_summary: {
        total_pixels: result.image.width * result.image.height,
        wall_coverage_percent: result.wall.area_percent,
        floor_coverage_percent: result.floor.area_percent,
        wall_confidence: result.wall.confidence,
        floor_confidence: result.floor.confidence,
      }
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}_detection_report.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E7E7E0] p-5 sm:p-6 shadow-card space-y-4">
      <div>
        <h3 className="text-sm font-bold text-[#202A35] tracking-tight">Export & Surface Downloads</h3>
        <p className="text-xs text-[#718096] mt-0.5 font-normal">
          Export 8-bit black-and-white binary masks (255 = surface, 0 = background) preserving exact original {result.image.width} × {result.image.height}px resolution
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Wall Mask Download (Blue #2878E5) */}
        <button
          type="button"
          onClick={() => downloadBase64Png(result.wall.mask_png_base64, 'wall_mask')}
          className="p-3.5 rounded-xl border border-[#b9d7fb] bg-[#f8fbfe] hover:bg-[#eef5fd] transition-all text-left flex items-center space-x-3 group shadow-subtle hover:shadow-card"
        >
          <div className="w-9 h-9 rounded-lg bg-[#2878E5] text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
            <Download className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#1d5db3] truncate">Wall Mask (PNG)</p>
            <p className="text-[10px] text-[#2878E5] truncate mt-0.5 font-medium">
              B&W binary • {result.wall.area_percent}% coverage
            </p>
          </div>
        </button>

        {/* Floor Mask Download (Green #22A06B) */}
        <button
          type="button"
          onClick={() => downloadBase64Png(result.floor.mask_png_base64, 'floor_mask')}
          className="p-3.5 rounded-xl border border-[#a3e2c6] bg-[#f7fcf9] hover:bg-[#eaf7f1] transition-all text-left flex items-center space-x-3 group shadow-subtle hover:shadow-card"
        >
          <div className="w-9 h-9 rounded-lg bg-[#22A06B] text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
            <Download className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#187a51] truncate">Floor Mask (PNG)</p>
            <p className="text-[10px] text-[#22A06B] truncate mt-0.5 font-medium">
              B&W binary • {result.floor.area_percent}% coverage
            </p>
          </div>
        </button>

        {/* Blended Composite Overlay (Deep Teal #087E8B) */}
        <button
          type="button"
          onClick={() => downloadBase64Png(result.overlay_png_base64, 'composite_overlay')}
          disabled={!result.overlay_png_base64}
          className="p-3.5 rounded-xl border border-[#bee5e9] bg-[#f0f9fa]/70 hover:bg-[#def2f4] transition-all text-left flex items-center space-x-3 group disabled:opacity-50 shadow-subtle hover:shadow-card"
        >
          <div className="w-9 h-9 rounded-lg bg-[#087E8B] text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
            <FileImage className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#06545d] truncate">Composite Overlay</p>
            <p className="text-[10px] text-[#087E8B] truncate mt-0.5 font-medium">
              Photo + Wall (Blue) + Floor (Green)
            </p>
          </div>
        </button>

        {/* JSON Metadata Report (Dark Charcoal #202A35) */}
        <button
          type="button"
          onClick={downloadJsonReport}
          className="p-3.5 rounded-xl border border-[#E7E7E0] bg-white hover:bg-[#F7F7F2] transition-all text-left flex items-center space-x-3 group shadow-subtle hover:shadow-card"
        >
          <div className="w-9 h-9 rounded-lg bg-[#202A35] text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
            <FileCode className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#202A35] truncate">JSON Report</p>
            <p className="text-[10px] text-[#718096] truncate mt-0.5 font-medium">
              Metrics, IDs & latency specs
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
