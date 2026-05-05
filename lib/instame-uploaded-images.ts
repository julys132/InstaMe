import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

export type PreparedUploadImage = {
  uri: string;
  base64: string;
  previewBase64: string;
  mimeType: string;
  width: number;
  height: number;
  fileSizeBytes: number;
};

export type UploadedImageViewMode = "tiny" | "small" | "medium" | "large";

export const MAX_STORED_UPLOADS = 10;
export const MAX_LIBRARY_IMAGE_BYTES = 1_000_000;
export const MAX_LIBRARY_IMAGE_DIMENSION = 1024;
export const LIBRARY_PREVIEW_DIMENSION = 360;
export const VIEW_MODE_OPTIONS: { value: UploadedImageViewMode; label: string }[] = [
  { value: "tiny", label: "XS" },
  { value: "small", label: "S" },
  { value: "medium", label: "M" },
  { value: "large", label: "L" },
];
export const VIEW_MODE_TILE_SIZE: Record<UploadedImageViewMode, number> = {
  tiny: 72,
  small: 96,
  medium: 124,
  large: 164,
};

export function stripDataUriPrefix(base64OrDataUri: string): string {
  const commaIndex = base64OrDataUri.indexOf(",");
  return commaIndex >= 0 ? base64OrDataUri.slice(commaIndex + 1) : base64OrDataUri;
}

export function estimateBase64Bytes(base64: string): number {
  const sanitized = stripDataUriPrefix(base64).replace(/\s+/g, "");
  if (!sanitized) return 0;

  const padding =
    sanitized.endsWith("==") ? 2 : sanitized.endsWith("=") ? 1 : 0;
  return Math.floor((sanitized.length * 3) / 4) - padding;
}

export function inferImageMimeTypeFromBase64(base64OrDataUri: string): string {
  const sanitized = stripDataUriPrefix(base64OrDataUri).replace(/\s+/g, "");
  if (!sanitized) return "image/jpeg";

  if (sanitized.startsWith("/9j/")) return "image/jpeg";
  if (sanitized.startsWith("iVBORw0KGgo")) return "image/png";
  if (sanitized.startsWith("UklGR")) return "image/webp";
  if (sanitized.startsWith("R0lGOD")) return "image/gif";

  return "image/jpeg";
}

