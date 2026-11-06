/// <reference types="node" preserve="true" />
import type { Buffer } from 'node:buffer';

export type ImageInput = string | Buffer;
export type AssetKind = 'icon' | 'maskable' | 'apple' | 'favicon' | 'ico' | 'splash';
export interface DevicePreset {
  /** CSS portrait dimensions; output pixels = CSS dimensions * pixelRatio. */
  name: string;
  width: number;
  height: number;
  pixelRatio: number;
}
export interface IconOptions {
  preset?: 'pwa';
  sizes?: number[];
  maskable?: boolean;
  maskableSizes?: number[];
  apple?: boolean;
  appleSizes?: number[];
  favicons?: boolean;
  faviconSizes?: number[];
  ico?: boolean;
  /** Padding on each side, as a fraction of the canvas. */
  padding?: number;
  background?: string;
  maskableBackground?: string;
}
export interface SplashOptions {
  preset?: 'ios';
  devices?: DevicePreset[];
  orientations?: ('portrait' | 'landscape')[];
  /** Maximum logo width and height relative to the shorter screen edge. */
  logoScale?: number;
  background?: string;
  darkBackground?: string;
}
export interface ManifestIcon {
  src: string;
  sizes: string;
  type: 'image/png';
  purpose: 'any' | 'maskable';
}
export interface WebManifest {
  name?: string;
  short_name?: string;
  start_url?: string;
  display?: string;
  background_color?: string;
  theme_color?: string;
  icons?: unknown[];
  [key: string]: unknown;
}
export interface GenerateOptions {
  input: ImageInput;
  icons?: false | IconOptions;
  /** Uses the iOS preset by default; pass false to disable. */
  splash?: false | SplashOptions;
  /** Opt in with true or a manifest object. Generated icons replace matching src values. */
  manifest?: boolean | WebManifest;
  /** Generate index.html. Disabled by default. */
  html?: boolean;
  publicPath?: string;
  background?: string;
  concurrency?: number;
  limitInputPixels?: number;
}
export interface PlannedAsset {
  /** POSIX path relative to outDir, including the asset category directory. */
  filename: string;
  kind: AssetKind;
  width: number;
  height: number;
  background: string;
  padding: number;
  media?: string;
}
export interface AssetPlan {
  images: PlannedAsset[];
  files: string[];
  manifest: WebManifest | null;
  html: string;
}
export interface GeneratedAsset {
  /** POSIX path relative to outDir; optional manifest and index.html remain at its root. */
  filename: string;
  mimeType: 'image/png' | 'image/x-icon' | 'application/manifest+json' | 'text/html';
  data: Buffer;
  width?: number;
  height?: number;
  kind?: AssetKind;
}
export interface GenerateResult extends AssetPlan {
  assets: GeneratedAsset[];
  warnings: string[];
}
export interface WriteOptions {
  outDir: string;
  overwrite?: boolean;
}
