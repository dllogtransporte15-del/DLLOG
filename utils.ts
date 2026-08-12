export const formatId = (num: number, prefix: string, pad: number = 3): string => {
  return `${prefix}-${String(num).padStart(pad, '0')}`;
};

const numberToWordsPtBr = (num: number, gender: 'm' | 'f' = 'm'): string => {
  if (num === 0) return 'zero';

  const unitsM = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const unitsF = ['', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const units = gender === 'm' ? unitsM : unitsF;
  
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  const convertThreeDigits = (n: number, currentGender: 'm' | 'f'): string => {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    
    let res = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    const t = Math.floor(remainder / 10);
    const u = remainder % 10;

    if (h > 0) res += hundreds[h];
    if (h > 0 && remainder > 0) res += ' e ';

    if (t === 1) {
      res += teens[u];
    } else {
      if (t > 1) res += tens[t];
      if (t > 1 && u > 0) res += ' e ';
      if (u > 0 || (h === 0 && t === 0)) {
          if (!(h > 0 && t === 0 && u === 0)) {
              res += (currentGender === 'm' ? unitsM[u] : unitsF[u]);
          }
      }
    }
    return res;
  };

  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const rest = num % 1000;

  let result = '';
  if (millions > 0) {
      result += convertThreeDigits(millions, 'm') + (millions === 1 ? ' milhão' : ' milhões');
      if (thousands > 0 || rest > 0) result += ' e ';
  }

  if (thousands > 0) {
    if (thousands === 1) {
      result += 'mil';
    } else {
      result += convertThreeDigits(thousands, 'm') + ' mil';
    }
    if (rest > 0) result += ' e ';
  }

  if (rest > 0 || (millions === 0 && thousands === 0)) {
    result += convertThreeDigits(rest, gender);
  }

  return result.trim();
};

export const formatWeightPtBr = (num: number): string => {
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 1000);

  let result = '';
  
  if (integerPart > 0) {
    result += numberToWordsPtBr(integerPart, 'f') + (integerPart === 1 ? ' tonelada' : ' toneladas');
  }

  if (decimalPart > 0) {
    if (result) result += ' e ';
    result += numberToWordsPtBr(decimalPart, 'm') + (decimalPart === 1 ? ' quilo' : ' quilos');
  }

  return (result || 'zero toneladas').toUpperCase();
};

import type { FreightOffer, Cargo } from './types';
import { FreightOfferStatus } from './types';

export const getMatchedCargo = (offer: FreightOffer, cargosList?: Cargo[]): Cargo | null => {
  if (!cargosList || cargosList.length === 0) return null;

  // 1. Direct cargoId link on offer
  if (offer.cargoId) {
    const targetCargoId = offer.cargoId;
    const cleanNum = targetCargoId.replace(/\D/g, '');
    const cargoByDirectId = cargosList.find(c => 
      c.id === targetCargoId || 
      `CRG-${c.sequenceId}` === targetCargoId ||
      (cleanNum ? c.sequenceId?.toString() === cleanNum : false)
    );
    if (cargoByDirectId) return cargoByDirectId;
  }


  // 2. Extract cargo ID / sequenceId from history log description (e.g. "Carga #104 criada a partir da oferta.")
  if (offer.history && offer.history.length > 0) {
    for (const h of offer.history) {
      if (h.description && (h.description.includes('criada a partir da oferta') || h.description.includes('Carga #'))) {
        const match = h.description.match(/Carga\s+#?(CRG-\d+|\d+)/i);
        if (match) {
          const cargoIdOrNum = match[1];
          const cargoByHistory = cargosList.find(c => 
            c.id.toLowerCase() === cargoIdOrNum.toLowerCase() ||
            `CRG-${c.sequenceId}`.toLowerCase() === cargoIdOrNum.toLowerCase() ||
            c.sequenceId?.toString() === cargoIdOrNum.replace(/\D/g, '')
          );
          if (cargoByHistory) return cargoByHistory;
        }
      }
    }
  }

  // 3. Fallback matching by client, product, origin, destination
  const normalize = (str?: string) => str ? str.trim().toLowerCase().replace(/\s+/g, ' ') : '';
  const offerOrigin = normalize(offer.origin);
  const offerDest = normalize(offer.destination);

  return cargosList.find(c => {
    const matchClient = c.clientId === offer.clientId;
    const matchProduct = c.productId === offer.productId;
    const cargoOrigin = normalize(c.origin);
    const cargoDest = normalize(c.destination);
    
    const matchOrigin = cargoOrigin === offerOrigin || (cargoOrigin && offerOrigin && (cargoOrigin.includes(offerOrigin) || offerOrigin.includes(cargoOrigin)));
    const matchDest = cargoDest === offerDest || (cargoDest && offerDest && (cargoDest.includes(offerDest) || offerDest.includes(cargoDest)));

    return matchClient && matchProduct && matchOrigin && matchDest;
  }) || null;
};

export function getShipmentCte(shipment?: { cteNumber?: string; documents?: any } | null): string {
  if (!shipment) return '-';
  if (shipment.cteNumber) return shipment.cteNumber;
  if (shipment.documents?.cte_number) return String(shipment.documents.cte_number);

  const cteDocs = shipment.documents?.['CT-e'] || shipment.documents?.['CT-E'] || shipment.documents?.['cte'] || shipment.documents?.['Cte'];
  if (Array.isArray(cteDocs) && cteDocs.length > 0) {
    const extractedList: string[] = [];
    for (const item of cteDocs) {
      if (typeof item === 'string') {
        const match = item.match(/DACTE_(\d+)/i) || 
                      item.match(/CT[-_]?e[^\d]*(\d{3,8})/i) || 
                      item.match(/_(\d{3,8})\.(?:pdf|xml)/i);
        if (match && match[1]) {
          if (!extractedList.includes(match[1])) extractedList.push(match[1]);
        }
      }
    }
    if (extractedList.length > 0) return extractedList.join(', ');
  }

  return '-';
}


