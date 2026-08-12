import { supabase } from '../supabase';
import { extractFiscalDocNumbersFromUrls } from '../utils/fiscalDocParser';
import type {
  Client, Owner, Driver, Vehicle, Product, Cargo, Shipment, User, Ticket, ProfilePermissions, ShipmentLock, Branch, FreightOffer
} from '../types';

// ─────────────────────────────────────────────
// HELPERS: Map DB rows (snake_case) ↔ App types (camelCase)
// ─────────────────────────────────────────────

const toFreightOffer = (row: any): FreightOffer => {
  const rawHistory = row.history || [];
  const metaLog = rawHistory.find((h: any) => h.id === 'meta_dest_obs');
  let additionalDestinations = undefined;
  let observations = undefined;
  let attachments = undefined;
  let freightType: 'CIF' | 'FOB' | undefined = row.freight_type || undefined;
  let hasIcms: boolean | undefined = row.has_icms !== undefined ? row.has_icms : undefined;
  let icmsPercentage: number | undefined = row.icms_percentage !== undefined ? Number(row.icms_percentage) : undefined;

  if (metaLog) {
    try {
      const parsed = JSON.parse(metaLog.description);
      additionalDestinations = parsed.additionalDestinations;
      observations = parsed.observations;
      attachments = parsed.attachments;
      if (parsed.driverId) row.driverId = parsed.driverId;
      if (parsed.cargoId) row.cargoId = parsed.cargoId;
      if (parsed.requestedEmbarcadorId) row.requestedEmbarcadorId = parsed.requestedEmbarcadorId;
      if (parsed.requestTimestamp) row.requestTimestamp = parsed.requestTimestamp;
      if (parsed.freightType) freightType = parsed.freightType;
      if (parsed.hasIcms !== undefined) hasIcms = parsed.hasIcms;
      if (parsed.icmsPercentage !== undefined) icmsPercentage = parsed.icmsPercentage;
    } catch (e) {
      console.error('Error parsing freight offer metadata:', e);
    }
  }

  return {
    id: row.id,
    clientId: row.client_id,
    origin: row.origin,
    originLocation: row.origin_location,
    destination: row.destination,
    destinationLocation: row.destination_location,
    totalTonnage: Number(row.total_tonnage),
    dailySchedule: row.daily_schedule,
    freightValuePerTon: Number(row.freight_value_per_ton),
    productId: row.product_id,
    status: row.status,
    counterOfferValue: row.counter_offer_value ? Number(row.counter_offer_value) : undefined,
    createdAt: row.created_at,
    history: rawHistory.filter((h: any) => h.id !== 'meta_dest_obs'),
    additionalDestinations,
    observations,
    attachments,
    driverId: row.driverId,
    cargoId: row.cargoId,
    requestedEmbarcadorId: row.requestedEmbarcadorId,
    requestTimestamp: row.requestTimestamp,
    freightType,
    hasIcms,
    icmsPercentage,
  };
};

export const fetchFreightOffers = async (): Promise<FreightOffer[]> => {
  try {
    const data = await fetchAllRows('freight_offers', 'created_at', { ascending: true });
    const rawOffers = data.map(toFreightOffer);

    let currentSeq = 1;
    const formattedOffers = rawOffers.map((offer: FreightOffer) => {
      if (offer.id && /^OFR-\d+$/i.test(offer.id)) {
        const match = offer.id.match(/^OFR-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num >= currentSeq) {
            currentSeq = num + 1;
          }
        }
        return { ...offer, displayId: offer.id };
      } else {
        const formattedId = `OFR-${String(currentSeq).padStart(2, '0')}`;
        currentSeq++;
        return { ...offer, displayId: formattedId };
      }
    });

    return formattedOffers.reverse();
  } catch (error: any) {
    if (error.code === '42P01') {
      console.warn('Table freight_offers does not exist yet. Returning empty array.');
      return [];
    }
    console.error('Error fetching freight offers:', error);
    return [];
  }
};

const fromFreightOffer = (o: FreightOffer | Omit<FreightOffer, 'id'>) => {
  const history = [...(o.history || [])].filter(h => h.id !== 'meta_dest_obs');
  
  if ((o.additionalDestinations && o.additionalDestinations.length > 0) || o.observations || (o.attachments && o.attachments.length > 0) || o.driverId || o.cargoId || o.requestedEmbarcadorId || o.requestTimestamp || o.freightType || o.hasIcms !== undefined || o.icmsPercentage !== undefined) {
    history.push({
      id: 'meta_dest_obs',
      userId: 'system',
      timestamp: o.createdAt || new Date().toISOString(),
      description: JSON.stringify({
        additionalDestinations: o.additionalDestinations,
        observations: o.observations,
        attachments: o.attachments,
        driverId: o.driverId,
        cargoId: o.cargoId,
        requestedEmbarcadorId: o.requestedEmbarcadorId,
        requestTimestamp: o.requestTimestamp,
        freightType: o.freightType,
        hasIcms: o.hasIcms,
        icmsPercentage: o.icmsPercentage,
      })
    });
  }

  return {
    id: (o as FreightOffer).id,
    client_id: o.clientId,
    origin: o.origin,
    origin_location: o.originLocation,
    destination: o.destination,
    destination_location: o.destinationLocation,
    total_tonnage: o.totalTonnage,
    daily_schedule: o.dailySchedule,
    freight_value_per_ton: o.freightValuePerTon || 0,
    product_id: o.productId,
    status: o.status,
    counter_offer_value: o.counterOfferValue,
    created_at: o.createdAt,
    history,
  };
};

