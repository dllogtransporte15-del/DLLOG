
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import type { 
  User, Client, Owner, Driver, Vehicle, Product, Cargo, Shipment, Ticket,
  ProfilePermissions, ShipmentLock, Branch, FreightOffer, RiskQueryOption
} from '../types';
import { INITIAL_PERMISSIONS } from '../auth';
import { DEFAULT_RISK_QUERY_OPTIONS } from '../types';
import { 
  fetchClients, fetchOwners, fetchDrivers, fetchVehicles, fetchProducts,
  fetchCargos, fetchShipments, fetchUsers, fetchTickets, fetchProfilePermissions,
  fetchAppSettings, fetchShipmentLocks, fetchBranches, fetchFreightOffers,
  fetchRiskQueryOptions,
  backfillShipmentFiscalNumbers,
  backfillAdvanceAndBalanceCalculations
} from '../lib/db';
import { getAllToolStays, StayRecord } from '../utils/toolStorage';

// ─── Module-level helpers (accessible from both loadAllData and realtime handler) ───

function getMaxId(items: any[], startOffset: number): number {
  if (!items || items.length === 0) {
    console.log(`[getMaxId] No items found, returning startOffset: ${startOffset}`);
    return startOffset;
  }
  let maxNum = startOffset - 1;
  for (const item of items) {
    if (item?.id && typeof item.id === 'string') {
      // Ignora IDs temporários, logs, anexos, etc.
      if (item.id.startsWith('TEMP') || item.id.startsWith('log_') || item.id.startsWith('branch_') || item.id.startsWith('img_')) {
        continue;
      }
      const match = item.id.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        // IDs sequenciais normais são < 1.000.000 (valores maiores são timestamps Date.now())
        if (!isNaN(num) && num < 1000000 && num > maxNum) maxNum = num;
      }
    }
    // Também valida sequence_id / sequenceId numérico
    if (item?.sequence_id && typeof item.sequence_id === 'number' && item.sequence_id < 1000000 && item.sequence_id > maxNum) {
      maxNum = item.sequence_id;
    }
    if (item?.sequenceId && typeof item.sequenceId === 'number' && item.sequenceId < 1000000 && item.sequenceId > maxNum) {
      maxNum = item.sequenceId;
    }
  }
  const nextId = maxNum + 1;
  console.log(`[getMaxId] Items count: ${items.length}, Max found: ${maxNum}, Next ID: ${nextId}`);
  return nextId;
}

function calculateNextIds(
  dbClients: any[], dbOwners: any[], dbDrivers: any[], dbVehicles: any[], 
  dbProducts: any[], dbShipments: any[], dbCargos: any[], dbUsers: any[], dbTickets: any[],
  dbBranches: any[], dbOffers: any[] = []
) {
  const result = {
    client: getMaxId(dbClients, 100),
    owner: getMaxId(dbOwners, 100),
    driver: getMaxId(dbDrivers, 100),
    vehicle: getMaxId(dbVehicles, 100),
    product: getMaxId(dbProducts, 100),
    shipment: getMaxId(dbShipments, 100),
    cargo: getMaxId(dbCargos, 100),
    user: getMaxId(dbUsers, 100),
    ticket: getMaxId(dbTickets, 1),
    branch: getMaxId(dbBranches, 10),
    freightOffer: getMaxId(dbOffers, 1),
    history: 9999,
  };
  console.log('[DB] Next IDs calculated:', result);
  return result;
}

// ─────────────────────────────────────────────

