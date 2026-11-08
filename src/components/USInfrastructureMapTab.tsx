import React, { useState, useMemo, useEffect } from 'react';
import {
  StockRiskProfile,
  InfraSite,
  InfraCategory,
} from '../data/aftershockData';
import {
  Waves,
  Flame,
  Server,
  Cpu,
  Zap,
  Building2,
  MapPin,
} from 'lucide-react';

interface USInfrastructureMapTabProps {
  profiles: StockRiskProfile[];
  initialSelectedTicker?: string | null;
}

// Convert US lat/lng (24.5..49.2 N, -125..-66.5 W) to SVG 960x560 coordinates
function projectLatLng(lat: number, lng: number, offsetIdx = 0): { x: number; y: number } {
  const minLng = -125.5;
  const maxLng = -66.5;
  const minLat = 24.2;
  const maxLat = 49.5;

  const normX = (lng - minLng) / (maxLng - minLng);
  const normY = 1 - (lat - minLat) / (maxLat - minLat);

  const angle = offsetIdx * 2.15;
  const radius = offsetIdx === 0 ? 0 : 14 + (offsetIdx % 2) * 6;

  const x = 65 + normX * 830 + Math.cos(angle) * radius;
  const y = 45 + normY * 465 + Math.sin(angle) * radius;

  return {
    x: Math.max(45, Math.min(905, x)),
    y: Math.max(40, Math.min(515, y)),
  };
}

function getCategoryShortCode(cat: InfraCategory): string {
  if (cat === 'Data Center') return 'DC';
  if (cat === 'Power Supply') return 'PWR';
  if (cat === 'Corporate HQ') return 'HQ';
  return 'FAB';
}