export const upsertFreightOffer = async (offer: FreightOffer | Omit<FreightOffer, 'id' | 'createdAt'>): Promise<void> => {
  const isUuid = 'id' in offer && typeof offer.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(offer.id);
  const offerUuid = isUuid ? (offer as FreightOffer).id : crypto.randomUUID();

  const row = fromFreightOffer({
    ...offer,
    id: offerUuid,
    createdAt: ('createdAt' in offer && offer.createdAt) ? offer.createdAt : new Date().toISOString()
  });
  
  const { error } = await supabase.from('freight_offers').upsert(row);
  if (error) throw error;
};

const toClient = (row: any): Client => ({
  id: row.id,
  razaoSocial: row.razao_social || '',
  nomeFantasia: row.nome_fantasia || '',
  cnpj: row.cnpj || '',
  phone: row.phone || '',
  email: row.email || '',
  address: row.address || '',
  city: row.city || '',
  state: row.state || '',
  paymentMethod: row.payment_method || 'Prazo',
  paymentTerm: typeof row.payment_term === 'number' ? row.payment_term : (parseInt(row.payment_term, 10) || 0),
  requiresExternalOrder: !!row.requires_external_order,
  requiresScheduling: !!row.requires_scheduling,
});

const fromClient = (c: Client | Omit<Client, 'id'>) => ({
  id: (c as Client).id,
  razao_social: c.razaoSocial,
  nome_fantasia: c.nomeFantasia,
  cnpj: c.cnpj,
  phone: c.phone || '',
  email: c.email || '',
  address: c.address || '',
  city: c.city || '',
  state: c.state || '',
  payment_method: c.paymentMethod,
  payment_term: c.paymentTerm !== undefined && c.paymentTerm !== null ? String(c.paymentTerm) : '0',
  requires_external_order: c.requiresExternalOrder ?? false,
  requires_scheduling: c.requiresScheduling ?? false,
});

const toOwner = (row: any): Owner => ({
  id: row.id,
  name: row.name,
  cpfCnpj: row.cpf_cnpj,
  phone: row.phone,
  type: row.type,
  bankDetails: row.bank_details,
});

const fromOwner = (o: Owner | Omit<Owner, 'id'>) => ({
  id: (o as Owner).id,
  name: o.name,
  cpf_cnpj: o.cpfCnpj,
  phone: o.phone,
  type: o.type,
  bank_details: o.bankDetails,
});

const toDriver = (row: any): Driver => ({
  id: row.id,
  name: row.name,
  cpf: row.cpf,
  cnh: row.cnh,
  phone: row.phone,
  classification: row.classification,
  ownerId: row.owner_id,
  active: row.active ?? true,
  restrictionReason: row.restriction_reason,
  has_app: row.has_app ?? false,
});

const fromDriver = (d: Driver | Omit<Driver, 'id'>) => ({
  id: (d as Driver).id,
  name: d.name,
  cpf: d.cpf,
  cnh: d.cnh,
  phone: d.phone,
  classification: d.classification,
  owner_id: d.ownerId || null,
  active: d.active !== undefined ? d.active : true,
  restriction_reason: d.restrictionReason,
  has_app: (d as Driver).has_app ?? false,
});

const toVehicle = (row: any): Vehicle => ({
  id: row.id,
  plate: row.plate,
  setType: row.set_type,
  bodyType: row.body_type,
  classification: row.classification,
  driverId: row.driver_id,
  ownerId: row.owner_id,
});

const fromVehicle = (v: Vehicle | Omit<Vehicle, 'id'>) => ({
  id: (v as Vehicle).id,
  plate: v.plate,
  set_type: v.setType,
  body_type: v.bodyType,
  classification: v.classification,
  driver_id: v.driverId || null,
  owner_id: v.ownerId || null,
});

const toProduct = (row: any): Product => ({
  id: row.id,
  name: row.name,
  unit: row.unit,
  // Retrocompatibilidade: se a coluna for null (antes da migration), assume true (fluxo completo)
  requiresRiskManagement: row.requires_risk_management !== false,
});

const safeParseJson = (val: any, fallback: any) => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val;
};

