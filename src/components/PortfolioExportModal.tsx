/**
 * Portfolio Risk Export Modal Component
 *
 * This feature component provides an interactive modal dialog enabling institutional users
 * to inspect, copy, and download the full portfolio risk evaluation, individual stock profiles,
 * and critical US infrastructure site inventories across Markdown, CSV, and JSON formats.
 *
 * Feature Overview & Use Cases:
 * 1. Multi-Format Selection: Allows switching among executive Markdown (.md), tabular CSV (.csv),
 *    and programmatic structured JSON (.json) previews.
 * 2. Instant Clipboard Copying: Enables one-click copying to clipboard with visual confirmation feedback.
 * 3. Native File Downloads: Dispatches sanitized, client-side browser file downloads.
 * 4. Transparent Presentation: Exposes all underlying metrics, score point justifications, and
 *    open federal data source citations.
 */

import React, { useState, useMemo } from 'react';
import { X, Copy, Check, Download, FileText, FileSpreadsheet, Braces } from 'lucide-react';
import {
  StockRiskProfile,
  PortfolioMetricsComparison,
} from '../data/aftershockData';
import { generatePortfolioMarkdownReport } from '../features/export/markdownExporter';
import { generatePortfolioCsv } from '../features/export/csvExporter';
import { generatePortfolioJson } from '../features/export/jsonExporter';
import { downloadFileBlob } from '../features/export/fileDownloader';
import { logFunctionCall } from '../utils/logger';

export type ExportFormat = 'markdown' | 'json' | 'csv';

export interface PortfolioExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioName: string;
  profiles: StockRiskProfile[];
  metrics: PortfolioMetricsComparison;
  isHedged: boolean;
}

/**
 * Interactive modal dialog for exporting portfolio risk evaluation data.
 *
 * @param props Component properties containing modal visibility, close handler, and evaluation state.
 * @returns React modal element or null when closed.
 */
export const PortfolioExportModal: React.FC<PortfolioExportModalProps> = ({
  isOpen,
  onClose,
  portfolioName,
  profiles,
  metrics,
  isHedged,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [copied, setCopied] = useState(false);

  // Generate Markdown report via modular feature
  const markdownContent = useMemo(() => {
    return generatePortfolioMarkdownReport(portfolioName, profiles, metrics, isHedged);
  }, [portfolioName, profiles, metrics, isHedged]);

  // Generate CSV table via modular feature
  const csvContent = useMemo(() => {
    return generatePortfolioCsv(portfolioName, profiles, metrics, isHedged);
  }, [portfolioName, profiles, metrics, isHedged]);

  // Generate JSON payload via modular feature
  const jsonContent = useMemo(() => {
    return generatePortfolioJson(portfolioName, profiles, metrics, isHedged);
  }, [portfolioName, profiles, metrics, isHedged]);

  const activeContent =
    selectedFormat === 'markdown'
      ? markdownContent
      : selectedFormat === 'json'
        ? jsonContent
        : csvContent;

  const fileExtension =
    selectedFormat === 'markdown'
      ? 'md'
      : selectedFormat === 'json'
        ? 'json'
        : 'csv';

  const mimeType =
    selectedFormat === 'markdown'
      ? 'text/markdown;charset=utf-8'
      : selectedFormat === 'json'
        ? 'application/json;charset=utf-8'
        : 'text/csv;charset=utf-8';

  /**
   * Copies the active formatted report content to the system clipboard.
   */
  const handleCopy = async (): Promise<void> => {
    logFunctionCall('handleCopyExport', { format: selectedFormat, length: activeContent.length });
    await navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  /**
   * Downloads the active formatted report as a local file.
   */
  const handleDownload = (): void => {
    const cleanName = portfolioName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const fileName = `aftershock-risk-evaluation-${cleanName}.${fileExtension}`;
    logFunctionCall('handleDownloadExport', { fileName, mimeType });
    downloadFileBlob(activeContent, fileName, mimeType);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl h-[84vh] bg-[#221B16] border border-[#3E3127] rounded-[28px] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-[#191410] border-b border-[#332820] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#2E241D] border border-[#45362C] flex items-center justify-center text-[#E57A54]">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#F7F2EB]">
                Export Portfolio Risk Evaluation
              </h2>
              <p className="text-xs text-[#9A897A]">
                Download or copy all portfolio metrics, exposure scores, and US site data
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-2xl bg-[#2E241D] hover:bg-[#3A2E25] border border-[#45362C] text-xs font-bold text-[#F7F2EB] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#52B788]" />
                  <span className="text-[#52B788]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#E57A54]" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-2 rounded-2xl bg-[#E57A54] hover:bg-[#eb8967] text-xs font-bold text-[#16110E] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .{fileExtension}</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-[#2A201A] hover:bg-[#382C24] text-[#B5A698] hover:text-[#F7F2EB] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Format Selector Pills */}
        <div className="px-6 py-2.5 bg-[#1B1511] border-b border-[#332820] flex items-center gap-2">
          <button
            onClick={() => {
              logFunctionCall('selectExportFormat', { format: 'markdown' });
              setSelectedFormat('markdown');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              selectedFormat === 'markdown'
                ? 'bg-[#332720] border-[#E57A54] text-[#F7F2EB]'
                : 'bg-[#15100D] border-[#2C221B] text-[#9A897A] hover:text-[#F7F2EB]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#E57A54]" />
            <span>Markdown (.md)</span>
          </button>
          <button
            onClick={() => {
              logFunctionCall('selectExportFormat', { format: 'csv' });
              setSelectedFormat('csv');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              selectedFormat === 'csv'
                ? 'bg-[#332720] border-[#E57A54] text-[#F7F2EB]'
                : 'bg-[#15100D] border-[#2C221B] text-[#9A897A] hover:text-[#F7F2EB]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#52B788]" />
            <span>CSV Table (.csv)</span>
          </button>
          <button
            onClick={() => {
              logFunctionCall('selectExportFormat', { format: 'json' });
              setSelectedFormat('json');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              selectedFormat === 'json'
                ? 'bg-[#332720] border-[#E57A54] text-[#F7F2EB]'
                : 'bg-[#15100D] border-[#2C221B] text-[#9A897A] hover:text-[#F7F2EB]'
            }`}
          >
            <Braces className="w-3.5 h-3.5 text-[#F4A261]" />
            <span>Structured JSON (.json)</span>
          </button>
        </div>

        {/* Content Preview Box */}
        <div className="flex-1 overflow-auto p-6 bg-[#14100D] font-mono text-xs leading-relaxed text-[#E6DDD3]">
          <pre className="whitespace-pre overflow-x-auto">
            <code>{activeContent}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
