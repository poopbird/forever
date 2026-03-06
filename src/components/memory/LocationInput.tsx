'use client';

import { useState, useEffect, useRef } from 'react';
import { searchLocations, forwardGeocode } from '@/lib/geocoding';
import type { LocationResult } from '@/lib/geocoding';

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  onCoordinatesFound: (lat: number, lng: number) => void;
}

export default function LocationInput({
  value,
  onChange,
  onCoordinatesFound,
}: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search as user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchLocations(value);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setSearching(false);
    }, 400); // wait 400ms after user stops typing

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectSuggestion(result: LocationResult) {
    onChange(result.displayName);
    onCoordinatesFound(result.lat, result.lng);
    setSuggestions([]);
    setShowDropdown(false);
  }

  // If user blurs without selecting a suggestion, try to forward-geocode what they typed
  async function handleBlur() {
    if (suggestions.length === 0 && value.trim().length >= 2) {
      const result = await forwardGeocode(value);
      if (result) {
        onCoordinatesFound(result.lat, result.lng);
        // Update the display name to the cleaner geocoded version
        onChange(result.displayName);
      }
    }
    // Small delay so click on suggestion fires before blur hides dropdown
    setTimeout(() => setShowDropdown(false), 150);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          onBlur={handleBlur}
          className="form-input pr-8"
          placeholder="e.g. Paris, France"
          autoComplete="off"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light/50 text-xs animate-pulse">
            …
          </span>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <ul
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-rose-100
                     rounded-xl shadow-lg overflow-hidden"
        >
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => selectSuggestion(s)}
                className="w-full text-left px-4 py-2.5 font-sans text-sm text-ink
                           hover:bg-rose-blush transition-colors duration-100
                           border-b border-rose-50 last:border-0"
              >
                📍 {s.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