export const toCargo = (row: any): Cargo => ({
  id: row.id,
  sequenceId: row.sequence_id,
  clientId: row.client_id,
  productId: row.product_id,
  origin: row.origin,
  originLocation: row.origin_location,
  originMapLink: row.origin_map_link,
  destination: row.destination,
  destinationLocation: row.destination_location,
  destinationMapLink: row.destination_map_link,
  totalVolume: Number(row.total_volume),
  scheduledVolume: Number(row.scheduled_volume),
  loadedVolume: Number(row.loaded_volume),
  companyFreightValuePerTon: Number(row.company_freight_value_per_ton),
  driverFreightValuePerTon: Number(row.driver_freight_value_per_ton),
  hasIcms: row.has_icms,
  icmsPercentage: Number(row.icms_percentage),
  requiresScheduling: row.requires_scheduling,
  type: row.type,
  status: row.status,
  createdAt: row.created_at,
  createdById: row.created_by_id,
  history: safeParseJson(row.history, []),
  loadingDeadline: row.loading_deadline,
  allowedVehicleTypes: safeParseJson(row.allowed_vehicle_types, undefined),
  freightLegs: safeParseJson(row.freight_legs, undefined),
  dailySchedule: safeParseJson(row.daily_schedule, undefined),
  observations: row.observations,
  attachments: safeParseJson(row.attachments, []),
  originCoords: safeParseJson(row.origin_coords, undefined),
  destinationCoords: safeParseJson(row.destination_coords, undefined),
  salespersonName: row.salesperson_name,
  salespersonCommissionPerTon: Number(row.salesperson_commission_per_ton),
  branchId: row.branch_id,
  allowedProfiles: (() => {
    if (row.allowed_profiles) return safeParseJson(row.allowed_profiles, undefined);
    const rawHistory = safeParseJson(row.history, []);
    const metaLog = Array.isArray(rawHistory) ? rawHistory.find((h: any) => h.id === 'meta_allowed_profiles') : null;
    if (metaLog) {
      try {
        return JSON.parse(metaLog.description);
      } catch {
        return undefined;
      }
    }
    return undefined;
  })(),
  allowedUserIds: (() => {
    if (row.allowed_user_ids) return safeParseJson(row.allowed_user_ids, undefined);
    const rawHistory = safeParseJson(row.history, []);
    const metaLog = Array.isArray(rawHistory) ? rawHistory.find((h: any) => h.id === 'meta_allowed_user_ids') : null;
    if (metaLog) {
      try {
        return JSON.parse(metaLog.description);
      } catch {
        return undefined;
      }
    }
    return undefined;
  })(),
});

const fromCargo = (c: Cargo | Omit<Cargo, 'id'>) => {
  let history = c.history ? [...c.history] : [];
  if (c.allowedProfiles) {
    history = history.filter(h => h.id !== 'meta_allowed_profiles');
    history.push({
      id: 'meta_allowed_profiles',
      userId: 'system',
      timestamp: new Date().toISOString(),
      description: JSON.stringify(c.allowedProfiles)
    });
  }
  if (c.allowedUserIds) {
    history = history.filter(h => h.id !== 'meta_allowed_user_ids');
    history.push({
      id: 'meta_allowed_user_ids',
      userId: 'system',
      timestamp: new Date().toISOString(),
      description: JSON.stringify(c.allowedUserIds)
    });
  }

  return {
    id: (c as Cargo).id,
    sequence_id: c.sequenceId,
    client_id: c.clientId,
    product_id: c.productId,
    origin: c.origin,
    origin_location: c.originLocation,
    origin_map_link: c.originMapLink,
    destination: c.destination,
    destination_location: c.destinationLocation,
    destination_map_link: c.destinationMapLink,
    total_volume: c.totalVolume,
    scheduled_volume: c.scheduledVolume,
    loaded_volume: c.loadedVolume,
    company_freight_value_per_ton: c.companyFreightValuePerTon,
    driver_freight_value_per_ton: c.driverFreightValuePerTon,
    has_icms: c.hasIcms,
    icms_percentage: c.icmsPercentage,
    requires_scheduling: c.requiresScheduling,
    type: c.type,
    status: c.status,
    created_at: c.createdAt,
    created_by_id: c.createdById,
    history: history,
    loading_deadline: c.loadingDeadline,
    allowed_vehicle_types: c.allowedVehicleTypes,
    freight_legs: c.freightLegs,
    daily_schedule: c.dailySchedule,
    observations: c.observations,
    attachments: c.attachments || [],
    origin_coords: c.originCoords ? (typeof c.originCoords === 'string' ? c.originCoords : JSON.stringify(c.originCoords)) : null,
    destination_coords: c.destinationCoords ? (typeof c.destinationCoords === 'string' ? c.destinationCoords : JSON.stringify(c.destinationCoords)) : null,
    salesperson_name: c.salespersonName,
    salesperson_commission_per_ton: c.salespersonCommissionPerTon,
    branch_id: c.branchId || null,
    allowed_profiles: c.allowedProfiles || null,
    allowed_user_ids: c.allowedUserIds || null,
  };
};

