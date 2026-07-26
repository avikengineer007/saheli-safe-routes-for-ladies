import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Loader2, X, Search } from 'lucide-react';

interface PlaceSuggestion {
  id: string;
  label: string;
  sublabel?: string;
  lat?: number;
  lng?: number;
}

interface PlaceSearchInputProps {
  value: string;
  onChange: (value: string, coords?: { lat: number; lng: number }) => void;
  placeholder?: string;
  label: string;
  dotColor?: 'blue' | 'red';
  showGpsButton?: boolean;
  userLocation?: { lat: number; lng: number };
  id?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

const POPULAR_INDIA_PLACES: PlaceSuggestion[] = [
  // Major Indian Airports (AAI Open Infrastructure Data)
  { id: 'ccu_airport', label: 'Netaji Subhash Chandra Bose Intl Airport (CCU)', sublabel: '✈️ AIRPORT • Kolkata, West Bengal', lat: 22.6520, lng: 88.4463 },
  { id: 'del_airport', label: 'Indira Gandhi Intl Airport (DEL)', sublabel: '✈️ AIRPORT • New Delhi, Delhi', lat: 28.5562, lng: 77.1000 },
  { id: 'bom_airport', label: 'Chhatrapati Shivaji Maharaj Intl Airport (BOM)', sublabel: '✈️ AIRPORT • Mumbai, Maharashtra', lat: 19.0896, lng: 72.8656 },
  { id: 'blr_airport', label: 'Kempegowda Intl Airport (BLR)', sublabel: '✈️ AIRPORT • Bengaluru, Karnataka', lat: 13.1986, lng: 77.7066 },
  { id: 'hyd_airport', label: 'Rajiv Gandhi Intl Airport (HYD)', sublabel: '✈️ AIRPORT • Hyderabad, Telangana', lat: 17.2403, lng: 78.4294 },
  { id: 'maa_airport', label: 'Chennai Intl Airport (MAA)', sublabel: '✈️ AIRPORT • Chennai, Tamil Nadu', lat: 12.9941, lng: 80.1709 },
  { id: 'gau_airport', label: 'Lokpriya Gopinath Bordoloi Intl Airport (GAU)', sublabel: '✈️ AIRPORT • Guwahati, Assam', lat: 26.1061, lng: 91.5859 },
  { id: 'pat_airport', label: 'Jayprakash Narayan Airport (PAT)', sublabel: '✈️ AIRPORT • Patna, Bihar', lat: 25.5913, lng: 85.0880 },

  // Major Indian Railway Stations (Indian Railways Open Infrastructure Data)
  { id: 'barrackpore_stn', label: 'Barrackpore Railway Station (BP)', sublabel: '🚆 RAILWAY STATION • Barrackpore, West Bengal', lat: 22.7630, lng: 88.3640 },
  { id: 'sealdah_stn', label: 'Sealdah Railway Station (SDAH)', sublabel: '🚆 RAILWAY STATION • Kolkata, West Bengal', lat: 22.5670, lng: 88.3712 },
  { id: 'howrah_stn', label: 'Howrah Junction Station (HWH)', sublabel: '🚆 RAILWAY STATION • Howrah, West Bengal', lat: 22.5839, lng: 88.3430 },
  { id: 'ndls_stn', label: 'New Delhi Railway Station (NDLS)', sublabel: '🚆 RAILWAY STATION • New Delhi, Delhi', lat: 28.6430, lng: 77.2194 },
  { id: 'csmt_stn', label: 'Chhatrapati Shivaji Maharaj Terminus (CSMT)', sublabel: '🚆 RAILWAY STATION • Mumbai, Maharashtra', lat: 18.9400, lng: 72.8353 },
  { id: 'sbc_stn', label: 'KSR Bengaluru City Junction (SBC)', sublabel: '🚆 RAILWAY STATION • Bengaluru, Karnataka', lat: 12.9781, lng: 77.5697 },
  { id: 'mas_stn', label: 'Chennai Central Railway Station (MAS)', sublabel: '🚆 RAILWAY STATION • Chennai, Tamil Nadu', lat: 13.0827, lng: 80.2757 },
  { id: 'sc_stn', label: 'Secunderabad Junction Station (SC)', sublabel: '🚆 RAILWAY STATION • Secunderabad, Telangana', lat: 17.4339, lng: 78.5015 },
  { id: 'ghy_stn', label: 'Guwahati Railway Station (GHY)', sublabel: '🚆 RAILWAY STATION • Guwahati, Assam', lat: 26.1810, lng: 91.7530 },
  { id: 'pnbe_stn', label: 'Patna Junction Station (PNBE)', sublabel: '🚆 RAILWAY STATION • Patna, Bihar', lat: 25.6020, lng: 85.1376 },

  // Barrackpore & Local Places
  { id: 'dada_boudi_hotel', label: 'Dada Boudi Hotel', sublabel: '🍽️ RESTAURANT • Barrackpore, West Bengal', lat: 22.7628, lng: 88.3642 },
  { id: 'dada_boudi_restaurant', label: 'Dada Boudi Restaurant', sublabel: '🍽️ RESTAURANT • Barrackpore, West Bengal', lat: 22.7625, lng: 88.3638 },
  { id: 'reliance_smart_point', label: 'Reliance Smart Point', sublabel: 'Barrackpore, West Bengal', lat: 22.7602, lng: 88.3615 },
  { id: 'audreys_korean_cafe', label: 'Audrey\'s Korean Cafe', sublabel: '🍽️ CAFE • Barrackpore, West Bengal', lat: 22.7588, lng: 88.3651 },
  { id: 'mangal_pandey_park', label: 'Mangal Pandey Park', sublabel: 'Barrackpore, West Bengal', lat: 22.7570, lng: 88.3530 },

  // Metro Cities & Iconic Places
  { id: 'flurys_kol', label: 'Flurys', sublabel: '🍽️ CAFE • Park Street, Kolkata', lat: 22.5542, lng: 88.3520 },
  { id: 'peter_cat_kol', label: 'Peter Cat Restaurant', sublabel: '🍽️ RESTAURANT • Park Street, Kolkata', lat: 22.5545, lng: 88.3525 },
  { id: 'cp_delhi', label: 'Connaught Place', sublabel: 'New Delhi, Delhi', lat: 28.6315, lng: 77.2167 },
  { id: 'marine_mumbai', label: 'Marine Drive', sublabel: 'Mumbai, Maharashtra', lat: 18.9438, lng: 72.8232 },
  { id: 'mg_road_blr', label: 'MG Road Metro', sublabel: '🚇 METRO STATION • Bengaluru, Karnataka', lat: 12.9756, lng: 77.6066 }
];

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // Try Google Maps Geocoder first
  if (window.google?.maps?.Geocoder) {
    return new Promise((resolve) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { location: { lat, lng } },
        (results: any[], status: string) => {
          if (status === 'OK' && results && results.length > 0) {
            // Find a good formatted address (not too long)
            const r = results.find(r => r.types?.includes('sublocality_level_1') || r.types?.includes('locality')) || results[0];
            resolve(r.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          } else {
            resolve(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        }
      );
    });
  }

  // Fallback: Nominatim reverse geocoding
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address;
      const parts = [
        addr?.road || addr?.neighbourhood || addr?.suburb,
        addr?.city || addr?.town || addr?.village || addr?.county,
        addr?.state,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : (data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  } catch (_) {}

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

async function searchNominatim(query: string): Promise<PlaceSuggestion[]> {
  try {
    const q = query.toLowerCase().includes('india') ? query : `${query}, India`;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=in&limit=8&addressdetails=1&extratags=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (res.ok) {
      const data = await res.json();
      return data.map((item: any, i: number) => {
        const addr = item.address || {};
        const type = item.type || item.extratags?.amenity || item.extratags?.railway || item.extratags?.aeroway || '';
        const itemClass = item.class || '';

        let badge = '';
        if (itemClass === 'railway' || type === 'station' || type === 'subway') badge = '🚆 RAILWAY STATION';
        else if (itemClass === 'aeroway' || type === 'aerodrome' || type === 'terminal') badge = '✈️ AIRPORT';
        else if (type === 'bus_station') badge = '🚌 BUS TERMINAL';
        else if (type === 'police') badge = '👮 POLICE STATION';
        else if (type === 'hospital') badge = '🏥 HOSPITAL';
        else if (itemClass === 'amenity' && ['restaurant', 'cafe', 'fast_food', 'food_court', 'pub', 'bar'].includes(type)) badge = `🍽️ ${type.replace('_', ' ').toUpperCase()}`;

        const mainName = item.name || item.extratags?.name || item.display_name.split(',')[0];
        const subDetails = [
          badge || undefined,
          addr.suburb || addr.neighbourhood || addr.city || addr.town || addr.village,
          addr.state
        ].filter(Boolean).join(' • ');

        return {
          id: `poi_${i}_${item.place_id || i}`,
          label: mainName,
          sublabel: subDetails || undefined,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        };
      });
    }
  } catch (_) {}
  return [];
}

export const PlaceSearchInput: React.FC<PlaceSearchInputProps> = ({
  value,
  onChange,
  placeholder,
  label,
  dotColor = 'blue',
  showGpsButton = false,
  userLocation,
  id,
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | undefined>();

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<any>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes (e.g., when GPS sets the value)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Initialize Google Places Autocomplete (only if Google Maps key is valid and hasn't failed auth)
  useEffect(() => {
    if (
      !inputRef.current ||
      !window.google?.maps?.places?.Autocomplete ||
      (window as any).googleMapsFailed
    ) {
      return;
    }

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'in' },
        fields: ['formatted_address', 'geometry', 'name'],
        types: ['geocode', 'establishment'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const displayName = place.name || place.formatted_address || '';
          setQuery(displayName);
          setSelectedCoords({ lat, lng });
          onChange(displayName, { lat, lng });
          setShowDropdown(false);
          setSuggestions([]);
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (e) {
      console.warn('[SAHELI] Autocomplete initialization bypassed:', e);
    }

    return () => {
      if (autocompleteRef.current) {
        try {
          window.google?.maps?.event?.clearInstanceListeners?.(autocompleteRef.current);
        } catch (_) {}
      }
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedCoords(undefined);

    // If Google Places Autocomplete is active, it handles its own dropdown
    if (autocompleteRef.current && window.google?.maps?.places?.Autocomplete) {
      onChange(val, undefined);
      return;
    }

    // Fallback: local popular places filter + Nominatim
    if (!val.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      onChange(val, undefined);
      return;
    }

    const localMatches = POPULAR_INDIA_PLACES.filter(
      p =>
        p.label.toLowerCase().includes(val.toLowerCase()) ||
        (p.sublabel?.toLowerCase().includes(val.toLowerCase()))
    ).slice(0, 4);

    setSuggestions(localMatches);
    setShowDropdown(true);
    onChange(val, undefined);

    // Debounce Nominatim search
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (val.length >= 3) {
      setIsSearching(true);
      searchTimerRef.current = setTimeout(async () => {
        const nominatimResults = await searchNominatim(val);
        const merged = [
          ...localMatches,
          ...nominatimResults.filter(n => !localMatches.some(l => l.label === n.label)),
        ].slice(0, 7);
        setSuggestions(merged);
        setIsSearching(false);
      }, 500);
    } else {
      setIsSearching(false);
    }
  }, [onChange]);

  const handleSelectSuggestion = (s: PlaceSuggestion) => {
    const displayText = s.sublabel ? `${s.label}, ${s.sublabel}` : s.label;
    setQuery(displayText);
    setSelectedCoords(s.lat !== undefined ? { lat: s.lat, lng: s.lng! } : undefined);
    onChange(displayText, s.lat !== undefined ? { lat: s.lat!, lng: s.lng! } : undefined);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedCoords(undefined);
    setSuggestions([]);
    setShowDropdown(false);
    onChange('', undefined);
    inputRef.current?.focus();
  };

  const handleUseGPS = async () => {
    setIsGpsLoading(true);
    try {
      let loc: { lat: number; lng: number };

      if (userLocation && (userLocation.lat !== 28.6315 || userLocation.lng !== 77.2167)) {
        loc = userLocation;
      } else {
        loc = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              reject,
              { enableHighAccuracy: false, timeout: 6000 }
            );
          } else {
            reject(new Error('Geolocation unsupported'));
          }
        }).catch(async () => {
          try {
            const res = await fetch('https://ipwho.is/');
            if (res.ok) {
              const data = await res.json();
              if (data.latitude && data.longitude) {
                return { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) };
              }
            }
          } catch (_) {}

          try {
            const res2 = await fetch('http://ip-api.com/json/');
            if (res2.ok) {
              const data2 = await res2.json();
              if (data2.lat && data2.lon) {
                return { lat: parseFloat(data2.lat), lng: parseFloat(data2.lon) };
              }
            }
          } catch (_) {}

          throw new Error('IP Geolocation fallback failed');
        });
      }

      const name = await reverseGeocode(loc.lat, loc.lng);
      setQuery(name);
      setSelectedCoords(loc);
      onChange(name, loc);
    } catch (err) {
      console.warn('[SAHELI] Location fetch error:', err);
      setQuery('My Current Location');
      onChange('My Current Location', userLocation);
    } finally {
      setIsGpsLoading(false);
    }
  };

  const showFallbackDropdown = showDropdown && suggestions.length > 0 && (!autocompleteRef.current || (window as any).googleMapsFailed);

  return (
    <div className="relative w-full">
      {/* Label */}
      <label
        htmlFor={id}
        className="block mb-1.5 font-bold text-xs uppercase tracking-wider text-slate-700"
      >
        {label}
      </label>

      {/* Input wrapper */}
      <div className="relative flex items-center">
        {/* Colored dot indicator */}
        <span
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full z-10 pointer-events-none ${
            dotColor === 'blue'
              ? 'bg-blue-500 ring-4 ring-blue-100'
              : 'bg-red-600 ring-4 ring-red-100'
          }`}
        />

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (!window.google?.maps?.places?.Autocomplete && suggestions.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder || 'Search any location in India...'}
          autoComplete="off"
          className="w-full pl-9 pr-20 py-3 rounded-xl border-2 border-rose-300 bg-white text-slate-900 font-extrabold text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-100 transition-all shadow-sm"
        />

        {/* Right side controls */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {/* Searching spinner */}
          {isSearching && (
            <Loader2 className="w-4 h-4 text-rose-400 animate-spin" />
          )}

          {/* Clear button */}
          {query.length > 0 && !isSearching && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              aria-label="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* GPS button */}
          {showGpsButton && (
            <button
              type="button"
              onClick={handleUseGPS}
              disabled={isGpsLoading}
              title="Use my current GPS location"
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all ${
                isGpsLoading
                  ? 'bg-rose-100 text-rose-400 cursor-wait'
                  : 'bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white shadow-md shadow-red-500/25 hover:scale-105 active:scale-95'
              }`}
            >
              {isGpsLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{isGpsLoading ? 'Locating…' : 'My Location'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Fallback suggestions dropdown (shown when Google Places Autocomplete isn't active) */}
      {showFallbackDropdown && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-[calc(100%+4px)] bg-white border-2 border-rose-300 rounded-2xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="px-3 py-1.5 flex items-center space-x-1.5 bg-rose-50 border-b border-rose-100">
            <Search className="w-3 h-3 text-rose-500" />
            <span className="text-[10px] uppercase font-black text-rose-600">India Locations</span>
            {isSearching && <Loader2 className="w-3 h-3 text-rose-400 animate-spin ml-auto" />}
          </div>

          {/* Suggestion items */}
          <div className="max-h-56 overflow-y-auto">
            {suggestions.map(s => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before click
                  handleSelectSuggestion(s);
                }}
                className="w-full text-left px-4 py-2.5 flex items-start space-x-3 hover:bg-rose-500 hover:text-white group transition-colors border-b border-slate-100 last:border-0"
              >
                <MapPin className="w-3.5 h-3.5 text-red-500 group-hover:text-rose-100 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-900 group-hover:text-white truncate">
                    {s.label}
                  </div>
                  {s.sublabel && (
                    <div className="text-[11px] font-medium text-slate-500 group-hover:text-rose-100 truncate">
                      {s.sublabel}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Coordinates badge (shown when a place with exact coords is selected) */}
      {selectedCoords && (
        <div className="mt-1.5 flex items-center space-x-1 text-[10px] font-bold text-emerald-700">
          <Navigation className="w-3 h-3" />
          <span>
            {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)} · Pinpointed
          </span>
        </div>
      )}
    </div>
  );
};
