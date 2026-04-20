import { supabase } from '../supabase';

// =============================================
// Types
// =============================================

export interface Client {
  id: string;
  name: string;
}

export interface StayRecord {
  id: string;
  clientName?: string;
  driver: string;
  plate: string;
  invoice: string;
  origin: string;
  destination: string;
  location: 'Origem' | 'Destino';
  entryDate: string;
  exitDate: string;
  totalHours: number;
  weight: number;
  valuePerHour: number;
  tolerance: number;
  totalValue: number;
  date: string; // = created_at, para compatibilidade com o histórico
}

export interface QuoteRecord {
  id: string;
  clientName?: string;
  date: string;
  origin: string;
  destination: string;
  distance: number;
  axes: number;
  cargoType: string;
  inputMode: 'PER_KM' | 'PER_TON';
  valuePerKm: number;
  driverTotalValue: number;
  tollValue: number;
  anttValue: number;
  weight: number;
  margin: number;
  driverFreightPerTon: number;
  companyFreightPerTon: number;
  companyTotalFreight: number;
  carrierNetProfit: number;
  carrierProfitMargin: number;
}

// =============================================
// Client Management
// =============================================

export async function getToolClients(userId: string): Promise<Client[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('tool_clients')
    .select('id, name')
    .eq('user_id', userId)
    .order('name');

  if (error) {
    console.error('Erro ao buscar clientes:', error);
    return [];
  }

  return (data ?? []).map(row => ({ id: row.id, name: row.name }));
}

export async function saveToolClient(userId: string, name: string): Promise<Client | null> {
  if (!userId || !name.trim()) return null;

  const { data, error } = await supabase
    .from('tool_clients')
    .upsert({ user_id: userId, name: name.trim() }, { onConflict: 'user_id,name' })
    .select('id, name')
    .single();

  if (error) {
    console.error('Erro ao salvar cliente:', error);
    return null;
  }

  return data ? { id: data.id, name: data.name } : null;
}

// =============================================
// Stays Management
// =============================================

export async function getToolStays(userId: string): Promise<StayRecord[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('tool_stays')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar estadias:', error);
    return [];
  }

  return (data ?? []).map(row => ({
    id: row.id,
    clientName: row.client_name ?? undefined,
    driver: row.driver,
    plate: row.plate,
    invoice: row.invoice ?? '',
    origin: row.origin,
    destination: row.destination,
    location: row.location as 'Origem' | 'Destino',
    entryDate: row.entry_date,
    exitDate: row.exit_date,
    totalHours: Number(row.total_hours),
    weight: Number(row.weight),
    valuePerHour: Number(row.value_per_hour),
    tolerance: Number(row.tolerance),
    totalValue: Number(row.total_value),
    date: row.created_at,
  }));
}

export async function saveToolStay(
  userId: string,
  stay: Omit<StayRecord, 'id' | 'date'>
): Promise<StayRecord | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('tool_stays')
    .insert({
      user_id: userId,
      client_name: stay.clientName ?? null,
      driver: stay.driver,
      plate: stay.plate,
      invoice: stay.invoice ?? null,
      origin: stay.origin,
      destination: stay.destination,
      location: stay.location,
      entry_date: stay.entryDate,
      exit_date: stay.exitDate,
      total_hours: stay.totalHours,
      weight: stay.weight,
      value_per_hour: stay.valuePerHour,
      tolerance: stay.tolerance,
      total_value: stay.totalValue,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Erro ao salvar estadia:', error);
    return null;
  }

  return data
    ? {
        id: data.id,
        clientName: data.client_name ?? undefined,
        driver: data.driver,
        plate: data.plate,
        invoice: data.invoice ?? '',
        origin: data.origin,
        destination: data.destination,
        location: data.location as 'Origem' | 'Destino',
        entryDate: data.entry_date,
        exitDate: data.exit_date,
        totalHours: Number(data.total_hours),
        weight: Number(data.weight),
        valuePerHour: Number(data.value_per_hour),
        tolerance: Number(data.tolerance),
        totalValue: Number(data.total_value),
        date: data.created_at,
      }
    : null;
}

export async function deleteToolStay(id: string): Promise<void> {
  const { error } = await supabase.from('tool_stays').delete().eq('id', id);
  if (error) console.error('Erro ao excluir estadia:', error);
}

// =============================================
// Quotes Management
// =============================================

export async function getToolQuotes(userId: string): Promise<QuoteRecord[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('tool_quotes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar cotações:', error);
    return [];
  }

  return (data ?? []).map(row => ({
    id: row.id,
    clientName: row.client_name ?? undefined,
    date: row.created_at,
    origin: row.origin,
    destination: row.destination,
    distance: Number(row.distance),
    axes: Number(row.axes),
    cargoType: row.cargo_type,
    inputMode: row.input_mode as 'PER_KM' | 'PER_TON',
    valuePerKm: Number(row.value_per_km),
    driverTotalValue: Number(row.driver_total_value),
    tollValue: Number(row.toll_value),
    anttValue: Number(row.antt_value),
    weight: Number(row.weight),
    margin: Number(row.margin),
    driverFreightPerTon: Number(row.driver_freight_per_ton),
    companyFreightPerTon: Number(row.company_freight_per_ton),
    companyTotalFreight: Number(row.company_total_freight),
    carrierNetProfit: Number(row.carrier_net_profit),
    carrierProfitMargin: Number(row.carrier_profit_margin),
  }));
}

export async function saveToolQuote(
  userId: string,
  quote: Omit<QuoteRecord, 'id' | 'date'>
): Promise<QuoteRecord | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('tool_quotes')
    .insert({
      user_id: userId,
      client_name: quote.clientName ?? null,
      origin: quote.origin,
      destination: quote.destination,
      distance: quote.distance,
      axes: quote.axes,
      cargo_type: quote.cargoType,
      input_mode: quote.inputMode,
      value_per_km: quote.valuePerKm,
      driver_total_value: quote.driverTotalValue,
      toll_value: quote.tollValue,
      antt_value: quote.anttValue,
      weight: quote.weight,
      margin: quote.margin,
      driver_freight_per_ton: quote.driverFreightPerTon,
      company_freight_per_ton: quote.companyFreightPerTon,
      company_total_freight: quote.companyTotalFreight,
      carrier_net_profit: quote.carrierNetProfit,
      carrier_profit_margin: quote.carrierProfitMargin,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Erro ao salvar cotação:', error);
    return null;
  }

  return data
    ? {
        id: data.id,
        clientName: data.client_name ?? undefined,
        date: data.created_at,
        origin: data.origin,
        destination: data.destination,
        distance: Number(data.distance),
        axes: Number(data.axes),
        cargoType: data.cargo_type,
        inputMode: data.input_mode as 'PER_KM' | 'PER_TON',
        valuePerKm: Number(data.value_per_km),
        driverTotalValue: Number(data.driver_total_value),
        tollValue: Number(data.toll_value),
        anttValue: Number(data.antt_value),
        weight: Number(data.weight),
        margin: Number(data.margin),
        driverFreightPerTon: Number(data.driver_freight_per_ton),
        companyFreightPerTon: Number(data.company_freight_per_ton),
        companyTotalFreight: Number(data.company_total_freight),
        carrierNetProfit: Number(data.carrier_net_profit),
        carrierProfitMargin: Number(data.carrier_profit_margin),
      }
    : null;
}

export async function deleteToolQuote(id: string): Promise<void> {
  const { error } = await supabase.from('tool_quotes').delete().eq('id', id);
  if (error) console.error('Erro ao excluir cotação:', error);
}