const toShipment = (row: any): Shipment => ({
  id: row.id,
  orderId: row.order_id,
  cargoId: row.cargo_id,
  driverName: row.driver_name,
  driverContact: row.driver_contact,
  driverCpf: row.driver_cpf,
  embarcadorId: row.embarcador_id,
  horsePlate: row.horse_plate,
  trailer1Plate: row.trailer1_plate,
  trailer2Plate: row.trailer2_plate,
  trailer3Plate: row.trailer3_plate,
  shipmentTonnage: Number(row.shipment_tonnage),
  driverFreightValue: Number(row.driver_freight_value),
  status: row.status,
  scheduledDate: row.scheduled_date,
  scheduledTime: row.scheduled_time,
  arrivalTime: row.arrival_time,
  documents: row.documents || {},
  history: row.history || [],
  createdAt: row.created_at,
  createdById: row.created_by_id,
  statusHistory: row.status_history || [],
  anttOwnerIdentifier: row.antt_owner_identifier,
  paymentMethod: row.payment_method || row.documents?.payment_method,
  pixKey: row.pix_key || row.documents?.pix_key,
  bankDetails: row.bank_details,
  advancePercentage: row.advance_percentage !== null && row.advance_percentage !== undefined ? Number(row.advance_percentage) : (row.documents?.advance_percentage !== undefined ? Number(row.documents.advance_percentage) : undefined),
  advanceValue: row.advance_value !== null ? Number(row.advance_value) : undefined,
  tollValue: row.toll_value !== null ? Number(row.toll_value) : undefined,
  vehicleTag: row.vehicle_tag,
  companyFreightRateSnapshot: row.company_freight_rate_snapshot !== null ? Number(row.company_freight_rate_snapshot) : undefined,
  driverFreightRateSnapshot: row.driver_freight_rate_snapshot !== null ? Number(row.driver_freight_rate_snapshot) : undefined,
  driverFreightType: row.driver_freight_type || 'PJ',
  route: row.route,
  cancellationReason: row.cancellation_reason,
  driverReferences: Array.isArray(row.driver_references) ? row.driver_references.join('\n') : (row.driver_references || ''),
  ownerContact: row.owner_contact,
  balanceToReceiveValue: row.balance_to_receive_value !== null ? Number(row.balance_to_receive_value) : undefined,
  discountValue: row.discount_value !== null ? Number(row.discount_value) : undefined,
  netBalanceValue: row.net_balance_value !== null ? Number(row.net_balance_value) : undefined,
  unloadedTonnage: row.unloaded_tonnage !== null ? Number(row.unloaded_tonnage) : undefined,
  vehicleSetType: row.vehicle_set_type,
  vehicleBodyType: row.vehicle_body_type,
  riskReleaseCode: row.risk_release_code || row.documents?.risk_release_code,
  riskQueryType: row.risk_query_type || row.documents?.risk_query_type,
  riskQueryCost: row.risk_query_cost !== null && row.risk_query_cost !== undefined ? Number(row.risk_query_cost) : (row.documents?.risk_query_cost !== undefined ? Number(row.documents.risk_query_cost) : undefined),
  cteNumber: row.cte_number || row.documents?.cte_number,
  nfeNumber: row.nfe_number || row.documents?.nfe_number,
  mdfeNumber: row.mdfe_number || row.documents?.mdfe_number,
});

const fromShipment = (s: Shipment) => ({
  id: s.id,
  order_id: s.orderId,
  cargo_id: s.cargoId,
  driver_name: s.driverName,
  driver_contact: s.driverContact,
  driver_cpf: s.driverCpf,
  embarcador_id: s.embarcadorId,
  horse_plate: s.horsePlate,
  trailer1_plate: s.trailer1Plate,
  trailer2_plate: s.trailer2Plate,
  trailer3_plate: s.trailer3Plate,
  shipment_tonnage: s.shipmentTonnage,
  driver_freight_value: s.driverFreightValue,
  status: s.status,
  scheduled_date: s.scheduledDate,
  scheduled_time: s.scheduledTime,
  arrival_time: s.arrivalTime,
  documents: {
    ...(s.documents || {}),
    ...(s.riskReleaseCode ? { risk_release_code: s.riskReleaseCode } : {}),
    ...(s.riskQueryType ? { risk_query_type: s.riskQueryType } : {}),
    ...(s.riskQueryCost !== undefined ? { risk_query_cost: s.riskQueryCost } : {}),
    ...(s.paymentMethod ? { payment_method: s.paymentMethod } : {}),
    ...(s.pixKey ? { pix_key: s.pixKey } : {}),
    ...(s.advancePercentage !== undefined ? { advance_percentage: s.advancePercentage } : {}),
    ...(s.cteNumber ? { cte_number: s.cteNumber } : {}),
    ...(s.nfeNumber ? { nfe_number: s.nfeNumber } : {}),
    ...(s.mdfeNumber ? { mdfe_number: s.mdfeNumber } : {}),
  },
  history: s.history,
  created_at: s.createdAt,
  created_by_id: s.createdById,
  status_history: s.statusHistory,
  antt_owner_identifier: s.anttOwnerIdentifier,
  payment_method: s.paymentMethod,
  pix_key: s.pixKey,
  bank_details: s.bankDetails,
  advance_percentage: s.advancePercentage,
  advance_value: s.advanceValue,
  toll_value: s.tollValue,
  vehicle_tag: s.vehicleTag,
  company_freight_rate_snapshot: s.companyFreightRateSnapshot,
  driver_freight_rate_snapshot: s.driverFreightRateSnapshot,
  driver_freight_type: s.driverFreightType || 'PJ',
  route: s.route,
  cancellation_reason: s.cancellationReason,
  driver_references: s.driverReferences ? s.driverReferences.split('\n').filter(Boolean) : [],
  owner_contact: s.ownerContact,
  balance_to_receive_value: s.balanceToReceiveValue,
  discount_value: s.discountValue,
  net_balance_value: s.netBalanceValue,
  unloaded_tonnage: s.unloadedTonnage,
  branch_id: s.branchId || null,
  vehicle_set_type: s.vehicleSetType,
  vehicle_body_type: s.vehicleBodyType,
  risk_release_code: s.riskReleaseCode,
  risk_query_type: s.riskQueryType,
  risk_query_cost: s.riskQueryCost,
});

