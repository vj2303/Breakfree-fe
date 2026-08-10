'use client';

import { useEffect, useState } from 'react';

export function getFileExtensionFromNameOrUrl(nameOrUrl: string): string {
  const path = (nameOrUrl.split(/[?#]/)[0] ?? '').trim();
  const dot = path.lastIndexOf('.');
  return dot >= 0 ? path.slice(dot + 1).toLowerCase() : '';
}

export type DocumentPreviewMode = 'pdf' | 'image' | 'office' | 'text' | 'generic';

export function inferDocumentPreviewMode(fileUrl: string, fileName?: string): DocumentPreviewMode {
  const extFromName = fileName ? getFileExtensionFromNameOrUrl(fileName) : '';
  const extFromUrl = getFileExtensionFromNameOrUrl(fileUrl);
  const ext = extFromName || extFromUrl;
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(ext)) return 'office';
  if (['txt', 'csv', 'md', 'json', 'xml'].includes(ext)) return 'text';
  if (/\.pdf(\?|#|$)/i.test(fileUrl)) return 'pdf';
  if (/\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(fileUrl)) return 'image';
  return 'generic';
}

export function TextSubmissionPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('failed');
        return r.text();
      })
      .then((t) => {
        if (!cancelled) setText(t);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) {
    return (
      <p className="p-3 text-xs text-gray-500">
        Text preview is unavailable (network or CORS). Use &quot;Open file&quot; below.
      </p>
    );
  }
  if (text === null) {
    return <p className="p-3 text-xs text-gray-500">Loading text preview…</p>;
  }
  return (
    <pre className="max-h-[min(70vh,560px)] overflow-auto whitespace-pre-wrap break-words bg-white p-3 text-xs text-gray-900">
      {text}
    </pre>
  );
}

export function DocumentSubmissionPreview({
  fileUrl,
  fileName,
  fileSize,
}: {
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
}) {
  const mode = inferDocumentPreviewMode(fileUrl, fileName);
  const officeEmbedSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;

  return (
    <div className="mt-2 space-y-2">
      <div className="overflow-hidden rounded border border-gray-200 bg-gray-50">
        <p className="border-b border-gray-200 bg-gray-100 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-600">
          Preview
        </p>
        {mode === 'pdf' && (
          <iframe
            title={fileName || 'Document preview'}
            src={fileUrl}
            className="h-[min(70vh,560px)] w-full border-0 bg-white"
          />
        )}
        {mode === 'image' && (
          // eslint-disable-next-line @next/next/no-img-element -- external participant submission URL
          <img
            src={fileUrl}
            alt={fileName || 'Submission document'}
            className="max-h-[min(70vh,560px)] w-full bg-neutral-100 object-contain"
          />
        )}
        {mode === 'office' && (
          <iframe
            title={fileName || 'Document preview'}
            src={officeEmbedSrc}
            className="h-[min(70vh,560px)] w-full border-0 bg-white"
          />
        )}
        {mode === 'text' && <TextSubmissionPreview url={fileUrl} />}
        {mode === 'generic' && (
          <iframe
            title={fileName || 'Document preview'}
            src={fileUrl}
            className="h-[min(70vh,560px)] w-full border-0 bg-white"
          />
        )}
      </div>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-black"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a2 2 0 00-2.828-2.828L9 10.172 7.586 8.586a2 2 0 10-2.828 2.828l4 4a2 2 0 002.828 0L16.828 9.828a2 2 0 000-2.828z"
          />
        </svg>
        {fileName || 'Open file in new tab'}
        {fileSize != null && fileSize > 0 && (
          <span className="text-gray-500">({(fileSize / 1024).toFixed(2)} KB)</span>
        )}
        <span className="text-gray-500">· download / full view</span>
      </a>
    </div>
  );
}
