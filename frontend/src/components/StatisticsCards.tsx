import React from 'react';
import { Clock, Maximize2, Cpu, AlertCircle, ShieldCheck } from 'lucide-react';
import { DetectionResponse } from '../types';

interface StatisticsCardsProps {
  result: DetectionResponse;
}

export const StatisticsCards: React.FC<StatisticsCardsProps> = ({ result }) => {
  const modelShortName = result.model.name.split('/').pop() || result.model.name;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Dimensions */}
        <div className="bg-white p-4 rounded-2xl border border-[#E7E7E0] shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#718096]">
            <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">Image Size</span>
            <Maximize2 className="w-4 h-4 text-[#087E8B]" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-bold text-[#202A35] tracking-tight">
              {result.image.width} × {result.image.height}
            </div>
            <p className="text-[11px] text-[#718096] mt-0.5">Pixels (Preserved)</p>
          </div>
        </div>

        {/* Card 2: Processing Time */}
        <div className="bg-white p-4 rounded-2xl border border-[#E7E7E0] shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#718096]">
            <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">Inference</span>
            <Clock className="w-4 h-4 text-[#087E8B]" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-bold text-[#202A35] tracking-tight">
              {result.processing_ms} <span className="text-xs font-normal text-[#718096]">ms</span>
            </div>
            <p className="text-[11px] text-[#718096] mt-0.5">End-to-end latency</p>
          </div>
        </div>

        {/* Card 3: Model Architecture */}
        <div className="bg-white p-4 rounded-2xl border border-[#E7E7E0] shadow-card flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-[#718096]">
            <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">Model</span>
            <Cpu className="w-4 h-4 text-[#087E8B]" />
          </div>
          <div className="mt-2">
            <div className="text-sm sm:text-base font-bold text-[#202A35] truncate" title={result.model.name}>
              {modelShortName}
            </div>
            <p className="text-[11px] text-[#718096] mt-0.5">v{result.model.version} (ADE20K)</p>
          </div>
        </div>

        {/* Card 4: Wall Coverage (Blue #2878E5) */}
        <div className="bg-white p-4 rounded-2xl border border-[#b9d7fb] shadow-card flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#2878E5]"></div>
          <div className="flex items-center justify-between text-[#718096]">
            <span className="text-xs font-semibold text-[#1d5db3]">Wall Coverage</span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#eef5fd] text-[#1d5db3] rounded-md tracking-wide">
              Blue
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-extrabold text-[#1d5db3] tracking-tight">
              {result.wall.area_percent}%
            </div>
            <p className="text-[11px] text-[#2878E5] mt-0.5 flex items-center space-x-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2878E5]" />
              <span>Conf: {(result.wall.confidence * 100).toFixed(1)}%</span>
            </p>
          </div>
        </div>

        {/* Card 5: Floor Coverage (Green #22A06B) */}
        <div className="bg-white p-4 rounded-2xl border border-[#a3e2c6] shadow-card flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#22A06B]"></div>
          <div className="flex items-center justify-between text-[#718096]">
            <span className="text-xs font-semibold text-[#187a51]">Floor Coverage</span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#eaf7f1] text-[#187a51] rounded-md tracking-wide">
              Green
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-extrabold text-[#187a51] tracking-tight">
              {result.floor.area_percent}%
            </div>
            <p className="text-[11px] text-[#22A06B] mt-0.5 flex items-center space-x-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22A06B]" />
              <span>Conf: {(result.floor.confidence * 100).toFixed(1)}%</span>
            </p>
          </div>
        </div>
      </div>

      {/* Warnings Banner if any */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start space-x-2 shadow-subtle">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {result.warnings.map((w, idx) => (
              <p key={idx}>{w}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
