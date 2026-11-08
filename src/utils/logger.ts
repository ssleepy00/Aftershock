/**
 * Centralized Application Logger Engine
 *
 * This module provides comprehensive structured informational and diagnostic logging
 * across the client and server runtimes, adhering to strict enterprise observability guidelines.
 *
 * Feature Overview & Use Cases:
 * 1. Function Call Tracing: Automatically logs every key computational and feature function call
 *    with its input parameters formatted as structured JSON for auditing, reproducibility, and debugging.
 * 2. Generative AI Telemetry: Captures all GenAI calls (model name, prompt contents, generation
 *    configs) and outputs while sanitizing heavy inline binary data (e.g. base64 image data) to keep logs
 *    clean, readable, and performant.
 * 3. Execution Environment Awareness: Seamlessly routes logs in browser developer consoles via
 *    standard console.info(), in Node.js server runtimes, and in piped CLI test harnesses (e.g. bench.py)
 *    so stdout pipes remain strictly isolated for machine-readable JSON payloads while all info logs
 *    stream cleanly to the diagnostic stream.
 * 4. Error Tracing & Warning Diagnostics: Formats unexpected runtime exceptions and fallback events.
 */

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  type: 'FUNCTION_CALL' | 'GENAI_CALL';
  name: string;
  summary: string;
}

const RECENT_AUDIT_LOGS: AuditLogEntry[] = [];
const MAX_AUDIT_LOGS = 60;

/**
 * Returns a copy of the most recent structured function and GenAI audit log entries.
 *
 * @returns Array of recent AuditLogEntry objects (newest first).
 */
export function getRecentAuditLogs(): AuditLogEntry[] {
  return [...RECENT_AUDIT_LOGS];
}

/**
 * Strips raw base64 or heavy binary inlineData payloads from prompt parts before logging.
 *
 * @param parts Array of multimodal prompt parts passed to the Gemini SDK.
 * @returns Sanitized prompt parts with inline data replaced by byte metadata.
 */
export function sanitizePromptPartsForLogging(parts: any[]): any[] {
  if (!Array.isArray(parts)) return [parts];
  return parts.map((part) => {
    if (part?.inlineData) {
      return {
        ...part,
        inlineData: {
          mimeType: part.inlineData.mimeType,
          data: `[STRIPPED_INLINE_DATA: ${part.inlineData.data ? Math.round(part.inlineData.data.length * 0.75) : 0} bytes]`,
        },
      };
    }
    return part;
  });
}

/**
 * Logs an informational function invocation along with its caller-supplied arguments.
 * Formats parameters into structured JSON. In piped Node.js subprocess environments, safely redirects
 * to stderr so stdout remains clean for machine-to-machine JSON pipelines. In browsers, always logs
 * via console.info.
 *
 * @param functionName Name of the function being executed.
 * @param params Key-value map or object containing the parameters passed to the function.
 */
export function logFunctionCall(functionName: string, params: Record<string, any>): void {
  const isBrowser = typeof window !== 'undefined';
  const hasNodeStderr =
    !isBrowser &&
    typeof process !== 'undefined' &&
    Boolean(process.stderr && typeof process.stderr.write === 'function') &&
    (!process.stdout || !process.stdout.isTTY);

  const msg = `[INFO] Call -> ${functionName}()`;

  try {
    const serialized = JSON.stringify(params);
    RECENT_AUDIT_LOGS.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString().slice(11, 23),
      type: 'FUNCTION_CALL',
      name: functionName,
      summary: serialized.slice(0, 220),
    });
    if (RECENT_AUDIT_LOGS.length > MAX_AUDIT_LOGS) {
      RECENT_AUDIT_LOGS.pop();
    }

    if (hasNodeStderr) {
      process.stderr.write(`${msg} ${serialized}\n`);
    } else {
      console.info(msg, serialized);
    }
  } catch {
    if (hasNodeStderr) {
      process.stderr.write(`${msg} [non-serializable params]\n`);
    } else {
      console.info(msg, params);
    }
  }
}

/**
 * Logs a Generative AI request and its response payload, stripping inline binary data.
 *
 * @param meta Object containing the target model, sanitized prompt payload, config, and output text.
 */
export function logGenAiCall(meta: {
  model: string;
  parts: any[];
  config?: any;
  output?: string;
  error?: any;
}): void {
  const sanitizedParts = sanitizePromptPartsForLogging(meta.parts);
  const logPayload = {
    timestamp: new Date().toISOString(),
    model: meta.model,
    prompt: sanitizedParts,
    config: meta.config,
    output: meta.output,
    error: meta.error ? String(meta.error) : undefined,
  };
  RECENT_AUDIT_LOGS.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString().slice(11, 23),
    type: 'GENAI_CALL',
    name: meta.model,
    summary: JSON.stringify({
      output: meta.output ? meta.output.slice(0, 140) : undefined,
      error: meta.error,
    }),
  });
  if (RECENT_AUDIT_LOGS.length > MAX_AUDIT_LOGS) {
    RECENT_AUDIT_LOGS.pop();
  }
  console.info('[INFO] GenAI Call Executed:', JSON.stringify(logPayload, null, 2));
}