export const toUser = (row: any): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  profile: row.profile,
  active: row.active,
  phone: row.phone,
  password: row.password,
  clientId: row.client_id,
  requirePasswordChange: row.require_password_change,
  authId: row.auth_id,
  passwordUpdatedAt: row.password_updated_at,
  branchId: row.branch_id,
  customPermissions: row.permissions,
});

export const fromUser = (u: User | Omit<User, 'id'>) => ({
  id: (u as User).id,
  name: u.name,
  email: u.email,
  profile: u.profile,
  active: u.active,
  phone: u.phone,
  password: u.password,
  client_id: u.clientId,
  require_password_change: u.requirePasswordChange,
  auth_id: u.authId,
  password_updated_at: u.passwordUpdatedAt,
  branch_id: u.branchId || null,
  permissions: (u as User).customPermissions,
});

const toTicket = (row: any): Ticket => {
  let cleanDesc = row.description || '';
  const cargoMatch = cleanDesc.match(/\[CARGO_ID:\s*(.*?)\]/);
  const shipmentMatch = cleanDesc.match(/\[SHIPMENT_ID:\s*(.*?)\]/);
  
  const cargoId = cargoMatch ? cargoMatch[1] : undefined;
  const shipmentId = shipmentMatch ? shipmentMatch[1] : undefined;

  if (cargoMatch || shipmentMatch) {
    cleanDesc = cleanDesc.replace(/\[CARGO_ID:\s*.*?\]/g, '').replace(/\[SHIPMENT_ID:\s*.*?\]/g, '').trim();
  }

  return {
    id: row.id,
    title: row.title,
    description: cleanDesc,
    status: row.status,
    priority: row.priority,
    createdById: row.created_by_id,
    assignedToId: row.assigned_to_id,
    createdAt: row.created_at,
    history: row.history || [],
    cargoId,
    shipmentId,
  };
};

const fromTicket = (t: Ticket | Omit<Ticket, 'id' | 'history' | 'createdAt' | 'createdById'>) => {
  let finalDesc = t.description;
  const ticketObj = t as Ticket;
  if (ticketObj.cargoId) finalDesc += `\n\n[CARGO_ID: ${ticketObj.cargoId}]`;
  if (ticketObj.shipmentId) finalDesc += `\n\n[SHIPMENT_ID: ${ticketObj.shipmentId}]`;

  return {
    id: ticketObj.id,
    title: t.title,
    description: finalDesc,
    status: t.status,
    priority: t.priority,
    created_by_id: ticketObj.createdById,
    assigned_to_id: t.assignedToId,
    created_at: ticketObj.createdAt,
    history: ticketObj.history || [],
  };
};

const toBranch = (row: any): Branch => ({
  id: row.id,
  name: row.name,
  city: row.city,
  state: row.state,
  createdAt: row.created_at,
});

const fromBranch = (b: Branch | Omit<Branch, 'id' | 'createdAt'>) => ({
  id: (b as Branch).id,
  name: b.name,
  city: b.city,
  state: b.state,
});

// ─────────────────────────────────────────────
// FETCH HELPERS: Handle Auth Errors
// ─────────────────────────────────────────────

const handleAuthError = (error: any, defaultValue: any) => {
  if (error.code === 'PGRST116' || error.status === 406 || error.status === 401) {
    console.warn('[DB] Auth/RLS error or no data found:', error.message);
    return defaultValue;
  }
  throw error;
};

// ─────────────────────────────────────────────
// FETCH ALL
// ─────────────────────────────────────────────

async function fetchAllRows(
  tableName: string,
  orderColumn: string,
  orderOptions?: { ascending?: boolean }
): Promise<any[]> {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(orderColumn, orderOptions)
      .range(from, to);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    allData = allData.concat(data);

    if (data.length < pageSize) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allData;
}

export async function fetchClients(): Promise<Client[]> {
  try {
    const data = await fetchAllRows('clients', 'nome_fantasia');
    return data.map(toClient);
  } catch (error) {
    return handleAuthError(error, []);
  }
}

export async function fetchOwners(): Promise<Owner[]> {
  try {
    const data = await fetchAllRows('owners', 'name');
    return data.map(toOwner);
  } catch (error) {
    return handleAuthError(error, []);
  }
}

export async function fetchDrivers(): Promise<Driver[]> {
  try {
    const data = await fetchAllRows('drivers', 'name');
    return data.map(toDriver);
  } catch (error) {
    return handleAuthError(error, []);
  }
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  try {
    const data = await fetchAllRows('vehicles', 'plate');
    return data.map(toVehicle);
  } catch (error) {
    return handleAuthError(error, []);
  }
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const data = await fetchAllRows('products', 'name');
    return data.map(toProduct);
  } catch (error) {
    return handleAuthError(error, []);
  }
}