export function buildDataUri(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${stripDataUriPrefix(base64)}`;
}

export async function optimizeImageAsset(
  asset: ImagePicker.ImagePickerAsset,
  previewDimension: number = LIBRARY_PREVIEW_DIMENSION,
): Promise<PreparedUploadImage> {
  const sourceWidth = Math.max(asset.width || 0, 1);
  const sourceHeight = Math.max(asset.height || 0, 1);
  const largestSide = Math.max(sourceWidth, sourceHeight);
  const resizeAction =
    largestSide > MAX_LIBRARY_IMAGE_DIMENSION
      ? sourceWidth >= sourceHeight
        ? [{ resize: { width: MAX_LIBRARY_IMAGE_DIMENSION } }]
        : [{ resize: { height: MAX_LIBRARY_IMAGE_DIMENSION } }]
      : [];

  const compressSteps = [0.82, 0.72, 0.62, 0.52, 0.42];
  let optimizedBase64 = "";
  let optimizedUri = asset.uri;
  let optimizedWidth = sourceWidth;
  let optimizedHeight = sourceHeight;
  let optimizedBytes = asset.fileSize || 0;

  for (const compress of compressSteps) {
    const result = await manipulateAsync(asset.uri, resizeAction, {
      compress,
      format: SaveFormat.JPEG,
      base64: true,
    });
    const candidateBase64 = stripDataUriPrefix(result.base64 || "");
    const candidateBytes = estimateBase64Bytes(candidateBase64);

    optimizedBase64 = candidateBase64;
    optimizedUri = result.uri;
    optimizedWidth = result.width;
    optimizedHeight = result.height;
    optimizedBytes = candidateBytes;

    if (candidateBase64 && candidateBytes <= MAX_LIBRARY_IMAGE_BYTES) {
      break;
    }
  }

  if (!optimizedBase64) {
    throw new Error("Could not optimize this image.");
  }

  if (optimizedBytes > MAX_LIBRARY_IMAGE_BYTES) {
    throw new Error("This photo is still larger than 1MB after optimization.");
  }

  const previewResizeAction =
    Math.max(optimizedWidth, optimizedHeight) > previewDimension
      ? optimizedWidth >= optimizedHeight
        ? [{ resize: { width: previewDimension } }]
        : [{ resize: { height: previewDimension } }]
      : [];

  const previewResult = await manipulateAsync(optimizedUri, previewResizeAction, {
    compress: 0.62,
    format: SaveFormat.JPEG,
    base64: true,
  });
  const previewBase64 = stripDataUriPrefix(previewResult.base64 || optimizedBase64);

  return {
    uri: optimizedUri,
    base64: optimizedBase64,
    previewBase64,
    mimeType: "image/jpeg",
    width: optimizedWidth,
    height: optimizedHeight,
    fileSizeBytes: optimizedBytes,
  };
}

export async function optimizeGeneratedBase64Image(options: {
  base64: string;
  mimeType?: string;
  previewDimension?: number;
}): Promise<PreparedUploadImage> {
  const mimeType = options.mimeType || "image/png";
  const inputUri = buildDataUri(options.base64, mimeType);
  const previewDimension = options.previewDimension || LIBRARY_PREVIEW_DIMENSION;

  const firstPass = await manipulateAsync(inputUri, [], {
    compress: 0.92,
    format: SaveFormat.JPEG,
    base64: true,
  });

  const sourceWidth = Math.max(firstPass.width || 0, 1);
  const sourceHeight = Math.max(firstPass.height || 0, 1);
  const largestSide = Math.max(sourceWidth, sourceHeight);
  const resizeAction =
    largestSide > MAX_LIBRARY_IMAGE_DIMENSION
      ? sourceWidth >= sourceHeight
        ? [{ resize: { width: MAX_LIBRARY_IMAGE_DIMENSION } }]
        : [{ resize: { height: MAX_LIBRARY_IMAGE_DIMENSION } }]
      : [];

  const compressSteps = [0.82, 0.72, 0.62, 0.52, 0.42];
  let optimizedBase64 = stripDataUriPrefix(firstPass.base64 || "");
  let optimizedUri = firstPass.uri;
  let optimizedWidth = firstPass.width;
  let optimizedHeight = firstPass.height;
  let optimizedBytes = estimateBase64Bytes(optimizedBase64);

  for (const compress of compressSteps) {
    const result = await manipulateAsync(firstPass.uri, resizeAction, {
      compress,
      format: SaveFormat.JPEG,
      base64: true,
    });

    const candidateBase64 = stripDataUriPrefix(result.base64 || "");
    const candidateBytes = estimateBase64Bytes(candidateBase64);

    optimizedBase64 = candidateBase64;
    optimizedUri = result.uri;
    optimizedWidth = result.width;
    optimizedHeight = result.height;
    optimizedBytes = candidateBytes;

    if (candidateBase64 && candidateBytes <= MAX_LIBRARY_IMAGE_BYTES) {
      break;
    }
  }

  if (!optimizedBase64) {
    throw new Error("Could not optimize the enhanced portrait.");
  }

  if (optimizedBytes > MAX_LIBRARY_IMAGE_BYTES) {
    throw new Error("The enhanced portrait is still larger than 1MB after optimization.");
  }

  const previewResizeAction =
    Math.max(optimizedWidth, optimizedHeight) > previewDimension
      ? optimizedWidth >= optimizedHeight
        ? [{ resize: { width: previewDimension } }]
        : [{ resize: { height: previewDimension } }]
      : [];

  const previewResult = await manipulateAsync(optimizedUri, previewResizeAction, {
    compress: 0.62,
    format: SaveFormat.JPEG,
    base64: true,
  });

  return {
    uri: optimizedUri,
    base64: optimizedBase64,
    previewBase64: stripDataUriPrefix(previewResult.base64 || optimizedBase64),
    mimeType: "image/jpeg",
    width: optimizedWidth,
    height: optimizedHeight,
    fileSizeBytes: optimizedBytes,
  };
}
