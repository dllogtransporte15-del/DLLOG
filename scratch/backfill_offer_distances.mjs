import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=([^\s]+)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=([^\s]+)/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

const LOGISTICS_CITY_COORDINATES = {
  'patrocinio': { lat: -18.9433, lng: -46.9944 },
  'perdizes': { lat: -19.3528, lng: -47.2917 },
  'uberaba': { lat: -19.7483, lng: -47.9319 },
  'uberlandia': { lat: -18.9186, lng: -48.2772 },
  'araguari': { lat: -18.6472, lng: -48.1872 },
  'araxa': { lat: -19.5933, lng: -46.9406 },
  'sacramento': { lat: -19.8653, lng: -47.4403 },
  'lagamar': { lat: -18.1811, lng: -46.8089 },
  'patos de minas': { lat: -18.5789, lng: -46.5181 },
  'serra do salitre': { lat: -19.1111, lng: -46.6908 },
  'pouso alegre': { lat: -22.2300, lng: -45.9364 },
  'alfenas': { lat: -21.4289, lng: -45.9464 },
  'monte belo': { lat: -21.3189, lng: -46.3364 },
  'passos': { lat: -20.7230, lng: -46.6110 },
  'ituiutaba': { lat: -18.9697, lng: -49.4653 },
  'coromandel': { lat: -18.4736, lng: -47.2003 },
  'pratinha': { lat: -19.7431, lng: -46.7867 },
  'rio paranaiba': { lat: -19.1914, lng: -46.2444 },
  'eloi mendes': { lat: -21.6111, lng: -45.5658 },
  'guaxupe': { lat: -21.3056, lng: -46.7117 },
  'cruzilia': { lat: -21.8417, lng: -44.8083 },
  'santa luzia': { lat: -19.7697, lng: -43.8514 },
  'catalao': { lat: -18.1691, lng: -47.9463 },
  'ipameri': { lat: -17.7219, lng: -48.1597 },
  'nazario': { lat: -16.5833, lng: -49.8833 },
  'rio verde': { lat: -17.7915, lng: -50.9202 },
  'mineiros': { lat: -17.5694, lng: -52.5514 },
  'jatai': { lat: -17.8814, lng: -51.7144 },
  'goiania': { lat: -16.6869, lng: -49.2648 },
  'anapolis': { lat: -16.3267, lng: -48.9528 },
  'cristalina': { lat: -16.7686, lng: -47.6133 },
  'luziania': { lat: -16.2528, lng: -47.9500 },
  'formosa': { lat: -15.5367, lng: -47.3344 },
  'castilho': { lat: -20.8697, lng: -51.4883 },
  'ponte gestal': { lat: -20.1878, lng: -49.7083 },
  'aruana': { lat: -14.9170, lng: -51.0755 },
  'sao sebastiao do rio claro': { lat: -15.7355, lng: -51.4730 },
  'inaciolandia': { lat: -18.3961, lng: -50.0194 },
  'nova crixas': { lat: -14.4809, lng: -50.4308 },
  'montes claros de goias': { lat: -15.9443, lng: -51.7256 },
  'indianopolis': { lat: -19.0436, lng: -47.9208 },
  'formoso': { lat: -14.9450, lng: -46.4513 },
  'hidrolandia': { lat: -17.0598, lng: -49.3957 },
  'campo verde': { lat: -15.5458, lng: -55.1667 },
  'buriti alegre': { lat: -18.1433, lng: -49.0439 },
  'cristianopolis': { lat: -17.1983, lng: -48.7042 },
  'cristinopolis': { lat: -17.1983, lng: -48.7042 },
  'santos': { lat: -23.9608, lng: -46.3339 },
  'guaruja': { lat: -23.9930, lng: -46.2570 },
  'cubatao': { lat: -23.8950, lng: -46.4253 },
  'orlandia': { lat: -20.7206, lng: -47.8878 },
  'paranagua': { lat: -25.5204, lng: -48.5093 },
  'gurupi': { lat: -11.7297, lng: -49.0686 }
};