export const USInfrastructureMapTab: React.FC<USInfrastructureMapTabProps> = ({
  profiles,
  initialSelectedTicker,
}) => {
  // Always keep profiles sorted by most negative unpriced risk first
  const sortedProfiles = useMemo(
    () => [...profiles].sort((a, b) => a.unpricedRiskPct - b.unpricedRiskPct),
    [profiles]
  );

  const [selectedTicker, setSelectedTicker] = useState<string | null>(
    initialSelectedTicker || sortedProfiles[0]?.ticker || null
  );
  const [hazardFilter, setHazardFilter] = useState<'ALL' | 'Hurricane' | 'Earthquake'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | InfraCategory>('ALL');
  const [hoveredSite, setHoveredSite] = useState<InfraSite | null>(null);

  useEffect(() => {
    if (initialSelectedTicker) {
      setSelectedTicker(initialSelectedTicker);
    }
  }, [initialSelectedTicker]);

  // Flatten and project all sites with city-collision offsets
  const projectedSites = useMemo(() => {
    const cityCounts: Record<string, number> = {};
    const list: (InfraSite & { x: number; y: number })[] = [];

    for (const stock of sortedProfiles) {
      for (const site of stock.sites) {
        if (hazardFilter !== 'ALL' && site.hazard !== hazardFilter) continue;
        if (categoryFilter !== 'ALL' && site.category !== categoryFilter) continue;

        const cityKey = `${site.city}-${site.state}`;
        const count = cityCounts[cityKey] || 0;
        cityCounts[cityKey] = count + 1;
        const coords = projectLatLng(site.lat, site.lng, count);
        list.push({
          ...site,
          x: coords.x,
          y: coords.y,
        });
      }
    }
    return list;
  }, [sortedProfiles, hazardFilter, categoryFilter]);

  const selectedStockProfile = useMemo(
    () =>
      sortedProfiles.find((p) => p.ticker === selectedTicker) ||
      sortedProfiles[0] ||
      null,
    [sortedProfiles, selectedTicker]
  );

  const riskColor = (level: 'high' | 'moderate' | 'low') => {
    if (level === 'high') return '#F25C54'; // Coral Red
    if (level === 'moderate') return '#F4A261'; // Amber
    return '#52B788'; // Emerald Green
  };

  const renderCategoryIcon = (cat: InfraCategory) => {
    if (cat === 'Data Center') return <Server className="w-3.5 h-3.5 text-[#E57A54]" />;
    if (cat === 'Power Supply') return <Zap className="w-3.5 h-3.5 text-[#F4A261]" />;
    if (cat === 'Corporate HQ') return <Building2 className="w-3.5 h-3.5 text-[#A8DADC]" />;
    return <Cpu className="w-3.5 h-3.5 text-[#F25C54]" />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 8 Columns: High-Clarity US Infrastructure & Risk Map + Expanded Bottom Stock Deep-Dive */}
      <div className="lg:col-span-8 bg-[#221B16] border border-[#382C24] rounded-[28px] p-5 shadow-xl space-y-4">
        {/* Map Top Filter Bar: Hazard + Infrastructure Type Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Infrastructure Category Filters (HQ, Power Supply, Data Centers, Fabs) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ALL', label: 'All Infrastructure' },
                { id: 'Data Center', label: 'Data Centers' },
                { id: 'Power Supply', label: 'Power Supply' },
                { id: 'Corporate HQ', label: 'Corporate HQ' },
                { id: 'Wafer Fab', label: 'Fabs & Plants' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                  categoryFilter === cat.id
                    ? 'bg-[#F7F2EB] text-[#16110E] border-[#F7F2EB]'
                    : 'bg-[#191410] text-[#B5A698] hover:text-[#F7F2EB] border-[#332820]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Hazard Filter + Color Risk Legend */}
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setHazardFilter(hazardFilter === 'Hurricane' ? 'ALL' : 'Hurricane')
              }
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                hazardFilter === 'Hurricane'
                  ? 'bg-[#F4A261]/20 border-[#F4A261] text-[#F4A261]'
                  : 'bg-[#191410] border-[#332820] text-[#B5A698] hover:text-[#F7F2EB]'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Hurricanes</span>
            </button>
            <button
              onClick={() =>
                setHazardFilter(hazardFilter === 'Earthquake' ? 'ALL' : 'Earthquake')
              }
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                hazardFilter === 'Earthquake'
                  ? 'bg-[#F25C54]/20 border-[#F25C54] text-[#F25C54]'
                  : 'bg-[#191410] border-[#332820] text-[#B5A698] hover:text-[#F7F2EB]'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Earthquakes</span>
            </button>
          </div>
        </div>

        {/* SVG US Map Canvas */}
        <div className="relative rounded-[22px] bg-[#15100D] border border-[#332820] overflow-hidden">
          {/* Floating Legend Strip at Top Right of Map */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-3 text-[11px] bg-[#1B1511]/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-[#382C24]">
            <span className="flex items-center gap-1.5 text-[#F7F2EB] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F25C54]" />
              Severe
            </span>
            <span className="flex items-center gap-1.5 text-[#F7F2EB] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F4A261]" />
              Moderate
            </span>
            <span className="flex items-center gap-1.5 text-[#F7F2EB] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#52B788]" />
              Safe Inland
            </span>
          </div>

          <svg
            viewBox="0 0 960 540"
            className="w-full h-auto block select-none"
          >
            <defs>
              <radialGradient id="quakeZone" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F25C54" stopOpacity="0.28" />
                <stop offset="70%" stopColor="#F25C54" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#F25C54" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="hurricaneZone" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F4A261" stopOpacity="0.26" />
                <stop offset="70%" stopColor="#F4A261" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#F4A261" stopOpacity="0" />
              </radialGradient>
              <pattern
                id="mapGrid"
                width="48"
                height="48"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 48 0 L 0 0 0 48"
                  fill="none"
                  stroke="#261E18"
                  strokeWidth="0.8"
                />
              </pattern>
            </defs>

            {/* Subtle Coordinate Grid */}
            <rect width="960" height="540" fill="url(#mapGrid)" />

            {/* Continental US Silhouette + Major State Boundaries */}
            <g>
              <path
                d="M 92 72 L 185 68 L 310 68 L 445 68 L 555 76 L 635 108 L 705 128 L 775 112 L 845 78 L 885 95 L 892 142 L 855 185 L 848 228 L 818 282 L 778 345 L 762 415 L 785 485 L 752 505 L 712 435 L 645 422 L 575 445 L 515 478 L 465 512 L 425 462 L 368 422 L 265 415 L 182 385 L 112 335 L 72 248 L 68 152 Z"
                fill="#211914"
                stroke="#49392E"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />

              <g stroke="#31261E" strokeWidth="1.2" strokeDasharray="4 4" fill="none">
                <path d="M 185 68 L 178 382" />
                <path d="M 310 68 L 305 418" />
                <path d="M 465 70 L 465 512" />
                <path d="M 625 105 L 615 432" />
                <path d="M 70 185 L 855 185" />
                <path d="M 92 310 L 802 310" />
              </g>
            </g>

            {/* HAZARD OVERLAY 1: West Coast San Andreas & Cascadia Earthquake Fault Corridor */}
            {(hazardFilter === 'ALL' || hazardFilter === 'Earthquake') && (
              <g>
                <ellipse
                  cx="105"
                  cy="245"
                  rx="75"
                  ry="165"
                  fill="url(#quakeZone)"
                  transform="rotate(-10 105 245)"
                />
                <path
                  d="M 88 95 Q 72 195 102 285 T 145 365"
                  fill="none"
                  stroke="#F25C54"
                  strokeWidth="2"
                  strokeDasharray="6 5"
                  opacity="0.7"
                />
                <text
                  x="130"
                  y="125"
                  fill="#F25C54"
                  fontSize="10"
                  fontWeight="700"
                  opacity="0.85"
                >
                  PACIFIC SEISMIC FAULT ZONE
                </text>
              </g>
            )}

            {/* HAZARD OVERLAY 2: Gulf Coast & Atlantic Hurricane Alley */}
            {(hazardFilter === 'ALL' || hazardFilter === 'Hurricane') && (
              <g>
                <ellipse
                  cx="625"
                  cy="445"
                  rx="210"
                  ry="95"
                  fill="url(#hurricaneZone)"
                />
                <ellipse
                  cx="795"
                  cy="285"
                  rx="95"
                  ry="135"
                  fill="url(#hurricaneZone)"
                  transform="rotate(20 795 285)"
                />
                <path
                  d="M 480 475 Q 640 445 755 385 T 825 225"
                  fill="none"
                  stroke="#F4A261"
                  strokeWidth="2"
                  strokeDasharray="6 5"
                  opacity="0.7"
                />
                <text
                  x="530"
                  y="495"
                  fill="#F4A261"
                  fontSize="10"
                  fontWeight="700"
                  opacity="0.85"
                >
                  GULF &amp; ATLANTIC HURRICANE CORRIDOR
                </text>
              </g>
            )}

            {/* Regional Hub Labels */}
            <g fill="#7D6B5D" fontSize="10" fontWeight="600" className="pointer-events-none">
              <text x="115" y="102">PACIFIC NW (HQ / HYDRO / FABS)</text>
              <text x="112" y="295">SILICON VALLEY (HQ / AI CLUSTERS)</text>
              <text x="475" y="225">MIDWEST GRID CORE</text>
              <text x="445" y="438">TEXAS / GULF POWER &amp; REFINING</text>
              <text x="655" y="220">VIRGINIA DATA &amp; POWER ALLEY</text>
              <text x="660" y="475">SOUTH FLORIDA GRID</text>
            </g>

            {/* Connecting Network Arcs for Selected Stock (HQ -> Power Supply -> Data Centers) */}
            {selectedTicker && (
              <g>
                {projectedSites
                  .filter((s) => s.ticker === selectedTicker)
                  .map((site, idx, arr) => {
                    if (idx === 0) return null;
                    const prev = arr[0];
                    const midX = (prev.x + site.x) / 2;
                    const midY = Math.min(prev.y, site.y) - 45;
                    return (
                      <path
                        key={`arc-${site.id}`}
                        d={`M ${prev.x} ${prev.y} Q ${midX} ${midY} ${site.x} ${site.y}`}
                        fill="none"
                        stroke="#F7F2EB"
                        strokeWidth="1.8"
                        strokeDasharray="4 4"
                        opacity="0.65"
                      />
                    );
                  })}
              </g>
            )}

            {/* Infrastructure Nodes */}
            {projectedSites.map((site) => {
              const isSelectedStock =
                !selectedTicker || site.ticker === selectedTicker;
              const isHovered = hoveredSite?.id === site.id;
              const nodeColor = riskColor(site.riskLevel);
              const shortCode = getCategoryShortCode(site.category);

              return (
                <g
                  key={site.id}
                  transform={`translate(${site.x}, ${site.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTicker(site.ticker);
                    setHoveredSite(site);
                  }}
                  onMouseEnter={() => setHoveredSite(site)}
                  className="cursor-pointer transition-opacity duration-300"
                  style={{ opacity: isSelectedStock ? 1 : 0.25 }}
                >
                  {(site.riskLevel === 'high' || isHovered) && (
                    <circle
                      r={isHovered ? 20 : 14}
                      fill={nodeColor}
                      opacity={isHovered ? 0.3 : 0.18}
                      className="animate-pulse-soft"
                    />
                  )}

                  {/* Main Infrastructure Pin */}
                  <circle
                    r={isHovered ? 9.5 : 7.5}
                    fill={nodeColor}
                    stroke="#16110E"
                    strokeWidth="2.5"
                  />

                  {/* Compact Ticker + Infra Type + Unpriced % Pill right on map */}
                  <g transform="translate(11, -10)">
                    <rect
                      x="0"
                      y="0"
                      width="98"
                      height="20"
                      rx="8"
                      fill={isHovered ? '#2E241D' : '#1B1511'}
                      stroke={isHovered ? nodeColor : '#3A2E25'}
                      strokeWidth="1.2"
                      opacity="0.95"
                    />
                    <text
                      x="6"
                      y="13.5"
                      fill="#F7F2EB"
                      fontSize="9.5"
                      fontWeight="800"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {site.ticker}·{shortCode}
                    </text>
                    <text
                      x="62"
                      y="13.5"
                      fill={site.riskLevel === 'low' ? '#52B788' : '#F25C54'}
                      fontSize="9.5"
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {site.unpricedImpactPct.toFixed(1)}%
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Expanded Bottom Deep-Dive Panel for Clicked/Selected Stock */}
        {selectedStockProfile && (
          <div className="p-5 rounded-[24px] bg-[#191410] border border-[#3E3127] space-y-4">
            {/* Top Stock Summary Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3.5 border-b border-[#2E241D]">
              <div className="flex items-center gap-3.5">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center font-mono text-sm font-extrabold text-[#16110E]"
                  style={{ backgroundColor: selectedStockProfile.color }}
                >
                  {selectedStockProfile.ticker}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-extrabold text-[#F7F2EB]">
                      {selectedStockProfile.company}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#2E241D] border border-[#45362C] font-mono text-xs font-bold text-[#E57A54]">
                      Exposure Score: {selectedStockProfile.exposureScore}/100
                    </span>
                  </div>
                  <div className="text-xs text-[#A8988A] mt-0.5 flex flex-wrap items-center gap-2">
                    <span>
                      Current Weight: <strong className="text-[#F7F2EB] font-mono">{selectedStockProfile.weight.toFixed(1)}%</strong>
                    </span>
                    <span>→</span>
                    <span>
                      Hedged Weight: <strong className="text-[#52B788] font-mono">{selectedStockProfile.hedgedWeight.toFixed(1)}%</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Event Max Drawdown: <strong className="text-[#F25C54] font-mono">{selectedStockProfile.maxEventDrawdownPct.toFixed(1)}%</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-[#A8988A]">
                  Total Unpriced Risk
                </div>
                <div className="font-mono text-lg font-extrabold text-[#F25C54] tabular-nums">
                  {selectedStockProfile.unpricedRiskPct.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Grid of All Critical Infrastructure Sites (HQ, Power Supply, Data Centers, Fabs) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {selectedStockProfile.sites.map((site) => {
                const isActiveSite = hoveredSite?.id === site.id;
                return (
                  <div
                    key={site.id}
                    onMouseEnter={() => setHoveredSite(site)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isActiveSite
                        ? 'bg-[#281F19] border-[#E57A54]'
                        : 'bg-[#211A15] border-[#332820] hover:border-[#4D3C31]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#16110E] border border-[#382C24] text-[10px] font-bold text-[#F7F2EB]">
                        {renderCategoryIcon(site.category)}
                        {site.category}
                      </span>
                      <span className="font-mono text-xs font-extrabold text-[#F25C54]">
                        {site.unpricedImpactPct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="text-xs font-bold text-[#F7F2EB] leading-snug">
                      {site.name}
                    </div>
                    <div className="text-[11px] text-[#A8988A] flex items-center gap-1 mt-0.5">
                      <MapPin
                        className="w-3 h-3 shrink-0"
                        style={{ color: riskColor(site.riskLevel) }}
                      />
                      <span>
                        {site.city}, {site.state} · {site.hazard}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#2E241D] space-y-1 text-[10px]">
                      <div className="text-[#D6C7B8]">{site.hazardDetail}</div>
                      <div className="font-mono text-[#F4A261]">
                        Power: {site.powerCapacityMW}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right 4 Columns: Sorted Stocks in Danger Leaderboard */}
      <div className="lg:col-span-4 bg-[#221B16] border border-[#382C24] rounded-[28px] p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[#332820]">
            <div>
              <h2 className="text-base font-bold text-[#F7F2EB]">
                Stocks in Danger (Sorted)
              </h2>
              <p className="text-xs text-[#A8988A] mt-0.5">
                Click any stock to inspect HQ, power &amp; data centers
              </p>
            </div>
          </div>

          {/* Sorted Stock Danger Cards */}
          <div className="mt-4 space-y-2.5">
            {sortedProfiles.map((stock, idx) => {
              const isSelected = selectedStockProfile?.ticker === stock.ticker;
              const isHurricane = stock.primaryHazard === 'Hurricane';

              return (
                <div
                  key={stock.ticker}
                  onClick={() => setSelectedTicker(stock.ticker)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#2E231C] border-[#E57A54] shadow-md'
                      : 'bg-[#191410] border-[#31261F] hover:bg-[#241C16]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-[#7D6B5D] w-4">
                        #{idx + 1}
                      </span>
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-mono text-xs font-extrabold text-[#16110E]"
                        style={{ backgroundColor: stock.color }}
                      >
                        {stock.ticker}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#F7F2EB]">
                            {stock.company}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#2A201A] text-[#D6C7B8]">
                            {stock.exposureScore}/100
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#A8988A] mt-0.5">
                          {isHurricane ? (
                            <Waves className="w-3 h-3 text-[#F4A261]" />
                          ) : (
                            <Flame className="w-3 h-3 text-[#F25C54]" />
                          )}
                          <span>{stock.primaryHazard} Exposure</span>
                        </div>
                      </div>
                    </div>

                    {/* Prominent Red Unpriced % Badge */}
                    <div className="text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[#F25C54]/15 border border-[#F25C54]/35 font-mono text-sm font-extrabold text-[#F25C54] tabular-nums">
                        {stock.unpricedRiskPct.toFixed(1)}%
                      </span>
                      <div className="text-[10px] text-[#8C7A6B] mt-0.5">
                        not priced in
                      </div>
                    </div>
                  </div>

                  {/* Facility Category Chips (HQ, Power Supply, Data Center, Wafer Fab) */}
                  <div className="mt-3 pt-2.5 border-t border-[#2C221B] flex flex-wrap gap-1.5">
                    {stock.sites.map((site) => (
                      <span
                        key={site.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicker(stock.ticker);
                          setHoveredSite(site);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#221B16] border border-[#382C24] text-[10px] text-[#D6C7B8] hover:border-[#E57A54]"
                      >
                        {renderCategoryIcon(site.category)}
                        <span>
                          {getCategoryShortCode(site.category)} · {site.city}
                        </span>
                        <span className="font-mono text-[10px] text-[#F25C54] font-bold">
                          {site.unpricedImpactPct.toFixed(1)}%
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
