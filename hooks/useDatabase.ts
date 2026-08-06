
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import type { 
  User, Client, Owner, Driver, Vehicle, Product, Cargo, Shipment, Ticket,
  ProfilePermissions, ShipmentLock, Branch, FreightOffer
} from '../types';
import { INITIAL_PERMISSIONS } from '../auth';
import { 
  fetchClients, fetchOwners, fetchDrivers, fetchVehicles, fetchProducts,
  fetchCargos, fetchShipments, fetchUsers, fetchTickets, fetchProfilePermissions,
  fetchAppSettings, fetchShipmentLocks, fetchBranches, fetchFreightOffers
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
      const match = item.id.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
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
  const [activeLocks, setActiveLocks] = useState<ShipmentLock[]>([]);
  const [profilePermissions, setProfilePermissions] = useState<ProfilePermissions>(INITIAL_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [companyLogo, setCompanyLogo] = useState<string | null>(() => localStorage.getItem('transcunha_companyLogo') || localStorage.getItem('trancunha_companyLogo'));
  const [themeImage, setThemeImage] = useState<string | null>(() => localStorage.getItem('transcunha_themeImage') || localStorage.getItem('trancunha_themeImage'));

  const [nextIds, setNextIds] = useState(() => {
    const saved = localStorage.getItem('transcunha_nextIds') || localStorage.getItem('trancunha_nextIds');
    if (saved) return JSON.parse(saved);
    return { client: 100, owner: 100, driver: 100, vehicle: 100, product: 100, shipment: 100, cargo: 100, user: 100, ticket: 1, branch: 10, freightOffer: 1, history: 1000 };
  });

  const isAnyModalActiveRef = useRef(false);

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
          dbProducts, dbClients, dbFreightOffers, dbUsers
        ] = await Promise.all([
          fetchCargos(), fetchShipments(), fetchAppSettings(), fetchProfilePermissions(),
          fetchProducts(), fetchClients(), fetchFreightOffers(), fetchUsers()
        ]);

        setCargos(dbCargos);
        setShipments(dbShipments);
        setProducts(dbProducts);
        setClients(dbClients);
        setFreightOffers(dbFreightOffers);
        setUsers(dbUsers);

        if (dbPermissions) setProfilePermissions(dbPermissions);
        if (dbSettings) {
          if (dbSettings.company_logo) setCompanyLogo(dbSettings.company_logo);
          if (dbSettings.theme_image) setThemeImage(dbSettings.theme_image);
        }

      } else {
        const [
          dbClients, dbOwners, dbDrivers, dbVehicles, dbProducts, dbCargos, 
          dbShipments, dbUsers, dbTickets, dbPermissions, dbSettings, dbLocks, dbBranches,
          dbStays, dbFreightOffers
        ] = await Promise.all([
          fetchClients(), fetchOwners(), fetchDrivers(), fetchVehicles(), fetchProducts(),
          fetchCargos(), fetchShipments(), fetchUsers(), fetchTickets(),
          fetchProfilePermissions(), fetchAppSettings(), fetchShipmentLocks(),
          fetchBranches(), getAllToolStays(), fetchFreightOffers()
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

        if (dbPermissions) setProfilePermissions(dbPermissions);
        if (dbSettings) {
          if (dbSettings.company_logo) setCompanyLogo(dbSettings.company_logo);
          if (dbSettings.theme_image) setThemeImage(dbSettings.theme_image);
        }

        setNextIds(calculateNextIds(
          dbClients, dbOwners, dbDrivers, dbVehicles,
          dbProducts, dbShipments, dbCargos, dbUsers, dbTickets, dbBranches, dbFreightOffers
        ));
      }

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
          if (settings.company_logo) setCompanyLogo(settings.company_logo);
          if (settings.theme_image) setThemeImage(settings.theme_image);
        }
      });
    }
  }, [currentUser, loadAllData]);

  // Real-time integration
  useEffect(() => {
    if (!currentUser) return;

    const handlePostgresChange = async (payload: any) => {
      const { table, eventType } = payload;
      console.log(`[useDatabase] Change detected in ${table} (${eventType}). Updating...`);

      // Permite atualizações em tempo real mesmo com modais abertos para fluxos principais
      const alwaysUpdateTables = ['tickets', 'cargos', 'shipments', 'freight_offers'];
      if (isAnyModalActiveRef.current && !alwaysUpdateTables.includes(table)) return;

      try {
        switch (table) {
          case 'clients': {
            const dbClients = await fetchClients();
            setClients(dbClients);
            setNextIds((prev: any) => ({ ...prev, client: getMaxId(dbClients, 100) }));
            break;
          }
          case 'owners': {
            const dbOwners = await fetchOwners();
            setOwners(dbOwners);
            setNextIds((prev: any) => ({ ...prev, owner: getMaxId(dbOwners, 100) }));
            break;
          }
          case 'drivers': {
            const dbDrivers = await fetchDrivers();
            setDrivers(dbDrivers);
            setNextIds((prev: any) => ({ ...prev, driver: getMaxId(dbDrivers, 100) }));
            break;
          }
          case 'vehicles': {
            const dbVehicles = await fetchVehicles();
            setVehicles(dbVehicles);
            setNextIds((prev: any) => ({ ...prev, vehicle: getMaxId(dbVehicles, 100) }));
            break;
          }
          case 'products': {
            const dbProducts = await fetchProducts();
            setProducts(dbProducts);
            setNextIds((prev: any) => ({ ...prev, product: getMaxId(dbProducts, 100) }));
            break;
          }
          case 'cargos': {
            const dbCargos = await fetchCargos();
            setCargos(dbCargos);
            setNextIds((prev: any) => ({ ...prev, cargo: getMaxId(dbCargos, 100) }));
            break;
          }
          case 'shipments': {
            const dbShipments = await fetchShipments();
            setShipments(dbShipments);
            setNextIds((prev: any) => ({ ...prev, shipment: getMaxId(dbShipments, 100) }));
            break;
          }
          case 'app_users': {
            const dbUsers = await fetchUsers();
            setUsers(dbUsers);
            setNextIds((prev: any) => ({ ...prev, user: getMaxId(dbUsers, 100) }));
            break;
          }
          case 'tickets': {
            const dbTickets = await fetchTickets();
            setTickets(dbTickets);
            setNextIds((prev: any) => ({ ...prev, ticket: getMaxId(dbTickets, 1) }));
            break;
          }
          case 'freight_offers': {
            const dbOffers = await fetchFreightOffers();
            setFreightOffers(dbOffers);
            setNextIds((prev: any) => ({ ...prev, freightOffer: getMaxId(dbOffers, 1) }));
            break;
          }
          case 'branches': {
            const dbBranches = await fetchBranches();
            setBranches(dbBranches);
            setNextIds((prev: any) => ({ ...prev, branch: getMaxId(dbBranches, 10) }));
            break;
          }
          case 'tool_stays': {
            const dbStays = await getAllToolStays();
            setStays(dbStays);
            break;
          }
          case 'shipment_locks': {
            const dbLocks = await fetchShipmentLocks();
            setActiveLocks(dbLocks);
            break;
          }
          case 'profile_permissions': {
            const dbPermissions = await fetchProfilePermissions();
            if (dbPermissions) setProfilePermissions(dbPermissions);
            break;
          }
          case 'app_settings': {
            const dbSettings = await fetchAppSettings();
            if (dbSettings) {
              if (dbSettings.company_logo) setCompanyLogo(dbSettings.company_logo);
              if (dbSettings.theme_image) setThemeImage(dbSettings.theme_image);
            }
            break;
          }
          default:
            // If unknown table, fallback to background reload
            loadAllData(true);
        }
      } catch (err) {
        console.error(`[useDatabase] Error during surgical update for ${table}:`, err);
        loadAllData(true); // Fallback to full reload
      }
    };

    const channel = supabase
      .channel('db_changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, handlePostgresChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