function normalizeName(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findCityCoords(cityName) {
  if (!cityName) return null;
  const norm = normalizeName(cityName);
  if (!norm) return null;
  if (LOGISTICS_CITY_COORDINATES[norm]) return LOGISTICS_CITY_COORDINATES[norm];

  const words = norm.split(' ');
  const stateTokens = ['mg', 'go', 'sp', 'pr', 'ms', 'mt', 'to', 'rj', 'es', 'ba', 'sc', 'rs', 'df'];
  const cleanWords = words.filter(w => !stateTokens.includes(w));
  const withoutState = cleanWords.join(' ');

  if (withoutState && LOGISTICS_CITY_COORDINATES[withoutState]) {
    return LOGISTICS_CITY_COORDINATES[withoutState];
  }

  for (const [key, coords] of Object.entries(LOGISTICS_CITY_COORDINATES)) {
    if (norm.includes(key) || key.includes(withoutState)) return coords;
  }
  return null;
}

function dmsToDecimal(degrees, minutes, seconds, direction) {
  let dd = degrees + minutes / 60 + seconds / 3600;
  if (direction === 'S' || direction === 'W' || direction === 's' || direction === 'w') {
    dd = dd * -1;
  }
  return dd;
}

const parseCoordinates = (str) => {
  if (!str) return null;
  const decoded = decodeURIComponent(str).trim();

  const directMatch = decoded.match(/^(-?\d{1,2}\.\d+)\s*[\s,]\s*(-?\d{1,3}\.\d+)$/);
  if (directMatch) {
    const lat = parseFloat(directMatch[1]);
    const lng = parseFloat(directMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  const atMatch = decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  const d3d4Match = decoded.match(/!?3d(-?\d+\.\d+)!?4d(-?\d+\.\d+)/);
  if (d3d4Match) {
    const lat = parseFloat(d3d4Match[1]);
    const lng = parseFloat(d3d4Match[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  const dirMatch = decoded.match(/!1d(-?\d+\.\d+)!2d(-?\d+\.\d+)/);
  if (dirMatch) {
    const lng = parseFloat(dirMatch[1]);
    const lat = parseFloat(dirMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  const paramMatch = decoded.match(/[?&](?:q|ll|destination|origin|center)=(-?\d+\.\d+)[,\s+]+(-?\d+\.\d+)/i);
  if (paramMatch) {
    const lat = parseFloat(paramMatch[1]);
    const lng = parseFloat(paramMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  const pathMatch = decoded.match(/\/(?:search|place|dir)\/(-?\d+\.\d+)[,\s+]+(-?\d+\.\d+)/i);
  if (pathMatch) {
    const lat = parseFloat(pathMatch[1]);
    const lng = parseFloat(pathMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  const dmsMatch = decoded.match(/(\d{1,2})[°\s](\d{1,2})['\s]([\d.]+)["]?\s*([NSns])[\s+,]+(\d{1,3})[°\s](\d{1,2})['\s]([\d.]+)["]?\s*([EWew])/);
  if (dmsMatch) {
    const lat = dmsToDecimal(parseFloat(dmsMatch[1]), parseFloat(dmsMatch[2]), parseFloat(dmsMatch[3]), dmsMatch[4]);
    const lng = dmsToDecimal(parseFloat(dmsMatch[5]), parseFloat(dmsMatch[6]), parseFloat(dmsMatch[7]), dmsMatch[8]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  return null;
};

async function resolveUrl(url) {
  if (!url || !url.startsWith('http')) return url;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    return res.url;
  } catch (e) {
    return url;
  }
}

async function geocodeCity(cityStr) {
  if (!cityStr) return null;
  const known = findCityCoords(cityStr);
  if (known) return known;

  const clean = cityStr.replace(/https?:\/\/[^\s]+/g, '').replace(/[\\/]/g, ' ').trim();
  if (!clean || clean.length < 2) return null;

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean + ', Brasil')}&limit=1&accept-language=pt-br`, {
      headers: { 'User-Agent': 'TranscunhaControl/1.0 (logistica@transcunha.com.br)' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    }
  } catch (e) {}
  return null;
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function getDrivingDistance(oCoords, dCoords) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${oCoords.lng},${oCoords.lat};${dCoords.lng},${dCoords.lat}?overview=false`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.[0]) {
        return Math.round(data.routes[0].distance / 1000);
      }
    }
  } catch (e) {}
  return Math.round(getDistanceKm(oCoords.lat, oCoords.lng, dCoords.lat, dCoords.lng) * 1.25);
}

const { data: offers, error } = await supabase.from('freight_offers').select('*');
if (error) {
  console.error('Error fetching offers:', error);
  process.exit(1);
}

console.log(`Processing ${offers.length} offers...`);

for (const offer of offers) {
  let origCoords = parseCoordinates(offer.origin_location);
  let isExactOrig = Boolean(origCoords);
  if (!origCoords && offer.origin_location?.startsWith('http')) {
    const longUrl = await resolveUrl(offer.origin_location);
    origCoords = parseCoordinates(longUrl);
    if (origCoords) isExactOrig = true;
  }
  if (!origCoords) {
    origCoords = await geocodeCity(offer.origin);
  }

  let destCoords = parseCoordinates(offer.destination_location);
  let isExactDest = Boolean(destCoords);
  if (!destCoords && offer.destination_location?.startsWith('http')) {
    const longUrl = await resolveUrl(offer.destination_location);
    destCoords = parseCoordinates(longUrl);
    if (destCoords) isExactDest = true;
  }
  if (!destCoords) {
    destCoords = await geocodeCity(offer.destination);
  }

  if (origCoords && destCoords) {
    const isExact = isExactOrig && isExactDest;
    const distanceKm = await getDrivingDistance(origCoords, destCoords);

    // Update history meta_dest_obs
    const history = Array.isArray(offer.history) ? [...offer.history] : [];
    let metaIndex = history.findIndex(h => h.id === 'meta_dest_obs');
    let metaPayload = {};
    if (metaIndex >= 0) {
      try {
        metaPayload = JSON.parse(history[metaIndex].description || '{}');
      } catch (e) {}
    } else {
      metaIndex = history.length;
      history.push({
        id: 'meta_dest_obs',
        userId: 'system',
        timestamp: offer.created_at || new Date().toISOString(),
        description: '{}'
      });
    }

    metaPayload.originCoords = origCoords;
    metaPayload.destinationCoords = destCoords;
    metaPayload.distanceKm = distanceKm;
    metaPayload.isExactDistance = isExact;

    history[metaIndex].description = JSON.stringify(metaPayload);

    const { error: updErr } = await supabase
      .from('freight_offers')
      .update({ history })
      .eq('id', offer.id);

    if (updErr) {
      console.error(`Failed to update offer ${offer.id}:`, updErr.message);
    } else {
      console.log(`✓ ${offer.origin} -> ${offer.destination}: ${distanceKm} km (Exato: ${isExact ? 'SIM' : 'NÃO'})`);
    }
  } else {
    console.log(`✗ Sem coords: ${offer.id} (${offer.origin} -> ${offer.destination})`);
  }
}

console.log('Finished backfill!');
