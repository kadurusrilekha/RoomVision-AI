export interface ImageMeta {
  width: number;
  height: number;
}

export interface ModelMeta {
  name: string;
  version: string;
}

export interface MaskResult {
  mask_png_base64: string;
  area_percent: number;
  confidence: number;
}

export interface WallSegment {
  id: number;
  area_pixels: number;
  area_percent: number;
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  mask_png_base64: string;
}

export interface DetectionResponse {
  request_id: string;
  image: ImageMeta;
  model: ModelMeta;
  processing_ms: number;
  floor: MaskResult;
  wall: MaskResult;
  walls: WallSegment[];
  overlay_png_base64: string;
  warnings: string[];
}

export interface SampleImage {
  id: string;
  category: string;
  title: string;
  filename: string;
  thumbnailUrl: string;
  source: string;
  license: string;
}

export interface BackendHealth {
  status: 'healthy' | 'initializing' | 'offline';
  model?: {
    name: string;
    version: string;
    ready: boolean;
  };
}

