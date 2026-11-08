/**
 * Browser File Download Utility
 *
 * This feature module provides secure, browser-native client-side blob generation
 * and file download triggering without requiring server round-trips.
 *
 * Feature Overview & Use Cases:
 * 1. Client-Side Blob Creation: Converts raw string content (Markdown, CSV, JSON) into
 *    typed MIME blobs for instant browser saving.
 * 2. Revocable Object URLs: Dynamically provisions and cleans up object URLs to prevent
 *    browser memory leaks during repeated exports.
 * 3. File Name Sanitization: Strips non-alphanumeric characters from user portfolio names
 *    to guarantee safe filesystem saving across Windows, macOS, and Linux.
 */

import { logFunctionCall } from '../../utils/logger';

/**
 * Triggers a client-side browser file download from textual content.
 *
 * @param content String content to be downloaded (Markdown, CSV, JSON).
 * @param fileName Target filename including extension (e.g. aftershock-portfolio.md).
 * @param mimeType MIME content type string (e.g. text/markdown;charset=utf-8).
 */
export function downloadFileBlob(
  content: string,
  fileName: string,
  mimeType: string
): void {
  logFunctionCall('downloadFileBlob', {
    fileName,
    mimeType,
    contentLength: content.length,
  });

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