export async function fetchCargos(): Promise<Cargo[]> {
  try {
    const data = await fetchAllRows('cargos', 'created_at', { ascending: false });
    return data.map(toCargo);
  } catch (error) {
    return handleAuthError(error, []);
  }
}

export async function fetchPaginatedCargos(page: number, limit: number, filters?: { status?: string }): Promise<{ data: Cargo[], count: number }> {
  let query = supabase.from('cargos').select('*', { count: 'exact' });
  
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  } else if (filters?.status === 'all') {
    // Optionally exclude 'Fechada' by default if that's the logic
  }
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) {
    console.error('Error fetching paginated cargos:', error);
    return { data: [], count: 0 };
  }
  return { data: (data || []).map(toCargo), count: count || 0 };
}

export async function fetchShipments(): Promise<Shipment[]> {
  try {
    const data = await fetchAllRows('shipments', 'created_at', { ascending: false });
    return data.map(toShipment);
  } catch (error) {
    return handleAuthError(error, []);
  }
}

export async function fetchPaginatedShipments(page: number, limit: number, filters?: { status?: string }): Promise<{ data: Shipment[], count: number }> {
  let query = supabase.from('shipments').select('*', { count: 'exact' });
  
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  } else if (filters?.status === 'all') {
    query = query.neq('status', 'Cancelado').neq('status', 'Finalizado');
  }
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) {
    console.error('Error fetching paginated shipments:', error);
    return { data: [], count: 0 };
  }
  return { data: (data || []).map(toShipment), count: count || 0 };
}

export async function fetchUsers(): Promise<User[]> {
  try {
    const data = await fetchAllRows('app_users', 'name');
    return data.map(toUser);
  } catch (error) {
    return handleAuthError(error, []);
  }
}

export async function fetchTickets(): Promise<Ticket[]> {
  try {
    const data = await fetchAllRows('tickets', 'created_at', { ascending: false });
    return data.map(toTicket);
  } catch (error) {
    return handleAuthError(error, []);
  }
}

export async function fetchBranches(): Promise<Branch[]> {
  try {
    const data = await fetchAllRows('branches', 'name');
    return data.map(toBranch);
  } catch (error) {
    return handleAuthError(error, []);
  }
}

