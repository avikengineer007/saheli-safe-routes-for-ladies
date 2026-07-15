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
  { id: 'cp_delhi', label: 'Connaught Place', sublabel: 'New Delhi, Delhi', lat: 28.6315, lng: 77.2167 },
  { id: 'india_gate', label: 'India Gate', sublabel: 'New Delhi, Delhi', lat: 28.6129, lng: 77.2295 },
  { id: 'marine_mumbai', label: 'Marine Drive', sublabel: 'Mumbai, Maharashtra', lat: 18.9438, lng: 72.8232 },
  { id: 'gateway_mumbai', label: 'Gateway of India', sublabel: 'Mumbai, Maharashtra', lat: 18.9220, lng: 72.8347 },
  { id: 'mg_road_blr', label: 'MG Road Metro', sublabel: 'Bengaluru, Karnataka', lat: 12.9756, lng: 77.6066 },
  { id: 'koramangala_blr', label: 'Koramangala 5th Block', sublabel: 'Bengaluru, Karnataka', lat: 12.9352, lng: 77.6245 },
  { id: 'park_street_kol', label: 'Park Street Metro', sublabel: 'Kolkata, West Bengal', lat: 22.5552, lng: 88.3510 },
  { id: 'howrah_kol', label: 'Howrah Railway Station', sublabel: 'Howrah, West Bengal', lat: 22.5833, lng: 88.3419 },
  { id: 'salt_lake_kol', label: 'Salt Lake Sector V', sublabel: 'Kolkata, West Bengal', lat: 22.5769, lng: 88.4304 },
  { id: 'tnagar_chennai', label: 'T. Nagar', sublabel: 'Chennai, Tamil Nadu', lat: 13.0418, lng: 80.2341 },
  { id: 'hitec_hyd', label: 'HITEC City', sublabel: 'Hyderabad, Telangana', lat: 17.4435, lng: 78.3772 },
  { id: 'charminar_hyd', label: 'Charminar', sublabel: 'Hyderabad, Telangana', lat: 17.3616, lng: 78.4747 },
  { id: 'hawa_mahal_jaipur', label: 'Hawa Mahal', sublabel: 'Jaipur, Rajasthan', lat: 26.9239, lng: 75.8267 },
  { id: 'hazratganj_lko', label: 'Hazratganj', sublabel: 'Lucknow, Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { id: 'police_bazaar_shg', label: 'Police Bazaar', sublabel: 'Shillong, Meghalaya', lat: 25.5760, lng: 91.8847 },
  { id: 'gsroad_ghy', label: 'GS Road ABC Crossing', sublabel: 'Guwahati, Assam', lat: 26.1554, lng: 91.7783 },
  { id: 'sabarmati_ahm', label: 'Sabarmati Riverfront', sublabel: 'Ahmedabad, Gujarat', lat: 23.0225, lng: 72.5714 },
  { id: 'sec17_chd', label: 'Sector 17 Plaza', sublabel: 'Chandigarh, UT', lat: 30.7358, lng: 76.7873 },
  { id: 'lal_chowk_srg', label: 'Lal Chowk', sublabel: 'Srinagar, J&K', lat: 34.0850, lng: 74.8059 },
  { id: 'marine_kochi', label: 'Marine Drive Kochi', sublabel: 'Kochi, Kerala', lat: 9.9641, lng: 76.2820 },
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
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=in&limit=6&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (res.ok) {
      const data = await res.json();
      return data.map((item: any, i: number) => {
        const addr = item.address || {};
        const main = addr.road || addr.neighbourhood || addr.suburb || addr.amenity || item.display_name.split(',')[0];
        const sub = [addr.city || addr.town || addr.village, addr.state].filter(Boolean).join(', ');
        return {
          id: `nominatim_${i}`,
          label: main,
          sublabel: sub || undefined,
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

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!inputRef.current || !window.google?.maps?.places?.Autocomplete) return;

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

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners?.(autocompleteRef.current);
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

      if (userLocation && (userLocation.lat !== 28.6315)) {
        // Use already-acquired GPS location
        loc = userLocation;
      } else {
        // Request fresh GPS
        loc = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            reject,
            { enableHighAccuracy: true, timeout: 8000 }
          );
        });
      }

      const name = await reverseGeocode(loc.lat, loc.lng);
      setQuery(name);
      setSelectedCoords(loc);
      onChange(name, loc);
    } catch (err) {
      console.warn('[SAHELI] GPS not available:', err);
      // Show placeholder message
      setQuery('My Current Location');
      onChange('My Current Location', userLocation);
    } finally {
      setIsGpsLoading(false);
    }
  };

  const showFallbackDropdown = showDropdown && suggestions.length > 0 && !window.google?.maps?.places?.Autocomplete;

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
