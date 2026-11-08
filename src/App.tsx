/**
 * Aftershock Main Application Shell
 *
 * This is the root presentation and coordination layer for Aftershock, orchestrating
 * portfolio risk analysis, US physical infrastructure cartography, and multi-format reporting.
 *
 * Feature Overview & Use Cases:
 * 1. Global Navigation & View Switcher: Toggles seamlessly between the Portfolio Risk Assessment
 *    workspace and the interactive US Infrastructure Map view.
 * 2. Shared Portfolio State Management: Maintains active equity holdings, hedged allocations,
 *    and portfolio naming across components and modalities.
 * 3. Sticky Header Telemetry: Continuously surfaces high-level exposure score (/100) and unpriced
 *    disaster risk drag (%) in the primary navigation bar.
 * 4. Multi-Format Export Orchestration: Provides global access to the export modal, allowing
 *    instant report generation in Markdown, CSV, and JSON.
 * 5. Deep-Link Navigation: Facilitates seamless transitions from individual portfolio stock cards
 *    directly to focused facility markers on the US map.
 */

import React, { useState, useMemo } from 'react';
import {
  PORTFOLIO_PRESETS,
  buildPortfolioProfiles,
  computePortfolioMetrics,
  StockRiskProfile,
} from './data/aftershockData';
import { PortfolioUploadTab } from './components/PortfolioUploadTab';
import { USInfrastructureMapTab } from './components/USInfrastructureMapTab';
import { PortfolioExportModal } from './components/PortfolioExportModal';
import { logFunctionCall } from './utils/logger';
import { Download } from 'lucide-react';

export type TabId = 'portfolio' | 'map';

/**
 * Root Application Component.
 * Manages top-level routing, portfolio state, hedging toggles, and modal dialogs.
 *
 * @returns Complete application UI view.
 */
export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('portfolio');
  const [portfolioName, setPortfolioName] = useState<string>(
    PORTFOLIO_PRESETS[0].label
  );
  const [profiles, setProfiles] = useState<StockRiskProfile[]>(() =>
    buildPortfolioProfiles(PORTFOLIO_PRESETS[0].items)
  );
  const [isHedged, setIsHedged] = useState<boolean>(false);
  const [focusedTicker, setFocusedTicker] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const metrics = useMemo(() => computePortfolioMetrics(profiles), [profiles]);
  const activeSnapshot = isHedged ? metrics.hedged : metrics.current;

  /**
   * Switches view to the US Infrastructure Map focused on a designated stock ticker.
   *
   * @param ticker Optional stock ticker to spotlight on the map (e.g. NVDA, EQIX).
   */
  const handleGoToMap = (ticker?: string): void => {
    logFunctionCall('handleGoToMap', { ticker: ticker || 'none' });
    setFocusedTicker(ticker || null);
    setActiveTab('map');
  };

  /**
   * Switches the active top-level tab between portfolio overview and US map.
   *
   * @param tab Target tab identifier.
   */
  const handleTabSwitch = (tab: TabId): void => {
    logFunctionCall('handleTabSwitch', { tab });
    setActiveTab(tab);
  };

  /**
   * Toggles the portfolio export modal dialog.
   *
   * @param open Whether the export modal should be displayed.
   */
  const handleToggleExport = (open: boolean): void => {
    logFunctionCall('handleToggleExport', { open });
    setIsExportOpen(open);
  };

  return (
    <div className="min-h-screen bg-[#16110E] text-[#F7F2EB] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#16110E]/90 backdrop-blur-xl border-b border-[#2D231C]">
        <div className="max-w-[1360px] mx-auto px-6 h-20 flex items-center justify-between gap-8">
          {/* Brand: Cracked Dark Brown Circle Logo + Aftershock */}
          <div
            onClick={() => handleTabSwitch('portfolio')}
            className="flex items-center gap-3.5 cursor-pointer select-none"
          >
            {/* Dark Brown Circle Logo with Seismic Crack */}
            <div className="w-10 h-10 rounded-full bg-[#3A281E] border-2 border-[#634736] shadow-lg flex items-center justify-center relative overflow-hidden">
              <svg
                viewBox="0 0 40 40"
                className="w-10 h-10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="20" cy="20" r="18" fill="#362419" />
                <path
                  d="M 8 6 L 16 15 L 12 21 L 23 26 L 19 32 L 29 37"
                  stroke="#E57A54"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 16 15 L 26 12 L 31 16"
                  stroke="#F4A261"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.85"
                />
              </svg>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-[#F7F2EB]">
              Aftershock
            </span>
          </div>

          {/* Bubbly 2-Tab Switcher */}
          <nav className="flex items-center bg-[#221B16] p-1.5 rounded-2xl border border-[#382C24]">
            <button
              onClick={() => handleTabSwitch('portfolio')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'portfolio'
                  ? 'bg-[#E57A54] text-[#16110E] shadow-sm'
                  : 'text-[#B5A698] hover:text-[#F7F2EB]'
              }`}
            >
              Portfolio
            </button>
            <button
              onClick={() => handleTabSwitch('map')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-[#E57A54] text-[#16110E] shadow-sm'
                  : 'text-[#B5A698] hover:text-[#F7F2EB]'
              }`}
            >
              US Infrastructure Map
            </button>
          </nav>

          {/* Right Zone: Exposure Pill + Export Button */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 bg-[#221B16] px-4 py-2 rounded-2xl border border-[#382C24]">
              <div className="flex items-center gap-1.5 pr-3 border-r border-[#382C24]">
                <span className="text-xs text-[#A8988A] font-medium">
                  Exposure
                </span>
                <span className="font-mono text-sm font-extrabold text-[#F4A261] tabular-nums">
                  {activeSnapshot.exposureScore}/100
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#A8988A] font-medium">
                  Unpriced
                </span>
                <span className="font-mono text-sm font-extrabold text-[#F25C54] tabular-nums">
                  {activeSnapshot.unpricedRiskPct.toFixed(2)}%
                </span>
              </div>
            </div>

            <button
              onClick={() => handleToggleExport(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#E57A54] hover:bg-[#eb8967] text-xs font-bold text-[#16110E] flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              title="Export portfolio risk evaluation (Markdown, CSV, JSON)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-6 py-7">
        {activeTab === 'portfolio' ? (
          <PortfolioUploadTab
            portfolioName={portfolioName}
            setPortfolioName={setPortfolioName}
            profiles={profiles}
            setProfiles={setProfiles}
            isHedged={isHedged}
            setIsHedged={setIsHedged}
            onGoToMap={handleGoToMap}
          />
        ) : (
          <USInfrastructureMapTab
            profiles={profiles}
            initialSelectedTicker={focusedTicker}
          />
        )}
      </main>

      {/* Portfolio Risk Evaluation Export Modal */}
      <PortfolioExportModal
        isOpen={isExportOpen}
        onClose={() => handleToggleExport(false)}
        portfolioName={portfolioName}
        profiles={profiles}
        metrics={metrics}
        isHedged={isHedged}
      />
    </div>
  );
}