export function useDatabase(currentUser: User | null) {
  const [clients, setClients] = useState<Client[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [freightOffers, setFreightOffers] = useState<FreightOffer[]>([]);
  const [stays, setStays] = useState<StayRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [riskQueryOptions, setRiskQueryOptions] = useState<RiskQueryOption[]>(() => {
    try {
      const saved = localStorage.getItem('transcunha_risk_query_options');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_RISK_QUERY_OPTIONS;
  });
  const [activeLocks, setActiveLocks] = useState<ShipmentLock[]>([]);
  const [profilePermissions, setProfilePermissions] = useState<ProfilePermissions>(INITIAL_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [companyLogo, setCompanyLogo] = useState<string | null>(() => {
    try {
      return localStorage.getItem('transcunha_companyLogo') || localStorage.getItem('trancunha_companyLogo');
    } catch { return null; }
  });
  const [themeImage, setThemeImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem('transcunha_themeImage') || localStorage.getItem('trancunha_themeImage');
    } catch { return null; }
  });

  const [nextIds, setNextIds] = useState(() => {
    try {
      const saved = localStorage.getItem('transcunha_nextIds') || localStorage.getItem('trancunha_nextIds');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cargo && parsed.cargo > 1000000) parsed.cargo = 100;
        if (parsed.shipment && parsed.shipment > 1000000) parsed.shipment = 100;
        return parsed;
      }
    } catch {}
    return { client: 100, owner: 100, driver: 100, vehicle: 100, product: 100, shipment: 100, cargo: 100, user: 100, ticket: 1, branch: 10, freightOffer: 1, history: 1000 };
  });

  const isAnyModalActiveRef = useRef(false);
  const backfillRanRef = useRef(false);

  const loadAllData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    setLoadError(null);
    
    // Safety net: if loading takes more than 15 seconds, force it to stop
    const timeoutId = setTimeout(() => {
      console.error('[useDatabase] loadAllData timed out after 15s. Forcing isLoading=false.');
      setIsLoading(false);
    }, 15000);

    try {
      // Note: We now rely on the local session/user state from App.tsx 
      // instead of checking Supabase Auth every time.
      if (!currentUser) {
        console.warn('[DB] Tentativa de carga sem usuário logado.');
        setIsLoading(false);
        return;
      }

      console.log('[DB] Carregando dados para:', currentUser.email);

      const isMotorista = currentUser.profile === 'Motorista';

      if (isMotorista) {
        // Motorista only needs: cargos, shipments (filtered), settings, products, clients
        // Skip heavy tables: drivers (914), vehicles (1000), users, locks, branches, etc.
        const [
          dbCargos, dbShipments, dbSettings, dbPermissions,
          dbProducts, dbClients, dbFreightOffers, dbUsers, dbRiskOptions
        ] = await Promise.all([
          fetchCargos(), fetchShipments(), fetchAppSettings(), fetchProfilePermissions(),
          fetchProducts(), fetchClients(), fetchFreightOffers(), fetchUsers(), fetchRiskQueryOptions()
        ]);

        setCargos(dbCargos);
        setShipments(dbShipments);
        setProducts(dbProducts);
        setClients(dbClients);
        setFreightOffers(dbFreightOffers);
        setUsers(dbUsers);
        if (dbRiskOptions && dbRiskOptions.length > 0) setRiskQueryOptions(dbRiskOptions);

        if (dbPermissions) setProfilePermissions({ ...INITIAL_PERMISSIONS, ...dbPermissions });
        if (dbSettings) {
          setCompanyLogo(dbSettings.company_logo || null);
          setThemeImage(dbSettings.theme_image || null);
        }

      } else {
        const [
          dbClients, dbOwners, dbDrivers, dbVehicles, dbProducts, dbCargos, 
          dbShipments, dbUsers, dbTickets, dbPermissions, dbSettings, dbLocks, dbBranches,
          dbStays, dbFreightOffers, dbRiskOptions
        ] = await Promise.all([
          fetchClients(), fetchOwners(), fetchDrivers(), fetchVehicles(), fetchProducts(),
          fetchCargos(), fetchShipments(), fetchUsers(), fetchTickets(),
          fetchProfilePermissions(), fetchAppSettings(), fetchShipmentLocks(),
          fetchBranches(), getAllToolStays(), fetchFreightOffers(), fetchRiskQueryOptions()
        ]);

        setClients(dbClients);
        setOwners(dbOwners);
        setDrivers(dbDrivers);
        setVehicles(dbVehicles);
        setProducts(dbProducts);
        setCargos(dbCargos);
        setShipments(dbShipments);
        setUsers(dbUsers);
        setTickets(dbTickets);
        setFreightOffers(dbFreightOffers);
        setStays(dbStays);
        setBranches(dbBranches);
        setActiveLocks(dbLocks);
        if (dbRiskOptions && dbRiskOptions.length > 0) setRiskQueryOptions(dbRiskOptions);

        if (dbPermissions) setProfilePermissions({ ...INITIAL_PERMISSIONS, ...dbPermissions });
        if (dbSettings) {
          setCompanyLogo(dbSettings.company_logo || null);
          setThemeImage(dbSettings.theme_image || null);
        }

        setNextIds(calculateNextIds(
          dbClients, dbOwners, dbDrivers, dbVehicles,
          dbProducts, dbShipments, dbCargos, dbUsers, dbTickets, dbBranches, dbFreightOffers
        ));

      } // fim do else (não-Motorista)

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setLoadError('Erro ao conectar ao banco de dados.');
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false); // ALWAYS runs — no more eternal spinner
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadAllData();
    } else {
      setIsLoading(false);
      // Even without a user, try to load branding settings for the login page
      fetchAppSettings().then(settings => {
        if (settings) {
          setCompanyLogo(settings.company_logo || null);
          setThemeImage(settings.theme_image || null);
        }
      });
    }
  }, [currentUser, loadAllData]);

  // Real-time integration — com reconexão segura e fallback ultraleve
  useEffect(() => {
    if (!currentUser) return;

    let isSubscribed = true;
    let realtimeWorking = false;
    let reconnectTimeoutId: any = null;
    let channelRef: ReturnType<typeof supabase.channel> | null = null;
    let lastShipmentCheckTs: string | null = null;
    let lastCargoCheckTs: string | null = null;

    const handlePostgresChange = async (payload: any) => {
      if (!isSubscribed) return;
      const { table, eventType } = payload;
      realtimeWorking = true;
      console.log(`[Realtime] Mudança detectada em ${table} (${eventType}). Atualizando...`);

      // Permite atualizações em tempo real mesmo com modais abertos para fluxos principais
      const alwaysUpdateTables = ['tickets', 'cargos', 'shipments', 'freight_offers'];
      if (isAnyModalActiveRef.current && !alwaysUpdateTables.includes(table)) return;

      try {
        switch (table) {
          case 'clients': {
            const dbClients = await fetchClients();
            if (isSubscribed) {
              setClients(dbClients);
              setNextIds((prev: any) => ({ ...prev, client: getMaxId(dbClients, 100) }));
            }
            break;
          }
          case 'owners': {
            const dbOwners = await fetchOwners();
            if (isSubscribed) {
              setOwners(dbOwners);
              setNextIds((prev: any) => ({ ...prev, owner: getMaxId(dbOwners, 100) }));
            }
            break;
          }
          case 'drivers': {
            const dbDrivers = await fetchDrivers();
            if (isSubscribed) {
              setDrivers(dbDrivers);
              setNextIds((prev: any) => ({ ...prev, driver: getMaxId(dbDrivers, 100) }));
            }
            break;
          }
          case 'vehicles': {
            const dbVehicles = await fetchVehicles();
            if (isSubscribed) {
              setVehicles(dbVehicles);
              setNextIds((prev: any) => ({ ...prev, vehicle: getMaxId(dbVehicles, 100) }));
            }
            break;
          }
          case 'products': {
            const dbProducts = await fetchProducts();
            if (isSubscribed) {
              setProducts(dbProducts);
              setNextIds((prev: any) => ({ ...prev, product: getMaxId(dbProducts, 100) }));
            }
            break;
          }
          case 'cargos': {
            const dbCargos = await fetchCargos();
            if (isSubscribed) {
              setCargos(dbCargos);
              setNextIds((prev: any) => ({ ...prev, cargo: getMaxId(dbCargos, 100) }));
            }
            break;
          }
          case 'shipments': {
            const dbShipments = await fetchShipments();
            if (isSubscribed) {
              setShipments(dbShipments);
              setNextIds((prev: any) => ({ ...prev, shipment: getMaxId(dbShipments, 100) }));
            }
            break;
          }
          case 'app_users': {
            const dbUsers = await fetchUsers();
            if (isSubscribed) {
              setUsers(dbUsers);
              setNextIds((prev: any) => ({ ...prev, user: getMaxId(dbUsers, 100) }));
            }
            break;
          }
          case 'tickets': {
            const dbTickets = await fetchTickets();
            if (isSubscribed) {
              setTickets(dbTickets);
              setNextIds((prev: any) => ({ ...prev, ticket: getMaxId(dbTickets, 1) }));
            }
            break;
          }
          case 'freight_offers': {
            const dbOffers = await fetchFreightOffers();
            if (isSubscribed) {
              setFreightOffers(dbOffers);
              setNextIds((prev: any) => ({ ...prev, freightOffer: getMaxId(dbOffers, 1) }));
            }
            break;
          }
          case 'branches': {
            const dbBranches = await fetchBranches();
            if (isSubscribed) {
              setBranches(dbBranches);
              setNextIds((prev: any) => ({ ...prev, branch: getMaxId(dbBranches, 10) }));
            }
            break;
          }
          case 'tool_stays': {
            const dbStays = await getAllToolStays();
            if (isSubscribed) setStays(dbStays);
            break;
          }
          case 'shipment_locks': {
            const dbLocks = await fetchShipmentLocks();
            if (isSubscribed) setActiveLocks(dbLocks);
            break;
          }
          case 'profile_permissions': {
            const dbPermissions = await fetchProfilePermissions();
            if (isSubscribed && dbPermissions) setProfilePermissions(dbPermissions);
            const dbRiskOptions = await fetchRiskQueryOptions();
            if (isSubscribed && dbRiskOptions && dbRiskOptions.length > 0) {
              setRiskQueryOptions(dbRiskOptions);
            }
            if (isSubscribed && dbPermissions && (dbPermissions as any).client_branches) {
              const bMap = (dbPermissions as any).client_branches;
              setClients(prev => prev.map(c => ({
                ...c,
                secondaryCnpjs: bMap[c.id] !== undefined ? bMap[c.id] : (c.secondaryCnpjs || [])
              })));
            }
            break;
          }
          case 'app_settings': {
            const dbSettings = await fetchAppSettings();
            if (isSubscribed && dbSettings) {
              setCompanyLogo(dbSettings.company_logo || null);
              setThemeImage(dbSettings.theme_image || null);
            }
            break;
          }
          case 'risk_query_options': {
            const dbRiskOptions = await fetchRiskQueryOptions();
            if (isSubscribed && dbRiskOptions && dbRiskOptions.length > 0) {
              setRiskQueryOptions(dbRiskOptions);
            }
            break;
          }
          default:
            if (isSubscribed) loadAllData(true);
        }
      } catch (err) {
        console.error(`[Realtime] Erro ao atualizar ${table}:`, err);
      }
    };

    const subscribeChannel = () => {
      if (!isSubscribed) return;
      if (channelRef) {
        supabase.removeChannel(channelRef);
        channelRef = null;
      }
      channelRef = supabase
        .channel('db_changes_' + Date.now())
        .on('postgres_changes', { event: '*', schema: 'public' }, handlePostgresChange)
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] ✅ Canal conectado — atualizações automáticas ativas');
            realtimeWorking = true;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`[Realtime] ⚠️ Canal ${status} — tentando reconectar em 5s...`);
            realtimeWorking = false;
            if (isSubscribed) {
              if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
              reconnectTimeoutId = setTimeout(() => {
                subscribeChannel();
              }, 5000);
            }
          }
        });
    };

    subscribeChannel();

    // ── Polling de contingência LEVE: SÓ executa se o Realtime cair E a aba estiver visível ──
    const FALLBACK_POLL_INTERVAL_MS = 60_000;
    const pollInterval = setInterval(async () => {
      // Se Realtime está conectado e funcionando, ou se a aba está oculta/segundo plano, NÃO faz polling
      if (realtimeWorking || (typeof document !== 'undefined' && document.visibilityState === 'hidden') || isAnyModalActiveRef.current) {
        return;
      }

      try {
        // Consulta ultraleve (apenas 1 linha para verificar se houve alteração recente)
        const { data: latestShipment } = await supabase
          .from('shipments')
          .select('updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const shipmentTs = latestShipment?.updated_at || null;
        if (shipmentTs && lastShipmentCheckTs && shipmentTs !== lastShipmentCheckTs) {
          console.log('[Polling Fallback] 🔄 Novos embarques detectados via timestamp');
          lastShipmentCheckTs = shipmentTs;
          const dbShipments = await fetchShipments();
          if (isSubscribed) {
            setShipments(dbShipments);
            setNextIds((prev: any) => ({ ...prev, shipment: getMaxId(dbShipments, 100) }));
          }
        } else if (shipmentTs) {
          lastShipmentCheckTs = shipmentTs;
        }

        const { data: latestCargo } = await supabase
          .from('cargos')
          .select('updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const cargoTs = latestCargo?.updated_at || null;
        if (cargoTs && lastCargoCheckTs && cargoTs !== lastCargoCheckTs) {
          console.log('[Polling Fallback] 🔄 Novas cargas detectadas via timestamp');
          lastCargoCheckTs = cargoTs;
          const dbCargos = await fetchCargos();
          if (isSubscribed) {
            setCargos(dbCargos);
            setNextIds((prev: any) => ({ ...prev, cargo: getMaxId(dbCargos, 100) }));
          }
        } else if (cargoTs) {
          lastCargoCheckTs = cargoTs;
        }
      } catch (err) {
        console.warn('[Polling Fallback] Erro silencioso:', err);
      }
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      isSubscribed = false;
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      clearInterval(pollInterval);
      if (channelRef) {
        supabase.removeChannel(channelRef);
        channelRef = null;
      }
    };
  }, [currentUser, loadAllData]);

  return {
    clients, setClients,
    owners, setOwners,
    drivers, setDrivers,
    vehicles, setVehicles,
    products, setProducts,
    cargos, setCargos,
    shipments, setShipments,
    users, setUsers,
    tickets, setTickets,
    freightOffers, setFreightOffers,
    stays, setStays,
    branches, setBranches,
    riskQueryOptions, setRiskQueryOptions,
    activeLocks, setActiveLocks,
    profilePermissions, setProfilePermissions,
    isLoading, loadError,
    companyLogo, setCompanyLogo,
    themeImage, setThemeImage,
    nextIds, setNextIds,
    loadAllData,
    isAnyModalActiveRef
  };
}