export async function fetchShipmentLocks(): Promise<ShipmentLock[]> {
  const { data, error } = await supabase.from('shipment_locks').select('*');
  if (error) return handleAuthError(error, []);
  return (data || []).map(row => ({
    id: row.id,
    shipmentId: row.shipment_id,
    userId: row.user_id,
    userName: row.user_name,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

export async function fetchProfilePermissions(): Promise<ProfilePermissions | null> {
  const { data, error } = await supabase.from('profile_permissions').select('permissions').eq('id', 1).single();
  if (error) return null;
  return data?.permissions || null;
}

export async function fetchAppSettings(): Promise<{ company_logo: string | null; theme_image: string | null } | null> {
  const { data, error } = await supabase.from('app_settings').select('company_logo, theme_image').eq('id', 1).single();
  if (error) return null;
  return data || null;
}

// ─────────────────────────────────────────────
// UPSERT (insert or update)
// ─────────────────────────────────────────────

export async function upsertClient(client: Client): Promise<void> {
  const { error } = await supabase.from('clients').upsert(fromClient(client));
  if (error) throw error;
}

export async function upsertOwner(owner: Owner): Promise<void> {
  const { error } = await supabase.from('owners').upsert(fromOwner(owner));
  if (error) throw error;
}

export async function upsertDriver(driver: Driver): Promise<void> {
  const { error } = await supabase.from('drivers').upsert(fromDriver(driver));
  if (error) throw error;
}

export async function upsertVehicle(vehicle: Vehicle): Promise<void> {
  const { error } = await supabase.from('vehicles').upsert(fromVehicle(vehicle));
  if (error) throw error;
}

export async function upsertCargo(cargo: Cargo): Promise<void> {
  const payload = fromCargo(cargo);
  console.log('[upsertCargo] Saving cargo:', cargo.id, payload);
  let error;
  if (cargo.id) {
    // Existing record: use update to guarantee the row is written
    const result = await supabase.from('cargos').update(payload).eq('id', cargo.id);
    error = result.error;
    if (error && (error.message?.includes('allowed_profiles') || error.message?.includes('allowed_user_ids'))) {
      const fallbackPayload = { ...payload };
      delete (fallbackPayload as any).allowed_profiles;
      delete (fallbackPayload as any).allowed_user_ids;
      const retryResult = await supabase.from('cargos').update(fallbackPayload).eq('id', cargo.id);
      error = retryResult.error;
    }
  } else {
    let result = await supabase.from('cargos').insert(payload).select().single();
    error = result.error;
    if (error && (error.message?.includes('allowed_profiles') || error.message?.includes('allowed_user_ids'))) {
      const fallbackPayload = { ...payload };
      delete (fallbackPayload as any).allowed_profiles;
      delete (fallbackPayload as any).allowed_user_ids;
      result = await supabase.from('cargos').insert(fallbackPayload).select().single();
      error = result.error;
    }
    if (!error && result.data) {
      (cargo as any).id = result.data.id;
    }
  }
  if (error) {
    console.error('[upsertCargo] Error:', error);
    throw error;
  }
  console.log('[upsertCargo] Success for cargo:', cargo.id);
}

export async function upsertShipment(shipment: Shipment): Promise<void> {
  const payload = fromShipment(shipment);
  let error;
  if (shipment.id) {
    const result = await supabase.from('shipments').update(payload).eq('id', shipment.id);
    error = result.error;
  } else {
    const result = await supabase.from('shipments').insert(payload);
    error = result.error;
  }
  if (error) {
    console.error('[upsertShipment] Error:', error);
    throw error;
  }
}

/**
 * Backfill: lê os arquivos CT-e, NF-e e MDF-e já armazenados no Storage
 * para embarques antigos que não têm esses números registrados em `documents`.
 * Executa silenciosamente em background — erros individuais são ignorados.
 */
export async function backfillShipmentFiscalNumbers(
  onProgress?: (done: number, total: number) => void
): Promise<{ updated: number; skipped: number }> {
  // Busca apenas embarques que não têm cte_number, nfe_number nem mdfe_number em documents
  const { data: rows, error } = await supabase
    .from('shipments')
    .select('id, documents')
    .not('documents', 'is', null);

  if (error || !rows) {
    console.warn('[backfill] Falha ao buscar embarques:', error);
    return { updated: 0, skipped: 0 };
  }

  // Filtra apenas os que têm arquivos de documentos fiscais mas não têm os números extraídos
  const fiscalDocKeys = ['CT-e', 'Nota Fiscal', 'MDF-e'];
  const candidates = rows.filter((row) => {
    const docs = row.documents || {};
    const alreadyHas = docs.cte_number || docs.nfe_number || docs.mdfe_number;
    if (alreadyHas) return false;
    return fiscalDocKeys.some((key) => Array.isArray(docs[key]) && docs[key].length > 0);
  });

  let updated = 0;
  let skipped = 0;
  const total = candidates.length;

  console.log(`[backfill] ${total} embarques candidatos para backfill de documentos fiscais.`);

  for (let i = 0; i < candidates.length; i++) {
    const row = candidates[i];
    const docs = row.documents || {};

    // Monta mapa só com arrays de strings (URLs)
    const urlMap: { [key: string]: string[] } = {};
    for (const key of fiscalDocKeys) {
      if (Array.isArray(docs[key])) urlMap[key] = docs[key];
    }

    try {
      const extracted = await extractFiscalDocNumbersFromUrls(urlMap);
      const hasAny = extracted.cteNumber || extracted.nfeNumber || extracted.mdfeNumber;

      if (hasAny) {
        const updatedDocs = {
          ...docs,
          ...(extracted.cteNumber ? { cte_number: extracted.cteNumber } : {}),
          ...(extracted.nfeNumber ? { nfe_number: extracted.nfeNumber } : {}),
          ...(extracted.mdfeNumber ? { mdfe_number: extracted.mdfeNumber } : {}),
        };

        const { error: updateError } = await supabase
          .from('shipments')
          .update({ documents: updatedDocs })
          .eq('id', row.id);

        if (!updateError) {
          console.log(`[backfill] ✅ ${row.id}: CT-e=${extracted.cteNumber || '-'}, NF-e=${extracted.nfeNumber || '-'}, MDF-e=${extracted.mdfeNumber || '-'}`);
          updated++;
        } else {
          console.warn(`[backfill] ⚠️ Falha ao atualizar ${row.id}:`, updateError.message);
          skipped++;
        }
      } else {
        skipped++;
      }
    } catch (e) {
      console.warn(`[backfill] ⚠️ Erro ao processar ${row.id}:`, e);
      skipped++;
    }

    onProgress?.(i + 1, total);
  }

  console.log(`[backfill] Concluído: ${updated} atualizados, ${skipped} ignorados.`);
  return { updated, skipped };
}


export async function upsertUser(user: User): Promise<void> {
  const { error } = await supabase.from('app_users').upsert(fromUser(user));
  if (error) throw error;
}

export async function upsertBranch(branch: Branch): Promise<void> {
  const { error } = await supabase.from('branches').upsert(fromBranch(branch));
  if (error) throw error;
}

export async function upsertTicket(ticket: Ticket): Promise<void> {
  const payload = fromTicket(ticket);
  const { error } = await supabase.from('tickets').upsert(payload);
  if (error) {
    console.error('[upsertTicket] Error details:', error);
    throw error;
  }
}

export async function deleteTicket(id: string): Promise<void> {
  const { error } = await supabase.from('tickets').delete().eq('id', id);
  if (error) {
    console.error('[deleteTicket] Error details:', error);
    throw error;
  }
}

export async function insertCargo(cargo: Cargo | Omit<Cargo, 'id'>): Promise<Cargo> {
  const payload = fromCargo(cargo);
  console.log('[insertCargo] Inserting new cargo:', (cargo as Cargo).id || 'NEW');
  const { data, error } = await supabase.from('cargos').insert(payload).select().single();
  if (error) {
    console.error('[insertCargo] Error:', error);
    throw error;
  }
  console.log('[insertCargo] Success for cargo:', data.id);
  return toCargo(data);
}

export async function insertShipment(shipment: Shipment): Promise<void> {
  const payload = fromShipment(shipment);
  const { error } = await supabase.from('shipments').insert(payload);
  if (error) {
    console.error('[insertShipment] Error:', error);
    throw error;
  }
}

export async function saveProfilePermissions(permissions: ProfilePermissions): Promise<void> {
  const { error } = await supabase.from('profile_permissions').upsert({ id: 1, permissions });
  if (error) throw error;
}

export async function saveAppSettings(settings: { company_logo?: string | null; theme_image?: string | null }): Promise<void> {
  const { error } = await supabase.from('app_settings').update(settings).eq('id', 1);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// BULK UPSERT (used during shipment creation)
// ─────────────────────────────────────────────

export async function upsertManyDrivers(drivers: Driver[]): Promise<void> {
  if (drivers.length === 0) return;
  const { error } = await supabase.from('drivers').upsert(drivers.map(fromDriver));
  if (error) throw error;
}

export async function upsertManyVehicles(vehicles: Vehicle[]): Promise<void> {
  if (vehicles.length === 0) return;
  const { error } = await supabase.from('vehicles').upsert(vehicles.map(fromVehicle));
  if (error) throw error;
}

export async function upsertManyShipments(shipments: Shipment[]): Promise<void> {
  if (shipments.length === 0) return;
  const { error } = await supabase.from('shipments').upsert(shipments.map(fromShipment));
  if (error) throw error;
}

export async function upsertManyCargos(cargos: Cargo[]): Promise<void> {
  if (cargos.length === 0) return;
  const { error } = await supabase.from('cargos').upsert(cargos.map(fromCargo));
  if (error) throw error;
}

// ─────────────────────────────────────────────
// STORAGE (Attachments)
// ─────────────────────────────────────────────

export async function uploadShipmentAttachment(shipmentId: string, docType: string, file: File): Promise<string> {
  // To avoid naming collisions and special character issues, we create a safe filename
  const safeDocType = docType.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const filePath = `${shipmentId}/${safeDocType}_${Date.now()}_${safeFileName}`;
  
  const { data, error } = await supabase.storage
    .from('shipment_attachments')
    .upload(filePath, file, { upsert: true });

  if (error) {
    console.error(`[uploadShipmentAttachment] Error uploading ${docType} for shipment ${shipmentId}:`, error);
    throw error;
  }
  
  return data.path;
}

export function getShipmentAttachmentUrl(path: string): string {
  const { data } = supabase.storage
    .from('shipment_attachments')
    .getPublicUrl(path);
    
  return data.publicUrl;
}

export async function deleteShipmentAttachmentFromStorage(url: string): Promise<void> {
  // Extract path from public URL
  // Example URL: https://[project].supabase.co/storage/v1/object/public/shipment_attachments/SHP-123/Arquivos_Iniciais_123456_file.pdf
  const parts = url.split('/shipment_attachments/');
  if (parts.length < 2) {
    console.error('[deleteShipmentAttachmentFromStorage] Could not parse path from URL:', url);
    return;
  }
  
  const path = decodeURIComponent(parts[1]);
  
  const { error } = await supabase.storage
    .from('shipment_attachments')
    .remove([path]);

  if (error) {
    console.error(`[deleteShipmentAttachmentFromStorage] Error deleting path ${path}:`, error);
    throw error;
  }
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

export async function deleteCargo(id: string): Promise<void> {
  const { error } = await supabase.from('cargos').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteShipment(id: string): Promise<void> {
  const { error } = await supabase.from('shipments').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase.from('app_users').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteBranch(id: string): Promise<void> {
  const { error } = await supabase.from('branches').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertProduct(product: Product): Promise<void> {
  const { error } = await supabase.from('products').upsert({
    id: product.id,
    name: product.name,
    unit: product.unit,
    requires_risk_management: product.requiresRiskManagement !== false, // default true
  });
  if (error) throw error;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteFreightOffer(id: string): Promise<void> {
  const { error } = await supabase.from('freight_offers').delete().eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// LOCKING
// ─────────────────────────────────────────────

export async function tryAcquireShipmentLock(shipmentId: string, userId: string, userName: string): Promise<{ success: boolean; lockedBy?: string }> {
  const { data, error } = await supabase.rpc('acquire_shipment_lock', {
    p_shipment_id: shipmentId,
    p_user_id: userId,
    p_user_name: userName
  });

  if (error) {
    console.error('Error in acquire_shipment_lock:', error);
    throw error;
  }

  return {
    success: data.success,
    lockedBy: data.locked_by
  };
}

export async function releaseShipmentLock(shipmentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('shipment_locks')
    .delete()
    .eq('shipment_id', shipmentId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error in releaseShipmentLock:', error);
    throw error;
  }
}

