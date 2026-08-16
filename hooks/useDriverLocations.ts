import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { DriverLocation } from '../types';

const CHANNEL_NAME = 'driver_locations_monitor';

export function useDriverLocations() {
  const [driverLocations, setDriverLocations] = useState<Map<string, DriverLocation>>(new Map());

  useEffect(() => {
    const channel = supabase.channel(CHANNEL_NAME);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const locations = new Map<string, DriverLocation>();

        console.log('[useDriverLocations] Presence state sync:', state);

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
              const locationData: DriverLocation = {
                driverId: locObj.driverId || latest.driverId || key,
                driverName: locObj.driverName || latest.driverName || '',
                lat: locObj.lat,
                lng: locObj.lng,
                speed: locObj.speed ?? null,
                heading: locObj.heading ?? null,
                timestamp: locObj.timestamp || new Date().toISOString(),
              };
              locations.set(key, locationData);
              if (locationData.driverName) {
                locations.set(locationData.driverName.trim().toLowerCase(), locationData);
              }
            } else {
              const pendingData: any = {
                driverId: latest.driverId || key,
                driverName: latest.driverName || '',
                lat: 0,
                lng: 0,
                isAppActive: true,
                timestamp: new Date().toISOString(),
              };
              locations.set(key, pendingData);
              if (pendingData.driverName) {
                locations.set(pendingData.driverName.trim().toLowerCase(), pendingData);
              }
            }
          }
        });

        setDriverLocations(locations);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log(`[useDriverLocations] Motorista entrou: ${key}`, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log(`[useDriverLocations] Motorista saiu: ${key}`, leftPresences);
        setDriverLocations(prev => {
          const next = new Map(prev);
          next.delete(key);
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
