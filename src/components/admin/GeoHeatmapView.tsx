import { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import countriesAtlas from 'world-atlas/countries-110m.json';
import {
  Building2,
  Compass,
  DollarSign,
  ExternalLink,
  Globe2,
  Landmark,
  Mail,
  MapPin,
  Pickaxe,
  X,
} from 'lucide-react';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { EUROPE_APAC_GEO_HUBS, type GeoHubPoint } from '../../data/lithiumIntelCatalog';
import {
  TRADE_REGION_LABELS,
  type LithiumIntelRecord,
} from '../../types/lithiumIntel';

interface GeoHeatmapViewProps {
  onSelectLead: (record: LithiumIntelRecord) => void;
  onOpenEmailComposer: (prefill: {
    toEmail: string;
    contactName: string;
    companyName: string;
    leadId?: string;
    leadRankId?: number;
    subject?: string;
    body?: string;
  }) => void;
}

type ZoomZone = 'BOTH' | 'EUROPE' | 'APAC';
type RoleFilter = 'ALL' | 'REFINERS' | 'SOURCING_ECAS' | 'INVESTORS';

const NIGERIA_ORIGIN: [number, number] = [6.5, 9.5]; // Jega / Apapa corridor centroid

export default function GeoHeatmapView({
  onSelectLead,
  onOpenEmailComposer,
}: GeoHeatmapViewProps) {
  const { unifiedTradeBook } = useBuyerAuth();

  const [zoomZone, setZoomZone] = useState<ZoomZone>('BOTH');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [selectedHubId, setSelectedHubId] = useState<string>(EUROPE_APAC_GEO_HUBS[0].id);
  const [hoveredHubId, setHoveredHubId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true);

  const width = 960;
  const height = 490;

  const projection = useMemo(() => {
    const proj = d3.geoNaturalEarth1();
    if (zoomZone === 'EUROPE') {
      return proj.scale(620).center([7, 47]).translate([width / 2, height / 2]);
    }
    if (zoomZone === 'APAC') {
      return proj.scale(480).center([116, 20]).translate([width / 2, height / 2]);
    }
    return proj.scale(245).center([56, 30]).translate([width / 2, height / 2]);
  }, [zoomZone]);

  const pathGenerator = useMemo(() => d3.geoPath(projection), [projection]);

  const countriesGeo = useMemo(() => {
    const topology = countriesAtlas as unknown as Topology<{
      countries: GeometryCollection;
    }>;
    return feature(topology, topology.objects.countries);
  }, []);

  const graticulePath = useMemo(() => {
    return pathGenerator(d3.geoGraticule10()) || '';
  }, [pathGenerator]);

  const spherePath = useMemo(() => {
    return pathGenerator({ type: 'Sphere' }) || '';
  }, [pathGenerator]);

  const matchesRoleFilter = (rec: LithiumIntelRecord): boolean => {
    if (roleFilter === 'ALL') return true;
    if (roleFilter === 'REFINERS') return rec.leadCategory === 'LITHIUM';
    if (roleFilter === 'INVESTORS') {
      return (
        rec.leadCategory === 'FUNDING_FINANCE' &&
        (rec.regionCode === 'INVESTMENT_PARTNERS' ||
          rec.regionCode === 'DFI_GRANTS' ||
          rec.regionCode === 'EU_GRANTS_FINANCE' ||
          rec.regionCode === 'US_GRANTS_FINANCE')
      );
    }
    return (
      rec.regionCode === 'EUROPE_SOURCING' ||
      rec.regionCode === 'COMMERCIAL_TRADE_BANKS' ||
      rec.regionCode === 'EXPORT_CREDIT_FINANCE'
    );
  };

  // Match Trade Book records to the 14 Europe & APAC hubs
  const hubMetrics = useMemo(() => {
    return EUROPE_APAC_GEO_HUBS.map((hub) => {
      const matched = unifiedTradeBook.filter((rec) => {
        if (!matchesRoleFilter(rec)) return false;
        if (hub.regions.includes(rec.regionCode)) {
          // Refine shared European regions by country hint when applicable
          if (
            rec.regionCode === 'INVESTMENT_PARTNERS' ||
            rec.regionCode === 'COMMERCIAL_TRADE_BANKS' ||
            rec.regionCode === 'DFI_GRANTS' ||
            rec.regionCode === 'EUROPE_SOURCING'
          ) {
            const loc = rec.location.toLowerCase();
            if (hub.id === 'hub-london-uk') return loc.includes('uk') || loc.includes('london');
            if (hub.id === 'hub-paris-fr') return loc.includes('france') || loc.includes('paris');
            if (hub.id === 'hub-zurich-ch') return loc.includes('swiss') || loc.includes('zurich') || loc.includes('zug') || loc.includes('geneva');
            if (hub.id === 'hub-oslo-no') return loc.includes('norway') || loc.includes('oslo') || loc.includes('finland') || loc.includes('helsinki') || loc.includes('nordic');
            if (hub.id === 'hub-rotterdam-nl') return loc.includes('netherlands') || loc.includes('rotterdam') || loc.includes('amsterdam');
            if (hub.id === 'hub-madrid-it') return loc.includes('spain') || loc.includes('italy') || loc.includes('madrid') || loc.includes('milan');
            if (hub.id === 'hub-brussels-eu') return loc.includes('belgium') || loc.includes('brussels') || loc.includes('eu') || loc.includes('luxembourg');
            if (hub.id === 'hub-munich-de') return loc.includes('germany') || loc.includes('munich') || loc.includes('frankfurt') || loc.includes('berlin');
          }
          return true;
        }
        return false;
      });

      const refiners = matched.filter((r) => r.leadCategory === 'LITHIUM');
      const sourcingEcas = matched.filter(
        (r) =>
          r.leadCategory === 'AFRICA_SOURCING' ||
          r.regionCode === 'EXPORT_CREDIT_FINANCE' ||
          r.regionCode === 'COMMERCIAL_TRADE_BANKS'
      );
      const investorsGrants = matched.filter(
        (r) =>
          r.leadCategory === 'FUNDING_FINANCE' &&
          r.regionCode !== 'EXPORT_CREDIT_FINANCE' &&
          r.regionCode !== 'COMMERCIAL_TRADE_BANKS'
      );

      const totalFobUsd = matched.reduce((s, r) => s + (r.targetFobValue || 0), 0);
      const totalMt = matched.reduce((s, r) => s + (r.estimatedTonnage || 0), 0);

      return {
        hub,
        matched,
        refiners,
        sourcingEcas,
        investorsGrants,
        totalFobUsd,
        totalMt,
      };
    });
  }, [unifiedTradeBook, roleFilter]);

  const activeHubData = useMemo(() => {
    const targetId = hoveredHubId || selectedHubId;
    return (
      hubMetrics.find((m) => m.hub.id === targetId) ||
      hubMetrics[0]
    );
  }, [hubMetrics, hoveredHubId, selectedHubId]);

  const nigeriaXY = projection(NIGERIA_ORIGIN) || [0, 0];

  const makeExportArc = (destCoords: [number, number]): string => {
    const interp = d3.geoInterpolate(NIGERIA_ORIGIN, destCoords);
    const pts: Array<[number, number]> = [];
    for (let t = 0; t <= 1.001; t += 0.08) {
      const xy = projection(interp(Math.min(1, t)));
      if (xy) pts.push(xy);
    }
    const lineGen = d3
      .line<[number, number]>()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(d3.curveBasis);
    return lineGen(pts) || '';
  };

  const renderHubGroupList = (title: string, items: LithiumIntelRecord[], icon: 'pick' | 'ship' | 'bank') => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600 pt-1">
        <span className="inline-flex items-center gap-1.5">
          {icon === 'pick' && <Pickaxe className="w-3.5 h-3.5 text-amber-600" />}
          {icon === 'ship' && <Building2 className="w-3.5 h-3.5 text-emerald-600" />}
          {icon === 'bank' && <Landmark className="w-3.5 h-3.5 text-sky-600" />}
          <span>{title}</span>
        </span>
        <span className="font-mono tabular-nums">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-slate-400">No entries under active filter.</p>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-md bg-white">
          {items.map((rec) => (
            <div
              key={rec.rankId}
              className="p-2.5 hover:bg-slate-50 flex items-center justify-between gap-2 text-xs"
            >
              <button
                type="button"
                onClick={() => onSelectLead(rec)}
                className="text-left min-w-0 flex-1 cursor-pointer"
              >
                <div className="font-semibold text-slate-900 truncate">
                  #{rec.rankId} · {rec.companyName}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {rec.primaryRole} · {rec.priorityScore}pt ({rec.priorityTier}) · $
                  {(rec.targetFobValue / 1000).toFixed(0)}k
                </div>
              </button>
              <button
                type="button"
                title="Compose Email"
                onClick={() =>
                  onOpenEmailComposer({
                    toEmail: rec.directEmail || rec.generalEmail,
                    contactName: rec.decisionMaker,
                    companyName: rec.companyName,
                    leadId: rec.id,
                    leadRankId: rec.rankId,
                    subject: rec.emailSubject,
                    body: rec.emailBody,
                  })
                }
                className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded cursor-pointer shrink-0"
              >
                <Mail className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const totalEuropeApacCount = hubMetrics.reduce((s, h) => s + h.matched.length, 0);
  const totalEuropeApacUsd = hubMetrics.reduce((s, h) => s + h.totalFobUsd, 0);

  return (
    <div className="space-y-4">
      {/* Toolbar Controls */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-lg flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-amber-600" />
            <span>Europe &amp; Asia-Pacific Export Corridor Heatmap</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Live geographic concentration of {totalEuropeApacCount} plotted buyers, refiners, B2B importers &amp; capital hubs linked to EL No. 65197 (Jega LGA / Lagos) · Total Target: $
            {(totalEuropeApacUsd / 1_000_000).toFixed(2)}M
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom Presets */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-md">
            {(
              [
                { id: 'BOTH', label: 'Europe + APAC' },
                { id: 'EUROPE', label: 'Europe Detail' },
                { id: 'APAC', label: 'Asia-Pacific Detail' },
              ] as Array<{ id: ZoomZone; label: string }>
            ).map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setZoomZone(z.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer whitespace-nowrap ${
                  zoomZone === z.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>

          {/* Role Filter */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-md">
            {(
              [
                { id: 'ALL', label: 'All Partners' },
                { id: 'REFINERS', label: 'Refiners & Buyers' },
                { id: 'SOURCING_ECAS', label: 'Supply Chain & ECAs' },
                { id: 'INVESTORS', label: 'Investors & Grants' },
              ] as Array<{ id: RoleFilter; label: string }>
            ).map((rf) => (
              <button
                key={rf.id}
                type="button"
                onClick={() => setRoleFilter(rf.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer whitespace-nowrap ${
                  roleFilter === rf.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {rf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Split: D3 Map + Hub Drill-Down Drawer */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Map Canvas */}
        <div
          className={`${
            drawerOpen ? 'xl:col-span-8' : 'xl:col-span-12'
          } bg-slate-950 border border-slate-800 rounded-lg overflow-hidden relative`}
        >
          <div className="px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-amber-400 font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                <span>Origin: EL No. 65197 (Jega LGA / Apapa Lagos)</span>
              </span>
              <span aria-hidden="true">·</span>
              <span>14 Global Hubs</span>
            </div>
            {!drawerOpen && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded cursor-pointer"
              >
                Open Hub Drill-Down
              </button>
            )}
          </div>

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto block select-none"
            role="img"
            aria-label="Europe and Asia-Pacific Lithium and Capital Corridor Map"
          >
            <path d={spherePath} fill="#090f1d" stroke="#1e293b" strokeWidth={1} />
            <path d={graticulePath} fill="none" stroke="#1e293b" strokeWidth={0.45} strokeDasharray="2,3" />

            <g>
              {countriesGeo.features.map((feat, idx) => (
                <path
                  key={(feat.id as string) || idx}
                  d={pathGenerator(feat) || ''}
                  fill="#172033"
                  stroke="#28354d"
                  strokeWidth={0.55}
                />
              ))}
            </g>

            {/* Export Corridors from Nigeria Origin */}
            <g>
              {hubMetrics.map(({ hub, matched }) => {
                const active = selectedHubId === hub.id || hoveredHubId === hub.id;
                const d = makeExportArc(hub.coords);
                const strokeColor =
                  hub.macroZone === 'Europe' ? '#10b981' : '#f59e0b';
                return (
                  <path
                    key={`arc-${hub.id}`}
                    d={d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={active ? 2.2 : matched.length > 0 ? 1.15 : 0.6}
                    strokeOpacity={active ? 0.95 : matched.length > 0 ? 0.55 : 0.18}
                    strokeDasharray={active ? undefined : '4,3'}
                  />
                );
              })}
            </g>

            {/* Nigeria Origin Anchor */}
            <g transform={`translate(${nigeriaXY[0]}, ${nigeriaXY[1]})`}>
              <circle r={9} fill="#f59e0b" fillOpacity={0.22} />
              <circle r={4.5} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.5} />
              <text
                x={8}
                y={4}
                fill="#fcd34d"
                fontSize={10}
                fontWeight={700}
                fontFamily="monospace"
              >
                NG EL 65197
              </text>
            </g>

            {/* 14 Destination Hubs */}
            <g>
              {hubMetrics.map(({ hub, matched }) => {
                const xy = projection(hub.coords);
                if (!xy) return null;
                const isSelected = selectedHubId === hub.id;
                const isHovered = hoveredHubId === hub.id;
                const baseRadius = Math.max(5.5, Math.min(18, 5 + matched.length * 0.95));
                const color = hub.macroZone === 'Europe' ? '#10b981' : '#f59e0b';

                return (
                  <g
                    key={hub.id}
                    transform={`translate(${xy[0]}, ${xy[1]})`}
                    onClick={() => {
                      setSelectedHubId(hub.id);
                      setDrawerOpen(true);
                    }}
                    onMouseEnter={() => setHoveredHubId(hub.id)}
                    onMouseLeave={() => setHoveredHubId(null)}
                    className="cursor-pointer"
                  >
                    <circle
                      r={baseRadius + (isSelected ? 5 : 2)}
                      fill={color}
                      fillOpacity={isSelected || isHovered ? 0.35 : 0.16}
                    />
                    <circle
                      r={baseRadius}
                      fill={color}
                      fillOpacity={0.82}
                      stroke={isSelected ? '#ffffff' : '#0f172a'}
                      strokeWidth={isSelected ? 2 : 1.2}
                    />
                    <text
                      textAnchor="middle"
                      dy="0.35em"
                      fill="#090f1d"
                      fontSize={9}
                      fontWeight={700}
                      fontFamily="monospace"
                    >
                      {matched.length}
                    </text>
                    <text
                      x={baseRadius + 5}
                      y={3}
                      fill={isSelected ? '#ffffff' : '#cbd5e1'}
                      fontSize={9.5}
                      fontWeight={isSelected ? 700 : 500}
                    >
                      {hub.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Compact Hub Strip Legend */}
          <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Europe Offtake, Grants &amp; DFIs</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Asia-Pacific Lithium Refiners &amp; ECAs</span>
              </span>
            </div>
            <span className="font-mono text-slate-400">
              Click any hub marker to inspect local counterparties
            </span>
          </div>
        </div>

        {/* Clickable Hub Drill-Down Drawer */}
        {drawerOpen && activeHubData && (
          <div className="xl:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col max-h-[590px]">
            <div className="p-3.5 bg-slate-900 text-white flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-amber-400">
                  {activeHubData.hub.macroZone} · {activeHubData.hub.country}
                </div>
                <h4 className="font-display text-sm font-bold text-white truncate">
                  {activeHubData.hub.label}
                </h4>
                <div className="text-[11px] font-mono text-slate-300 mt-0.5 tabular-nums">
                  {activeHubData.matched.length} Partner(s) · $
                  {activeHubData.totalFobUsd.toLocaleString('en-US')} Target
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Collapse hub drill-down"
                className="p-1.5 text-slate-300 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
              {renderHubGroupList('Refiners & Offtake Buyers', activeHubData.refiners, 'pick')}
              {renderHubGroupList('B2B Sourcing & ECAs', activeHubData.sourcingEcas, 'ship')}
              {renderHubGroupList('Investors & Grant Agencies', activeHubData.investorsGrants, 'bank')}
            </div>

            <div className="p-3 border-t border-slate-200 bg-white text-[11px] text-slate-500 flex items-center justify-between">
              <span>Regions: {activeHubData.hub.regions.map((r) => TRADE_REGION_LABELS[r]).slice(0, 2).join(', ')}</span>
              <span className="inline-flex items-center gap-1 font-mono text-slate-700 tabular-nums">
                <Compass className="w-3 h-3 text-amber-600" />
                {activeHubData.totalMt.toLocaleString('en-US')} MT
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
