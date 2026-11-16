import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import countriesAtlas from 'world-atlas/countries-110m.json';
import {
  Anchor,
  ArrowRight,
  Clock,
  Compass,
  Minus,
  Plus,
  RotateCcw,
  Ship,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

type CorridorRegion = 'All' | 'Asia' | 'Europe' | 'Americas';

interface LogisticsRoute {
  id: string;
  region: Exclude<CorridorRegion, 'All'>;
  originPort: string;
  destinationPort: string;
  countryName: string;
  countryIsoNumeric: string;
  transitDays: string;
  incoterms: string;
  carriers: string;
  primaryCargo: string;
  primaryCargoFr: string;
  productIdForQuote: string;
  statusNote: string;
  statusNoteFr: string;
  waypoints: [number, number][]; // [longitude, latitude] along realistic sea lanes
}

interface GlobalLogisticsRoutesProps {
  onSelectRouteForQuote: (productId: string) => void;
}

const REGION_COLORS: Record<
  Exclude<CorridorRegion, 'All'>,
  { stroke: string; badgeBg: string; text: string; dot: string }
> = {
  Asia: {
    stroke: '#f59e0b',
    badgeBg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  Europe: {
    stroke: '#10b981',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  Americas: {
    stroke: '#38bdf8',
    badgeBg: 'bg-sky-500/15 border-sky-500/40 text-sky-300',
    text: 'text-sky-400',
    dot: 'bg-sky-400',
  },
};

const ORIGIN_HUBS: Array<{
  id: string;
  name: string;
  role: string;
  coords: [number, number];
  isPort: boolean;
}> = [
  {
    id: 'lagos',
    name: 'Lagos (Apapa / Tin Can)',
    role: 'Primary Maritime Terminal',
    coords: [3.38, 6.44],
    isPort: true,
  },
  {
    id: 'onne',
    name: 'Onne Deep Sea Port',
    role: 'Eastern Corridor Terminal',
    coords: [7.15, 4.72],
    isPort: true,
  },
  {
    id: 'kano',
    name: 'Kano / Nasarawa Hub',
    role: 'HQ & Mine Consolidation',
    coords: [8.52, 12.0],
    isPort: false,
  },
];

const SHIPPING_ROUTES: LogisticsRoute[] = [
  {
    id: 'lagos-qingdao',
    region: 'Asia',
    originPort: 'Apapa Wharf, Lagos',
    destinationPort: 'Qingdao, China',
    countryName: 'China',
    countryIsoNumeric: '156',
    transitDays: '28–34 Days',
    incoterms: 'FOB / CFR / CIF',
    carriers: 'Maersk · CMA CGM · COSCO',
    primaryCargo: 'Lithium Ore (4.61% Li2O @ $207/%), Whitish Sesame',
    primaryCargoFr: 'Minerai de Lithium (4,61% Li2O @ 207$/%), Sésame Blanc',
    productIdForQuote: 'lithium-spodumene-lepidolite',
    statusNote: 'Active Weekly FCL Sailing · SGS Seal Verified',
    statusNoteFr: 'Départs FCL Hebdomadaires · Scellés SGS Vérifiés',
    waypoints: [
      [3.38, 6.44],
      [2.5, -1.5],
      [11.0, -20.0],
      [18.4, -35.2],
      [42.0, -25.0],
      [75.0, -4.0],
      [103.85, 1.26],
      [116.5, 20.5],
      [122.2, 30.0],
      [120.38, 36.06],
    ],
  },
  {
    id: 'lagos-nansha',
    region: 'Asia',
    originPort: 'Tin Can Island, Lagos',
    destinationPort: 'Nansha / Shanghai, China',
    countryName: 'China',
    countryIsoNumeric: '156',
    transitDays: '26–32 Days',
    incoterms: 'FOB / CIF',
    carriers: 'COSCO · MSC · PIL',
    primaryCargo: 'Spodumene / Lepidolite Ore & Raw Cashew Kernels',
    primaryCargoFr: 'Minerai Spodumène / Lépidolite & Noix de Cajou',
    productIdForQuote: 'lithium-spodumene-lepidolite',
    statusNote: 'Bi-Weekly Bulk & 20ft Jumbo Bag Service',
    statusNoteFr: 'Service Bi-Hebdomadaire Jumbo Bags 20ft',
    waypoints: [
      [3.38, 6.44],
      [3.5, -3.0],
      [13.0, -23.0],
      [18.4, -35.2],
      [46.0, -22.0],
      [78.0, -1.0],
      [103.85, 1.26],
      [113.65, 22.75],
      [121.47, 31.23],
    ],
  },
  {
    id: 'lagos-mundra',
    region: 'Asia',
    originPort: 'Apapa / Onne',
    destinationPort: 'Nhava Sheva (Mumbai), India',
    countryName: 'India',
    countryIsoNumeric: '356',
    transitDays: '21–26 Days',
    incoterms: 'FOB / CFR / CIF',
    carriers: 'MSC · Hapag-Lloyd · Maersk',
    primaryCargo: 'Raw Cashew Nuts (KOR 46–48 lbs), Split Ginger, Hibiscus',
    primaryCargoFr: 'Noix de Cajou Brutes (RCN), Gingembre Séché, Hibiscus',
    productIdForQuote: 'raw-cashew-soybeans',
    statusNote: 'Peak Seasonal Direct Liner Lane',
    statusNoteFr: 'Ligne Directe Saisonnière Active',
    waypoints: [
      [3.38, 6.44],
      [4.0, -5.0],
      [14.0, -27.0],
      [18.4, -35.2],
      [45.0, -24.0],
      [60.0, -3.0],
      [72.95, 18.95],
    ],
  },
  {
    id: 'lagos-jebel-ali',
    region: 'Asia',
    originPort: 'Apapa Wharf, Lagos',
    destinationPort: 'Jebel Ali, UAE',
    countryName: 'United Arab Emirates',
    countryIsoNumeric: '784',
    transitDays: '22–27 Days',
    incoterms: 'FOB / CIF / DAP',
    carriers: 'CMA CGM · Maersk · Emirates',
    primaryCargo: 'Sesame 99/1, Dried Ginger, Commercial Solar & Foodstuffs',
    primaryCargoFr: 'Sésame 99/1, Gingembre, Équipements Solaires & Alimentaires',
    productIdForQuote: 'hulled-white-sesame',
    statusNote: 'GCC & Re-Export Consolidation Corridor',
    statusNoteFr: 'Corridor de Consolidation Golfe & Réexport',
    waypoints: [
      [3.38, 6.44],
      [2.5, -5.0],
      [13.5, -26.0],
      [18.4, -35.2],
      [44.5, -21.0],
      [53.0, 2.0],
      [59.0, 22.0],
      [55.06, 25.01],
    ],
  },
  {
    id: 'lagos-rotterdam',
    region: 'Europe',
    originPort: 'Tin Can Island, Lagos',
    destinationPort: 'Rotterdam, Netherlands',
    countryName: 'Netherlands',
    countryIsoNumeric: '528',
    transitDays: '16–20 Days',
    incoterms: 'FOB / CFR / CIF',
    carriers: 'CMA CGM · Maersk · Hapag-Lloyd',
    primaryCargo: 'Grade 1 Cocoa Beans, Whitish Sesame, Shea Butter, Soybeans',
    primaryCargoFr: 'Cacao Grade 1, Sésame Blanc, Beurre de Karité, Soja',
    productIdForQuote: 'hulled-white-sesame',
    statusNote: 'Active Weekly EU MRL-Verified Direct Loop',
    statusNoteFr: 'Rotation Directe Hebdomadaire Conforme LMR UE',
    waypoints: [
      [3.38, 6.44],
      [-7.7, 3.8],
      [-17.8, 16.5],
      [-15.5, 31.0],
      [-10.2, 42.5],
      [-4.5, 49.0],
      [4.48, 51.92],
    ],
  },
  {
    id: 'lagos-hamburg',
    region: 'Europe',
    originPort: 'Apapa Wharf, Lagos',
    destinationPort: 'Hamburg, Germany',
    countryName: 'Germany',
    countryIsoNumeric: '276',
    transitDays: '18–22 Days',
    incoterms: 'FOB / CIF / DAP',
    carriers: 'Hapag-Lloyd · MSC · Grimaldi',
    primaryCargo: 'Dried Split Ginger, Deep-Red Hibiscus (Zobo), Cocoa',
    primaryCargoFr: 'Gingembre Séché Fendu, Fleurs d’Hibiscus, Cacao',
    productIdForQuote: 'dried-split-ginger-hibiscus',
    statusNote: 'Phytosanitary + Aflatoxin Certified Corridor',
    statusNoteFr: 'Corridor Certifié Phytosanitaire & Aflatoxine',
    waypoints: [
      [3.38, 6.44],
      [-8.5, 4.2],
      [-18.2, 18.0],
      [-15.0, 34.0],
      [-9.5, 44.0],
      [-2.0, 50.2],
      [4.5, 53.6],
      [9.99, 53.55],
    ],
  },
  {
    id: 'lagos-london',
    region: 'Europe',
    originPort: 'Apapa / Tin Can Island',
    destinationPort: 'London Gateway / Felixstowe, UK',
    countryName: 'United Kingdom',
    countryIsoNumeric: '826',
    transitDays: '15–19 Days',
    incoterms: 'FOB / CIF',
    carriers: 'Maersk · Grimaldi · CMA CGM',
    primaryCargo: 'Retail Garri/Yam/Plantain Flour, Egusi, Tiger Nuts, Beans',
    primaryCargoFr: 'Farines Garri/Igname/Plantain, Egusi, Souchet, Niébé',
    productIdForQuote: 'hulled-white-sesame',
    statusNote: 'Dedicated West African Processed Food & Agro Loop',
    statusNoteFr: 'Ligne Dédiée Produits Alimentaires Ouest-Africains',
    waypoints: [
      [3.38, 6.44],
      [-7.2, 3.6],
      [-17.2, 17.5],
      [-14.5, 33.0],
      [-8.2, 45.0],
      [-3.5, 50.0],
      [0.47, 51.5],
    ],
  },
  {
    id: 'lagos-savannah',
    region: 'Americas',
    originPort: 'Apapa Wharf, Lagos',
    destinationPort: 'Savannah / Houston, USA',
    countryName: 'United States of America',
    countryIsoNumeric: '840',
    transitDays: '19–25 Days',
    incoterms: 'FOB / CFR / CIF',
    carriers: 'Maersk · MSC · Hapag-Lloyd',
    primaryCargo: 'Cashew W320, Hulled Sesame, Dried Ginger & Retail Food',
    primaryCargoFr: 'Cajou W320, Sésame Décortiqué, Gingembre & Alimentaire',
    productIdForQuote: 'raw-cashew-soybeans',
    statusNote: 'FDA Prior Notice & SGS CoA Enabled',
    statusNoteFr: 'Conforme FDA Prior Notice & Certificat SGS',
    waypoints: [
      [3.38, 6.44],
      [-14.0, 4.5],
      [-35.0, 12.0],
      [-58.0, 21.0],
      [-74.0, 27.5],
      [-81.09, 32.08],
    ],
  },
  {
    id: 'lagos-santos',
    region: 'Americas',
    originPort: 'Apapa / Onne',
    destinationPort: 'Santos, Brazil',
    countryName: 'Brazil',
    countryIsoNumeric: '076',
    transitDays: '12–16 Days',
    incoterms: 'FOB / CFR / CIF',
    carriers: 'MSC · CMA CGM · Grimaldi',
    primaryCargo: 'South Atlantic Bulk Commodities & Critical Minerals',
    primaryCargoFr: 'Vrac Atlantique Sud & Minerais Critiques',
    productIdForQuote: 'lithium-spodumene-lepidolite',
    statusNote: 'Direct South Atlantic Express Crossing',
    statusNoteFr: 'Traversée Express Atlantique Sud',
    waypoints: [
      [3.38, 6.44],
      [-10.0, -3.5],
      [-26.0, -13.0],
      [-40.0, -21.0],
      [-46.33, -23.96],
    ],
  },
];

export default function GlobalLogisticsRoutes({
  onSelectRouteForQuote,
}: GlobalLogisticsRoutesProps) {
  const { lang } = useLanguage();
  const [regionFilter, setRegionFilter] = useState<CorridorRegion>('All');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('lagos-qingdao');
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const mapLayerRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(
    null
  );

  const width = 960;
  const height = 470;

  const projection = useMemo(() => {
    return d3
      .geoNaturalEarth1()
      .scale(192)
      .center([12, 10])
      .translate([width / 2, height / 2]);
  }, []);

  const pathGenerator = useMemo(() => d3.geoPath(projection), [projection]);

  const countriesGeo = useMemo(() => {
    const topology = countriesAtlas as unknown as Topology<{
      countries: GeometryCollection;
    }>;
    return feature(topology, topology.objects.countries);
  }, []);

  const graticulePath = useMemo(() => {
    const graticule = d3.geoGraticule10();
    return pathGenerator(graticule) || '';
  }, [pathGenerator]);

  const spherePath = useMemo(() => {
    return pathGenerator({ type: 'Sphere' }) || '';
  }, [pathGenerator]);

  const lineGenerator = useMemo(() => {
    return d3
      .line<[number, number]>()
      .x((pt) => projection(pt)?.[0] ?? 0)
      .y((pt) => projection(pt)?.[1] ?? 0)
      .curve(d3.curveCatmullRom.alpha(0.55));
  }, [projection]);

  // Attach interactive D3 pan & zoom behavior to the map SVG
  useEffect(() => {
    const svgEl = svgRef.current;
    const gEl = mapLayerRef.current;
    if (!svgEl || !gEl) return;

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 4])
      .translateExtent([
        [-80, -40],
        [width + 80, height + 40],
      ])
      .on('zoom', (event) => {
        d3.select(gEl).attr('transform', event.transform.toString());
        setZoomScale(event.transform.k);
      });

    zoomBehaviorRef.current = zoomBehavior;
    d3.select(svgEl).call(zoomBehavior);

    return () => {
      d3.select(svgEl).on('.zoom', null);
    };
  }, []);

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(260)
      .call(zoomBehaviorRef.current.scaleBy, 1.35);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(260)
      .call(zoomBehaviorRef.current.scaleBy, 0.75);
  };

  const handleZoomReset = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  const visibleRoutes = useMemo(() => {
    if (regionFilter === 'All') return SHIPPING_ROUTES;
    return SHIPPING_ROUTES.filter((r) => r.region === regionFilter);
  }, [regionFilter]);

  // Keep selected route inside visible filter
  useEffect(() => {
    if (!visibleRoutes.some((r) => r.id === selectedRouteId) && visibleRoutes[0]) {
      setSelectedRouteId(visibleRoutes[0].id);
    }
  }, [visibleRoutes, selectedRouteId]);

  const activeRoute = useMemo(() => {
    const targetId = hoveredRouteId || selectedRouteId;
    return (
      visibleRoutes.find((r) => r.id === targetId) ||
      SHIPPING_ROUTES.find((r) => r.id === targetId) ||
      SHIPPING_ROUTES[0]
    );
  }, [hoveredRouteId, selectedRouteId, visibleRoutes]);

  const highlightedDestIsos = useMemo(() => {
    return new Set(visibleRoutes.map((r) => r.countryIsoNumeric));
  }, [visibleRoutes]);

  const inlandFeederPath = useMemo(() => {
    // Kano / Nasarawa Mine Gate -> Lagos Port Complex
    return lineGenerator([
      [8.52, 12.0],
      [6.1, 9.1],
      [3.38, 6.44],
    ]);
  }, [lineGenerator]);

  return (
    <section
      id="logistics-routes"
      className="py-16 lg:py-24 bg-slate-950 text-white border-b border-slate-800"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header & Region Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-amber-400 mb-2">
              {lang === 'fr'
                ? 'Réseau Logistique Maritime D3'
                : 'Global Maritime Trade Network'}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance mb-3">
              {lang === 'fr'
                ? 'Corridors d’Exportation Actifs : Nigeria → Asie, Europe & Amériques'
                : 'Global Logistics Routes & Active Ocean Shipping Lanes'}
            </h2>
            <p className="text-base text-slate-300 leading-relaxed">
              {lang === 'fr'
                ? 'Visualisez les liaisons maritimes FCL et vrac d’Ahzan Tech Ltd depuis Apapa, Tin Can Island et Onne vers les principaux ports de raffinage et de négoce en Asie, Europe et Amérique.'
                : 'Interactive D3 corridor map tracing active FCL and bulk export lanes from Nigerian origin hubs (Apapa, Tin Can Island, Onne) to deep-sea buyer terminals across Asia, Europe, and the Americas.'}
            </p>
          </div>

          {/* Region Filter Bar */}
          <div
            role="tablist"
            aria-label="Filter export corridors by destination region"
            className="inline-flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-lg shrink-0"
          >
            {(['All', 'Asia', 'Europe', 'Americas'] as const).map((region) => {
              const count =
                region === 'All'
                  ? SHIPPING_ROUTES.length
                  : SHIPPING_ROUTES.filter((r) => r.region === region).length;
              const isSelected = regionFilter === region;
              return (
                <button
                  key={region}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setRegionFilter(region)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {region !== 'All' && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-slate-950' : REGION_COLORS[region].dot
                      }`}
                    />
                  )}
                  <span>
                    {region === 'All'
                      ? lang === 'fr'
                        ? `Tous (${count})`
                        : `All Lanes (${count})`
                      : `${region} (${count})`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main 12-Column Map + Route Intelligence Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 8 Columns: D3 Geo World Map */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            {/* Map Top Legend & Zoom Controls */}
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-white ring-2 ring-amber-500" />
                  <span>Nigeria Origin Hubs</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-amber-400" />
                  <span>Asia</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-emerald-400" />
                  <span>Europe</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-sky-400" />
                  <span>Americas</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-slate-400 mr-1 tabular-nums">
                  {zoomScale.toFixed(1)}×
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  aria-label="Zoom in map"
                  className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  aria-label="Zoom out map"
                  className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  aria-label="Reset map view"
                  className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Responsive D3 SVG Canvas */}
            <div className="relative flex-1 bg-slate-950 min-h-[340px] sm:min-h-[430px] select-none">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label="Interactive D3 Global Logistics Routes map from Nigeria to Asia, Europe, and the Americas"
                className="w-full h-full block cursor-grab active:cursor-grabbing"
              >
                <defs>
                  <radialGradient id="oceanGlow" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#020617" />
                  </radialGradient>
                </defs>

                <g ref={mapLayerRef}>
                  {/* Ocean sphere */}
                  <path d={spherePath} fill="url(#oceanGlow)" stroke="#1e293b" strokeWidth={0.8} />

                  {/* Latitude/Longitude graticule */}
                  <path
                    d={graticulePath}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth={0.4}
                    strokeOpacity={0.65}
                  />

                  {/* Countries geometry from world-atlas TopoJSON via D3 */}
                  <g>
                    {countriesGeo.features.map((geo, idx) => {
                      const d = pathGenerator(geo);
                      if (!d) return null;
                      const isoId = String(geo.id || idx);
                      const isNigeria = isoId === '566';
                      const isDestinationCountry = highlightedDestIsos.has(isoId);

                      return (
                        <path
                          key={`${isoId}-${idx}`}
                          d={d}
                          fill={
                            isNigeria
                              ? '#334155'
                              : isDestinationCountry
                                ? '#172554'
                                : '#0f172a'
                          }
                          stroke={isNigeria ? '#f59e0b' : '#1e293b'}
                          strokeWidth={isNigeria ? 1.1 : 0.55}
                        />
                      );
                    })}
                  </g>

                  {/* Inland Kano / Nasarawa Mine Gate -> Lagos Port Feeder */}
                  {inlandFeederPath && (
                    <path
                      d={inlandFeederPath}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth={1.4}
                      strokeDasharray="3 3"
                      strokeOpacity={0.9}
                    />
                  )}

                  {/* Active Ocean Shipping Lanes */}
                  <g>
                    {visibleRoutes.map((route) => {
                      const routePath = lineGenerator(route.waypoints);
                      if (!routePath) return null;
                      const isSelected = activeRoute.id === route.id;
                      const color = REGION_COLORS[route.region].stroke;

                      return (
                        <g
                          key={route.id}
                          onMouseEnter={() => setHoveredRouteId(route.id)}
                          onMouseLeave={() => setHoveredRouteId(null)}
                          onClick={() => setSelectedRouteId(route.id)}
                          className="cursor-pointer"
                        >
                          {/* Wide transparent hit target for easy hover/click */}
                          <path
                            d={routePath}
                            fill="none"
                            stroke="transparent"
                            strokeWidth={12}
                          />
                          {/* Soft base shipping lane */}
                          <path
                            d={routePath}
                            fill="none"
                            stroke={color}
                            strokeWidth={isSelected ? 2.6 : 1.35}
                            strokeOpacity={isSelected ? 0.95 : 0.45}
                            strokeLinecap="round"
                          />
                          {/* Animated active shipping pulse */}
                          <path
                            d={routePath}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth={isSelected ? 1.6 : 0.9}
                            strokeOpacity={isSelected ? 0.9 : 0.4}
                            strokeDasharray="6 14"
                            strokeLinecap="round"
                          >
                            <animate
                              attributeName="stroke-dashoffset"
                              from="40"
                              to="0"
                              dur={isSelected ? '1.8s' : '3.2s'}
                              repeatCount="indefinite"
                            />
                          </path>
                        </g>
                      );
                    })}
                  </g>

                  {/* Destination Port Nodes */}
                  <g>
                    {visibleRoutes.map((route) => {
                      const endPt = projection(
                        route.waypoints[route.waypoints.length - 1]
                      );
                      if (!endPt) return null;
                      const isSelected = activeRoute.id === route.id;
                      const color = REGION_COLORS[route.region].stroke;

                      return (
                        <g
                          key={`port-${route.id}`}
                          transform={`translate(${endPt[0]}, ${endPt[1]})`}
                          onMouseEnter={() => setHoveredRouteId(route.id)}
                          onMouseLeave={() => setHoveredRouteId(null)}
                          onClick={() => setSelectedRouteId(route.id)}
                          className="cursor-pointer"
                        >
                          {isSelected && (
                            <circle
                              r={10}
                              fill={color}
                              fillOpacity={0.22}
                              stroke={color}
                              strokeWidth={0.8}
                            >
                              <animate
                                attributeName="r"
                                values="6;13;6"
                                dur="2.2s"
                                repeatCount="indefinite"
                              />
                              <animate
                                attributeName="fill-opacity"
                                values="0.35;0.05;0.35"
                                dur="2.2s"
                                repeatCount="indefinite"
                              />
                            </circle>
                          )}
                          <circle
                            r={isSelected ? 4.8 : 3.4}
                            fill={color}
                            stroke="#020617"
                            strokeWidth={1.2}
                          />
                          {isSelected && (
                            <g transform="translate(8, -6)">
                              <rect
                                x={0}
                                y={-9}
                                width={Math.max(85, route.destinationPort.length * 5.6 + 12)}
                                height={16}
                                rx={3}
                                fill="#020617"
                                fillOpacity={0.9}
                                stroke={color}
                                strokeWidth={0.7}
                              />
                              <text
                                x={6}
                                y={1.5}
                                fill="#f8fafc"
                                fontSize={8.5}
                                fontWeight={600}
                                fontFamily="JetBrains Mono, monospace"
                              >
                                {route.destinationPort}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </g>

                  {/* Nigerian Origin Hubs */}
                  <g>
                    {ORIGIN_HUBS.map((hub) => {
                      const pt = projection(hub.coords);
                      if (!pt) return null;
                      return (
                        <g key={hub.id} transform={`translate(${pt[0]}, ${pt[1]})`}>
                          {hub.isPort && (
                            <circle
                              r={9}
                              fill="#f59e0b"
                              fillOpacity={0.22}
                            >
                              <animate
                                attributeName="r"
                                values="5;11;5"
                                dur="2.4s"
                                repeatCount="indefinite"
                              />
                            </circle>
                          )}
                          <circle
                            r={hub.isPort ? 4.4 : 3.2}
                            fill="#ffffff"
                            stroke="#f59e0b"
                            strokeWidth={1.8}
                          />
                        </g>
                      );
                    })}
                  </g>
                </g>
              </svg>

              {/* Floating Origin Tag */}
              <div className="pointer-events-none absolute bottom-3 left-3 px-3 py-1.5 bg-slate-950/85 border border-slate-800 rounded-md text-[11px] font-mono text-slate-300">
                Origin Dispatch: <span className="text-amber-400 font-semibold">Apapa / Tin Can / Onne (NG)</span>
              </div>
            </div>
          </div>

          {/* Right 4 Columns: Active Corridor Inspector & Route Selector */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Selected Route Detail Card */}
            <div className="p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-semibold rounded border ${
                      REGION_COLORS[activeRoute.region].badgeBg
                    }`}
                  >
                    <Compass className="w-3 h-3" />
                    <span>{activeRoute.region} Corridor</span>
                  </span>
                  <h3 className="font-display text-xl font-bold text-white mt-2">
                    {activeRoute.destinationPort}
                  </h3>
                  <p className="text-xs text-slate-400">
                    From {activeRoute.originPort} · {activeRoute.countryName}
                  </p>
                </div>
                <Ship className="w-5 h-5 text-amber-400 shrink-0 mt-1" />
              </div>

              <dl className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
                <div>
                  <dt className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>{lang === 'fr' ? 'Transit' : 'Ocean Transit'}</span>
                  </dt>
                  <dd className="font-mono font-bold text-white mt-0.5 tabular-nums">
                    {activeRoute.transitDays}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 flex items-center gap-1">
                    <Anchor className="w-3 h-3 text-emerald-400" />
                    <span>Incoterms</span>
                  </dt>
                  <dd className="font-mono font-semibold text-white mt-0.5">
                    {activeRoute.incoterms}
                  </dd>
                </div>
              </dl>

              <div className="p-3 bg-slate-950/75 border border-slate-800 rounded-lg space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block">
                    {lang === 'fr' ? 'Cargaisons Principales' : 'Primary Export Cargo'}
                  </span>
                  <span className="font-medium text-slate-100">
                    {lang === 'fr'
                      ? activeRoute.primaryCargoFr
                      : activeRoute.primaryCargo}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-400">Lines:</span>
                  <span className="font-mono text-slate-200">{activeRoute.carriers}</span>
                </div>
                <div className="text-[11px] font-medium text-emerald-400">
                  {lang === 'fr' ? activeRoute.statusNoteFr : activeRoute.statusNote}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectRouteForQuote(activeRoute.productIdForQuote)}
                className="w-full py-2.5 px-4 inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer"
              >
                <span>
                  {lang === 'fr'
                    ? `Demander Cotation (${activeRoute.destinationPort})`
                    : `Request Route Quote (${activeRoute.destinationPort})`}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrollable Shipping Lanes List */}
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2.5 px-1">
                <span>
                  {lang === 'fr' ? 'Lignes Actives' : 'Active Shipping Lanes'}
                </span>
                <span className="font-mono text-amber-400 tabular-nums">
                  {visibleRoutes.length} {lang === 'fr' ? 'routes' : 'corridors'}
                </span>
              </div>

              <div className="space-y-1.5 max-h-[210px] overflow-y-auto pr-1">
                {visibleRoutes.map((route) => {
                  const isActive = activeRoute.id === route.id;
                  return (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => setSelectedRouteId(route.id)}
                      onMouseEnter={() => setHoveredRouteId(route.id)}
                      onMouseLeave={() => setHoveredRouteId(null)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        isActive
                          ? 'bg-slate-800 border-amber-500/60 text-white'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            REGION_COLORS[route.region].dot
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">
                            {route.destinationPort}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {route.originPort}
                          </div>
                        </div>
                      </div>

                      <span className="font-mono text-[11px] text-slate-300 shrink-0 tabular-nums">
                        {route.transitDays}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
