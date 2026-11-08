import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download, Code2 } from 'lucide-react';

interface SourceFileItem {
  path: string;
  label: string;
  language: string;
  content: string;
}

interface SourceCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SourceCodeModal: React.FC<SourceCodeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [files, setFiles] = useState<SourceFileItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('src/App.tsx');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && files.length === 0) {
      fetch('/api/source-files')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data?.files) && data.files.length > 0) {
            setFiles(data.files);
            setSelectedPath(data.files[0].path);
          }
        })
        .catch((err) => console.error('Failed to load source files:', err));
    }
  }, [isOpen, files.length]);

  if (!isOpen) return null;

  const activeFile =
    files.find((f) => f.path === selectedPath) || files[0] || null;

  const handleCopy = async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadFile = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.path.split('/').pop() || 'source.tsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl h-[82vh] bg-[#221B16] border border-[#3E3127] rounded-[28px] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Top Modal Header */}
        <div className="px-6 py-4 bg-[#191410] border-b border-[#332820] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#2E241D] border border-[#45362C] flex items-center justify-center text-[#E57A54]">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#F7F2EB]">
                Aftershock Source Code
              </h2>
              <p className="text-xs text-[#9A897A]">
                Inspect, copy, or download the project source files
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFile && (
              <>
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
                      <span>Copy File</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownloadFile}
                  className="px-3.5 py-2 rounded-2xl bg-[#E57A54] hover:bg-[#eb8967] text-xs font-bold text-[#16110E] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-[#2A201A] hover:bg-[#382C24] text-[#B5A698] hover:text-[#F7F2EB] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* File Selector Tabs */}
        <div className="px-6 py-2.5 bg-[#1B1511] border-b border-[#332820] flex items-center gap-2 overflow-x-auto no-scrollbar">
          {files.map((file) => {
            const isSelected = file.path === selectedPath;
            return (
              <button
                key={file.path}
                onClick={() => setSelectedPath(file.path)}
                className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#332720] border-[#E57A54] text-[#F7F2EB]'
                    : 'bg-[#15100D] border-[#2C221B] text-[#9A897A] hover:text-[#F7F2EB]'
                }`}
              >
                {file.label}
              </button>
            );
          })}
        </div>

        {/* Code Viewer */}
        <div className="flex-1 overflow-auto p-6 bg-[#14100D] font-mono text-xs leading-relaxed text-[#E6DDD3]">
          {activeFile ? (
            <pre className="whitespace-pre overflow-x-auto">
              <code>{activeFile.content}</code>
            </pre>
          ) : (
            <div className="text-[#9A897A]">Loading source files...</div>
          )}
        </div>
      </div>
    </div>
  );
};
