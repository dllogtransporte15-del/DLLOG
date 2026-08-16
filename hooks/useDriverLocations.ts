import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { DriverLocation } from '../types';

const CHANNEL_NAME = 'driver_locations_monitor';
const LAST_LOCATIONS_KEY = 'transcunha_last_driver_locations';

export interface ExtendedDriverLocation extends DriverLocation {
  isAppActive?: boolean;
}

function getStoredLastLocations(): Record<string, ExtendedDriverLocation> {
  try {
    const data = localStorage.getItem(LAST_LOCATIONS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

function saveStoredLastLocations(records: Record<string, ExtendedDriverLocation>) {
  try {
    localStorage.setItem(LAST_LOCATIONS_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving last driver locations to localStorage', e);
  }
}

export function useDriverLocations() {
  const [driverLocations, setDriverLocations] = useState<Map<string, ExtendedDriverLocation>>(new Map());

  useEffect(() => {
    // 1. Initial load from localStorage
    const saved = getStoredLastLocations();
    const initialMap = new Map<string, ExtendedDriverLocation>();

    Object.entries(saved).forEach(([key, loc]) => {
      if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' && (loc.lat !== 0 || loc.lng !== 0)) {
        const offlineLoc: ExtendedDriverLocation = { ...loc, isAppActive: false };
        initialMap.set(key, offlineLoc);
        if (loc.driverId) initialMap.set(loc.driverId, offlineLoc);
        if (loc.driverName) initialMap.set(loc.driverName.trim().toLowerCase(), offlineLoc);
      }
    });

    setDriverLocations(initialMap);

    // 2. Realtime presence tracking
    const channel = supabase.channel(CHANNEL_NAME);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const currentSaved = getStoredLastLocations();
        const locations = new Map<string, ExtendedDriverLocation>();

        // Pre-populate with saved offline locations first
        Object.entries(currentSaved).forEach(([key, loc]) => {
          if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' && (loc.lat !== 0 || loc.lng !== 0)) {
            const offlineLoc: ExtendedDriverLocation = { ...loc, isAppActive: false };
            locations.set(key, offlineLoc);
            if (loc.driverId) locations.set(loc.driverId, offlineLoc);
            if (loc.driverName) locations.set(loc.driverName.trim().toLowerCase(), offlineLoc);
          }
        });

        // Overlay active presences
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            const latest = presences[presences.length - 1];
            const locObj = latest.location || (typeof latest.lat === 'number' ? latest : null);

            if (
              locObj &&
              typeof locObj.lat === 'number' &&
              typeof locObj.lng === 'number' &&
              (locObj.lat !== 0 || locObj.lng !== 0)
            ) {
              const locationData: ExtendedDriverLocation = {
                driverId: locObj.driverId || latest.driverId || key,
                driverName: locObj.driverName || latest.driverName || '',
                lat: locObj.lat,
                lng: locObj.lng,
                speed: locObj.speed ?? null,
                heading: locObj.heading ?? null,
                timestamp: locObj.timestamp || new Date().toISOString(),
                isAppActive: true,
              };

              locations.set(key, locationData);
              if (locationData.driverId) locations.set(locationData.driverId, locationData);
              if (locationData.driverName) {
                locations.set(locationData.driverName.trim().toLowerCase(), locationData);
              }

              // Update persistent store
              const recordKey = locationData.driverId || key;
              currentSaved[recordKey] = locationData;
              if (locationData.driverName) {
                currentSaved[locationData.driverName.trim().toLowerCase()] = locationData;
              }
            } else {
              const pendingData: ExtendedDriverLocation = {
                driverId: latest.driverId || key,
                driverName: latest.driverName || '',
                lat: 0,
                lng: 0,
                speed: null,
                heading: null,
                isAppActive: true,
                timestamp: new Date().toISOString(),
              };
              locations.set(key, pendingData);
              if (pendingData.driverId) locations.set(pendingData.driverId, pendingData);
              if (pendingData.driverName) {
                locations.set(pendingData.driverName.trim().toLowerCase(), pendingData);
              }
            }
          }
        });

        saveStoredLastLocations(currentSaved);
        setDriverLocations(locations);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log(`[useDriverLocations] Motorista entrou: ${key}`, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log(`[useDriverLocations] Motorista saiu: ${key}`, leftPresences);
        const currentSaved = getStoredLastLocations();

        setDriverLocations(prev => {
          const next = new Map(prev);
          let driverId = key;
          let driverName = '';
          if (leftPresences && leftPresences.length > 0) {
            const latest = leftPresences[leftPresences.length - 1];
            driverId = latest.driverId || key;
            driverName = latest.driverName || '';
          }

          const savedLoc = currentSaved[driverId] || (driverName ? currentSaved[driverName.trim().toLowerCase()] : null) || currentSaved[key];
          if (savedLoc) {
            const offlineLoc: ExtendedDriverLocation = { ...savedLoc, isAppActive: false };
            next.set(key, offlineLoc);
            if (driverId) next.set(driverId, offlineLoc);
            if (driverName) next.set(driverName.trim().toLowerCase(), offlineLoc);
          } else {
            next.delete(key);
          }
          return next;
        });
      })
      .subscribe((status) => {
        console.log(`[useDriverLocations] Canal status: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return driverLocations;
}

