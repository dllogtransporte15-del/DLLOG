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
            // Pegar a presença mais recente
            const latest = presences[presences.length - 1];

            // Só adicionar ao mapa se tiver localização GPS real (lat/lng != 0)
            if (
              latest.location &&
              typeof latest.location.lat === 'number' &&
              typeof latest.location.lng === 'number' &&
              (latest.location.lat !== 0 || latest.location.lng !== 0)
            ) {
              console.log(`[useDriverLocations] Motorista ${key} localizado em:`, latest.location.lat, latest.location.lng);
              locations.set(key, latest.location as DriverLocation);
            } else {
              console.log(`[useDriverLocations] Motorista ${key} online mas sem GPS ainda.`);
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
        // Remover do mapa quando o motorista desconectar
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
