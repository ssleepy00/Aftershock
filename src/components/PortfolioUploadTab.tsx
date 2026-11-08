/**
 * Portfolio Upload & Risk Overview Feature Component
 *
 * This feature component powers the primary portfolio ingestion and physical climate risk
 * assessment workflow in Aftershock.
 *
 * Feature Overview & Use Cases:
 * 1. Multimodal Portfolio Ingestion: Provides a drag-and-drop zone supporting brokerage
 *    screenshots (PNG/JPG), pie charts, CSV files, and plain text tables.
 * 2. Rapid Preset Evaluation: Offers one-click institutional presets (AI & Cloud Leaders,
 *    Coastal Grid & Data REITs, Fault-Line Hardware & Fabs) for instant exploration.
 * 3. Side-by-Side Executive Metrics: Displays current vs. risk-hedged performance cards
 *    (Exposure Score, Unpriced Risk Drag, Sharpe/Sortino ratios, Max Event Drawdowns).
 * 4. Interactive Donut Chart & Holdings Roster: Renders dynamic SVG allocation donuts and
 *    per-holding physical risk breakdowns with one-click transitions to the geographic map.
 * 5. Constrained Risk Hedging Toggle: Toggles between baseline and defensively rebalanced
 *    portfolio states honoring institutional turnover and delta caps.
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  StockRiskProfile,
  PORTFOLIO_PRESETS,
  STOCK_DATABASE,
  DYNAMIC_TICKER_PROFILES,
  registerDynamicStockProfile,
  buildPortfolioProfiles,
  computePortfolioMetrics,
  verifyPortfolioGuardrails,
  computeHoldingReasoningTraces,
  evaluateStressScenario,
  STRESS_SCENARIOS,
  StressScenarioDefinition,
  AgentStepTrace,
} from '../data/aftershockData';
import { logFunctionCall } from '../utils/logger';
import {
  Upload,
  Sparkles,
  ArrowRight,
  Flame,
  Waves,
  Check,
  Loader2,
  TrendingUp,
  Shield,
  Info,
  AlertTriangle,
  ShieldCheck,
  Calculator,
  Plus,
  Zap,
} from 'lucide-react';

export interface PortfolioUploadTabProps {
  portfolioName: string;
  setPortfolioName: (name: string) => void;
  profiles: StockRiskProfile[];
  setProfiles: (profiles: StockRiskProfile[]) => void;
  isHedged: boolean;
  setIsHedged: (hedged: boolean) => void;
  onGoToMap: (selectedTicker?: string) => void;
}

/**
 * Portfolio Upload & Assessment Tab Component.
 *
 * @param props Component properties containing portfolio state, setters, and map navigation handler.
 * @returns React element rendering upload dropzone, metrics summary, and holdings list.
 */
