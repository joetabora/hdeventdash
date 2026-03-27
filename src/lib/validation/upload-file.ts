/** Max size for event document / media uploads (bytes). */
export const EVENT_FILE_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;

/** HTML `accept` hint: images (no SVG) + PDF only. */
export const EVENT_UPLOAD_ACCEPT_ATTR =
  "application/pdf,image/jpeg,image/png,image/gif,image/webp,image/bmp,image/avif,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.avif,.tif,.tiff,.heic,.heif";

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/avif",
  "image/pjpeg",
  "image/x-png",
]);

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".avif",
  ".tif",
  ".tiff",
  ".heic",
  ".heif",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ...IMAGE_EXTENSIONS,
]);

/** Executables, scripts, HTML, SVG, and other disallowed extensions. */
const BLOCKED_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".xhtml",
  ".svg",
  ".svgz",
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".com",
  ".pif",
  ".scr",
  ".msi",
  ".js",
  ".mjs",
  ".cjs",
  ".jar",
  ".app",
  ".deb",
  ".dmg",
  ".sh",
  ".ps1",
  ".vbs",
  ".hta",
  ".wasm",
  ".php",
  ".asp",
  ".aspx",
  ".jsp",
  ".pl",
  ".py",
  ".rb",
  ".wsf",
]);

const BLOCKED_MIME_EXACT = new Set([
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
  "text/javascript",
  "application/javascript",
  "application/x-javascript",
  "application/java-archive",
  "application/x-msdownload",
  "application/x-executable",
  "application/x-msdos-program",
  "application/x-msi",
  "application/vnd.microsoft.portable-executable",
]);

function extname(filename: string): string {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? filename;
  const i = base.lastIndexOf(".");
  if (i < 0) return "";
  return base.slice(i).toLowerCase();
}

function mimeLooksBlocked(mime: string): boolean {
  if (!mime) return false;
  if (BLOCKED_MIME_EXACT.has(mime)) return true;
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return true;
  if (mime.startsWith("text/") && mime !== "text/plain") return true;
  return false;
}

/**
 * Validates a file before storage upload: allowed types (raster images + PDF only),
 * max size, rejects HTML/SVG/executables and other blocked types.
 */
export function validateEventUploadFile(file: File): void {
  if (!file || typeof file.name !== "string") {
    throw new Error("Invalid file.");
  }
  if (/[\\/]|\.\./.test(file.name)) {
    throw new Error("Invalid file name.");
  }
  if (file.size <= 0) {
    throw new Error("File is empty.");
  }
  if (file.size > EVENT_FILE_UPLOAD_MAX_BYTES) {
    const mb = Math.round(EVENT_FILE_UPLOAD_MAX_BYTES / (1024 * 1024));
    throw new Error(`File is too large (max ${mb} MB).`);
  }

  const ext = extname(file.name);
  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw new Error("This file type is not allowed.");
  }

  const mime = (file.type ?? "").trim().toLowerCase();

  if (mimeLooksBlocked(mime)) {
    throw new Error("This file type is not allowed.");
  }

  if (mime === "application/pdf") {
    if (ext && ext !== ".pdf") {
      throw new Error("PDF files must use a .pdf extension.");
    }
    return;
  }

  if (ALLOWED_IMAGE_MIME.has(mime)) {
    if (ext === ".pdf") {
      throw new Error("File type does not match the extension.");
    }
    if (ext && !IMAGE_EXTENSIONS.has(ext)) {
      throw new Error("File extension does not match an allowed image type.");
    }
    return;
  }

  if (mime === "" || mime === "application/octet-stream") {
    if (ALLOWED_EXTENSIONS.has(ext)) {
      return;
    }
    throw new Error("Only images and PDF files are allowed.");
  }

  throw new Error("Only images and PDF files are allowed.");
}
