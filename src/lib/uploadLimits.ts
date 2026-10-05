/**
 * What a participant is allowed to upload, stated in one place.
 *
 * The ceiling mirrors the server's multer limit (UPLOAD_SIZE_LIMIT_BYTES in
 * the backend's uploadMimeTypes). Checking it in the browser means an
 * oversized file is refused instantly with a readable message, instead of
 * being uploaded for a minute and then rejected.
 */

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = '100 MB';

/** `accept` values and the human list shown under each dropzone. */
export const MEDIA_ACCEPT = 'video/*,audio/*,.mov,.m4a,.webm';
export const MEDIA_TYPES_LABEL = 'MP4, MOV, WebM, M4A or MP3';

export const DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.txt';
export const DOCUMENT_TYPES_LABEL = 'PDF, Word, PowerPoint or text';

export const DOCUMENT_IMAGE_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png';
export const DOCUMENT_IMAGE_TYPES_LABEL = 'PDF, Word, PowerPoint, text or image';

/** "742 KB", "18.4 MB" */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Null when the file is acceptable, otherwise the reason to show. */
export function checkUploadSize(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is ${formatFileSize(file.size)}. The limit is ${MAX_UPLOAD_LABEL} — please compress it or upload a shorter recording.`;
  }
  if (file.size === 0) {
    return 'That file is empty. Please choose another one.';
  }
  return null;
}