export const PortfolioUploadTab: React.FC<PortfolioUploadTabProps> = ({
  portfolioName,
  setPortfolioName,
  profiles,
  setProfiles,
  isHedged,
  setIsHedged,
  onGoToMap,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isHumanApproved, setIsHumanApproved] = useState<boolean>(false);
  const [activePresetId, setActivePresetId] = useState<string>('ai-cloud');
  const [showScoreTooltip, setShowScoreTooltip] = useState(false);
  const [pinnedScoreTooltip, setPinnedScoreTooltip] = useState(false);
  const [expandedTraceTicker, setExpandedTraceTicker] = useState<string | null>(null);
  const [selectedStressId, setSelectedStressId] =
    useState<StressScenarioDefinition['id']>('baseline');
  const [customTickerInput, setCustomTickerInput] = useState<string>('');
  const [customWeightInput, setCustomWeightInput] = useState<string>('15');
  const [isResolvingTicker, setIsResolvingTicker] = useState<boolean>(false);
  const [latestAgentTrace, setLatestAgentTrace] = useState<{
    ticker: string;
    steps: AgentStepTrace[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Keep holdings sorted by highest danger / most negative unpriced risk first
  const sortedProfiles = useMemo(
    () => [...profiles].sort((a, b) => a.unpricedRiskPct - b.unpricedRiskPct),
    [profiles]
  );

  const metrics = useMemo(() => computePortfolioMetrics(sortedProfiles), [sortedProfiles]);
  const guardrailCheck = useMemo(
    () => verifyPortfolioGuardrails(sortedProfiles),
    [sortedProfiles]
  );
  const reasoningTraces = useMemo(
    () => computeHoldingReasoningTraces(sortedProfiles),
    [sortedProfiles]
  );
  const stressEval = useMemo(
    () => evaluateStressScenario(sortedProfiles, selectedStressId),
    [sortedProfiles, selectedStressId]
  );

  const traceByTicker = useMemo(() => {
    const map: Record<string, (typeof reasoningTraces)[number]> = {};
    for (const t of reasoningTraces) {
      map[t.ticker] = t;
    }
    return map;
  }, [reasoningTraces]);

  const activeMetrics = isHedged ? metrics.hedged : metrics.current;
  const totalSites = sortedProfiles.reduce((sum, p) => sum + p.sites.length, 0);

  const sharpeDelta = Number(
    (metrics.hedged.sharpeRatio - metrics.current.sharpeRatio).toFixed(2)
  );
  const sortinoDelta = Number(
    (metrics.hedged.sortinoRatio - metrics.current.sortinoRatio).toFixed(2)
  );
  const mddImprovement = Number(
    Math.abs(metrics.current.maxDrawdownPct - metrics.hedged.maxDrawdownPct).toFixed(1)
  );
  const cvarImprovement = Number(
    Math.abs(metrics.current.tailCvar99Pct - metrics.hedged.tailCvar99Pct).toFixed(1)
  );
  const scoreImprovement =
    metrics.current.exposureScore - metrics.hedged.exposureScore;

  /**
   * Resolves any unseen stock ticker symbol via `/api/portfolio/resolve-unseen-ticker`
   * using the 5-step Agentic Stock Infrastructure Research & Verification Loop
   * before building the portfolio profiles.
   *
   * @param items Raw ticker and weight items.
   */
  const resolveUnseenTickersAndBuild = async (
    items: { ticker: string; weight: number }[]
  ): Promise<StockRiskProfile[]> => {
    logFunctionCall('resolveUnseenTickersAndBuild', { count: items.length });
    const unseen = items
      .map((i) => i.ticker.toUpperCase().trim())
      .filter((t) => !STOCK_DATABASE[t] && !DYNAMIC_TICKER_PROFILES[t]);

    if (unseen.length > 0) {
      await Promise.all(
        unseen.slice(0, 4).map(async (ticker) => {
          try {
            const resp = await fetch('/api/portfolio/resolve-unseen-ticker', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ticker }),
            });
            const data = await resp.json();
            if (resp.ok && data?.profile) {
              registerDynamicStockProfile(data.profile);
              if (Array.isArray(data.agentTrace)) {
                setLatestAgentTrace({ ticker, steps: data.agentTrace });
              }
            }
          } catch {
            // If offline or unconfigured, buildPortfolioProfiles uses deterministic fallback
          }
        })
      );
    }

    return buildPortfolioProfiles(items);
  };

  /**
   * Processes an uploaded file (screenshot, pie chart image, CSV, or text),
   * calls the backend vision/parser extraction endpoint, and updates portfolio state.
   *
   * @param file User-selected or dropped file object.
   */
  const handleFileProcess = async (file: File): Promise<void> => {
    logFunctionCall('handleFileProcess', { fileName: file.name, fileSize: file.size, fileType: file.type });
    setIsUploading(true);
    setUploadError(null);
    setIsHumanApproved(false);
    setActivePresetId('');

    try {
      let imageBase64: string | undefined;
      let mimeType: string | undefined;
      let textContent: string | undefined;

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        setUploadedPreviewUrl(dataUrl);
        imageBase64 = dataUrl.split(',')[1];
        mimeType = file.type;
      } else {
        setUploadedPreviewUrl(null);
        textContent = await file.text();
      }

      const response = await fetch('/api/portfolio/extract-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          textContent,
          fileName: file.name,
        }),
      });

      const data = await response.json();
      if (!response.ok || data?.error) {
        setUploadError(data?.error || 'Failed to extract portfolio from upload.');
        return;
      }
      if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
        setPortfolioName(data.portfolioName || file.name.replace(/\.[^/.]+$/, ''));
        const built = await resolveUnseenTickersAndBuild(data.items);
        setProfiles(built);
      } else {
        setUploadError('No valid portfolio tickers or weights detected in file.');
      }
    } catch (err) {
      console.error('Upload extraction error:', err);
      setUploadError('Network error while extracting portfolio upload.');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Adds any arbitrary (including unseen) stock ticker to the active portfolio,
   * dynamically resolving its US facilities via Gemini if not already in the database.
   *
   * @param e Form submission event.
   */
  const handleAddCustomTicker = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const cleanTicker = customTickerInput.toUpperCase().trim().replace(/[^A-Z.]/g, '');
    const weightVal = Number(customWeightInput) || 15;
    if (!cleanTicker) return;

    logFunctionCall('handleAddCustomTicker', { ticker: cleanTicker, weight: weightVal });
    setIsResolvingTicker(true);
    setUploadError(null);
    setIsHumanApproved(false);

    try {
      const existingItems = sortedProfiles
        .filter((p) => p.ticker !== cleanTicker)
        .map((p) => ({ ticker: p.ticker, weight: p.weight }));
      const combined = [...existingItems, { ticker: cleanTicker, weight: weightVal }];
      const built = await resolveUnseenTickersAndBuild(combined);
      setProfiles(built);
      setCustomTickerInput('');
      setExpandedTraceTicker(cleanTicker);
    } catch (err: any) {
      setUploadError(err?.message || `Failed to add ticker ${cleanTicker}`);
    } finally {
      setIsResolvingTicker(false);
    }
  };

  /**
   * Handles dropping a file onto the upload dropzone.
   *
   * @param e Drag event with transferred files.
   */
  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      logFunctionCall('handleDrop', { fileName: file.name });
      handleFileProcess(file);
    }
  };

  /**
   * Selects and loads one of the preconfigured institutional portfolio presets.
   *
   * @param presetId Unique identifier of the portfolio preset.
   */
  const handleSelectPreset = (presetId: string): void => {
    logFunctionCall('handleSelectPreset', { presetId });
    const found = PORTFOLIO_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePresetId(presetId);
    setUploadedPreviewUrl(null);
    setUploadError(null);
    setIsHumanApproved(false);
    setExpandedTraceTicker(null);
    setPortfolioName(found.label);
    setProfiles(buildPortfolioProfiles(found.items));
  };

  // SVG Donut chart segments
  let cumulativePercent = 0;
  const donutSegments = sortedProfiles.map((p) => {
    const w = isHedged ? p.hedgedWeight : p.weight;
    const start = cumulativePercent;
    cumulativePercent += w;
    return {
      ...p,
      activeWeight: w,
      start,
    };
  });

  const isScoreOpen = showScoreTooltip || pinnedScoreTooltip;
  const bd = activeMetrics.scoreBreakdown;

  return (
    <div className="space-y-6">
      {/* Main 2-Column Compact Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (5 cols): Drop Screenshot / Pie Chart + Visual Donut with Exposure Score */}
        <div className="lg:col-span-5 bg-[#221B16] border border-[#382C24] rounded-[28px] p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#F7F2EB] tracking-tight">
                  Drop Portfolio Snapshot
                </h2>
                <p className="text-xs text-[#A8988A] mt-0.5">
                  Screenshot, pie chart, or brokerage CSV
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#2E241D] border border-[#42342B] text-[11px] font-medium text-[#D6C7B8]">
                Vision AI Ready
              </span>
            </div>

            {/* Interactive Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-[22px] border-2 border-dashed transition-all p-6 text-center flex flex-col items-center justify-center min-h-[190px] ${
                isDragging
                  ? 'border-[#E57A54] bg-[#2E231C]'
                  : 'border-[#46372D] bg-[#1B1511]/80 hover:border-[#695244] hover:bg-[#261E18]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.csv,.txt,.tsv,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.currentTarget.value = '';
                  if (file) handleFileProcess(file);
                }}
              />

              {isUploading ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#E57A54]/20 flex items-center justify-center text-[#E57A54]">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <div className="text-sm font-semibold text-[#F7F2EB]">
                    Reading portfolio chart...
                  </div>
                </div>
              ) : uploadedPreviewUrl ? (
                <div className="flex items-center gap-4 w-full text-left">
                  <img
                    src={uploadedPreviewUrl}
                    alt="Uploaded portfolio"
                    className="w-24 h-24 object-cover rounded-2xl border border-[#46372D] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#52B788]/15 text-[#52B788] text-[11px] font-semibold mb-1.5">
                      <Check className="w-3 h-3" /> Extracted
                    </div>
                    <div className="text-sm font-bold text-[#F7F2EB] truncate">
                      {portfolioName}
                    </div>
                    <div className="text-xs text-[#A8988A] mt-1">
                      {sortedProfiles.length} stocks · {totalSites} US facilities mapped
                    </div>
                    <div className="text-[11px] text-[#E57A54] font-medium mt-2">
                      Click to upload another screenshot
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-[#2E241D] border border-[#45362C] flex items-center justify-center text-[#E57A54] mb-3 shadow-inner">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-semibold text-[#F7F2EB]">
                    Drop a pie chart or screenshot here
                  </div>
                  <div className="text-xs text-[#A8988A] mt-1">
                    PNG, JPG, WebP, or CSV — we extract tickers &amp; weights automatically
                  </div>
                </>
              )}
            </div>

            {uploadError && (
              <div className="mt-3 p-3 rounded-2xl bg-[#F25C54]/15 border border-[#F25C54]/40 flex items-start gap-2.5 text-xs text-[#F7F2EB]">
                <AlertTriangle className="w-4 h-4 text-[#F25C54] shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Instant Sample Presets */}
            <div className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8C7A6B] mb-2">
                Or try a snapshot
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PORTFOLIO_PRESETS.map((preset) => {
                  const isActive = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`p-2.5 rounded-2xl text-left transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-[#332720] border-[#E57A54] text-[#F7F2EB]'
                          : 'bg-[#1B1511] border-[#332820] text-[#B5A698] hover:bg-[#28201A]'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{preset.label}</div>
                      <div className="text-[10px] text-[#8C7A6B] truncate mt-0.5">
                        {preset.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Unseen Ticker Tester (Out-of-Sample Equity Resolution) */}
            <div className="mt-3.5 p-3.5 rounded-2xl bg-[#191410] border border-[#332820] space-y-2.5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#E57A54] uppercase tracking-wider">
                    Out-of-Sample Unseen Ticker Tester
                  </span>
                  <span className="text-[10px] font-mono text-[#52B788] bg-[#52B788]/10 px-2 py-0.5 rounded-md border border-[#52B788]/30">
                    Live SEC EDGAR + FEMA/USGS Agent
                  </span>
                </div>
                <p className="text-[11px] text-[#A8988A] mt-1 leading-relaxed">
                  Test any stock symbol outside the 14 pre-indexed equities (e.g., <code className="text-[#F7F2EB] font-mono">PLD</code>, <code className="text-[#F7F2EB] font-mono">VST</code>, <code className="text-[#F7F2EB] font-mono">TSM</code>). Clicking <strong>Agent Resolve</strong> triggers a 5-step agentic loop that queries live SEC EDGAR filings, geolocates 3 primary physical facilities, cross-references county-level FEMA NRI &amp; USGS seismic hazard tables, and runs deterministic waterfilling math to rebalance your portfolio.
                </p>
              </div>

              <form
                onSubmit={handleAddCustomTicker}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  type="text"
                  value={customTickerInput}
                  onChange={(e) => setCustomTickerInput(e.target.value)}
                  placeholder="Test unseen ticker (e.g. TSM, PLD, VST)"
                  className="flex-1 min-w-0 bg-[#14100C] border border-[#382C24] rounded-xl px-3 py-1.5 text-xs text-[#F7F2EB] placeholder-[#7D6B5D] focus:outline-none focus:border-[#E57A54]"
                />
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={customWeightInput}
                  onChange={(e) => setCustomWeightInput(e.target.value)}
                  className="w-14 bg-[#14100C] border border-[#382C24] rounded-xl px-2 py-1.5 text-xs font-mono text-center text-[#F7F2EB] focus:outline-none focus:border-[#E57A54]"
                  title="Target allocation weight (%)"
                />
                <button
                  type="submit"
                  disabled={isResolvingTicker || !customTickerInput.trim()}
                  className="px-3 py-1.5 rounded-xl bg-[#2E241D] hover:bg-[#3D3027] disabled:opacity-50 border border-[#4D3C31] text-xs font-bold text-[#E57A54] flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {isResolvingTicker ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Agent Resolve</span>
                </button>
              </form>
            </div>

            {/* Multi-Step Agentic Stock Research & Verification Loop Trace */}
            {latestAgentTrace && (
              <div className="mt-3 p-3 rounded-2xl bg-[#16110E] border border-[#3E3026] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#E57A54]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#52B788]" />
                    <span>
                      5-Step Agentic Research Loop ({latestAgentTrace.ticker})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLatestAgentTrace(null)}
                    className="text-[10px] text-[#8C7A6B] hover:text-[#F7F2EB] cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="space-y-1.5">
                  {latestAgentTrace.steps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="p-2 rounded-xl bg-[#1F1814] border border-[#31261F] text-[10px]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#F7F2EB]">
                          {step.stepNumber}. {step.title}
                        </span>
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#2B211B] text-[#52B788]">
                          {step.toolName}
                        </span>
                      </div>
                      <div className="text-[#A8988A] mt-0.5">{step.outputSummary}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Donut Preview Footer with Portfolio Exposure Score (/100) */}
          <div className="mt-6 pt-5 border-t border-[#332820] flex items-center justify-between gap-4 relative">
            {/* Hover / Click Justification Popover */}
            {isScoreOpen && (
              <div className="absolute bottom-24 left-0 z-30 w-80 p-4 rounded-2xl bg-[#191410] border border-[#4D3C31] shadow-2xl text-xs">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#332820]">
                  <span className="font-bold text-[#F7F2EB]">
                    Exposure Score Breakdown
                  </span>
                  <span
                    className={`font-mono font-extrabold px-2 py-0.5 rounded-lg ${
                      activeMetrics.exposureScore >= 70
                        ? 'bg-[#F25C54]/20 text-[#F25C54]'
                        : 'bg-[#F4A261]/20 text-[#F4A261]'
                    }`}
                  >
                    {activeMetrics.exposureScore} / 100
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#B5A698]">Data Centers &amp; Cloud</span>
                    <span className="font-mono font-bold text-[#F7F2EB]">
                      +{bd.dataCenterPts} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#B5A698]">Power Supply &amp; Grid</span>
                    <span className="font-mono font-bold text-[#F7F2EB]">
                      +{bd.powerSupplyPts} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#B5A698]">Corporate HQ &amp; R&amp;D</span>
                    <span className="font-mono font-bold text-[#F7F2EB]">
                      +{bd.hqPts} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#B5A698]">Wafer Fabs &amp; Plants</span>
                    <span className="font-mono font-bold text-[#F7F2EB]">
                      +{bd.fabPts} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#2C221B]">
                    <span className="text-[#E57A54]">Fault / Storm Corridor Overlap</span>
                    <span className="font-mono font-bold text-[#E57A54]">
                      +{bd.corridorPenaltyPts} pts
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-[#2C221B] text-[10px] text-[#9A897A]">
                  <span className="text-[#D6C7B8] font-semibold">Top Drivers: </span>
                  {bd.topDrivers.join(' · ')}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              {/* Donut Chart with Exposure Score (/100) in Center */}
              <div
                onMouseEnter={() => setShowScoreTooltip(true)}
                onMouseLeave={() => setShowScoreTooltip(false)}
                onClick={() => setPinnedScoreTooltip((prev) => !prev)}
                className="relative w-22 h-22 shrink-0 cursor-pointer group"
                title="Hover or click to view Exposure Score justification"
              >
                <svg viewBox="0 0 36 36" className="w-22 h-22 -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="transparent"
                    stroke="#2E241D"
                    strokeWidth="4.5"
                  />
                  {donutSegments.map((seg) => {
                    const circumference = 2 * Math.PI * 14;
                    const strokeDasharray = `${(seg.activeWeight / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -((seg.start / 100) * circumference);
                    return (
                      <circle
                        key={seg.ticker}
                        cx="18"
                        cy="18"
                        r="14"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="4.5"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500"
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full group-hover:bg-[#2E241D]/60 transition-colors">
                  <span className="font-mono text-sm font-extrabold text-[#F25C54] leading-none tabular-nums">
                    {activeMetrics.exposureScore}
                    <span className="text-[9px] text-[#A8988A] font-normal">/100</span>
                  </span>
                  <span className="text-[8px] uppercase tracking-wider text-[#B5A698] mt-0.5 flex items-center gap-0.5">
                    Risk <Info className="w-2.5 h-2.5 text-[#E57A54]" />
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#A8988A]">Active Portfolio</span>
                  {isHedged && scoreImprovement > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#52B788]/15 text-[#52B788] font-mono text-[10px] font-bold">
                      -{scoreImprovement} pts risk
                    </span>
                  )}
                </div>
                <div className="text-base font-bold text-[#F7F2EB]">{portfolioName}</div>
                <div className="text-xs text-[#A8988A] mt-0.5">
                  {totalSites} Sites (HQ, Power Supply, Data Centers &amp; Fabs)
                </div>
              </div>
            </div>

            <button
              onClick={() => onGoToMap()}
              className="px-4 py-2.5 rounded-2xl bg-[#E57A54] hover:bg-[#eb8967] text-[#16110E] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-md"
            >
              <span>View Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column (7 cols): Portfolio Comparison Metrics + Sorted Holdings */}
        <div className="lg:col-span-7 bg-[#221B16] border border-[#382C24] rounded-[28px] p-6 flex flex-col justify-between shadow-xl">
          <div>
            {/* Top Header & Bubbly Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#332820]">
              <div>
                <div className="text-xs text-[#A8988A] font-medium">
                  {isHedged
                    ? 'Unpriced Disaster Risk (Net of Tx Costs)'
                    : 'Unpriced Disaster Risk'}
                </div>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <span className="font-mono text-2xl font-extrabold text-[#F25C54] tabular-nums">
                    {activeMetrics.unpricedRiskPct.toFixed(2)}%
                  </span>
                  {isHedged && (
                    <>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#52B788]/15 text-[#52B788] font-mono text-xs font-semibold">
                        +{Math.abs(metrics.current.unpricedRiskPct - metrics.hedged.unpricedRiskPct).toFixed(2)}% net protected
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#2E241D] text-[#B5A698] font-mono text-[11px]">
                        Tx Cost: -{metrics.hedged.transactionCostPct.toFixed(2)}% ({metrics.hedged.turnoverPct}% turnover)
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Bubbly Auto-Hedge Toggle */}
              <div className="flex items-center bg-[#18130F] p-1.5 rounded-2xl border border-[#362B22]">
                <button
                  onClick={() => setIsHedged(false)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !isHedged
                      ? 'bg-[#2E241D] text-[#F7F2EB] shadow'
                      : 'text-[#9A897A] hover:text-[#F7F2EB]'
                  }`}
                >
                  Current Weights
                </button>
                <button
                  onClick={() => setIsHedged(true)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isHedged
                      ? 'bg-[#52B788] text-[#16110E] shadow'
                      : 'text-[#9A897A] hover:text-[#F7F2EB]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Risk-Hedged</span>
                </button>
              </div>
            </div>

            {/* Deterministic Guardrail Verification & Human Approval Gate */}
            {isHedged && (
              <div className="mt-3 p-3 rounded-2xl bg-[#191410] border border-[#362B22] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 font-bold text-[#52B788]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {guardrailCheck.allChecksPassed
                      ? 'Guardrails Verified'
                      : 'Guardrail Check'}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-[#241C16] border border-[#382C24] font-mono text-[#D6C7B8]">
                    Max Shift: {guardrailCheck.maxSingleStockDeltaPts.toFixed(1)}/5.0 pts
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-[#241C16] border border-[#382C24] font-mono text-[#D6C7B8]">
                    Turnover: {guardrailCheck.oneWayTurnoverPct.toFixed(1)}%/15.0%
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-[#241C16] border border-[#382C24] font-mono text-[#D6C7B8]">
                    Total Weight: {guardrailCheck.hedgedWeightSumPct.toFixed(1)}%
                  </span>
                </div>

                <button
                  onClick={() => {
                    logFunctionCall('toggleHumanApprovalGate', {
                      portfolioName,
                      approved: !isHumanApproved,
                      guardrailCheck,
                    });
                    setIsHumanApproved((prev) => !prev);
                  }}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isHumanApproved
                      ? 'bg-[#52B788]/20 border-[#52B788] text-[#52B788]'
                      : 'bg-[#2E241D] border-[#4A3A2F] text-[#F7F2EB] hover:border-[#E57A54]'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>
                    {isHumanApproved
                      ? 'Human Approved · Advisory Only (No Auto-Trade)'
                      : 'Approve Hedged Proposal (Human Gate)'}
                  </span>
                </button>
              </div>
            )}

            {/* Interactive Physical Catastrophe Stress-Test Simulator */}
            <div className="mt-3 p-3 rounded-2xl bg-[#191410] border border-[#31261F]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#D6C7B8]">
                  <Zap className="w-3.5 h-3.5 text-[#F4A261]" />
                  <span>Catastrophe Stress Simulator:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {STRESS_SCENARIOS.map((sc) => {
                    const active = selectedStressId === sc.id;
                    return (
                      <button
                        key={sc.id}
                        onClick={() => setSelectedStressId(sc.id)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer border ${
                          active
                            ? 'bg-[#E57A54]/20 border-[#E57A54] text-[#F7F2EB]'
                            : 'bg-[#221B16] border-[#332820] text-[#9A897A] hover:text-[#F7F2EB]'
                        }`}
                      >
                        {sc.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedStressId !== 'baseline' && (
                <div className="mt-2 pt-2 border-t border-[#2C221B] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-[#A8988A]">
                    <strong className="text-[#F7F2EB]">{stressEval.scenario.agencyReference}:</strong>{' '}
                    Current Shock <strong className="font-mono text-[#F25C54]">{stressEval.currentShockLossPct}%</strong> → Hedged Shock{' '}
                    <strong className="font-mono text-[#52B788]">{stressEval.hedgedShockLossPct}%</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-[#52B788]/15 text-[#52B788] font-mono font-bold">
                    +{stressEval.netShockProtectionBps} bps tail protection
                  </span>
                </div>
              )}
            </div>

            {/* Quantitative Metrics Strip (Normal on Current Weights, New + Difference on Risk-Hedged) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
              {/* 1. Sharpe Ratio */}
              <div className="p-3 rounded-2xl bg-[#191410] border border-[#31261F]">
                <div className="flex items-center justify-between text-[11px] text-[#9A897A]">
                  <span>Sharpe Ratio</span>
                  <TrendingUp className={`w-3 h-3 ${isHedged ? 'text-[#52B788]' : 'text-[#8C7A6B]'}`} />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5 font-mono">
                  <span className="text-base font-extrabold text-[#F7F2EB] tabular-nums">
                    {activeMetrics.sharpeRatio.toFixed(2)}
                  </span>
                </div>
                {isHedged && (
                  <div className="text-[10px] font-mono font-bold text-[#52B788] mt-0.5">
                    {sharpeDelta >= 0 ? `+${sharpeDelta}` : sharpeDelta} vs {metrics.current.sharpeRatio.toFixed(2)} (net)
                  </div>
                )}
              </div>

              {/* 2. Max Drawdown */}
              <div className="p-3 rounded-2xl bg-[#191410] border border-[#31261F]">
                <div className="flex items-center justify-between text-[11px] text-[#9A897A]">
                  <span>Max Drawdown</span>
                  <Shield className={`w-3 h-3 ${isHedged ? 'text-[#52B788]' : 'text-[#8C7A6B]'}`} />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5 font-mono">
                  <span className="text-base font-extrabold text-[#F7F2EB] tabular-nums">
                    {activeMetrics.maxDrawdownPct.toFixed(1)}%
                  </span>
                </div>
                {isHedged && (
                  <div className="text-[10px] font-mono font-bold text-[#52B788] mt-0.5">
                    +{mddImprovement}% from {metrics.current.maxDrawdownPct.toFixed(1)}%
                  </div>
                )}
              </div>

              {/* 3. Sortino Ratio */}
              <div className="p-3 rounded-2xl bg-[#191410] border border-[#31261F]">
                <div className="flex items-center justify-between text-[11px] text-[#9A897A]">
                  <span>Sortino Ratio</span>
                  <TrendingUp className={`w-3 h-3 ${isHedged ? 'text-[#52B788]' : 'text-[#8C7A6B]'}`} />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5 font-mono">
                  <span className="text-base font-extrabold text-[#F7F2EB] tabular-nums">
                    {activeMetrics.sortinoRatio.toFixed(2)}
                  </span>
                </div>
                {isHedged && (
                  <div className="text-[10px] font-mono font-bold text-[#52B788] mt-0.5">
                    +{sortinoDelta} vs {metrics.current.sortinoRatio.toFixed(2)} (net)
                  </div>
                )}
              </div>

              {/* 4. 99% Tail Shock (CVaR) */}
              <div className="p-3 rounded-2xl bg-[#191410] border border-[#31261F]">
                <div className="flex items-center justify-between text-[11px] text-[#9A897A]">
                  <span>99% Tail CVaR</span>
                  <Shield className={`w-3 h-3 ${isHedged ? 'text-[#52B788]' : 'text-[#8C7A6B]'}`} />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5 font-mono">
                  <span className="text-base font-extrabold text-[#F7F2EB] tabular-nums">
                    {activeMetrics.tailCvar99Pct.toFixed(1)}%
                  </span>
                </div>
                {isHedged && (
                  <div className="text-[10px] font-mono font-bold text-[#52B788] mt-0.5">
                    +{cvarImprovement}% from {metrics.current.tailCvar99Pct.toFixed(1)}%
                  </div>
                )}
              </div>
            </div>

            {/* Sorted Holdings List (Sorted by Highest Risk Exposure) */}
            <div className="space-y-2">
              {sortedProfiles.map((stock, rankIdx) => {
                const displayWeight = isHedged ? stock.hedgedWeight : stock.weight;
                const weightDiff = Number((stock.hedgedWeight - stock.weight).toFixed(1));
                const isHurricane = stock.primaryHazard === 'Hurricane';
                const uniqueCategories = Array.from(
                  new Set(stock.sites.map((s) => s.category))
                ).join(' · ');
                const trace = traceByTicker[stock.ticker];
                const isTraceOpen = expandedTraceTicker === stock.ticker;

                return (
                  <div
                    key={stock.ticker}
                    className="rounded-2xl bg-[#1A1410] border border-[#31261F] hover:border-[#4D3C31] transition-all overflow-hidden"
                  >
                    <div
                      onClick={() => onGoToMap(stock.ticker)}
                      className="p-3 hover:bg-[#281F19] transition-all cursor-pointer flex items-center justify-between gap-4"
                    >
                      {/* Left: Rank + Ticker + Company + Threat Badge */}
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <span className="font-mono text-[11px] font-bold text-[#7D6B5D] w-4">
                          #{rankIdx + 1}
                        </span>
                        <div
                          className="w-9 h-9 rounded-2xl flex items-center justify-center font-mono text-xs font-extrabold text-[#16110E] shrink-0"
                          style={{ backgroundColor: stock.color }}
                        >
                          {stock.ticker}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#F7F2EB]">
                              {stock.company}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                isHurricane
                                  ? 'bg-[#F4A261]/15 text-[#F4A261]'
                                  : 'bg-[#E57A54]/15 text-[#E57A54]'
                              }`}
                            >
                              {isHurricane ? (
                                <Waves className="w-2.5 h-2.5" />
                              ) : (
                                <Flame className="w-2.5 h-2.5" />
                              )}
                              {stock.primaryHazard}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#9A897A] mt-0.5">
                            Score <strong className="text-[#D6C7B8] font-mono">{stock.exposureScore}/100</strong> · {uniqueCategories}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Allocation Bar */}
                      <div className="flex-1 max-w-[190px] hidden sm:block">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#9A897A]">
                            {isHedged ? 'Hedged' : 'Current'}
                          </span>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="font-bold text-[#F7F2EB] tabular-nums">
                              {displayWeight.toFixed(1)}%
                            </span>
                            {isHedged && weightDiff !== 0 && (
                              <span
                                className={`text-[10px] font-semibold ${
                                  weightDiff > 0 ? 'text-[#52B788]' : 'text-[#F4A261]'
                                }`}
                              >
                                ({weightDiff > 0 ? `+${weightDiff}%` : `${weightDiff}%`})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-[#2A201A] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, displayWeight * 2.5)}%`,
                              backgroundColor: stock.color,
                            }}
                          />
                        </div>
                      </div>

                      {/* Right: Trace Math Button + Unpriced Risk % in Red */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedTraceTicker(
                              isTraceOpen ? null : stock.ticker
                            );
                          }}
                          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            isTraceOpen
                              ? 'bg-[#E57A54] border-[#E57A54] text-[#16110E]'
                              : 'bg-[#241C16] border-[#3D3027] text-[#D6C7B8] hover:border-[#E57A54]'
                          }`}
                          title="Inspect verifiable math & facility rollup behind this stock's recommendation"
                        >
                          <Calculator className="w-3 h-3" />
                          <span>Trace Math</span>
                        </button>

                        <div className="text-right">
                          <div className="inline-flex items-center px-3 py-1 rounded-xl bg-[#F25C54]/15 border border-[#F25C54]/30 font-mono text-sm font-bold text-[#F25C54] tabular-nums">
                            {stock.unpricedRiskPct.toFixed(1)}%
                          </div>
                          <div className="text-[10px] text-[#8C7A6B] mt-0.5">
                            unpriced risk
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Traceable Reasoning & Calculation Audit Drawer */}
                    {isTraceOpen && trace && (
                      <div className="px-4 py-3.5 bg-[#14100C] border-t border-[#2E241D] text-xs space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-[#E57A54] flex items-center gap-1.5">
                            <Calculator className="w-3.5 h-3.5" />
                            Traceable Calculation Audit — {stock.ticker} ({stock.company})
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold ${
                              trace.classification === 'OVER_EXPOSED_TRIM'
                                ? 'bg-[#F4A261]/15 text-[#F4A261]'
                                : trace.classification === 'RESILIENT_BUFFER_ADD'
                                ? 'bg-[#52B788]/15 text-[#52B788]'
                                : 'bg-[#2E241D] text-[#B5A698]'
                            }`}
                          >
                            {trace.classification} · Priority Share: {trace.prioritySharePct}%
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#1C1612] border border-[#2E241D] font-mono text-[11px] text-[#D6C7B8] space-y-1">
                          <div>
                            <strong className="text-[#F7F2EB]">1. Facility Hazard Rollup:</strong>{' '}
                            {trace.facilityRollupFormula}
                          </div>
                          <div>
                            <strong className="text-[#F7F2EB]">2. Bounded Waterfilling Hedge:</strong>{' '}
                            {trace.hedgeAllocationFormula}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {trace.siteContributions.map((sc) => (
                            <div
                              key={sc.siteName}
                              className="p-2 rounded-xl bg-[#1C1612] border border-[#2C221B] text-[11px]"
                            >
                              <div className="font-bold text-[#F7F2EB] truncate">
                                {sc.siteName}
                              </div>
                              <div className="text-[#9A897A] text-[10px]">
                                {sc.location} · {sc.category} ({sc.hazard})
                              </div>
                              <div className="mt-1 font-mono text-[10px] text-[#F4A261]">
                                Impact: {sc.unpricedImpactPct}% ({sc.shareOfStockRiskPct}% of stock drag · +{sc.categoryPointsEarned} score pts)
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Summary Bar */}
          <div className="mt-4 pt-3.5 border-t border-[#332820] flex items-center justify-between text-xs text-[#A8988A]">
            <span>Sorted by highest unpriced disaster risk · Click &quot;Trace Math&quot; to verify equations or click any stock to inspect US sites</span>
          </div>
        </div>
      </div>
    </div>
  );
};
