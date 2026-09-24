
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { useDatabase } from './hooks/useDatabase';
import type { Client, Owner, Driver, Vehicle, Product, Cargo, Shipment, User, Page, ProfilePermissions, HistoryLog, Ticket, TicketHistory, ShipmentLock, Branch, FreightOffer, RiskQueryOption, RealProfitData } from './types';
import { CargoStatus, ShipmentStatus, UserProfile, TicketStatus, TicketPriority, DriverClassification, VehicleSetType, VehicleBodyType, REQUIRED_DOCUMENT_MAP, OwnerType, FreightOfferStatus, DEFAULT_RISK_QUERY_OPTIONS } from './types';
import { formatId, isCteApplicableForStatus, getShipmentCte, getShipmentCteEmissionDate, findCargoById, findProductForCargo, checkRequiresRiskManagement } from './utils';
import { extractFiscalDocNumbers, isCteDocType } from './utils/fiscalDocParser';
import { calculateAdvanceAndBalance, ADVANCE_ELIGIBLE_STATUSES } from './utils/freightCalculation';
import { INITIAL_PERMISSIONS, can, isDemoUser } from './auth';
import { useToast } from './hooks/useToast';

// Lazy-loaded Page Imports (Code Splitting for Optimal Performance)
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const ClientsPage = React.lazy(() => import('./pages/ClientsPage'));
const OwnersPage = React.lazy(() => import('./pages/OwnersPage'));
const DriversPage = React.lazy(() => import('./pages/DriversPage'));
const VehiclesPage = React.lazy(() => import('./pages/VehiclesPage'));
const LoadsPage = React.lazy(() => import('./pages/LoadsPage'));
const ProductsPage = React.lazy(() => import('./pages/ProductsPage'));
const ShipmentsPage = React.lazy(() => import('./pages/ShipmentsPage'));
const OperationalLoadsPage = React.lazy(() => import('./pages/OperationalLoadsPage'));
const OperationalMapPage = React.lazy(() => import('./pages/OperationalMapPage'));
const CommissionsPage = React.lazy(() => import('./pages/CommissionsPage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const AppearancePage = React.lazy(() => import('./pages/AppearancePage'));
const ShipmentHistoryPage = React.lazy(() => import('./pages/ShipmentHistoryPage'));
const LoadHistoryPage = React.lazy(() => import('./pages/LoadHistoryPage'));
const LayoverCalculatorPage = React.lazy(() => import('./pages/LayoverCalculatorPage'));
const FreightQuotePage = React.lazy(() => import('./pages/FreightQuotePage'));
const ToolsHistoryPage = React.lazy(() => import('./pages/ToolsHistoryPage'));
const FreightOffersHistoryPage = React.lazy(() => import('./pages/FreightOffersHistoryPage'));
const BranchesPage = React.lazy(() => import('./pages/BranchesPage'));
const SystemMonitorPage = React.lazy(() => import('./pages/SystemMonitorPage'));
const DownloadAppPage = React.lazy(() => import('./pages/DownloadAppPage'));
const RiskManagementPage = React.lazy(() => import('./pages/RiskManagementPage'));
const RiskQueryTypesPage = React.lazy(() => import('./pages/RiskQueryTypesPage'));
const WhatsAppManagementPage = React.lazy(() => import('./pages/WhatsAppManagementPage'));

// Component Imports
import TopNavBar from './components/TopNavBar';
import TicketModal from './components/TicketModal';
import PasswordChangeModal from './components/PasswordChangeModal';
import DriverPortal from './components/DriverPortal';
import NewShipmentModal from './components/NewShipmentModal';
import SystemUpdateModal from './components/SystemUpdateModal';
import SelectEmbarcadorModal from './components/SelectEmbarcadorModal';
import { WhatsAppChatPanel } from './components/whatsapp/WhatsAppChatPanel';
import { shouldShowUpdateModal } from './utils/systemUpdates';

import {
  upsertClient, upsertOwner, upsertDriver, upsertVehicle, upsertCargo, insertCargo,
  upsertShipment, insertShipment, upsertUser, upsertTicket, saveProfilePermissions,
  upsertManyDrivers, upsertManyVehicles, upsertManyShipments, upsertManyCargos,
  uploadShipmentAttachment, getShipmentAttachmentUrl,
  saveAppSettings,
  deleteCargo, deleteShipment, deleteUser, deleteClient, upsertProduct, deleteProduct,
  tryAcquireShipmentLock, releaseShipmentLock, toUser,
  deleteShipmentAttachmentFromStorage, upsertBranch, deleteBranch, deleteTicket,
  upsertFreightOffer, deleteFreightOffer, fetchFreightOffers,
  upsertRiskQueryOption, deleteRiskQueryOption, saveAllRiskQueryOptions,
  mergeClients, fetchClients, fetchCargos
} from './lib/db';

const PageLoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] w-full gap-3 py-12">
    <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin" />
    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Carregando módulo...</span>
  </div>
);



const FIELD_TRANSLATIONS: Record<string, string> = {
  // Cargo fields
  clientId: 'Cliente',
  productId: 'Produto',
  origin: 'Origem',
  originMapLink: 'Link do Mapa (Origem)',
  destination: 'Destino',
  destinationMapLink: 'Link do Mapa (Destino)',
  totalVolume: 'Volume Total',
  scheduledVolume: 'Volume Agendado',
  loadedVolume: 'Volume Carregado',
  companyFreightValuePerTon: 'Frete Empresa (p/ Ton)',
  companyFreightHasToll: 'Pedágio Frete Empresa',
  driverFreightValuePerTon: 'Frete Motorista (p/ Ton)',
  driverFreightHasToll: 'Pedágio Frete Motorista PJ',
  driverFreightPfHasToll: 'Pedágio Frete Motorista PF',
  hasIcms: 'Incide ICMS',
  icmsPercentage: '% ICMS',
  requiresScheduling: 'Exige Agendamento',
  type: 'Tipo de Carga',
  status: 'Status da Carga',
  createdById: 'Comercial Responsável',
  freightLegs: 'Trechos de Frete',
  dailySchedule: 'Agenda Diária',
  originCoords: 'Coordenadas de Origem',
  destinationCoords: 'Coordenadas de Destino',
  tmsLoteNumber: 'Lote TMS',
  isExport: 'Operação de Exportação',

  // Shipment fields
  driverId: 'Motorista',
  driverCpf: 'CPF do Motorista',
  anttOwnerIdentifier: 'CPF/CNPJ Titular ANTT',
  bankDetails: 'Dados Bancários',
  embarcadorId: 'Embarcador',
  horsePlate: 'Placa Cavalo',
  trailer1Plate: 'Placa Carreta 1',
  trailer2Plate: 'Placa Carreta 2',
  trailer3Plate: 'Placa Carreta 3',
  shipmentTonnage: 'Toneladas do Embarque',
  driverFreightValue: 'Valor Frete Motorista',
  driverFreightRateSnapshot: 'Frete Motorista (p/ Ton)',
  vehicleSetType: 'Tipo de Veículo',
  vehicleBodyType: 'Tipo de Carroceria',
  cteNumber: 'Número do CT-e',
  cteEmissionDate: 'Data/Hora de Emissão do CT-e',
  nfeNumber: 'Número da NF-e',
  mdfeNumber: 'Número do MDF-e',
  federalTax: 'Imposto Federal',
  riskQueryType: 'Tipo de Consulta de Risco (Modalidade)',
  riskQueryCost: 'Custo da Consulta de Risco',
  riskReleaseCode: 'Código de Liberação da Seguradora',
  advancePercentage: 'Adiantamento (%)',
  paymentMethod: 'Forma de Pagamento',
  pixKey: 'Chave Pix',
};

interface NewShipmentRequestData extends Omit<Shipment, 'id' | 'orderId' | 'status' | 'documents' | 'history' | 'createdAt' | 'createdById' | 'statusHistory'> {
  status?: ShipmentStatus;
  history?: HistoryLog[];
  driverCnh?: string;
  vehicleSetType?: VehicleSetType;
  vehicleBodyType?: VehicleBodyType;
  filesToAttach?: File[];
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      localStorage.removeItem('trancunha_currentUser');
      localStorage.removeItem('trancunha_user_email');
    } catch {}
    const saved = sessionStorage.getItem('trancunha_currentUser');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = (location.pathname === '/' ? 'dashboard' : location.pathname.substring(1)) as Page;
  const setCurrentPage = (page: Page) => navigate(`/${page}`);

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  const [offerToConvert, setOfferToConvert] = useState<FreightOffer | null>(null);
  const [offerForNewShipment, setOfferForNewShipment] = useState<FreightOffer | null>(null);
  const [isSelectEmbarcadorModalOpen, setIsSelectEmbarcadorModalOpen] = useState(false);
  const [selectedCargoForRequest, setSelectedCargoForRequest] = useState<Cargo | null>(null);

  // Theme Mode ('dark' or 'light')
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('trancunha_theme_mode');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'dark';
  });

  const handleThemeModeChange = (mode: 'dark' | 'light') => {
    setThemeMode(mode);
    localStorage.setItem('trancunha_theme_mode', mode);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);
  
  // Use custom hook for all database-related state and logic
  const {
    clients, setClients,
    owners, setOwners,
    drivers, setDrivers,
    vehicles, setVehicles,
    products, setProducts,
    cargos, setCargos,
    shipments, setShipments,
    users, setUsers,
    tickets, setTickets,
    activeLocks, setActiveLocks,
    profilePermissions, setProfilePermissions,
    isLoading, loadError,
    companyLogo, setCompanyLogo,
    themeImage, setThemeImage,
    nextIds, setNextIds,
    isAnyModalActiveRef,
    branches, setBranches,
    stays, setStays,
    freightOffers, setFreightOffers,
    riskQueryOptions, setRiskQueryOptions
  } = useDatabase(currentUser);

  const { showToast } = useToast();
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isGlobalWhatsAppFloatingOpen, setIsGlobalWhatsAppFloatingOpen] = useState(false);
  const [globalWhatsAppInitialPhone, setGlobalWhatsAppInitialPhone] = useState<string | undefined>(undefined);
  const [globalWhatsAppInitialName, setGlobalWhatsAppInitialName] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleOpenFloating = (e: any) => {
      const detail = e.detail || {};
      setGlobalWhatsAppInitialPhone(detail.phone);
      setGlobalWhatsAppInitialName(detail.name);
      setIsGlobalWhatsAppFloatingOpen(true);
    };
    window.addEventListener('transcunha:open_whatsapp_chat', handleOpenFloating);
    return () => {
      window.removeEventListener('transcunha:open_whatsapp_chat', handleOpenFloating);
    };
  }, []);

  useEffect(() => {
    if (currentUser?.id && !isLoading) {
      if (shouldShowUpdateModal(currentUser.id)) {
        const timer = setTimeout(() => {
          setIsUpdateModalOpen(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser?.id, isLoading]);

  const handleSaveRiskQueryOption = async (optionData: RiskQueryOption | Omit<RiskQueryOption, 'id'>) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    try {
      const saved = await upsertRiskQueryOption(optionData);
      setRiskQueryOptions(prev => {
        const index = prev.findIndex(o => o.id === saved.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = saved;
          return updated;
        }
        return [...prev, saved];
      });
      showToast('Modalidade de consulta salva com sucesso!', 'success');
    } catch (err: any) {
      console.error('Error saving risk query option:', err);
      showToast('Erro ao salvar modalidade de consulta: ' + (err?.message || ''), 'error');
      throw err;
    }
  };

  const handleDeleteRiskQueryOption = async (optionId: string) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    try {
      await deleteRiskQueryOption(optionId);
      setRiskQueryOptions(prev => prev.filter(o => o.id !== optionId));
      showToast('Modalidade de consulta excluída com sucesso!', 'success');
    } catch (err: any) {
      console.error('Error deleting risk query option:', err);
      showToast('Erro ao excluir modalidade de consulta: ' + (err?.message || ''), 'error');
    }
  };

  const handleRestoreRiskQueryDefaults = async () => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    try {
      await saveAllRiskQueryOptions(DEFAULT_RISK_QUERY_OPTIONS);
      setRiskQueryOptions(DEFAULT_RISK_QUERY_OPTIONS);
      showToast('Modalidades padrão restauradas com sucesso!', 'success');
    } catch (err: any) {
      console.error('Error restoring defaults:', err);
      showToast('Erro ao restaurar modalidades padrão', 'error');
    }
  };

  const isAnyModalActive = isAnyModalOpen || isSelectEmbarcadorModalOpen || !!offerForNewShipment;
  
  // Sincronização de modais para supressão de real-time
  useEffect(() => {
    isAnyModalActiveRef.current = isAnyModalActive;
  }, [isAnyModalActive, isAnyModalActiveRef]);

  // Previne recarregamento acidental no celular/navegador quando houver formulários ou modais abertos
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isAnyModalActive) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAnyModalActive]);


  // Track app activity for motoristas
  useEffect(() => {
    if (currentUser?.profile === UserProfile.Motorista) {
      
      // Update persistent status in database, silently catch error if column missing
      supabase.from('drivers').update({ has_app: true }).eq('id', currentUser.id).then(({error}) => {
         if (error) console.log("has_app column might not exist yet", error);
      });

      const channel = supabase.channel('driver_tracking', {
        config: { presence: { key: currentUser.id } },
      });
      channel.on('presence', { event: 'sync' }, () => {});
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ driverName: currentUser.name, isAppActive: true });
        }
      });
      return () => {
        channel.untrack();
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);

  // Controle de PWA (Instalação)
  useEffect(() => {
    const isPwaEnabled = profilePermissions?.system_settings?.pwa_enabled !== false;
    
    // Prevent beforeinstallprompt if disabled
    const handleBeforeInstallPrompt = (e: any) => {
      if (!isPwaEnabled) {
        e.preventDefault();
      }
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Manipulate manifest link
    let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
    if (!isPwaEnabled) {
      if (manifestLink) {
        manifestLink.setAttribute('data-href', manifestLink.href);
        manifestLink.removeAttribute('href');
      }
    } else {
      if (manifestLink && manifestLink.hasAttribute('data-href')) {
        manifestLink.href = manifestLink.getAttribute('data-href') as string;
      }
    }
    
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [profilePermissions?.system_settings?.pwa_enabled]);

  // Persistência da sessão (apenas enquanto a janela/navegador estiver aberta)
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('trancunha_currentUser', JSON.stringify(currentUser));
      sessionStorage.setItem('trancunha_user_email', currentUser.email);
    } else {
      sessionStorage.removeItem('trancunha_currentUser');
      sessionStorage.removeItem('trancunha_user_email');
    }
  }, [currentUser]);

  // Removido persistência local da rota, agora controlada pela URL

  // UI Effects (Branding & Theme)
  useEffect(() => {
    if (companyLogo) {
      localStorage.setItem('trancunha_companyLogo', companyLogo);
      const link = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = companyLogo;
      if (!document.querySelector("link[rel*='icon']")) {
        document.getElementsByTagName('head')[0].appendChild(link);
      }
    }
  }, [companyLogo]);

  // Notification Sound Generator using Web Audio API
  const playNotificationSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playNote = (delay: number, frequency: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime + delay);
        
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
        
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + duration);
      };
      
      playNote(0, 587.33, 0.15); // D5
      playNote(0.15, 880, 0.3);   // A5
    } catch (e) {
      console.warn("Web Audio API not supported or blocked by user interaction policy", e);
    }
  }, []);

  // Notifications in document title (bell in tab) and sound alert
  const lastPendingCountRef = useRef(0);
  useEffect(() => {
    if (!currentUser || !freightOffers) {
      document.title = "Transcunha Logística";
      return;
    }

    const isAllowedProfile = 
      currentUser.profile === UserProfile.Admin ||
      currentUser.profile === UserProfile.Diretor ||
      currentUser.profile === UserProfile.Comercial ||
      currentUser.profile === UserProfile.Supervisor ||
      currentUser.profile === UserProfile.Cliente ||
      currentUser.profile === UserProfile.Demonstracao ||
      (currentUser.profile as string) === 'Demo';

    if (!isAllowedProfile) {
      document.title = "Transcunha Logística";
      lastPendingCountRef.current = 0;
      return;
    }

    const isClient = currentUser.profile === UserProfile.Cliente;
    
    // Filter offers relevant to the logged-in user's pending actions (Aguardando preço, Contraproposta, ou Aceita sem carga gerada)
    const relevantOffers = freightOffers.filter(offer => {
      // Se a oferta foi aceita, verifica se já existe carga gerada para ela no passado ou presente
      if (offer.status === FreightOfferStatus.Aceita || offer.status === FreightOfferStatus.ContrapropostaAceita) {
        const hasCargo = (offer.cargoId && cargos.some(c => c.id === offer.cargoId)) ||
          cargos.some(c => 
            c.clientId === offer.clientId &&
            c.productId === offer.productId &&
            c.origin === offer.origin &&
            c.destination === offer.destination
          );
        // Se já existe carga gerada/vinculada no passado, desativa a notificação para esta oferta aceita
        if (hasCargo) return false;
      }

      if (isClient) {
        // Client side: waiting for carrier to send initial price, pending offer, or accepted without load
        return offer.clientId === currentUser.clientId && (
          offer.status === FreightOfferStatus.AguardandoPreco ||
          offer.status === FreightOfferStatus.Pendente ||
          offer.status === FreightOfferStatus.Aceita ||
          offer.status === FreightOfferStatus.ContrapropostaAceita
        );
      } else {
        // Carrier/Internal side: pending offers, waiting to send price, counter-offer pending approval, or accepted without load
        return !offer.driverId && (
          offer.status === FreightOfferStatus.AguardandoPreco ||
          offer.status === FreightOfferStatus.Pendente ||
          offer.status === FreightOfferStatus.Contraproposta ||
          offer.status === FreightOfferStatus.Aceita ||
          offer.status === FreightOfferStatus.ContrapropostaAceita
        );
      }
    });

    const pendingCount = relevantOffers.length;

    // Update document title with a bell emoji and count
    if (pendingCount > 0) {
      document.title = `🔔 (${pendingCount}) Transcunha Logística`;
    } else {
      document.title = "Transcunha Logística";
    }

    // Play notification sound
    if (pendingCount > 0) {
      // Play immediately if count increased
      if (pendingCount > lastPendingCountRef.current) {
        playNotificationSound();
      }
      
      // Setup periodic reminder sound every 60 seconds
      const intervalId = setInterval(() => {
        playNotificationSound();
      }, 60000);

      lastPendingCountRef.current = pendingCount;
      return () => clearInterval(intervalId);
    } else {
      lastPendingCountRef.current = 0;
    }
  }, [freightOffers, cargos, currentUser, playNotificationSound]);

  useEffect(() => {
    try {
      if (themeImage) {
        localStorage.setItem('transcunha_themeImage', themeImage);
        document.body.style.backgroundImage = `url("${themeImage.replace(/"/g, '\\"')}")`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
      } else {
        localStorage.removeItem('trancunha_themeImage');
        localStorage.removeItem('transcunha_themeImage');
        document.body.style.backgroundImage = '';
      }
    } catch (e) {
      console.warn('[App] Não foi possível salvar tema no localStorage:', e);
      if (themeImage) {
        document.body.style.backgroundImage = `url("${themeImage.replace(/"/g, '\\"')}")`;
      }
    }
  }, [themeImage]);

  useEffect(() => {
    try {
      if (companyLogo) {
        localStorage.setItem('transcunha_companyLogo', companyLogo);
      } else {
        localStorage.removeItem('trancunha_companyLogo');
        localStorage.removeItem('transcunha_companyLogo');
      }
    } catch (e) {
      console.warn('[App] Não foi possível salvar logo no localStorage:', e);
    }
  }, [companyLogo]);

  const verifySession = useCallback(async () => {
    setIsAuthChecking(true);
    console.log('[Auth] Iniciando verificação de sessão...');

    try {
      const savedUserEmail = sessionStorage.getItem('trancunha_user_email');

      if (savedUserEmail) {
        console.log('[Auth] Recuperando perfil para:', savedUserEmail);

        // Verifica se o usuário salvo na sessão já é um motorista
        let savedUser: User | null = null;
        try { savedUser = JSON.parse(sessionStorage.getItem('trancunha_currentUser') || 'null'); } catch { savedUser = null; }
        const isMotoristaSession = savedUser?.profile === UserProfile.Motorista;

        if (isMotoristaSession) {
          // Motorista: valida diretamente na tabela drivers via CPF (não existe em app_users)
          const cleanCpf = savedUserEmail.replace(/\D/g, "");
          const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

          let { data: dbDriver } = await supabase
            .from('drivers')
            .select('*')
            .eq("cpf", formattedCpf)
            .maybeSingle();

          if (!dbDriver) {
            const { data: dbDriverClean } = await supabase
              .from('drivers')
              .select('*')
              .eq("cpf", cleanCpf)
              .maybeSingle();
            dbDriver = dbDriverClean;
          }

          if (dbDriver && dbDriver.active) {
            const driverProfile: User = {
              id: dbDriver.id,
              name: dbDriver.name,
              email: dbDriver.cpf,
              profile: UserProfile.Motorista,
              active: dbDriver.active,
            };
            setCurrentUser(driverProfile);
            console.log('[Auth] Sessão de motorista restaurada:', driverProfile.name);
          } else {
            console.warn('[Auth] Motorista não encontrado ou inativo.');
            setCurrentUser(null);
          }
          return;
        }

        // Usuário interno: busca em app_users
        const { data: dbUser, error: dbError } = await supabase
          .from('app_users')
          .select('*')
          .eq("email", savedUserEmail)
          .maybeSingle();

        if (!dbError && dbUser) {
          const userProfile = toUser(dbUser);

          if (userProfile.active) {
            if (userProfile.passwordUpdatedAt) {
              const lastUpdate = new Date(userProfile.passwordUpdatedAt).getTime();
              const now = new Date().getTime();
              const daysSinceUpdate = (now - lastUpdate) / (1000 * 3600 * 24);
              if (daysSinceUpdate >= 30) {
                userProfile.requirePasswordChange = true;
              }
            }
            setCurrentUser(userProfile);
            console.log('[Auth] Sessão restaurada com sucesso:', userProfile.name);
          } else {
            console.warn('[Auth] Usuário inativo no banco.');
            setCurrentUser(null);
          }
        } else {
          if (dbError) console.error('[Auth] Erro ao recuperar perfil:', dbError.message);
          setCurrentUser(null);
        }
      } else {
        console.log('[Auth] Nenhuma sessão encontrada na aba atual.');
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('[Auth] Erro crítico na verificação:', err);
    } finally {
      setIsAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const nextStatusMap: Partial<Record<ShipmentStatus, ShipmentStatus>> = {
    [ShipmentStatus.PreCadastro]: ShipmentStatus.AguardandoSeguradora,            // 1 -> 2
    [ShipmentStatus.AguardandoSeguradora]: ShipmentStatus.AguardandoCarregamento, // 2 -> 3
    [ShipmentStatus.AguardandoCarregamento]: ShipmentStatus.AguardandoNota,       // 3 -> 4
    [ShipmentStatus.AguardandoNota]: ShipmentStatus.AguardandoFiscal,             // 4 -> 5
    [ShipmentStatus.AguardandoFiscal]: ShipmentStatus.AguardandoAdiantamento,     // 5 -> 6 (ou pula p/ 7 se 0%)
    [ShipmentStatus.AguardandoAdiantamento]: ShipmentStatus.AguardandoAgendamento,// 6 -> 7
    [ShipmentStatus.AguardandoAgendamento]: ShipmentStatus.AguardandoDescarga,    // 7 -> 8
    [ShipmentStatus.AguardandoDescarga]: ShipmentStatus.ValidacaoTicket,          // 8 -> 9
    [ShipmentStatus.ValidacaoTicket]: ShipmentStatus.AguardandoPagamentoSaldo,    // 9 -> 10 (ou pula p/ 11 se 100%)
    [ShipmentStatus.AguardandoPagamentoSaldo]: ShipmentStatus.Finalizado,         // 10 -> 11
  };

  // --- HISTORY LOGGING ---
  const createHistoryLog = (description: string): HistoryLog => {
    if (!currentUser) throw new Error("Ação não pode ser realizada sem um usuário logado.");
    const newLog = {
      id: `log_${nextIds.history}`,
      userId: currentUser.id,
      timestamp: new Date().toISOString(),
      description: `${description}`,
    };
    setNextIds((prev: any) => ({...prev, history: prev.history + 1}));
    return newLog;
  }

  // --- AUTH HANDLERS ---
  const handleLogin = (user: User) => {
    sessionStorage.setItem('trancunha_user_email', user.email);
    sessionStorage.setItem('trancunha_currentUser', JSON.stringify(user));
    localStorage.removeItem('trancunha_user_email');
    localStorage.removeItem('trancunha_currentUser');
    setCurrentUser(user);
    if (user.profile === UserProfile.Motorista) {
      setCurrentPage('operational-loads');
    } else {
      setCurrentPage('dashboard');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('trancunha_user_email');
    sessionStorage.removeItem('trancunha_currentUser');
    localStorage.removeItem('trancunha_user_email');
    localStorage.removeItem('trancunha_currentUser');
    setCurrentUser(null);
    setCurrentPage('dashboard');
  };

  const handlePasswordChange = async (newPassword: string, currentPassword: string) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração não pode alterar senha.', 'warning');
      return;
    }
    
    try {
      // 1. Atualiza no Banco de Dados
      let data, dbError;
      
      if (currentUser.isFirstSetup) {
         // Primeira vez configurando a senha (motorista)
         const result = await supabase.from('app_users').upsert({
           id: currentUser.id,
           name: currentUser.name,
           email: currentUser.email,
           profile: currentUser.profile,
           active: currentUser.active,
           password: newPassword,
           require_password_change: false,
           password_updated_at: new Date().toISOString()
         }).select();
         data = result.data;
         dbError = result.error;
      } else {
          // Atualização de senha padrão
          const result = await supabase
            .from('app_users')
            .update({ 
              password: newPassword,
              require_password_change: false,
              password_updated_at: new Date().toISOString()
            })
            .eq('id', currentUser.id)
            .eq('password', currentPassword)
            .select();
          data = result.data;
          dbError = result.error;
      }
      
      if (dbError || !data || data.length === 0) {
        console.error('Erro ao atualizar senha no Banco:', dbError || 'Nenhuma linha afetada (senha incorreta)');
        throw new Error('A senha atual está incorreta ou houve um erro no banco.');
      }

      // Atualiza estado local
      const updatedUser: User = {
        ...currentUser, 
        password: newPassword, 
        requirePasswordChange: false,
        passwordUpdatedAt: data[0].password_updated_at
      };
      
      setCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      
      showToast('Senha atualizada com sucesso no sistema! Próxima atualização em 30 dias.', 'success');
    } catch (err: any) {
      console.error('Erro geral no handlePasswordChange:', err);
      throw err;
    }
  };

  const handleSavePermissions = async (newPermissions: ProfilePermissions) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    setProfilePermissions(newPermissions);
    try {
      await saveProfilePermissions(newPermissions);
    } catch (err) {
      console.error('Erro ao salvar permissões:', err);
    }
    showToast("Permissões salvas com sucesso!", 'success');
  };
  
  const handleSaveLogo = async (logo: string) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    setCompanyLogo(logo || null);
    try {
      await saveAppSettings({ company_logo: logo || null });
    } catch (err) {
      console.error('Erro ao salvar logo no Supabase:', err);
    }
    showToast("Logo da empresa atualizado com sucesso!", 'success');
  };

  const handleSaveThemeImage = async (image: string) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    setThemeImage(image || null);
    try {
      await saveAppSettings({ theme_image: image || null });
    } catch (err) {
      console.error('Erro ao salvar tema no Supabase:', err);
    }
    showToast("Tema de fundo atualizado com sucesso!", 'success');
  };

  const handleSaveTicket = async (ticketData: Omit<Ticket, 'id' | 'history' | 'createdAt' | 'createdById'>) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    const newId = formatId(nextIds.ticket, 'TCK');
    const newTicket: Ticket = {
      ...ticketData,
      id: newId,
      status: TicketStatus.Aberto,
      createdById: currentUser.id,
      createdAt: new Date().toISOString(),
      history: [{
          userId: currentUser.id,
          timestamp: new Date().toISOString(),
          comment: `Chamado criado e atribuído a ${users.find(u => u.id === ticketData.assignedToId)?.name || 'N/A'}.`
      }],
    };
    setTickets((prev: Ticket[]) => [newTicket, ...prev]);
    setNextIds((prev: any) => ({ ...prev, ticket: prev.ticket + 1 }));
    try { await upsertTicket(newTicket); } catch(err) { console.error('Erro ao salvar ticket:', err); }
  }

  const handleDeleteTicket = async (ticketId: string) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir permanentemente esta informação?")) return;
    if (window.confirm('Tem certeza que deseja excluir este chamado?')) {
      setTickets((prev: Ticket[]) => prev.filter(t => t.id !== ticketId));
      try {
        await deleteTicket(ticketId);
        showToast('Chamado excluído com sucesso.', 'success');
      } catch (err) {
        console.error('Erro ao excluir ticket:', err);
        showToast('Erro ao excluir chamado.', 'error');
      }
    }
  };

  const handleUpdateTicket = async (ticketId: string, newStatus: TicketStatus, comment: string) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    
    const ticketToUpdate = tickets.find(t => t.id === ticketId);
    if (!ticketToUpdate) return;

    const oldStatus = ticketToUpdate.status;
    let finalComment = comment.trim();
    if (!finalComment) {
      finalComment = newStatus === TicketStatus.Resolvido
        ? 'Chamado marcado como resolvido.'
        : `Status alterado para ${newStatus}.`;
    }

    const newHistoryEntry: TicketHistory = {
      userId: currentUser.id,
      timestamp: new Date().toISOString(),
      comment: finalComment,
      oldStatus,
      newStatus,
    };

    const updatedTicket = { 
      ...ticketToUpdate, 
      status: newStatus, 
      history: [...ticketToUpdate.history, newHistoryEntry] 
    };

    setTickets((prevTickets: Ticket[]) =>
      prevTickets.map(ticket => ticket.id === ticketId ? updatedTicket : ticket)
    );

    try {
      await upsertTicket(updatedTicket);
    } catch (err) {
      console.error('Erro ao atualizar ticket:', err);
    }
  };


  // --- DATA FILTERING BASED ON USER ---
  const visibleLoads = useMemo(() => {
    if (!currentUser) return [];

    return cargos.filter(c => {
      // 1. Admin and Demo always see all loads
      if (currentUser.profile === UserProfile.Admin || currentUser.profile === UserProfile.Demonstracao || (currentUser.profile as string) === 'Demo') return true;

      // 2. Motorista profile: sees all non-suspended loads
      if (currentUser.profile === UserProfile.Motorista) {
        return c.status !== CargoStatus.Suspensa && c.status !== CargoStatus.Fechada;
      }

      // 3. Client profile specific filtering (must match clientId or secondary CNPJs)
      if (currentUser.profile === UserProfile.Cliente) {
        if (!currentUser.clientId) return false;
        if (c.clientId === currentUser.clientId) return true;
        const client = clients.find(cl => cl.id === currentUser.clientId);
        if (!client) return false;
        const cleanCargoCnpj = c.clientCnpj?.replace(/\D/g, '');
        if (cleanCargoCnpj) {
          if (client.cnpj?.replace(/\D/g, '') === cleanCargoCnpj) return true;
          if (client.secondaryCnpjs?.some(b => b.cnpj.replace(/\D/g, '') === cleanCargoCnpj || b.id === c.clientBranchId)) return true;
        }
        return false;
      }

      // 4. Filter by allowed user IDs if defined on cargo (Admin, Diretor, Fiscal & Financeiro have global access)
      if (c.allowedUserIds && c.allowedUserIds.length > 0) {
        if (!c.allowedUserIds.includes(currentUser.id) && ![UserProfile.Admin, UserProfile.Diretor, UserProfile.Fiscal, UserProfile.Financeiro, UserProfile.Demonstracao].includes(currentUser.profile as UserProfile)) {
          return false;
        }
      } else if (c.allowedProfiles && c.allowedProfiles.length > 0) {
        if (!c.allowedProfiles.includes(currentUser.profile) && ![UserProfile.Admin, UserProfile.Diretor, UserProfile.Fiscal, UserProfile.Financeiro, UserProfile.Demonstracao].includes(currentUser.profile as UserProfile)) {
          return false;
        }
      }

      // 5. Embarcador & Agenciador profile
      if (currentUser.profile === UserProfile.Embarcador || currentUser.profile === UserProfile.Agenciador) {
        return true;
      }

      // 5. Profiles that see all branches
      if ([UserProfile.Diretor, UserProfile.Fiscal, UserProfile.GerenciadoraDeRisco, UserProfile.Financeiro].includes(currentUser.profile as UserProfile)) {
        return true;
      }

      // 6. Branch filtering for other profiles (e.g. Comercial, Supervisor)
      if (currentUser.branchId) {
        return c.branchId === currentUser.branchId || !c.branchId;
      }

      return true;
    });
  }, [currentUser, cargos, clients]);

  const visibleShipments = useMemo(() => {
    if (!currentUser) return [];

    // Motorista sees their assigned shipments
    if (currentUser.profile === UserProfile.Motorista) {
      const driverCpfClean = (currentUser.email || '').replace(/\D/g, '');
      return shipments.filter(s => (s.driverCpf || '').replace(/\D/g, '') === driverCpfClean);
    }

    // Embarcador & Agenciador see their shipments (ou da sua filial)
    if (currentUser.profile === UserProfile.Embarcador || currentUser.profile === UserProfile.Agenciador) {
      return shipments.filter(s => s.embarcadorId === currentUser.id || s.createdById === currentUser.id || (currentUser.branchId && s.branchId === currentUser.branchId));
    }

    // Admin, Demo & Financeiro see all shipments (Financeiro requires company-wide visibility for advances, balances, receipts and settlement)
    if (currentUser.profile === UserProfile.Admin || currentUser.profile === UserProfile.Demonstracao || (currentUser.profile as string) === 'Demo' || currentUser.profile === UserProfile.Financeiro) {
      return shipments;
    }

    const visibleCargoIds = new Set(visibleLoads.map(c => c.id));

    // Cliente sees shipments of permitted visible loads matching their client
    if (currentUser.profile === UserProfile.Cliente && currentUser.clientId) {
      return shipments.filter(s => visibleCargoIds.has(s.cargoId));
    }

    // Profiles with all-branch visibility must still respect cargo profile permissions
    if ([UserProfile.Diretor, UserProfile.Fiscal, UserProfile.GerenciadoraDeRisco].includes(currentUser.profile as UserProfile)) {
      return shipments.filter(s => visibleCargoIds.has(s.cargoId));
    }

    // Branch filtering for other profiles
    if (currentUser.branchId) {
      return shipments.filter(s => visibleCargoIds.has(s.cargoId) && (s.branchId === currentUser.branchId || !s.branchId));
    }

    return shipments.filter(s => visibleCargoIds.has(s.cargoId));
  }, [currentUser, shipments, visibleLoads]);
  
  const visibleEmbarcadores = useMemo(() => {
    if (!currentUser) return [];
    const allEmbarcadorUsers = users.filter(u => u.profile === UserProfile.Embarcador || u.profile === UserProfile.Agenciador);

    if (currentUser.profile === UserProfile.Embarcador || currentUser.profile === UserProfile.Agenciador) {
        return allEmbarcadorUsers.filter(u => u.id === currentUser.id);
    }
    
    return allEmbarcadorUsers;
  }, [currentUser, users]);


  const inProgressLoads = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const filtered = visibleLoads.filter(c => {
      // Oculta cargas suspensas ou fechadas
      if (c.status !== CargoStatus.EmAndamento) {
        return false;
      }
      // Oculta cargas sem programação ativa a partir de hoje
      return Boolean(c.dailySchedule && c.dailySchedule.some(ds => ds.date >= today));
    });

    // Para motoristas: garantir que os cargos dos embarques ativos sempre estejam incluídos,
    // mesmo que o dailySchedule da carga já tenha passado
    if (currentUser?.profile === UserProfile.Motorista) {
      const driverCpfClean = (currentUser.email || '').replace(/\D/g, '');
      const activeShipmentCargoIds = new Set(
        shipments
          .filter(s =>
            (s.driverCpf || '').replace(/\D/g, '') === driverCpfClean &&
            s.status !== ShipmentStatus.Finalizado &&
            s.status !== ShipmentStatus.Cancelado
          )
          .map(s => s.cargoId)
      );
      // Adicionar cargas faltantes (as que têm embarques ativos mas não passaram no filtro de datas)
      const filteredIds = new Set(filtered.map(c => c.id));
      const missingCargos = visibleLoads.filter(c =>
        activeShipmentCargoIds.has(c.id) && !filteredIds.has(c.id)
      );
      return [...filtered, ...missingCargos];
    }

    return filtered;
  }, [visibleLoads, currentUser, shipments]);

  const handleAcceptFreightOffer = async (offer: FreightOffer) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    try {
      if (offer.cargoId && offer.driverId) {
        // It's a Driver's request for a Shipment
        // We will accept it immediately and ideally open the shipment modal, but since it's hard to pass state directly,
        // we can just approve it and show a message to go to the Cargo to dispatch.
        await handleSaveFreightOffer({ ...offer, status: FreightOfferStatus.Aceita, history: [...(offer.history || []), {
          id: `log_${Date.now()}_sys`,
          userId: currentUser?.id || 'system',
          timestamp: new Date().toISOString(),
          description: `Solicitação aprovada. O embarque deve ser criado na página de Cargas Operacionais.`
        }]});
        showToast('Solicitação aprovada! Vá para Cargas Operacionais e clique em Novo Embarque para esta carga.', 'success');
        return;
      }

      // Salva a oferta imediatamente no Supabase e atualiza o estado local com os novos anexos
      await upsertFreightOffer(offer);
      setFreightOffers(prev => prev.map(o => o.id === offer.id ? offer : o));

      setOfferToConvert(offer);
      setCurrentPage('loads');
      showToast('Preenchendo dados da nova carga a partir da oferta...', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao abrir o formulário da carga.', 'error');
    }
  };

  const handleSaveFreightOffer = async (offerData: FreightOffer | Omit<FreightOffer, 'id' | 'createdAt'>) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    try {
      const isUuid = 'id' in offerData && typeof (offerData as FreightOffer).id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((offerData as FreightOffer).id);
      const isNew = !isUuid;
      const uuid = isUuid ? (offerData as FreightOffer).id : crypto.randomUUID();

      let displayId = ('displayId' in offerData && (offerData as FreightOffer).displayId) ? (offerData as FreightOffer).displayId : '';
      if (!displayId || isNew) {
        const nextNum = nextIds.freightOffer || 1;
        displayId = formatId(nextNum, 'OFR', 2);
        setNextIds((prev: any) => ({ ...prev, freightOffer: (prev.freightOffer || nextNum) + 1 }));
      }

      const tempOffer: FreightOffer = {
        ...offerData,
        id: uuid,
        displayId: displayId,
        createdAt: ('createdAt' in offerData && offerData.createdAt) ? offerData.createdAt : new Date().toISOString(),
        history: ('history' in offerData && offerData.history?.length) ? offerData.history : [{
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          userId: currentUser?.id || '',
          timestamp: new Date().toISOString(),
          description: offerData.freightValuePerTon ? `Oferta criada com valor inicial de R$ ${(offerData.freightValuePerTon || 0).toFixed(2)}.` : `Oferta criada. Aguardando preço da transportadora.`
        }]
      };

      setFreightOffers(prev => {
        const exists = prev.some(o => o.id === tempOffer.id);
        if (exists) {
          return prev.map(o => o.id === tempOffer.id ? tempOffer : o);
        } else {
          return [tempOffer, ...prev];
        }
      });
      
      await upsertFreightOffer(tempOffer);
    } catch (err) {
      console.error('Erro ao salvar oferta de frete:', err);
      showToast('Erro ao atualizar oferta de frete.', 'error');
    }
  };

  const handleRequestLoadOrder = (cargo: Cargo) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    
    // Check if the user already has a pending offer for this cargo
    const existingOffer = freightOffers.find(o => o.cargoId === cargo.id && o.driverId === currentUser.id && o.status === FreightOfferStatus.Pendente);
    if (existingOffer) {
       showToast('Você já possui uma solicitação pendente para esta carga!', 'warning');
       return;
    }
    
    setSelectedCargoForRequest(cargo);
    setIsSelectEmbarcadorModalOpen(true);
  };

  const handleConfirmRequestOrder = async (embarcadorId: string) => {
    if (!currentUser || !selectedCargoForRequest) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    const cargo = selectedCargoForRequest;
    
    const newOffer: FreightOffer | Omit<FreightOffer, 'id' | 'createdAt'> = {
      clientId: cargo.clientId,
      origin: cargo.origin,
      originLocation: cargo.originMapLink,
      destination: cargo.destination,
      destinationLocation: cargo.destinationMapLink,
      totalTonnage: Math.max(0, cargo.scheduledVolume - cargo.loadedVolume) || cargo.scheduledVolume, 
      productId: cargo.productId,
      freightValuePerTon: cargo.driverFreightValuePerTon,
      status: FreightOfferStatus.Pendente,
      driverId: currentUser.id,
      cargoId: cargo.id,
      requestedEmbarcadorId: embarcadorId,
      requestTimestamp: new Date().toISOString(),
      history: [{
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
        description: `Motorista ${currentUser.name} solicitou ordem de carregamento para a Carga ${cargo.sequenceId}.`
      }]
    };
    
    await handleSaveFreightOffer(newOffer);
    showToast('Ordem de carregamento solicitada com sucesso! Aguarde aprovação do Embarcador.', 'success');
    setIsSelectEmbarcadorModalOpen(false);
    setSelectedCargoForRequest(null);
  };

  const handleAcceptOrderRequestFromNotification = (offer: FreightOffer) => {
    if (currentUser) {
      if (isDemoUser(currentUser)) {
        showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
        return;
      }
    }
    setOfferForNewShipment(offer);
  };

  const handleRefuseOrderRequestFromNotification = async (offer: FreightOffer, reason?: string) => {
    if (currentUser) {
      if (isDemoUser(currentUser)) {
        showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
        return;
      }
      const refusalReason = reason || 'Solicitação de ordem recusada pelo embarcador';
      const history = [...(offer.history || []), {
        id: `log_${Date.now()}_sys`,
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
        description: `Solicitação de ordem de carregamento recusada por ${currentUser.name}. Motivo: ${refusalReason}`
      }];
      await handleSaveFreightOffer({ ...offer, status: FreightOfferStatus.Recusada, history });

      // Registrar essa recusa no histórico de embarques cancelados
      if (offer.cargoId) {
        const driverUser = users.find(u => u.id === offer.driverId);
        const driverInDb = drivers.find(d => d.id === offer.driverId || (driverUser?.email && d.cpf.replace(/\D/g, '') === driverUser.email.replace(/\D/g, '')));
        const dName = driverInDb?.name || driverUser?.name || (offer as any).driverName || 'Motorista';
        const dCpf = driverInDb?.cpf || (driverUser?.email && driverUser.email.replace(/\D/g, '').length === 11 ? driverUser.email : '') || (offer as any).driverCpf || '';
        const dContact = driverInDb?.phone || driverUser?.phone || (offer as any).driverContact || '';

        const cargo = cargos.find(c => c.id === offer.cargoId);
        const ton = offer.totalTonnage || (cargo ? Math.max(0, cargo.scheduledVolume - cargo.loadedVolume) : 0) || 0;
        const driverFreightRate = offer.freightValuePerTon || cargo?.driverFreightValuePerTon || 0;

        await handleCreateShipment({
          cargoId: offer.cargoId,
          driverName: dName,
          driverCpf: dCpf,
          driverContact: dContact,
          embarcadorId: currentUser.id,
          horsePlate: '-',
          shipmentTonnage: ton,
          driverFreightValue: driverFreightRate * ton,
          driverFreightRateSnapshot: driverFreightRate,
          status: ShipmentStatus.Cancelado,
          scheduledDate: new Date().toISOString().split('T')[0],
          cancellationReason: refusalReason,
          history: [{
            id: `log_${Date.now()}_refusal`,
            userId: currentUser.id,
            timestamp: new Date().toISOString(),
            description: `Solicitação de ordem do motorista ${dName} recusada. Motivo: ${refusalReason}`
          }]
        });
      }

      showToast('Solicitação de ordem de carregamento recusada e registrada no histórico de cancelados.', 'success');
    }
  };

  const handleDeleteFreightOffer = async (offer: FreightOffer) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir permanentemente esta informação?")) return;
    try {
      setFreightOffers(prev => prev.filter(o => o.id !== offer.id));
      await deleteFreightOffer(offer.id);
      showToast('Oferta excluída com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao excluir oferta de frete:', err);
      showToast('Erro ao excluir oferta de frete.', 'error');
      // Refetch to undo optimistic update
      const offers = await fetchFreightOffers();
      setFreightOffers(offers);
    }
  };

  const activeLoads = useMemo(() => 
    visibleLoads.filter(c => c.status !== CargoStatus.Fechada),
    [visibleLoads]
  );

  const closedLoads = useMemo(() => 
    visibleLoads.filter(c => c.status === CargoStatus.Fechada),
    [visibleLoads]
  );

  
  // --- CRUD HANDLERS ---
  const handleCreateShipment = async (data: NewShipmentRequestData) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    
    let currentNextIds = { ...nextIds };
    let historyId = currentNextIds.history;
    
    const createHistoryLogLocal = (description: string): HistoryLog => {
      const newLog = {
        id: `log_${historyId}`,
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
        description,
      };
      historyId++;
      return newLog;
    };

    let newDrivers = [...drivers];
    let addedDrivers: Driver[] = [];
    let driverToUse = drivers.find(d => 
        (d.name.trim().toLowerCase() === data.driverName.trim().toLowerCase() && data.driverName.trim() !== '') || 
        (d.cpf.replace(/\D/g, '') === (data.driverCpf || '').replace(/\D/g, '') && (data.driverCpf || '').trim() !== '')
    );
    const isAlreadyRegisteredDriver = !!driverToUse;

    const driverCpfClean = (data.driverCpf || driverToUse?.cpf || '').replace(/\D/g, '');
    const driverNameClean = (data.driverName || driverToUse?.name || '').trim().toLowerCase();

    // Verificar se o motorista já tem histórico de embarque efetivado (embarque anterior não cancelado)
    const hasCompletedTrip = shipments.some(s => {
      const sCpfClean = (s.driverCpf || '').replace(/\D/g, '');
      const sNameClean = (s.driverName || '').trim().toLowerCase();
      
      const isDriverMatch = (driverCpfClean !== '' && sCpfClean === driverCpfClean) ||
                            (driverNameClean !== '' && sNameClean === driverNameClean);
      if (!isDriverMatch) return false;

      return s.status !== ShipmentStatus.Cancelado;
    });

    const relatedCargo = findCargoById(cargos, data.cargoId);
    const relatedProduct = findProductForCargo(products, relatedCargo);
    const productRequiresRisk = checkRequiresRiskManagement(relatedCargo, relatedProduct);

    let initialStatus: ShipmentStatus;
    if (!productRequiresRisk) {
      // Produto não necessita de Gerenciamento de Risco (GR):
      // Se motorista com histórico de viagem concluída: pula Ag. Cadastro E Ag. Seguradora -> vai direto para "3 - Ag. Carregamento"
      // Se motorista sem histórico prévio: inicia em "1 - Ag. Cadastro" (e ao avançar do cadastro pulará Ag. Seguradora)
      if (hasCompletedTrip) {
        initialStatus = ShipmentStatus.AguardandoCarregamento;
      } else {
        initialStatus = ShipmentStatus.PreCadastro;
      }
    } else {
      if (hasCompletedTrip) {
        // Motorista com histórico de embarque efetivado: pula "1 - Ag. Cadastro" e inicia em "2 - Ag. Seguradora"
        initialStatus = ShipmentStatus.AguardandoSeguradora;
      } else {
        // Motorista sem histórico prévio: inicia em "1 - Ag. Cadastro"
        initialStatus = ShipmentStatus.PreCadastro;
      }
    }

    if (!driverToUse) {
      const newDriverId = formatId(currentNextIds.driver, 'DRV');
      driverToUse = {
        id: newDriverId,
        name: data.driverName,
        cpf: data.driverCpf || '',
        cnh: data.driverCnh || '',
        phone: data.driverContact || '',
        classification: DriverClassification.Terceiro,
        active: true,
      };
      newDrivers.unshift(driverToUse);
      addedDrivers.push(driverToUse);
      currentNextIds.driver++;
    }

    let newVehicles = [...vehicles];
    let addedVehicles: Vehicle[] = [];
    let newOwners = [...owners];
    let addedOwner: Owner | null = null;
    let defaultOwner = newOwners.find(o => o.name === 'PROPRIETÁRIO PADRÃO TERCEIRO');
    if (!defaultOwner) {
        const newOwnerId = formatId(currentNextIds.owner, 'OWN');
        defaultOwner = {
            id: newOwnerId,
            name: 'PROPRIETÁRIO PADRÃO TERCEIRO',
            cpfCnpj: '00.000.000/0000-00',
            type: OwnerType.PessoaJuridica,
            phone: '',
            bankDetails: ''
        };
        newOwners.unshift(defaultOwner);
        addedOwner = defaultOwner;
        currentNextIds.owner++;
    }

    const processVehicle = (plate: string, isHorse: boolean) => {
        if (!plate || !plate.trim()) return;
        let vehicle = newVehicles.find(v => v.plate.trim().toLowerCase() === plate.trim().toLowerCase());
        if (!vehicle) {
            const newVehicleId = formatId(currentNextIds.vehicle, 'VEH');
            const newVehicle: Vehicle = {
                id: newVehicleId,
                plate: plate,
                setType: isHorse ? (data.vehicleSetType || VehicleSetType.LSSimples) : VehicleSetType.LSSimples,
                bodyType: isHorse ? (data.vehicleBodyType || VehicleBodyType.Graneleiro) : VehicleBodyType.Graneleiro,
                classification: DriverClassification.Terceiro,
                ownerId: defaultOwner.id,
            };
            newVehicles.unshift(newVehicle);
            addedVehicles.push(newVehicle);
            currentNextIds.vehicle++;
        }
    };

    processVehicle(data.horsePlate, true);
    processVehicle(data.trailer1Plate || '', false);
    processVehicle(data.trailer2Plate || '', false);
    processVehicle(data.trailer3Plate || '', false);

    const prefix = currentUser?.name ? currentUser.name.substring(0, 3).toUpperCase() : 'SHP';
    const newShipmentId = formatId(currentNextIds.shipment, prefix);
    
    const documentsUrlMap: { [key: string]: string[] } = {};
    const attachedFileNames: string[] = [];
    if (data.filesToAttach && data.filesToAttach.length > 0) {
      try {
        const newDocUrls = [];
        for (const file of data.filesToAttach) {
          const path = await uploadShipmentAttachment(newShipmentId, 'Arquivos Iniciais', file);
          const url = getShipmentAttachmentUrl(path);
          newDocUrls.push(url);
          attachedFileNames.push(file.name);
        }
        documentsUrlMap['Arquivos Iniciais'] = newDocUrls;
      } catch (error) {
        console.error('Erro ao fazer upload dos anexos iniciais:', error);
        showToast('Ocorreu um erro ao enviar os arquivos. O embarque foi criado, mas os arquivos não puderam ser salvos.', 'warning');
      }
    }
    
    let historyMsg = `Embarque ${newShipmentId} criado.`;
    if (!productRequiresRisk) {
      if (!hasCompletedTrip) {
        historyMsg += ` Primeiro embarque do motorista (sem histórico de viagem concluída) — direcionado para Ag. Cadastro (GR dispensado para este produto).`;
      } else {
        historyMsg += ` Produto com GR dispensado e motorista com histórico — direcionado diretamente para Ag. Carregamento.`;
      }
    } else {
      if (!hasCompletedTrip) {
        historyMsg += ` Primeiro embarque do motorista (sem histórico de viagem concluída) — direcionado para Ag. Cadastro.`;
      } else {
        historyMsg += ` Motorista com histórico de viagem concluída — direcionado diretamente para Ag. Seguradora.`;
      }
    }
    if (attachedFileNames.length > 0) historyMsg += ` Anexo(s): ${attachedFileNames.join(', ')}.`;
    if (data.bankDetails) historyMsg += ` Dados bancários preenchidos.`;

    // Identificação de comissão automática:
    // 1. Agenciador: ativação automática de comissão de agência vinculada ao Líder da Agência
    const requestingUser = users.find(u => u.id === data.embarcadorId) || currentUser;
    const isAgenciadorRequester = requestingUser.profile === UserProfile.Agenciador || currentUser.profile === UserProfile.Agenciador;
    
    const activeAgenciador = requestingUser.profile === UserProfile.Agenciador 
      ? requestingUser 
      : (currentUser.profile === UserProfile.Agenciador ? currentUser : null);

    const agencyLeader = (activeAgenciador && activeAgenciador.agencyRole === 'embarque' && activeAgenciador.agencyLeaderId)
      ? users.find(u => u.id === activeAgenciador.agencyLeaderId)
      : activeAgenciador;

    const agencyRateConfigured = agencyLeader?.agencyCommissionPercentage ?? 30;
    const agencyNameAuto = agencyLeader
      ? (agencyLeader.branchId ? `Agência ${agencyLeader.branchId} (${agencyLeader.name})` : agencyLeader.name)
      : (requestingUser.branchId ? `Agência ${requestingUser.branchId} (${requestingUser.name})` : requestingUser.name);

    // 2. Embarcador com taxa R$/ton configurada: ativação automática da comissão do embarcador
    const shipperRateConfigured = requestingUser.shipperCommissionRatePerTon || (data.embarcadorId ? users.find(u => u.id === data.embarcadorId)?.shipperCommissionRatePerTon : undefined);
    const isShipperCommAuto = Boolean(shipperRateConfigured && shipperRateConfigured > 0);

    if (isAgenciadorRequester) {
      (documentsUrlMap as any).agency_commission_enabled = true;
      (documentsUrlMap as any).agency_commission_percentage = agencyRateConfigured;
      (documentsUrlMap as any).agency_commission_agency_name = agencyNameAuto;
    }
    if (isShipperCommAuto) {
      (documentsUrlMap as any).shipper_commission_enabled = true;
      (documentsUrlMap as any).shipper_commission_rate_per_ton = shipperRateConfigured;
    }

    const newShipment: Shipment = {
      id: newShipmentId,
      orderId: `ord_${newShipmentId}`,
      cargoId: data.cargoId,
      driverName: data.driverName,
      driverContact: data.driverContact,
      driverCpf: data.driverCpf,
      embarcadorId: data.embarcadorId,
      horsePlate: data.horsePlate,
      trailer1Plate: data.trailer1Plate,
      trailer2Plate: data.trailer2Plate,
      trailer3Plate: data.trailer3Plate,
      shipmentTonnage: data.shipmentTonnage,
      driverFreightValue: data.driverFreightValue,
      driverFreightRateSnapshot: data.driverFreightRateSnapshot ?? (findCargoById(cargos, data.cargoId)?.driverFreightValuePerTon || 0),
      companyFreightRateSnapshot: findCargoById(cargos, data.cargoId)?.companyFreightValuePerTon,
      driverFreightType: data.driverFreightType || 'PJ',
      status: data.status || initialStatus,
      cancellationReason: data.cancellationReason,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      paymentMethod: data.paymentMethod,
      pixKey: data.pixKey,
      bankDetails: data.bankDetails,
      advancePercentage: data.advancePercentage,
      documents: Object.keys(documentsUrlMap).length > 0 ? documentsUrlMap : undefined,
      history: data.history ? data.history : [createHistoryLogLocal(historyMsg)],
      createdAt: new Date().toISOString(),
      createdById: currentUser.id,
      driverReferences: data.driverReferences,
      ownerContact: data.ownerContact,
      anttOwnerIdentifier: data.anttOwnerIdentifier,
      anttModality: data.anttModality,
      etcTaxRegime: data.etcTaxRegime,
      agencyCommissionEnabled: isAgenciadorRequester ? true : undefined,
      agencyCommissionPercentage: isAgenciadorRequester ? agencyRateConfigured : undefined,
      agencyCommissionAgencyName: isAgenciadorRequester ? agencyNameAuto : undefined,
      shipperCommissionEnabled: isShipperCommAuto ? true : undefined,
      shipperCommissionRatePerTon: isShipperCommAuto ? shipperRateConfigured : undefined,
      statusHistory: [{
        status: data.status || initialStatus,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
      }],
      vehicleTag: data.vehicleTag,
      vehicleSetType: data.vehicleSetType,
      vehicleBodyType: data.vehicleBodyType,
      branchId: currentUser.branchId,
    };
    const newShipments = [newShipment, ...shipments];
    
    const newCargos = cargos.map(cargo => {
      const isTarget = cargo.id === data.cargoId || String(cargo.id) === String(data.cargoId) || (cargo.sequenceId && String(cargo.sequenceId) === String(data.cargoId).replace(/\D/g, ''));
      if (isTarget) {
        const newScheduledVolume = cargo.scheduledVolume + data.shipmentTonnage;
        return {
          ...cargo,
          scheduledVolume: newScheduledVolume,
          history: [...cargo.history, createHistoryLogLocal(`Volume agendado atualizado para ${newScheduledVolume.toFixed(2)} ton devido ao novo embarque ${newShipmentId}`)],
        };
      }
      return cargo;
    });
    
    currentNextIds.shipment++;
    currentNextIds.history = historyId;
    
    // Batch state updates (optimistic)
    setDrivers(newDrivers);
    setVehicles(newVehicles);
    setShipments(newShipments);
    setCargos(newCargos);
    if (addedOwner) setOwners(newOwners);
    setNextIds(currentNextIds);

    // Persist to Supabase
    try {
      const updatedCargo = findCargoById(newCargos, data.cargoId);
      if (addedOwner) await upsertOwner(addedOwner);
      await upsertManyDrivers(addedDrivers);
      await upsertManyVehicles(addedVehicles);
      await insertShipment(newShipment);
      if (updatedCargo) await upsertCargo(updatedCargo);
    } catch (err: any) {
      console.error('Erro ao salvar embarque no Supabase:', err);
      const errorMessage = err?.message || 'Erro desconhecido ao salvar no banco de dados.';
      showToast(`[ERRO CRÍTICO] O embarque não pôde ser salvo no banco de dados: ${errorMessage}. Verifique sua conexão ou contate o suporte.`, 'error');
    }

    setCurrentPage('shipments');
    let toastMessage = `Novo embarque ${newShipmentId} criado com sucesso!`;
    if (!productRequiresRisk) {
      if (!hasCompletedTrip) {
        toastMessage = `Embarque ${newShipmentId} criado! Primeiro embarque do motorista — direcionado para "Ag. Cadastro" (GR dispensado para este produto).`;
      } else {
        toastMessage = `Embarque ${newShipmentId} criado! Produto sem exigência de GR — direcionado direto para "Ag. Carregamento".`;
      }
    } else {
      if (!hasCompletedTrip) {
        toastMessage = `Embarque ${newShipmentId} criado! Primeiro embarque do motorista (sem histórico de viagem concluída) — direcionado para "Ag. Cadastro".`;
      } else {
        toastMessage = `Embarque ${newShipmentId} criado! Motorista com histórico de viagem concluída — direcionado direto para "Ag. Seguradora".`;
      }
    }
    showToast(toastMessage, 'success');
  };

  const handleMarkArrival = async (shipmentId: string) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    const shipmentToUpdate = shipments.find(s => s.id === shipmentId);
    if (!shipmentToUpdate) return;

    const now = new Date().toISOString();
    const updatedShipment: Shipment = { 
      ...shipmentToUpdate, 
      arrivalTime: now, 
      history: [...shipmentToUpdate.history, createHistoryLog(`Chegada do veículo marcada em ${new Date(now).toLocaleString('pt-BR')}`)] 
    };

    setShipments((prev: Shipment[]) => prev.map(s => s.id === shipmentId ? updatedShipment : s));
    try {
      await upsertShipment(updatedShipment);
    } catch (err) {
      console.error('Erro ao marcar chegada:', err);
    }
  };


  const handleAddShipmentAttachments = async (shipmentId: string, files: File[]) => {
    if (!currentUser) {
      showToast('Usuário não autenticado.', 'error');
      return;
    }
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    
    const shipment = shipments.find(s => s.id === shipmentId);
    if (!shipment) {
      showToast('Embarque não encontrado.', 'error');
      return;
    }

    try {
      const updatedDocuments = { ...(shipment.documents || {}) };
      const newUrls: string[] = [];
      const fileNames: string[] = [];

      for (const file of files) {
        const path = await uploadShipmentAttachment(shipmentId, 'Arquivos Iniciais', file);
        const url = getShipmentAttachmentUrl(path);
        newUrls.push(url);
        fileNames.push(file.name);
      }

      const existingDocs = updatedDocuments['Arquivos Iniciais'] || [];
      updatedDocuments['Arquivos Iniciais'] = [...existingDocs, ...newUrls];

      const updatedShipment: Shipment = {
        ...shipment,
        documents: updatedDocuments,
        history: [...shipment.history, createHistoryLog(`Novos anexos adicionados: ${fileNames.join(', ')}.`)]
      };

      await upsertShipment(updatedShipment);
      setShipments(prev => prev.map(s => s.id === shipmentId ? updatedShipment : s));
      showToast('Documentos anexados com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao anexar documentos:', error);
      showToast('Erro ao anexar documentos. Verifique sua conexão.', 'error');
    }
  };
  
  const handleDeleteShipmentAttachment = async (shipmentId: string, url: string) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    
    const shipment = shipments.find(s => s.id === shipmentId);
    if (!shipment || !shipment.documents) return;

    try {
      // 1. Storage Removal (non-blocking best effort)
      await deleteShipmentAttachmentFromStorage(url);

      // 2. Database Update
      const updatedDocuments = { ...shipment.documents };
      let foundCategory = '';
      let fileName = '';

      const rawParts = url.split('/');
      const rawDecoded = decodeURIComponent(rawParts[rawParts.length - 1].split('?')[0]);
      fileName = rawDecoded.includes('_') ? rawDecoded.split('_').slice(2).join('_') : rawDecoded;

      // Find the category and remove the URL safely whether it's an Array or a String
      Object.keys(updatedDocuments).forEach(category => {
        const val = updatedDocuments[category];
        if (Array.isArray(val)) {
          if (val.includes(url)) {
            foundCategory = category;
            updatedDocuments[category] = val.filter((u: string) => u !== url);
            if (updatedDocuments[category].length === 0) {
              delete updatedDocuments[category];
            }
          }
        } else if (typeof val === 'string' && val === url) {
          foundCategory = category;
          delete updatedDocuments[category];
        }
      });

      const updatedShipment: Shipment = {
        ...shipment,
        documents: updatedDocuments,
        history: [...shipment.history, createHistoryLog(`Anexo removido (${foundCategory || 'Geral'}): ${fileName || 'Arquivo'}`)]
      };

      await upsertShipment(updatedShipment);
      setShipments(prev => prev.map(s => s.id === shipmentId ? updatedShipment : s));
      showToast('Anexo removido com sucesso!', 'success');
    } catch (error: any) {
      console.error('Erro ao remover anexo:', error);
      showToast(`Erro ao remover anexo: ${error?.message || 'Verifique sua conexão.'}`, 'error');
    }
  };

  const handleUpdateShipmentAttachment = async (shipmentId: string, data: { 
    filesToAttach: { [key: string]: File[] }, 
    bankDetails?: string, 
    loadedTonnage?: number, 
    advancePercentage?: number, 
    advanceValue?: number,
    tollValue?: number, 
    balanceToReceiveValue?: number,
    discountValue?: number,
    isBreakageWaived?: boolean,
    netBalanceValue?: number,
    unloadedTonnage?: number,
    route?: string,
    grStatus?: 'aprovado' | 'reprovado' | 'reprovado_restrito',
    riskReleaseCode?: string,
    riskQueryType?: string,
    riskQueryCost?: number,
    realProfitData?: RealProfitData,
  }) => {
    const { filesToAttach, bankDetails, loadedTonnage, advancePercentage, advanceValue, tollValue, balanceToReceiveValue, discountValue, isBreakageWaived, netBalanceValue, unloadedTonnage, route, grStatus, riskReleaseCode, riskQueryType, riskQueryCost, realProfitData } = data;
    
    if (!currentUser) {
      showToast('Usuário não autenticado.', 'error');
      throw new Error('Usuário não autenticado');
    }

    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      throw new Error('Usuário em modo demonstração possui acesso apenas de visualização.');
    }

    const originalShipment = shipments.find(s => s.id === shipmentId);
    
    if (!originalShipment) {
      showToast('Embarque não encontrado.', 'error');
      throw new Error('Embarque não encontrado');
    }

    // Validation for "Aguardando Seguradora" transition
    if (originalShipment.status === ShipmentStatus.AguardandoSeguradora) {
        if (!grStatus || grStatus === 'aprovado') {
            // Resolve the product linked to this shipment's cargo
            const relatedCargo = findCargoById(cargos, originalShipment.cargoId);
            const relatedProduct = findProductForCargo(products, relatedCargo);
            const needsFullRiskFlow = checkRequiresRiskManagement(relatedCargo, relatedProduct);

            if (needsFullRiskFlow) {
                // Fluxo completo: exige código de liberação + tipo de consulta
                if (!riskReleaseCode?.trim()) {
                    showToast('O Código de Liberação da Gerenciadora é obrigatório.', 'warning');
                    throw new Error('O Código de Liberação da Gerenciadora é obrigatório.');
                }
                if (!riskQueryType) {
                    showToast('O Tipo de Consulta Realizada é obrigatório.', 'warning');
                    throw new Error('O Tipo de Consulta Realizada é obrigatório.');
                }
            }
        }
    }


    // Validation for "Aguardando Nota" transition
    if (originalShipment.status === ShipmentStatus.AguardandoNota && !originalShipment.bankDetails && !bankDetails) {
        showToast('Dados bancários são obrigatórios para avançar para a etapa de adiantamento.', 'warning');
        throw new Error('Dados bancários são obrigatórios para avançar para a etapa de adiantamento.');
    }

    if (originalShipment.status === ShipmentStatus.AguardandoCarregamento && !route?.trim()) {
        showToast('A rota do motorista é obrigatória para avançar para a próxima etapa.', 'warning');
        throw new Error('A rota do motorista é obrigatória para avançar para a próxima etapa.');
    }

    if (originalShipment.status === ShipmentStatus.AguardandoCarregamento && (!loadedTonnage || loadedTonnage <= 0)) {
        showToast('O peso carregado é obrigatório para avançar para a próxima etapa.', 'warning');
        throw new Error('O peso carregado é obrigatório para avançar para a próxima etapa.');
    }

    const relatedCargoForTransition = findCargoById(cargos, originalShipment.cargoId);
    const relatedProductForTransition = findProductForCargo(products, relatedCargoForTransition);
    const productRequiresRiskForTransition = checkRequiresRiskManagement(relatedCargoForTransition, relatedProductForTransition);

    let nextStatus: ShipmentStatus | undefined;

    if (originalShipment.status === ShipmentStatus.AguardandoSeguradora && (grStatus === 'reprovado' || grStatus === 'reprovado_restrito')) {
        nextStatus = ShipmentStatus.Cancelado;
    } else if (originalShipment.status === ShipmentStatus.PreCadastro) {
        // 1 - Ag. Cadastro -> 2 - Ag. Seguradora (ou pula para 3 - Ag. Carregamento se produto não requer GR)
        nextStatus = productRequiresRiskForTransition ? ShipmentStatus.AguardandoSeguradora : ShipmentStatus.AguardandoCarregamento;
    } else if (originalShipment.status === ShipmentStatus.AguardandoSeguradora) {
        // 2 - Ag. Seguradora -> 3 - Ag. Carregamento
        nextStatus = ShipmentStatus.AguardandoCarregamento;
    } else if (originalShipment.status === ShipmentStatus.AguardandoCarregamento) {
        // 3 - Ag. Carregamento -> 4 - Ag. Nota
        nextStatus = ShipmentStatus.AguardandoNota;
    } else if (originalShipment.status === ShipmentStatus.AguardandoNota) {
        // 4 - Ag. Nota -> 5 - Ag. Fiscal
        nextStatus = ShipmentStatus.AguardandoFiscal;
    } else if (originalShipment.status === ShipmentStatus.AguardandoFiscal) {
        // 5 - Ag. Fiscal -> 6 - Ag. Adiantamento (ou pula para 7 apenas se explicitamente 0% de adiantamento)
        const advPct = advancePercentage !== undefined ? advancePercentage : (originalShipment.advancePercentage !== undefined ? originalShipment.advancePercentage : 70);
        const is0PercentAdvance = advPct === 0;

        if (is0PercentAdvance) {
            // Pula "6 - Ag. Adiantamento" e vai direto para "7 - Ag. Agend. ou Troca/nfe"
            nextStatus = ShipmentStatus.AguardandoAgendamento;
        } else {
            nextStatus = ShipmentStatus.AguardandoAdiantamento;
        }
    } else if (originalShipment.status === ShipmentStatus.AguardandoAdiantamento) {
        // 6 - Ag. Adiantamento -> 7 - Ag. Agend. ou Troca/nfe
        nextStatus = ShipmentStatus.AguardandoAgendamento;
    } else if (originalShipment.status === ShipmentStatus.AguardandoAgendamento) {
        // 7 - Ag. Agend. ou Troca/nfe -> 8 - Ag. Descarga
        nextStatus = ShipmentStatus.AguardandoDescarga;
    } else if (currentUser.profile === UserProfile.Motorista && originalShipment.status === ShipmentStatus.AguardandoDescarga) {
        nextStatus = ShipmentStatus.AguardandoDescarga;
    } else if (originalShipment.status === ShipmentStatus.AguardandoDescarga) {
        // 8 - Ag. Descarga -> 9 - Valid. de Ticket
        nextStatus = ShipmentStatus.ValidacaoTicket;
    } else if (originalShipment.status === ShipmentStatus.ValidacaoTicket) {
        // 9 - Valid. de Ticket -> 10 - Ag. Saldo (ou pula para 11 se 100% de adiantamento)
        const is100PercentAdvance = (originalShipment.advancePercentage !== undefined && originalShipment.advancePercentage >= 100) || 
                                     (originalShipment.balanceToReceiveValue !== undefined && originalShipment.balanceToReceiveValue <= 0.001 && originalShipment.advanceValue !== undefined && originalShipment.advanceValue > 0) ||
                                     (originalShipment.advanceValue !== undefined && originalShipment.driverFreightValue !== undefined && (originalShipment.advanceValue + (originalShipment.tollValue || 0) >= originalShipment.driverFreightValue - 0.01));
        if (is100PercentAdvance) {
            // Pula "10 - Ag. Saldo" e vai direto para "11 - Finalizado"
            nextStatus = ShipmentStatus.Finalizado;
        } else {
            nextStatus = ShipmentStatus.AguardandoPagamentoSaldo;
        }
    } else if (originalShipment.status === ShipmentStatus.AguardandoPagamentoSaldo) {
        // 10 - Ag. Saldo -> 11 - Finalizado
        nextStatus = ShipmentStatus.Finalizado;
    } else if (originalShipment.status === ShipmentStatus.Finalizado) {
        nextStatus = ShipmentStatus.Finalizado;
    } else {
        nextStatus = nextStatusMap[originalShipment.status];
    }
    
    if (!nextStatus) {
      console.warn(`[handleUpdateShipmentAttachment] No next status found for ${originalShipment.status}`);
      throw new Error(`Não há próximo status configurado para ${originalShipment.status}`);
    }

    const currentStatus = originalShipment.status;
    let isUserAllowed = true;
    let alertMessage = '';

    // Check permissions based on the current status
    if (currentStatus === ShipmentStatus.PreCadastro) {
        isUserAllowed = [UserProfile.Fiscal, UserProfile.Diretor, UserProfile.Supervisor, UserProfile.Embarcador, UserProfile.Comercial, UserProfile.Admin, UserProfile.Agenciador, UserProfile.GerenciadoraDeRisco].includes(currentUser.profile);
        alertMessage = 'Apenas os perfis Gerenciadora de Risco, Comercial, Fiscal, Diretor, Supervisor, Embarcador, Agenciador ou Administrador podem realizar esta ação.';
    } else if (currentStatus === ShipmentStatus.AguardandoSeguradora) {
        isUserAllowed = [UserProfile.GerenciadoraDeRisco, UserProfile.Admin, UserProfile.Diretor, UserProfile.Supervisor, UserProfile.Embarcador, UserProfile.Fiscal, UserProfile.Comercial, UserProfile.Financeiro].includes(currentUser.profile);
        alertMessage = 'Apenas o perfil Gerenciadora de Risco, Embarcador ou Administrador do Sistema pode avançar embarques neste status.';
    } else if (currentStatus === ShipmentStatus.AguardandoDescarga) {
        isUserAllowed = [UserProfile.Embarcador, UserProfile.Fiscal, UserProfile.Diretor, UserProfile.Supervisor, UserProfile.Comercial, UserProfile.Admin, UserProfile.Financeiro, UserProfile.Agenciador, UserProfile.Motorista].includes(currentUser.profile);
        alertMessage = 'Você não tem permissão para anexar o comprovante de descarga.';
    } else if (currentStatus === ShipmentStatus.ValidacaoTicket) {
        isUserAllowed = [UserProfile.Fiscal, UserProfile.Diretor, UserProfile.Supervisor, UserProfile.Comercial, UserProfile.Admin, UserProfile.Financeiro].includes(currentUser.profile);
        alertMessage = 'Apenas os perfis Fiscal, Supervisor, Diretor, Comercial, Financeiro ou Administrador do Sistema podem validar o ticket do embarque (bloqueado para Embarcador).';
    } else if (currentStatus === ShipmentStatus.AguardandoAdiantamento || currentStatus === ShipmentStatus.AguardandoPagamentoSaldo || currentStatus === ShipmentStatus.Finalizado) {
        isUserAllowed = [UserProfile.Financeiro, UserProfile.Diretor, UserProfile.Supervisor, UserProfile.Admin, UserProfile.Fiscal, UserProfile.Comercial].includes(currentUser.profile);
        alertMessage = 'Apenas os perfis Financeiro, Diretor, Supervisor, Fiscal, Comercial ou Administrador do Sistema podem realizar esta ação.';
    }


    if (!isUserAllowed) {
        showToast(`Você não tem permissão para alterar o status deste embarque. ${alertMessage}`, 'error');
        throw new Error(`Você não tem permissão para alterar o status deste embarque. ${alertMessage}`);
    }

    // 1. Upload Files - Fetch freshest documents from Supabase to prevent concurrent overwrites
    let latestDbDocs: Record<string, any> = {};
    let latestDbCteNumber: string | undefined = undefined;
    let latestDbCteDate: string | undefined = undefined;
    let latestDbNfeNumber: string | undefined = undefined;
    let latestDbMdfeNumber: string | undefined = undefined;

    try {
      const { data: freshRow } = await supabase
        .from('shipments')
        .select('documents, cte_number, cte_emission_date, nfe_number, mdfe_number')
        .eq('id', shipmentId)
        .single();
      if (freshRow?.documents) {
        latestDbDocs = freshRow.documents;
      }
      latestDbCteNumber = freshRow?.cte_number || freshRow?.documents?.cte_number;
      latestDbCteDate = freshRow?.cte_emission_date || freshRow?.documents?.cte_emission_date;
      latestDbNfeNumber = freshRow?.nfe_number || freshRow?.documents?.nfe_number;
      latestDbMdfeNumber = freshRow?.mdfe_number || freshRow?.documents?.mdfe_number;
    } catch (err) {
      console.warn('[handleUpdateShipmentAttachment] Could not fetch freshest db documents:', err);
    }

    const updatedDocuments = { ...(originalShipment.documents || {}), ...latestDbDocs };
    const attachedFileNames: string[] = [];

    try {
      for (const docType in filesToAttach) {
        const files = filesToAttach[docType];
        if (!Array.isArray(files) || files.length === 0) continue;
        
        const newDocUrls = [];
        for (const file of files) {
          const path = await uploadShipmentAttachment(shipmentId, docType, file);
          const url = getShipmentAttachmentUrl(path);
          newDocUrls.push(url);
          attachedFileNames.push(file.name);
        }
        const existingDocs = updatedDocuments[docType] || [];
        updatedDocuments[docType] = [...existingDocs, ...newDocUrls];
      }
    } catch (error) {
      console.error('Erro ao fazer upload dos anexos:', error);
      showToast('Ocorreu um erro ao enviar os arquivos. Verifique sua conexão e tente novamente.', 'error');
      throw error;
    }

    // 1b. Extract fiscal document numbers (CT-e, NF-e, MDF-e, Data de Emissão) from attached files
    const targetStatus = nextStatus || originalShipment.status;
    const canExtractCte = isCteApplicableForStatus(targetStatus);

    let extractedCteNumber: string | undefined = originalShipment.cteNumber || latestDbCteNumber || undefined;
    let extractedCteEmissionDate: string | undefined = originalShipment.cteEmissionDate || latestDbCteDate || undefined;
    let extractedNfeNumber: string | undefined = originalShipment.nfeNumber || latestDbNfeNumber || undefined;
    let extractedMdfeNumber: string | undefined = originalShipment.mdfeNumber || latestDbMdfeNumber || undefined;
    let fiscalDocLog = '';
    let extractedTollValue: number | undefined = undefined;
    let extractedAdvanceValue: number | undefined = undefined;
    let extractedAdvancePercentage: number | undefined = undefined;

    if (Object.keys(filesToAttach).length > 0) {
      try {
        const fiscalNums = await extractFiscalDocNumbers(filesToAttach);
        const hasCteFileInBatch = Object.keys(filesToAttach).some(dt => isCteDocType(dt));

        if (canExtractCte && fiscalNums.cteNumber && (hasCteFileInBatch || !extractedCteNumber)) {
          extractedCteNumber = fiscalNums.cteNumber;
        }
        if (canExtractCte && fiscalNums.cteEmissionDate && (hasCteFileInBatch || !extractedCteEmissionDate)) {
          extractedCteEmissionDate = fiscalNums.cteEmissionDate;
        }
        if (fiscalNums.nfeNumber) extractedNfeNumber = fiscalNums.nfeNumber;
        if (fiscalNums.mdfeNumber) extractedMdfeNumber = fiscalNums.mdfeNumber;
        if (fiscalNums.tollValue !== undefined) extractedTollValue = fiscalNums.tollValue;
        if (fiscalNums.advanceValue !== undefined) extractedAdvanceValue = fiscalNums.advanceValue;
        if (fiscalNums.advancePercentage !== undefined) extractedAdvancePercentage = fiscalNums.advancePercentage;

        const docLogs = [
          (canExtractCte && fiscalNums.cteNumber) ? `CT-e nº ${fiscalNums.cteNumber}` : null,
          (canExtractCte && fiscalNums.cteEmissionDate) ? `Emissão: ${fiscalNums.cteEmissionDate}` : null,
          fiscalNums.nfeNumber ? `NF-e nº ${fiscalNums.nfeNumber}` : null,
          fiscalNums.mdfeNumber ? `MDF-e nº ${fiscalNums.mdfeNumber}` : null,
          fiscalNums.advanceValue !== undefined ? `Adiantamento: R$ ${fiscalNums.advanceValue.toLocaleString('pt-BR')}` : null,
          fiscalNums.tollValue !== undefined ? `Pedágio: R$ ${fiscalNums.tollValue.toLocaleString('pt-BR')}` : null,
          fiscalNums.advancePercentage !== undefined ? `% Adiantamento: ${fiscalNums.advancePercentage}%` : null,
        ].filter(Boolean);
        if (docLogs.length > 0) {
          fiscalDocLog = docLogs.join(', ');
        }
      } catch (e) {
        console.warn('[handleUpdateShipmentAttachment] Could not extract fiscal doc numbers:', e);
      }
    }

    // Safety fallback: if CTE is applicable and we have CTE documents attached, derive CTE number if still missing
    if (canExtractCte && !extractedCteNumber) {
      const derivedCte = getShipmentCte({ status: targetStatus, documents: updatedDocuments });
      if (derivedCte && derivedCte !== '-') {
        extractedCteNumber = derivedCte;
      }
    }
    if (canExtractCte && !extractedCteEmissionDate) {
      const derivedDate = getShipmentCteEmissionDate({ status: targetStatus, documents: updatedDocuments });
      if (derivedDate) {
        extractedCteEmissionDate = derivedDate;
      }
    }

    // 2. Prepare Updates
    const historyLogs = [];
    if(attachedFileNames.length > 0) historyLogs.push(`anexo(s): ${attachedFileNames.join(', ')}`);
    if(bankDetails) historyLogs.push(`Dados bancários preenchidos.`);
    if(fiscalDocLog) historyLogs.push(`Documentos fiscais extraídos: ${fiscalDocLog}.`);


    let updatedTonnage = originalShipment.shipmentTonnage;
    let updatedDriverFreight = originalShipment.driverFreightValue;
    
    if (loadedTonnage !== undefined && loadedTonnage > 0) {
        updatedTonnage = loadedTonnage;
        const rateToUse = originalShipment.driverFreightRateSnapshot || cargos.find(c => c.id === originalShipment.cargoId)?.driverFreightValuePerTon || 0;
        updatedDriverFreight = rateToUse * loadedTonnage;
        const formattedVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(updatedDriverFreight);
        historyLogs.push(`Tonelagem ajustada para ${loadedTonnage.toLocaleString('pt-BR')} ton. Frete atualizado para ${formattedVal}.`);
    }
    
    let calculatedAdvanceValue = originalShipment.advanceValue;
    let finalAdvancePercentage = originalShipment.advancePercentage;
    const effectiveTollValue = tollValue !== undefined ? tollValue : (extractedTollValue !== undefined ? extractedTollValue : originalShipment.tollValue);
    const effectiveAdvancePercentage = advancePercentage !== undefined ? advancePercentage : (extractedAdvancePercentage !== undefined ? extractedAdvancePercentage : (originalShipment.advancePercentage !== undefined ? originalShipment.advancePercentage : 70));

    const isPfCalc = (originalShipment.driverFreightType === 'PF' || originalShipment.anttModality === 'TAC');
    const calcResult = calculateAdvanceAndBalance({
      driverFreightValue: updatedDriverFreight,
      tollValue: effectiveTollValue || 0,
      advancePercentage: effectiveAdvancePercentage,
      driverFreightType: isPfCalc ? 'PF' : 'PJ',
    });

    if (advanceValue !== undefined) {
        calculatedAdvanceValue = advanceValue;
        finalAdvancePercentage = effectiveAdvancePercentage;
        historyLogs.push(`Valor pago na conta de R$ ${calculatedAdvanceValue.toLocaleString('pt-BR')} registrado.`);
    } else if (extractedAdvanceValue !== undefined) {
        calculatedAdvanceValue = extractedAdvanceValue;
        finalAdvancePercentage = effectiveAdvancePercentage;
        historyLogs.push(`Valor pago na conta de R$ ${calculatedAdvanceValue.toLocaleString('pt-BR')} extraído do documento.`);
    } else if (effectiveAdvancePercentage !== undefined && effectiveAdvancePercentage > 0) {
        finalAdvancePercentage = effectiveAdvancePercentage;
        calculatedAdvanceValue = calcResult.advanceInAccountValue;
        const formattedAdv = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculatedAdvanceValue);
        historyLogs.push(`Pagamento de Adiantamento: ${effectiveAdvancePercentage}% registrado (Conta: ${formattedAdv} + Tag: R$ ${(effectiveTollValue || 0).toLocaleString('pt-BR')}).`);
    }

    let finalBalanceToReceive = balanceToReceiveValue ?? ((originalShipment.balanceToReceiveValue !== undefined && originalShipment.balanceToReceiveValue > 0 && originalShipment.status === ShipmentStatus.AguardandoPagamentoSaldo) ? originalShipment.balanceToReceiveValue : calcResult.balanceToReceiveValue);
    let finalDiscountValue = isBreakageWaived ? 0 : (discountValue ?? originalShipment.discountValue);
    let finalNetBalanceValue = netBalanceValue ?? originalShipment.netBalanceValue;
    let finalIsBreakageWaived = isBreakageWaived !== undefined ? isBreakageWaived : originalShipment.isBreakageWaived;

    if (isBreakageWaived) {
        historyLogs.push(`Quebra de carga abonada (sem aplicação de desconto).`);
    } else if (discountValue !== undefined && discountValue > 0) {
        const formattedDiscount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountValue);
        historyLogs.push(`Desconto de quebra aplicado: ${formattedDiscount}.`);
    }

    if (balanceToReceiveValue !== undefined || discountValue !== undefined || netBalanceValue !== undefined) {
        historyLogs.push(`Pagamento de Saldo registrado.`);
    }

    let finalUnloadedTonnage = unloadedTonnage ?? originalShipment.unloadedTonnage;
    if (unloadedTonnage !== undefined && unloadedTonnage > 0) {
        historyLogs.push(`Peso descarregado: ${unloadedTonnage.toLocaleString('pt-BR')} ton.`);
    }
    
    if (route) historyLogs.push(`Rota informada: ${route}`);
    if (riskReleaseCode) historyLogs.push(`Liberação de Seguradora: Cód ${riskReleaseCode} (${riskQueryType} - R$ ${riskQueryCost})`);

    let cancellationReason = originalShipment.cancellationReason;
    if (originalShipment.status === ShipmentStatus.AguardandoSeguradora && (grStatus === 'reprovado' || grStatus === 'reprovado_restrito')) {
        if (grStatus === 'reprovado') {
            cancellationReason = 'Reprovado no GR';
            historyLogs.push('Embarque cancelado devido a Reprovado no GR.');
        } else {
            cancellationReason = 'Reprovado no GR e Restrito';
            historyLogs.push('Embarque cancelado devido a Reprovado no GR e Restrito. Motorista negativado/restrito no sistema.');
        }
    }

    const isStatusSame = nextStatus === originalShipment.status;
    const logMessage = isStatusSame
        ? `Comprovante de descarga anexado pelo motorista. ${historyLogs.join(' ')}`
        : `Status alterado para ${nextStatus}. ${historyLogs.join(' ')}`;
    const statusChangeLog = createHistoryLog(logMessage);

    const updatedShipment: Shipment = {
        ...originalShipment,
        status: nextStatus,
        cancellationReason: cancellationReason,
        documents: updatedDocuments,
        bankDetails: bankDetails || originalShipment.bankDetails,
        shipmentTonnage: updatedTonnage,
        driverFreightValue: updatedDriverFreight,
        advancePercentage: finalAdvancePercentage,
        advanceValue: calculatedAdvanceValue,
        tollValue: effectiveTollValue !== undefined ? effectiveTollValue : originalShipment.tollValue,
        balanceToReceiveValue: finalBalanceToReceive,
        discountValue: finalDiscountValue,
        netBalanceValue: finalNetBalanceValue,
        isBreakageWaived: finalIsBreakageWaived,
        unloadedTonnage: finalUnloadedTonnage,
        route: route || originalShipment.route,
        riskReleaseCode: riskReleaseCode || originalShipment.riskReleaseCode,
        riskQueryType: riskQueryType || originalShipment.riskQueryType,
        riskQueryCost: riskQueryCost !== undefined ? riskQueryCost : originalShipment.riskQueryCost,
        cteNumber: extractedCteNumber,
        cteEmissionDate: extractedCteEmissionDate,
        nfeNumber: extractedNfeNumber,
        mdfeNumber: extractedMdfeNumber,
        realProfitData: realProfitData || originalShipment.realProfitData,
        history: [...originalShipment.history, statusChangeLog],
        statusHistory: isStatusSame
            ? (originalShipment.statusHistory || [])
            : [
                ...(originalShipment.statusHistory || []),
                {
                    status: nextStatus,
                    timestamp: new Date().toISOString(),
                    userId: currentUser.id,
                }
            ],
    };

    // 3. Prepare Cargo Update (if applicable)
    const statusOrder = [
        ShipmentStatus.AguardandoSeguradora, ShipmentStatus.PreCadastro,
        ShipmentStatus.AguardandoCarregamento, ShipmentStatus.AguardandoNota, ShipmentStatus.AguardandoFiscal,
        ShipmentStatus.AguardandoAdiantamento, ShipmentStatus.AguardandoAgendamento,
        ShipmentStatus.AguardandoDescarga, ShipmentStatus.ValidacaoTicket, ShipmentStatus.AguardandoPagamentoSaldo,
        ShipmentStatus.Finalizado
    ];

    const isAdvancingToLoaded = nextStatus === ShipmentStatus.AguardandoDescarga && 
                               statusOrder.indexOf(originalShipment.status) < statusOrder.indexOf(ShipmentStatus.AguardandoDescarga);

    let updatedCargo: Cargo | undefined;
    if (nextStatus === ShipmentStatus.Cancelado && originalShipment.status !== ShipmentStatus.Cancelado) {
        const relatedCargo = cargos.find(c => c.id === originalShipment.cargoId);
        if (relatedCargo) {
            const newScheduledVolume = Math.max(0, relatedCargo.scheduledVolume - originalShipment.shipmentTonnage);
            updatedCargo = { 
                ...relatedCargo, 
                scheduledVolume: newScheduledVolume, 
                history: [...relatedCargo.history, createHistoryLog(`Volume agendado ajustado devido ao cancelamento do embarque ${shipmentId} (Reprovação no GR).`)] 
            };
        }
    } else if (isAdvancingToLoaded) {
        const cargo = cargos.find(c => c.id === originalShipment.cargoId);
        if (cargo) {
            const newLoadedVolume = (cargo.loadedVolume || 0) + updatedShipment.shipmentTonnage;
            updatedCargo = { 
                ...cargo, 
                loadedVolume: newLoadedVolume, 
                history: [...cargo.history, createHistoryLog(`Volume carregado atualizado para ${newLoadedVolume.toFixed(2)} ton via embarque ${shipmentId}.`)] 
            };
        }
    }

    let updatedDriverToRestrict: Driver | undefined;
    if (grStatus === 'reprovado_restrito' && (originalShipment.driverCpf || originalShipment.driverName)) {
        const driverObj = drivers.find(d => (d.cpf && d.cpf === originalShipment.driverCpf) || d.name === originalShipment.driverName);
        if (driverObj) {
            updatedDriverToRestrict = {
                ...driverObj,
                active: false,
                restrictionReason: 'Reprovado no GR',
            };
        }
    }

    let createdTicket: Ticket | undefined;
    if (currentUser.profile === UserProfile.Motorista && originalShipment.status === ShipmentStatus.AguardandoDescarga) {
        const newTicketId = formatId(nextIds.ticket, 'TCK');
        const commentMsg = `Chamado criado automaticamente após o envio do comprovante de descarga pelo motorista ${currentUser.name}.`;
        const assignedToId = originalShipment.embarcadorId || '';

        const is100PercentAdvance = (originalShipment.advancePercentage !== undefined && originalShipment.advancePercentage >= 100) || 
                                     (originalShipment.balanceToReceiveValue !== undefined && originalShipment.balanceToReceiveValue <= 0.001 && originalShipment.advanceValue !== undefined && originalShipment.advanceValue > 0) ||
                                     (originalShipment.advanceValue !== undefined && originalShipment.driverFreightValue !== undefined && (originalShipment.advanceValue + (originalShipment.tollValue || 0) >= originalShipment.driverFreightValue - 0.01));
        const targetStatusText = is100PercentAdvance ? '"Finalizado"' : '"Ag. Saldo"';

        createdTicket = {
            id: newTicketId,
            title: `Confirmação de Descarga - Embarque ${shipmentId}`,
            description: `O motorista ${currentUser.name} anexou o Comprovante de Descarga para o embarque ${shipmentId}.\nPor favor, confirme o peso descarregado (Informado pelo motorista: ${unloadedTonnage ? unloadedTonnage + ' Ton' : 'Não informado'}) e altere o status do embarque para ${targetStatusText}.`,
            status: TicketStatus.Aberto,
            priority: TicketPriority.Alta,
            createdById: currentUser.id,
            assignedToId: assignedToId,
            createdAt: new Date().toISOString(),
            shipmentId: shipmentId,
            cargoId: originalShipment.cargoId,
            history: [{
                userId: currentUser.id,
                timestamp: new Date().toISOString(),
                comment: commentMsg
            }]
        };
    }

    // 4. Persist to Supabase
    try {
      await upsertShipment(updatedShipment);
      if (updatedCargo) {
        await upsertCargo(updatedCargo);
      }
      if (createdTicket) {
        await upsertTicket(createdTicket);
      }
      if (updatedDriverToRestrict) {
        await upsertDriver(updatedDriverToRestrict);
      }
      
      // 5. Update local state on SUCCESS
      setShipments((prev: Shipment[]) => prev.map(s => s.id === shipmentId ? updatedShipment : s));
      if (updatedCargo) {
        const cargoToUpdate = updatedCargo; // capture for closure
        setCargos(prev => prev.map(c => c.id === cargoToUpdate.id ? cargoToUpdate : c));
      }
      if (createdTicket) {
        const ticketToUpdate = createdTicket;
        setTickets((prev: Ticket[]) => [ticketToUpdate, ...prev]);
        setNextIds((prev: any) => ({ ...prev, ticket: prev.ticket + 1 }));
      }
      if (updatedDriverToRestrict) {
        const driverToUpdate = updatedDriverToRestrict;
        setDrivers((prev: Driver[]) => prev.map(d => d.id === driverToUpdate.id ? driverToUpdate : d));
      }
      
      let successMsg = 'Embarque atualizado com sucesso!';
      if (grStatus === 'reprovado') {
        successMsg = 'Embarque cancelado devido a reprovação na Gerenciadora de Risco (GR).';
      } else if (grStatus === 'reprovado_restrito') {
        successMsg = 'Embarque cancelado e motorista marcado como RESTRITO por reprovação no GR.';
      } else if (currentUser.profile === UserProfile.Motorista && originalShipment.status === ShipmentStatus.AguardandoDescarga) {
        successMsg = 'Comprovante enviado! Aguardando confirmação do peso pelo embarcador.';
      }
      showToast(successMsg, 'success');
    } catch(err: any) { 
      console.error('Erro ao salvar no Supabase:', err);
      const errorMessage = err?.message || 'Erro desconhecido ao salvar no banco de dados.';
      showToast(`[ERRO CRÍTICO] Falha ao persistir dados: ${errorMessage}`, 'error');
      throw err;
    }
  };

  const handleUpdateShipmentAnttAndBankDetails = async (shipmentId: string, data: { anttOwnerIdentifier: string; bankDetails?: string }) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    const shipmentToUpdate = shipments.find(s => s.id === shipmentId);
    if (!shipmentToUpdate) return;

    const changes: string[] = [];
    if (shipmentToUpdate.anttOwnerIdentifier !== data.anttOwnerIdentifier) changes.push(`${FIELD_TRANSLATIONS.anttOwnerIdentifier} definido.`);
    if (data.bankDetails && shipmentToUpdate.bankDetails !== data.bankDetails) changes.push(`${FIELD_TRANSLATIONS.bankDetails} definidos.`);

    const updatedShipment: Shipment = { 
      ...shipmentToUpdate, 
      anttOwnerIdentifier: data.anttOwnerIdentifier, 
      bankDetails: data.bankDetails || shipmentToUpdate.bankDetails, 
      history: changes.length > 0 ? [...shipmentToUpdate.history, createHistoryLog(changes.join(' '))] : shipmentToUpdate.history 
    };

    setShipments((prev: Shipment[]) => prev.map(s => s.id === shipmentId ? updatedShipment : s));
    try {
      await upsertShipment(updatedShipment);
    } catch (err) {
      console.error('Erro ao atualizar ANTT/banco:', err);
    }
  };

  const handleUpdateShipmentData = async (shipmentId: string, data: Partial<Shipment>, options?: { silent?: boolean }) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      if (!options?.silent) {
        showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      }
      return;
    }
    const shipmentToUpdate = shipments.find(s => s.id === shipmentId);
    if (!shipmentToUpdate) return;

    const changes: string[] = [];
    const fieldsToTrack: (keyof Shipment)[] = [
      'driverName', 'driverCpf', 'driverContact', 
      'horsePlate', 'trailer1Plate', 'trailer2Plate', 'trailer3Plate', 
      'vehicleTag', 'vehicleSetType', 'vehicleBodyType',
      'shipmentTonnage', 'bankDetails', 'driverReferences', 'ownerContact', 'anttOwnerIdentifier',
      'cteNumber', 'cteEmissionDate', 'nfeNumber', 'mdfeNumber', 'federalTax', 'isFederalTaxManual',
      'riskQueryType', 'riskQueryCost', 'riskReleaseCode',
      'advancePercentage', 'paymentMethod', 'pixKey'
    ];

    fieldsToTrack.forEach(field => {
      if (data[field] !== undefined && data[field] !== shipmentToUpdate[field]) {
        const oldVal = shipmentToUpdate[field] || 'Vazio';
        const newVal = data[field] || 'Vazio';
        changes.push(`${FIELD_TRANSLATIONS[field] || field} alterado de "${oldVal}" para "${newVal}".`);
      }
    });

    if (changes.length === 0 && Object.keys(data).length === 0) return;

    let updatedDriverFreight = data.driverFreightValue !== undefined ? data.driverFreightValue : shipmentToUpdate.driverFreightValue;
    let updatedCargo: Cargo | undefined;

    const rateToUse = data.driverFreightRateSnapshot !== undefined 
      ? data.driverFreightRateSnapshot 
      : (shipmentToUpdate.driverFreightRateSnapshot || cargos.find(c => c.id === shipmentToUpdate.cargoId)?.driverFreightValuePerTon || 0);

    const targetTonnage = data.shipmentTonnage !== undefined ? data.shipmentTonnage : shipmentToUpdate.shipmentTonnage;

    if (data.shipmentTonnage !== undefined && data.shipmentTonnage !== shipmentToUpdate.shipmentTonnage) {
        const diff = data.shipmentTonnage - shipmentToUpdate.shipmentTonnage;
        updatedDriverFreight = rateToUse * targetTonnage;
        
        const cargo = cargos.find(c => c.id === shipmentToUpdate.cargoId);
        if (cargo) {
            const isLoaded = Object.values(ShipmentStatus).indexOf(shipmentToUpdate.status) >= Object.values(ShipmentStatus).indexOf(ShipmentStatus.AguardandoDescarga);
            updatedCargo = {
                ...cargo,
                scheduledVolume: Math.max(0, cargo.scheduledVolume + diff),
                loadedVolume: isLoaded ? Math.max(0, cargo.loadedVolume + diff) : cargo.loadedVolume,
                history: [...cargo.history, createHistoryLog(`Volume ajustado devido à correção de tonelagem no embarque ${shipmentId} (${shipmentToUpdate.shipmentTonnage} -> ${data.shipmentTonnage}).`)]
            };
        }
    } else if (data.driverFreightRateSnapshot !== undefined && data.driverFreightRateSnapshot !== shipmentToUpdate.driverFreightRateSnapshot) {
        updatedDriverFreight = rateToUse * targetTonnage;
    }

    const updatedDocs = {
      ...(shipmentToUpdate.documents || {}),
      ...(data.documents || {}),
      ...(data.cteNumber !== undefined ? { cte_number: data.cteNumber } : {}),
      ...(data.cteEmissionDate !== undefined ? { cte_emission_date: data.cteEmissionDate } : {}),
      ...(data.nfeNumber !== undefined ? { nfe_number: data.nfeNumber } : {}),
      ...(data.mdfeNumber !== undefined ? { mdfe_number: data.mdfeNumber } : {}),
      ...(data.riskQueryType !== undefined ? { risk_query_type: data.riskQueryType } : {}),
      ...(data.riskQueryCost !== undefined ? { risk_query_cost: data.riskQueryCost } : {}),
      ...(data.riskReleaseCode !== undefined ? { risk_release_code: data.riskReleaseCode } : {}),
      ...(data.isFederalTaxManual !== undefined ? { is_federal_tax_manual: data.isFederalTaxManual } : {}),
      ...(data.federalTax !== undefined ? { federal_tax: data.federalTax, imposto_federal: data.federalTax } : {}),
      ...(data.realProfitData !== undefined ? { real_profit_data: data.realProfitData } : {}),
    };

    if (data.isFederalTaxManual === false) {
      updatedDocs.is_federal_tax_manual = false;
      delete (updatedDocs as any).federal_tax;
      delete (updatedDocs as any).imposto_federal;
    }

    let calculatedAdvanceVal = data.advanceValue !== undefined ? data.advanceValue : shipmentToUpdate.advanceValue;
    let calculatedBalanceVal = data.balanceToReceiveValue !== undefined ? data.balanceToReceiveValue : shipmentToUpdate.balanceToReceiveValue;
    let calculatedAdvancePct = data.advancePercentage !== undefined ? data.advancePercentage : (shipmentToUpdate.advancePercentage !== undefined ? shipmentToUpdate.advancePercentage : 70);

    if (ADVANCE_ELIGIBLE_STATUSES.includes(shipmentToUpdate.status)) {
      const toll = data.tollValue !== undefined ? data.tollValue : (shipmentToUpdate.tollValue || 0);
      const isPfCalc = (shipmentToUpdate.driverFreightType === 'PF' || shipmentToUpdate.anttModality === 'TAC');
      const calc = calculateAdvanceAndBalance({
        driverFreightValue: updatedDriverFreight,
        driverFreightRate: rateToUse,
        tonnage: targetTonnage,
        tollValue: toll,
        advancePercentage: calculatedAdvancePct,
        driverFreightType: isPfCalc ? 'PF' : 'PJ',
      });
      calculatedAdvanceVal = calc.advanceInAccountValue;
      calculatedBalanceVal = calc.balanceToReceiveValue;
      calculatedAdvancePct = calc.advancePercentage;
    }

    const updatedShipment: Shipment = { 
      ...shipmentToUpdate, 
      ...data, 
      advancePercentage: calculatedAdvancePct,
      advanceValue: calculatedAdvanceVal,
      balanceToReceiveValue: calculatedBalanceVal,
      documents: updatedDocs,
      driverFreightRateSnapshot: rateToUse,
      driverFreightValue: updatedDriverFreight,
      history: data.history 
        ? data.history 
        : (changes.length > 0 
          ? [...shipmentToUpdate.history, createHistoryLog(`Dados do embarque corrigidos: ${changes.join(' ')}`)]
          : shipmentToUpdate.history)
    };

    setShipments((prev: Shipment[]) => prev.map(s => s.id === shipmentId ? updatedShipment : s));
    if (updatedCargo) {
        setCargos(prev => prev.map(c => c.id === updatedShipment.cargoId ? updatedCargo! : c));
    }

    try {
      await upsertShipment(updatedShipment);
      if (updatedCargo) await upsertCargo(updatedCargo);
      if (!options?.silent) {
        showToast('Dados do embarque atualizados com sucesso!', 'success');
      }
    } catch (err) {
      console.error('Erro ao atualizar dados do embarque:', err);
      if (!options?.silent) {
        showToast('Erro ao salvar alterações no banco de dados.', 'error');
      }
    }
  };

  const handleBatchUpdateShipments = async (updatedList: Shipment[]) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    if (!updatedList || updatedList.length === 0) return;
    
    // Atualiza estado local imediatamente
    setShipments((prev: Shipment[]) => {
      const map = new Map(updatedList.map(u => [u.id, u]));
      return prev.map(s => map.get(s.id) || s);
    });

    try {
      await upsertManyShipments(updatedList);
      showToast(`${updatedList.length} embarque(s) sincronizados com sucesso no banco de dados!`, 'success');
    } catch (err: any) {
      console.error('Erro ao salvar atualização em lote de embarques:', err);
      showToast(`Erro ao salvar no banco: ${err?.message || 'Erro desconhecido'}`, 'error');
    }
  };

  const handleUpdateShipmentPrice = async (shipmentId: string, data: { newTotal: number, newRate?: number, newCompanyRate?: number }) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    const isAdmin = currentUser.profile === UserProfile.Admin || (currentUser.profile as string) === 'Administrador do Sistema';
    if (!isAdmin) {
      showToast('Apenas Administradores do Sistema têm permissão para alterar o preço do frete.', 'error');
      return;
    }
    const shipmentToUpdate = shipments.find(s => s.id === shipmentId);
    if (!shipmentToUpdate) return;

    const oldPriceFormatted = shipmentToUpdate.driverFreightValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const newPriceFormatted = data.newTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const historyMsgParts = [`${FIELD_TRANSLATIONS['driverFreightValue']} alterado de "${oldPriceFormatted}" para "${newPriceFormatted}".`];

    const updateObj: Partial<Shipment> = { driverFreightValue: data.newTotal };
    
    if (data.newRate !== undefined) {
      const oldRateFormatted = (shipmentToUpdate.driverFreightRateSnapshot || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const newRateFormatted = data.newRate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      updateObj.driverFreightRateSnapshot = data.newRate;
      historyMsgParts.push(`Taxa do motorista alterada de "${oldRateFormatted}" para "${newRateFormatted}".`);
    }

    if (data.newCompanyRate !== undefined) {
      const oldCompanyRateFormatted = (shipmentToUpdate.companyFreightRateSnapshot || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const newCompanyRateFormatted = data.newCompanyRate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      updateObj.companyFreightRateSnapshot = data.newCompanyRate;
      historyMsgParts.push(`Frete Empresa alterado de "${oldCompanyRateFormatted}" para "${newCompanyRateFormatted}".`);
    }

    if (ADVANCE_ELIGIBLE_STATUSES.includes(shipmentToUpdate.status)) {
      const isPfCalc = (shipmentToUpdate.driverFreightType === 'PF' || shipmentToUpdate.anttModality === 'TAC');
      const calc = calculateAdvanceAndBalance({
        driverFreightValue: data.newTotal,
        driverFreightRate: data.newRate ?? shipmentToUpdate.driverFreightRateSnapshot,
        tonnage: shipmentToUpdate.shipmentTonnage,
        tollValue: shipmentToUpdate.tollValue || 0,
        advancePercentage: shipmentToUpdate.advancePercentage !== undefined ? shipmentToUpdate.advancePercentage : 70,
        driverFreightType: isPfCalc ? 'PF' : 'PJ',
      });
      updateObj.advancePercentage = calc.advancePercentage;
      updateObj.advanceValue = calc.advanceInAccountValue;
      updateObj.balanceToReceiveValue = calc.balanceToReceiveValue;
    }

    const updatedShipment: Shipment = { 
      ...shipmentToUpdate, 
      ...updateObj, 
      history: [...shipmentToUpdate.history, createHistoryLog(historyMsgParts.join(' '))] 
    };

    setShipments((prev: Shipment[]) => prev.map(s => s.id === shipmentId ? updatedShipment : s));
    try {
      await upsertShipment(updatedShipment);
    } catch (err) {
      console.error('Erro ao atualizar preço:', err);
    }
  };

  const handleUpdateScheduledDateTime = async (shipmentId: string, data: { scheduledDate: string, scheduledTime?: string }) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    const shipmentToUpdate = shipments.find(s => s.id === shipmentId);
    if (!shipmentToUpdate) return;

    const changes: string[] = [];
    if (shipmentToUpdate.scheduledDate !== data.scheduledDate) {
      changes.push(`Data Programada alterada de "${shipmentToUpdate.scheduledDate}" para "${data.scheduledDate}".`);
    }
    if (data.scheduledTime !== undefined && shipmentToUpdate.scheduledTime !== data.scheduledTime) {
      changes.push(`Horário Previsto alterado de "${shipmentToUpdate.scheduledTime || 'N/A'}" para "${data.scheduledTime}".`);
    }

    if (changes.length === 0) return;

    const updatedShipment: Shipment = { 
      ...shipmentToUpdate, 
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      history: [...shipmentToUpdate.history, createHistoryLog(changes.join(' '))] 
    };

    setShipments((prev: Shipment[]) => prev.map(s => s.id === shipmentId ? updatedShipment : s));
    try {
      await upsertShipment(updatedShipment);
    } catch (err) {
      console.error('Erro ao atualizar agendamento:', err);
    }
  };

  
  const handleConfirmCancelShipment = async (shipmentId: string, reason: string) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    const shipmentToCancel = shipments.find(s => s.id === shipmentId);
    if (!shipmentToCancel || !currentUser) return;
    
    const oldStatus = shipmentToCancel.status;
    const historyEntry = `Status alterado de "${oldStatus}" para "${ShipmentStatus.Cancelado}". Motivo: ${reason}`;
    
    const cancelledShipment: Shipment = { 
      ...shipmentToCancel, 
      status: ShipmentStatus.Cancelado,
      cancellationReason: reason,
      history: [...shipmentToCancel.history, createHistoryLog(historyEntry)], 
      statusHistory: [...(shipmentToCancel.statusHistory || []), { status: ShipmentStatus.Cancelado, timestamp: new Date().toISOString(), userId: currentUser.id }] 
    };

    setShipments((prev: Shipment[]) => prev.map(s => s.id === shipmentId ? cancelledShipment : s));

    const wasLoaded = Object.values(ShipmentStatus).indexOf(shipmentToCancel.status) >= Object.values(ShipmentStatus).indexOf(ShipmentStatus.AguardandoDescarga);
    const relatedCargo = cargos.find(c => c.id === shipmentToCancel.cargoId);
    
    let updatedCargo: Cargo | undefined;
    if (relatedCargo) {
        const newScheduledVolume = relatedCargo.scheduledVolume - shipmentToCancel.shipmentTonnage;
        const newLoadedVolume = wasLoaded ? relatedCargo.loadedVolume - shipmentToCancel.shipmentTonnage : relatedCargo.loadedVolume;
        const historyDescription = wasLoaded
            ? `Volumes agendado e carregado ajustados devido ao cancelamento do embarque ${shipmentId}`
            : `Volume agendado ajustado devido ao cancelamento do embarque ${shipmentId}`;
        
        updatedCargo = { 
            ...relatedCargo, 
            scheduledVolume: Math.max(0, newScheduledVolume), 
            loadedVolume: Math.max(0, newLoadedVolume), 
            history: [...relatedCargo.history, createHistoryLog(historyDescription)] 
        };
        
        setCargos(prevCargos => prevCargos.map(cargo => cargo.id === relatedCargo.id ? updatedCargo! : cargo));
    }

    try {
      await upsertShipment(cancelledShipment);
      if (updatedCargo) await upsertCargo(updatedCargo);
    } catch (err) {
      console.error('Erro ao cancelar embarque:', err);
    }
  };

  const handleTransferShipment = async (shipmentId: string, newEmbarcadorId: string) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }

    const newEmbarcador = users.find(u => u.id === newEmbarcadorId);
    const newEmbarcadorName = newEmbarcador?.name || 'N/A';

    // Identificação de regras de comissão / agência do novo responsável
    const isNewAgenciador = newEmbarcador?.profile === UserProfile.Agenciador;
    const newActiveAgenciador = isNewAgenciador ? newEmbarcador : null;
    const newAgencyLeader = (newActiveAgenciador && newActiveAgenciador.agencyRole === 'embarque' && newActiveAgenciador.agencyLeaderId)
      ? users.find(u => u.id === newActiveAgenciador.agencyLeaderId)
      : newActiveAgenciador;

    const newAgencyRateConfigured = newAgencyLeader?.agencyCommissionPercentage ?? 30;
    const newAgencyNameAuto = newAgencyLeader
      ? (newAgencyLeader.branchId ? `Agência ${newAgencyLeader.branchId} (${newAgencyLeader.name})` : newAgencyLeader.name)
      : (newEmbarcador?.branchId ? `Agência ${newEmbarcador.branchId} (${newEmbarcador.name})` : newEmbarcador?.name);

    const newShipperRateConfigured = newEmbarcador?.shipperCommissionRatePerTon;
    const isNewShipperComm = Boolean(newShipperRateConfigured && newShipperRateConfigured > 0);

    let updated: Shipment | undefined;
    setShipments((prev: Shipment[]) => prev.map(s => {
        if (s.id === shipmentId) {
            const oldEmbarcadorName = users.find(u => u.id === s.embarcadorId || u.id === s.createdById)?.name || 'N/A';
            
            const docsUpdated = { ...(s.documents || {}) };
            if (isNewAgenciador) {
              docsUpdated.agency_commission_enabled = true;
              docsUpdated.agency_commission_percentage = newAgencyRateConfigured;
              docsUpdated.agency_commission_agency_name = newAgencyNameAuto;
            }
            if (isNewShipperComm) {
              docsUpdated.shipper_commission_enabled = true;
              docsUpdated.shipper_commission_rate_per_ton = newShipperRateConfigured;
            }

            updated = { 
              ...s, 
              embarcadorId: newEmbarcadorId,
              createdById: newEmbarcadorId, // Atualiza também o solicitante do embarque
              branchId: newEmbarcador?.branchId || s.branchId,
              agencyCommissionEnabled: isNewAgenciador ? true : s.agencyCommissionEnabled,
              agencyCommissionPercentage: isNewAgenciador ? newAgencyRateConfigured : s.agencyCommissionPercentage,
              agencyCommissionAgencyName: isNewAgenciador ? newAgencyNameAuto : s.agencyCommissionAgencyName,
              shipperCommissionEnabled: isNewShipperComm ? true : s.shipperCommissionEnabled,
              shipperCommissionRatePerTon: isNewShipperComm ? newShipperRateConfigured : s.shipperCommissionRatePerTon,
              documents: Object.keys(docsUpdated).length > 0 ? docsUpdated : s.documents,
              history: [
                ...s.history, 
                createHistoryLog(`Embarque transferido: Solicitante e embarcador responsável alterados de "${oldEmbarcadorName}" para "${newEmbarcadorName}".`)
              ] 
            };
            return updated;
        }
        return s;
    }));
    if (updated) {
      try { 
        await upsertShipment(updated); 
        showToast(`Embarque transferido com sucesso para ${newEmbarcadorName}.`, 'success');
      } catch(err) { 
        console.error('Erro ao transferir embarque:', err); 
        showToast('Erro ao transferir embarque no banco de dados.', 'error');
      }
    }
  };

  const handleSwapCargo = async (shipmentId: string, newCargoId: string) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }

    const shipment = shipments.find(s => s.id === shipmentId);
    if (!shipment) return;

    const oldCargoId = shipment.cargoId;
    if (oldCargoId === newCargoId) return;

    const oldCargo = cargos.find(c => c.id === oldCargoId);
    const newCargo = cargos.find(c => c.id === newCargoId);

    if (!newCargo) {
      showToast('Nova carga não encontrada.', 'error');
      return;
    }

    const tonnage = Number(shipment.shipmentTonnage) || 0;
    const isLoaded = [
      ShipmentStatus.AguardandoNota,
      ShipmentStatus.AguardandoFiscal,
      ShipmentStatus.AguardandoAdiantamento,
      ShipmentStatus.AguardandoAgendamento,
      ShipmentStatus.AguardandoDescarga,
      ShipmentStatus.ValidacaoTicket,
      ShipmentStatus.AguardandoPagamentoSaldo,
      ShipmentStatus.Finalizado
    ].includes(shipment.status);
    const loadedTon = Number(shipment.loadedTonnage) || tonnage;

    // 1. Prepare updated Shipment
    const newDriverRate = newCargo.driverFreightValuePerTon;
    const newCompanyRate = newCargo.companyFreightValuePerTon;
    const newTotalDriverFreight = newDriverRate * tonnage;

    const updatedShipment: Shipment = {
      ...shipment,
      cargoId: newCargoId,
      branchId: newCargo.branchId || shipment.branchId,
      driverFreightRateSnapshot: newDriverRate,
      companyFreightRateSnapshot: newCompanyRate,
      driverFreightValue: newTotalDriverFreight,
      history: [
        ...shipment.history,
        createHistoryLog(`Carga trocada de #${oldCargo?.sequenceId || oldCargoId} para #${newCargo.sequenceId}. Taxas e valores de frete atualizados para o fluxo da nova carga.`)
      ]
    };

    // 2. Prepare updated Old Cargo (if exists)
    let updatedOldCargo: Cargo | undefined;
    if (oldCargo) {
      updatedOldCargo = {
        ...oldCargo,
        scheduledVolume: Math.max(0, Number((oldCargo.scheduledVolume - tonnage).toFixed(2))),
        loadedVolume: isLoaded ? Math.max(0, Number(((oldCargo.loadedVolume || 0) - loadedTon).toFixed(2))) : oldCargo.loadedVolume,
        history: [
          ...oldCargo.history,
          createHistoryLog(`Volume reduzido devido à troca de carga do embarque ${shipmentId} para a carga #${newCargo.sequenceId}.`)
        ]
      };
    }

    // 3. Prepare updated New Cargo
    const updatedNewCargo: Cargo = {
      ...newCargo,
      scheduledVolume: Number(((newCargo.scheduledVolume || 0) + tonnage).toFixed(2)),
      loadedVolume: isLoaded ? Number(((newCargo.loadedVolume || 0) + loadedTon).toFixed(2)) : newCargo.loadedVolume,
      history: [
        ...newCargo.history,
        createHistoryLog(`Volume aumentado devido à troca de carga do embarque ${shipmentId} da carga #${oldCargo?.sequenceId || oldCargoId}.`)
      ]
    };

    // Optimistic UI updates
    setShipments(prev => prev.map(s => s.id === shipmentId ? updatedShipment : s));
    setCargos(prev => prev.map(c => {
      if (c.id === oldCargoId && updatedOldCargo) return updatedOldCargo;
      if (c.id === newCargoId) return updatedNewCargo;
      return c;
    }));

    // Persistence
    try {
      const promises = [
        upsertShipment(updatedShipment),
        upsertCargo(updatedNewCargo)
      ];
      if (updatedOldCargo) promises.push(upsertCargo(updatedOldCargo));
      
      await Promise.all(promises);
      showToast(`Embarque ${shipmentId} transferido para a carga #${newCargo.sequenceId} com sucesso!`, 'success');
    } catch (err) {
      console.error('Erro ao trocar carga:', err);
      showToast('Erro ao persistir a troca de carga no banco de dados.', 'error');
    }
  };

  const handleSaveClient = async (clientData: Client | Omit<Client, 'id'>) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    let saved: Client;
    if ('id' in clientData) {
      saved = clientData;
      setClients(prev => prev.map(c => c.id === clientData.id ? clientData : c));
    } else { 
      const newId = formatId(nextIds.client, 'CLI');
      saved = { ...clientData, id: newId };
      setClients(prev => [saved, ...prev]);
      setNextIds((prev: any) => ({ ...prev, client: prev.client + 1 }));
    }
    try { 
      await upsertClient(saved); 
      showToast('Cliente salvo com sucesso!', 'success');
    } catch(err: any) { 
      console.error('Erro ao salvar cliente:', err); 
      showToast(`Erro ao salvar cliente: ${err.message || 'Erro desconhecido'}`, 'error');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    try {
      await deleteClient(clientId);
      setClients(prev => prev.filter(c => c.id !== clientId));
      showToast('Cliente excluído com sucesso.', 'success');
    } catch (err: any) {
      console.error('Erro ao excluir cliente:', err);
      showToast(`Erro ao excluir cliente: ${err.message || 'Erro desconhecido'}`, 'error');
    }
  };

  const handleMergeClients = async (targetClientId: string, sourceClientIds: string[]) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    try {
      await mergeClients(targetClientId, sourceClientIds, clients, cargos, freightOffers, users);
      const [refreshedClients, refreshedCargos, refreshedOffers] = await Promise.all([
        fetchClients(),
        fetchCargos(),
        fetchFreightOffers()
      ]);
      setClients(refreshedClients);
      setCargos(refreshedCargos);
      setFreightOffers(refreshedOffers);
      showToast('Cadastros de clientes unificados com sucesso!', 'success');
    } catch (err: any) {
      console.error('Erro ao unir clientes:', err);
      showToast(`Erro ao unir clientes: ${err.message || 'Falha na unificação'}`, 'error');
      throw err;
    }
  };
  
  const handleDeleteCargo = async (cargoId: string) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir permanentemente esta informação?")) return;
    if (!currentUser || currentUser.profile !== UserProfile.Admin) return;
    
    const relatedShipments = shipments.filter(s => s.cargoId === cargoId);
    const confirmMsg = relatedShipments.length > 0
      ? `A carga ${cargoId} possui ${relatedShipments.length} embarque(s) associado(s). Se você excluir a carga, os embarques NÃO serão excluídos, mas poderão ficar sem os detalhes da carga original na visualização. Deseja excluir a carga e manter os embarques?`
      : `Tem certeza que deseja excluir permanentemente a carga ${cargoId}?`;

    if (confirm(confirmMsg)) {
        try {
            await deleteCargo(cargoId);
            setCargos(prev => prev.filter(c => c.id !== cargoId));
            showToast("Carga excluída com sucesso. Os embarques vinculados foram preservados.", 'success');
        } catch (error) {
            console.error('Erro ao excluir carga:', error);
            showToast("Erro ao excluir carga. Verifique o console.", 'error');
        }
    }
  };


  const handleDeleteShipment = async (shipmentId: string) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir permanentemente esta informação?")) return;
    if (!currentUser || currentUser.profile !== UserProfile.Admin) return;
    
    const shipmentToDelete = shipments.find(s => s.id === shipmentId);
    if (!shipmentToDelete) return;

    if (confirm(`Tem certeza que deseja excluir permanentemente o embarque ${shipmentId}?`)) {
        try {
            await deleteShipment(shipmentId);
            setShipments(prev => prev.filter(s => s.id !== shipmentId));

            // Atualizar volumes da carga
            const wasLoaded = Object.values(ShipmentStatus).indexOf(shipmentToDelete.status) >= Object.values(ShipmentStatus).indexOf(ShipmentStatus.AguardandoDescarga);
            const relatedCargo = cargos.find(c => c.id === shipmentToDelete.cargoId);
            
            if (relatedCargo) {
                const newScheduledVolume = Math.max(0, relatedCargo.scheduledVolume - shipmentToDelete.shipmentTonnage);
                const newLoadedVolume = wasLoaded ? Math.max(0, relatedCargo.loadedVolume - shipmentToDelete.shipmentTonnage) : relatedCargo.loadedVolume;
                const updatedCargo: Cargo = { 
                    ...relatedCargo, 
                    scheduledVolume: newScheduledVolume, 
                    loadedVolume: newLoadedVolume,
                    history: [...relatedCargo.history, createHistoryLog(`Embarque ${shipmentId} EXCLUÍDO pelo Administrador. Volumes ajustados.`)]
                };
                
                setCargos(prevCargos => prevCargos.map(cargo => cargo.id === relatedCargo.id ? updatedCargo : cargo));
                await upsertCargo(updatedCargo);
            }
            showToast("Embarque excluído com sucesso e volumes da carga recalculados.", 'success');
        } catch (error) {
            console.error('Erro ao excluir embarque:', error);
            showToast("Erro ao excluir embarque. Verifique o console.", 'error');
        }
    }
  };

  const handleSaveOwner = async (ownerData: Owner | Omit<Owner, 'id'>) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    let saved: Owner;
    if ('id' in ownerData) {
      saved = ownerData;
      setOwners(prev => prev.map(o => o.id === ownerData.id ? ownerData : o));
    } else {
      const newId = formatId(nextIds.owner, 'OWN');
      saved = { ...ownerData, id: newId };
      setOwners(prev => [saved, ...prev]);
      setNextIds((prev: any) => ({ ...prev, owner: prev.owner + 1 }));
    }
    try { await upsertOwner(saved); } catch(err) { console.error('Erro ao salvar proprietário:', err); }
  };

  const handleSaveDriver = async (driverData: Driver | Omit<Driver, 'id'>) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    let saved: Driver;
    if ('id' in driverData) {
      saved = driverData;
      setDrivers(prev => prev.map(d => d.id === driverData.id ? driverData : d));
    } else {
      const newId = formatId(nextIds.driver, 'DRV');
      saved = { ...driverData, id: newId };
      setDrivers(prev => [saved, ...prev]);
      setNextIds((prev: any) => ({ ...prev, driver: prev.driver + 1 }));
    }
    try { 
      await upsertDriver(saved); 
      showToast('Motorista salvo com sucesso!', 'success');
    } catch(err: any) { 
      console.error('Erro ao salvar motorista:', err); 
      showToast(`Erro ao salvar motorista: ${err.message || 'Erro desconhecido'}`, 'error');
    }
  };

  const handleSaveVehicle = async (vehicleData: Vehicle | Omit<Vehicle, 'id'>) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    let saved: Vehicle;
    if ('id' in vehicleData) {
      saved = vehicleData;
      setVehicles(prev => prev.map(v => v.id === vehicleData.id ? vehicleData : v));
    } else {
      const newId = formatId(nextIds.vehicle, 'VEH');
      saved = { ...vehicleData, id: newId };
      setVehicles(prev => [saved, ...prev]);
      setNextIds((prev: any) => ({ ...prev, vehicle: prev.vehicle + 1 }));
    }
    try { 
      await upsertVehicle(saved); 
      showToast('Veículo salvo com sucesso!', 'success');
    } catch(err: any) { 
      console.error('Erro ao salvar veículo:', err); 
      showToast(`Erro ao salvar veículo: ${err.message || 'Erro desconhecido'}`, 'error');
    }
  };

  const handleSaveProduct = async (productData: Product | Omit<Product, 'id'>) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    let saved: Product;
    if ('id' in productData) {
      saved = productData;
      setProducts(prev => prev.map(p => p.id === productData.id ? productData : p));
    } else {
      const newId = `PRD-${String(nextIds.product).padStart(3, '0')}`;
      saved = { ...productData, id: newId };
      setProducts(prev => [saved, ...prev]);
      setNextIds((prev: any) => ({ ...prev, product: prev.product + 1 }));
    }
    try { 
      await upsertProduct(saved); 
      showToast('Produto salvo com sucesso!', 'success');
    } catch(err: any) { 
      console.error('Erro ao salvar produto:', err); 
      showToast(`Erro ao salvar produto: ${err.message || 'Erro desconhecido'}`, 'error');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir permanentemente esta informação?")) return;
    try {
      await deleteProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      showToast('Produto excluído com sucesso.', 'success');
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      showToast('Erro ao excluir produto.', 'error');
    }
  };
  
  const handleSaveLoad = async (loadData: Cargo | Omit<Cargo, 'id' | 'history' | 'createdAt' | 'createdById'>) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    // Sanitize branchId to avoid FK violations ('' is not a valid UUID)
    if (loadData.branchId === '') {
        delete loadData.branchId;
    }

    if ('id' in loadData) {
      const oldCargo = cargos.find(l => l.id === loadData.id);

      if (!oldCargo) return;

      const changes: string[] = [];
      (Object.keys(loadData) as Array<keyof Cargo>).forEach(key => {
        if (key === 'scheduledVolume' || key === 'loadedVolume') return;

        const oldValue: any = oldCargo[key];
        const newValue: any = loadData[key];

        const isChanged = JSON.stringify(oldValue ?? null) !== JSON.stringify(newValue ?? null);
        if (key !== 'id' && key !== 'history' && key !== 'createdAt' && isChanged) {
          const fieldName = FIELD_TRANSLATIONS[key] || key;
          let oldDisplayValue = oldValue;
          let newDisplayValue = newValue;

          switch (key) {
            case 'clientId':
              oldDisplayValue = clients.find(c => c.id === oldValue)?.nomeFantasia || oldValue;
              newDisplayValue = clients.find(c => c.id === newValue)?.nomeFantasia || newValue;
              break;
            case 'productId':
              oldDisplayValue = products.find(p => p.id === oldValue)?.name || oldValue;
              newDisplayValue = products.find(p => p.id === newValue)?.name || newValue;
              break;
            case 'createdById':
              oldDisplayValue = users.find(u => u.id === oldValue)?.name || oldValue;
              newDisplayValue = users.find(u => u.id === newValue)?.name || newValue;
              break;
            case 'hasIcms':
            case 'requiresScheduling':
            case 'companyFreightHasToll':
            case 'driverFreightHasToll':
            case 'driverFreightPfHasToll':
              oldDisplayValue = oldValue ? 'Sim' : 'Não';
              newDisplayValue = newValue ? 'Sim' : 'Não';
              break;
            case 'companyFreightValuePerTon':
            case 'driverFreightValuePerTon':
              oldDisplayValue = oldValue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'N/A';
              newDisplayValue = newValue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'N/A';
              break;
            case 'totalVolume':
              oldDisplayValue = `${oldValue} ton`;
              newDisplayValue = `${newValue} ton`;
              break;
            case 'icmsPercentage':
              oldDisplayValue = `${oldValue}%`;
              newDisplayValue = `${newValue}%`;
              break;
            case 'originCoords':
            case 'destinationCoords':
              oldDisplayValue = oldValue ? `Lat: ${oldValue.lat.toFixed(4)}, Lng: ${oldValue.lng.toFixed(4)}` : 'N/A';
              newDisplayValue = newValue ? `Lat: ${newValue.lat.toFixed(4)}, Lng: ${newValue.lng.toFixed(4)}` : 'N/A';
              break;
            case 'dailySchedule':
              oldDisplayValue = Array.isArray(oldValue) && oldValue.length > 0 ? `${oldValue.length} dias agendados` : (oldValue === "" ? 'Vazio' : 'N/A');
              newDisplayValue = Array.isArray(newValue) && newValue.length > 0 ? `${newValue.length} dias agendados` : 'Vazio';
              break;
            case 'freightLegs':
              oldDisplayValue = Array.isArray(oldValue) && oldValue.length > 0 ? `${oldValue.length} trechos` : 'Padrão';
              newDisplayValue = Array.isArray(newValue) && newValue.length > 0 ? `${newValue.length} trechos` : 'Padrão';
              break;
          }
          changes.push(`${fieldName} alterado de "${oldDisplayValue}" para "${newDisplayValue}"`);
        }
      });

      let updatedCargo: Cargo;
      if (changes.length > 0) {
        const newHistory = createHistoryLog(`Carga atualizada: ${changes.join('; ')}.`);
        updatedCargo = { ...oldCargo, ...loadData, history: [...oldCargo.history, newHistory] };
      } else {
        updatedCargo = { ...oldCargo, ...loadData };
      }

      setCargos(prev => prev.map(l => l.id === loadData.id ? updatedCargo : l));
      try {
        await upsertCargo(updatedCargo);
        showToast('Carga atualizada com sucesso!', 'success');
      } catch (err: any) {
        console.error('Erro ao salvar carga no Supabase:', err);
        const errorMessage = err?.message || 'Erro desconhecido ao salvar no banco de dados.';
        showToast(`[ERRO CRÍTICO] A carga não pôde ser atualizada no banco de dados: ${errorMessage}`, 'error');
      }
    } else { 
      if (!currentUser) return;
      
      const validCargos = cargos.filter(c => c.sequenceId && c.sequenceId > 0 && c.sequenceId < 1000000);
      const localMaxSeq = validCargos.reduce((max, c) => Math.max(max, c.sequenceId || 0), 0);
      const safeNextCargo = (nextIds.cargo && nextIds.cargo < 1000000) ? nextIds.cargo : (localMaxSeq + 1);
      const nextSeq = Math.max(localMaxSeq + 1, safeNextCargo, 101);
      const newCargoId = `CRG-${nextSeq}`;

      const newLoad: Cargo = {
        ...loadData,
        id: newCargoId,
        sequenceId: nextSeq,
        createdAt: new Date().toISOString(),
        createdById: (loadData as any).createdById || currentUser.id,
        history: [createHistoryLog(`Carga criada (#${nextSeq})`)],
      } as Cargo;

      // Atualização otimista
      setCargos(prev => [newLoad, ...prev.filter(c => c.id !== newCargoId && c.sequenceId !== nextSeq)]);
      
      try {
        const savedCargo = await insertCargo(newLoad);
        
        // Atualiza o estado local garantindo que não haja duplicação com o Realtime
        setCargos(prev => {
          const filtered = prev.filter(c => c.id !== newCargoId && c.id !== savedCargo.id && c.sequenceId !== nextSeq);
          return [savedCargo, ...filtered];
        });
        
        if (offerToConvert) {
          const updatedOffer = {
            ...offerToConvert, 
            cargoId: savedCargo.id,
            status: FreightOfferStatus.Aceita,
            history: [
              ...(offerToConvert.history || []),
              {
                id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                userId: currentUser?.id || '',
                timestamp: new Date().toISOString(),
                description: `Carga #${savedCargo.sequenceId || savedCargo.id} criada a partir da oferta.`
              }
            ]
          };
          await upsertFreightOffer(updatedOffer);
          setFreightOffers(prev => prev.map(o => o.id === offerToConvert.id ? updatedOffer : o));
          setOfferToConvert(null);
        }
        
        // Sincroniza o contador local de IDs
        const finalSeq = savedCargo.sequenceId || parseInt(savedCargo.id.split('-')[1], 10);
        if (!isNaN(finalSeq) && finalSeq < 1000000) {
          setNextIds((prev: any) => ({ ...prev, cargo: Math.max(prev.cargo < 1000000 ? prev.cargo : 0, finalSeq + 1) }));
        }

        showToast('Carga criada com sucesso!', 'success');
        
      } catch (err: any) {
        console.error('Erro ao salvar carga no Supabase:', err);
        // Remove a carga em caso de erro (rollback)
        setCargos(prev => prev.filter(c => c.id !== newCargoId));
        
        const errorMessage = err?.message || 'Erro desconhecido ao salvar no banco de dados.';
        showToast(`[ERRO CRÍTICO] A carga não pôde ser salva no banco de dados: ${errorMessage}. Verifique as informações preenchidas.`, 'error');
      }
    }
  };

  const handleBulkSaveLoads = async (loadsToInsert: Omit<Cargo, 'id'>[]) => {
    if (!loadsToInsert || loadsToInsert.length === 0 || !currentUser) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }

    try {
      // 1. Descobre o maior sequenceId atual (banco + estado local)
      const validCargos = cargos.filter(c => c.sequenceId && c.sequenceId > 0 && c.sequenceId < 1000000);
      const localMaxSeq = validCargos.reduce((max, c) => Math.max(max, c.sequenceId || 0), 0);
      
      let dbMaxSeq = 0;
      try {
        const { data } = await supabase
          .from('cargos')
          .select('sequence_id')
          .lt('sequence_id', 1000000)
          .order('sequence_id', { ascending: false })
          .limit(1);
        if (data && data.length > 0 && data[0].sequence_id) {
          dbMaxSeq = Number(data[0].sequence_id);
        }
      } catch (err) {
        console.warn('[handleBulkSaveLoads] Aviso ao consultar sequence_id no Supabase:', err);
      }

      const safeNextCargo = (nextIds.cargo && nextIds.cargo < 1000000) ? nextIds.cargo - 1 : 0;
      let currentSeq = Math.max(localMaxSeq, dbMaxSeq, safeNextCargo, 100);

      const createdCargos: Cargo[] = [];

      for (const loadData of loadsToInsert) {
        currentSeq++;
        const realId = `CRG-${currentSeq}`;
        const newCargo: Cargo = {
          ...loadData,
          id: realId,
          sequenceId: currentSeq,
          createdAt: loadData.createdAt || new Date().toISOString(),
          createdById: loadData.createdById || currentUser.id,
          history: [
            createHistoryLog(`Carga criada via Importação em Lote (#${currentSeq})`)
          ]
        } as Cargo;

        const savedCargo = await insertCargo(newCargo);
        createdCargos.push(savedCargo || newCargo);
      }

      setCargos(prev => [...createdCargos, ...prev]);
      setNextIds((prev: any) => ({ ...prev, cargo: Math.max(prev.cargo < 1000000 ? prev.cargo : 0, currentSeq + 1) }));

      showToast(`${createdCargos.length} carga(s) importada(s) e criadas com sucesso no sistema!`, 'success');
    } catch (err: any) {
      console.error('Erro ao salvar cargas em lote:', err);
      const msg = err?.message || 'Erro desconhecido ao salvar lote de cargas.';
      showToast(`Erro na importação em lote: ${msg}`, 'error');
      throw err;
    }
  };

  const handleSaveUser = async (userData: User | Omit<User, 'id'>) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    let saved: User;
    if ('id' in userData) {
      saved = userData;
      setUsers(prev => prev.map(u => u.id === userData.id ? { ...u, ...userData } : u));
    } else { 
      const newId = formatId(nextIds.user, 'USR');
      saved = { ...userData, id: newId } as User;
      setUsers(prev => [saved, ...prev]);
      setNextIds((prev: any) => ({ ...prev, user: prev.user + 1 }));
    }
    try { 
      await upsertUser(saved); 
      showToast('Configurações do usuário salvas com sucesso no banco de dados!', 'success');
    } catch(err) { 
      console.error('Erro ao salvar usuário no Supabase:', err); 
      showToast('Erro ao salvar usuário no banco de dados.', 'error');
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir permanentemente esta informação?")) return;
    if (!currentUser || currentUser.profile !== UserProfile.Admin) return;
    if (userId === currentUser.id) {
        showToast("Você não pode excluir seu próprio usuário.", 'warning');
        return;
    }
    
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
        try {
            await deleteUser(userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
            showToast("Usuário excluído com sucesso.", 'success');
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            showToast("Erro ao excluir usuário. Verifique o console.", 'error');
        }
    }
  };

  const handleSaveBranch = async (branchData: Branch | Omit<Branch, 'id' | 'createdAt'>) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    let saved: Branch;
    if ('id' in branchData) {
      saved = branchData;
      setBranches(prev => prev.map(b => b.id === branchData.id ? branchData : b));
    } else {
      const newId = `FIL-${String(nextIds.branch).padStart(3, '0')}`;
      saved = { ...branchData, id: newId, createdAt: new Date().toISOString() } as Branch;
      setBranches(prev => [saved, ...prev]);
      setNextIds((prev: any) => ({ ...prev, branch: prev.branch + 1 }));
    }
    try { await upsertBranch(saved); } catch(err) { console.error('Erro ao salvar filial:', err); }
    showToast('Filial salva com sucesso!', 'success');
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir permanentemente esta informação?")) return;
    if (!currentUser || currentUser.profile !== UserProfile.Admin) return;
    if (confirm('Tem certeza que deseja excluir esta filial?')) {
      try {
        await deleteBranch(branchId);
        setBranches(prev => prev.filter(b => b.id !== branchId));
        showToast('Filial excluída com sucesso.', 'success');
      } catch (err) {
        console.error('Erro ao excluir filial:', err);
        showToast('Erro ao excluir filial.', 'error');
      }
    }
  };

  const handleRevertShipmentStatus = async (shipmentId: string) => {
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    const shipment = shipments.find(s => s.id === shipmentId);
    if (!shipment || !currentUser) return;
    
    if (![UserProfile.Admin, UserProfile.Diretor].includes(currentUser.profile)) {
        showToast("Apenas administradores ou diretores podem reverter o status.", 'warning');
        return;
    }

    const currentStatus = shipment.status;

    // Ordem estrita de reversão: 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
    const getStrictPreviousStatus = (status: ShipmentStatus, s: Shipment): ShipmentStatus | null => {
      const is100PctAdv = (s.advancePercentage !== undefined && s.advancePercentage >= 100) || 
                          (s.balanceToReceiveValue !== undefined && s.balanceToReceiveValue <= 0.001 && s.advanceValue !== undefined && s.advanceValue > 0) ||
                          (s.advanceValue !== undefined && s.driverFreightValue !== undefined && (s.advanceValue + (s.tollValue || 0) >= s.driverFreightValue - 0.01));
      
      const is0PctAdv = s.advancePercentage === 0;

      switch (status) {
        case ShipmentStatus.Finalizado: // 11
          // Se foi 100% adiantamento (pulou Ag. Saldo), volta direto para 9 - Valid. de Ticket
          return is100PctAdv ? ShipmentStatus.ValidacaoTicket : ShipmentStatus.AguardandoPagamentoSaldo;
        case ShipmentStatus.AguardandoPagamentoSaldo: // 10
          return ShipmentStatus.ValidacaoTicket; // 9
        case ShipmentStatus.ValidacaoTicket: // 9
          return ShipmentStatus.AguardandoDescarga; // 8
        case ShipmentStatus.AguardandoDescarga: // 8
          return ShipmentStatus.AguardandoAgendamento; // 7
        case ShipmentStatus.AguardandoAgendamento: // 7
          // Se foi 0% adiantamento (pulou Ag. Adiantamento), volta direto para 5 - Ag. Fiscal
          return is0PctAdv ? ShipmentStatus.AguardandoFiscal : ShipmentStatus.AguardandoAdiantamento;
        case ShipmentStatus.AguardandoAdiantamento: // 6
          return ShipmentStatus.AguardandoFiscal; // 5
        case ShipmentStatus.AguardandoFiscal: // 5
          return ShipmentStatus.AguardandoNota; // 4
        case ShipmentStatus.AguardandoNota: // 4
          return ShipmentStatus.AguardandoCarregamento; // 3
        case ShipmentStatus.AguardandoCarregamento: // 3
          {
            const relCargo = findCargoById(cargos, s.cargoId);
            const relProd = findProductForCargo(products, relCargo);
            const prodRequiresRisk = checkRequiresRiskManagement(relCargo, relProd);
            if (!prodRequiresRisk) {
              return s.statusHistory?.some(h => h.status === ShipmentStatus.PreCadastro) ? ShipmentStatus.PreCadastro : null;
            }
            return ShipmentStatus.AguardandoSeguradora; // 2
          }
        case ShipmentStatus.AguardandoSeguradora: // 2
          // Se o motorista passou por Ag. Cadastro (1)
          return s.statusHistory?.some(h => h.status === ShipmentStatus.PreCadastro) ? ShipmentStatus.PreCadastro : null;
        case ShipmentStatus.PreCadastro: // 1
          return null;
        case ShipmentStatus.Cancelado:
          return s.statusHistory && s.statusHistory.length > 1 ? s.statusHistory[s.statusHistory.length - 2].status : ShipmentStatus.PreCadastro;
        default:
          return null;
      }
    };

    let previousStatus: ShipmentStatus | null = null;
    let historyCopy = shipment.statusHistory ? [...shipment.statusHistory] : [];

    if (historyCopy.length > 1) {
      historyCopy.pop(); // Remove o status atual
      const previousStatusEntry = historyCopy[historyCopy.length - 1];
      previousStatus = previousStatusEntry?.status || getStrictPreviousStatus(currentStatus, shipment);
    } else {
      previousStatus = getStrictPreviousStatus(currentStatus, shipment);
      if (previousStatus) {
        historyCopy = [{
          status: previousStatus,
          timestamp: new Date().toISOString(),
          userId: currentUser.id
        }];
      }
    }

    if (!previousStatus) {
      showToast("Não há status anterior para reverter.", 'info');
      return;
    }

    // Build list of document and metadata keys to clear ONLY for the current status that is being reverted/cancelled
    const getDocKeysForStatus = (status: ShipmentStatus): string[] => {
      const mainDoc = REQUIRED_DOCUMENT_MAP[status];
      const keys: string[] = mainDoc ? [mainDoc] : [];
      if (status === ShipmentStatus.AguardandoNota) {
        keys.push('Nota Fiscal', 'nfe_number', 'nfeNumber');
      } else if (status === ShipmentStatus.AguardandoFiscal) {
        keys.push('CT-e', 'CIOT', 'Ciot', 'XML do CT-e', 'MDF-e', 'Carta Frete', 'Outros', 'cte_number', 'cte_emission_date', 'mdfe_number', 'cteNumber', 'cteEmissionDate', 'mdfeNumber');
      } else if (status === ShipmentStatus.AguardandoSeguradora) {
        keys.push('risk_release_code', 'risk_query_type', 'risk_query_cost', 'riskReleaseCode', 'riskQueryType', 'riskQueryCost');
      } else if (status === ShipmentStatus.AguardandoAdiantamento) {
        keys.push('advance_percentage', 'advance_value', 'toll_value', 'advancePercentage', 'advanceValue', 'tollValue', 'Comprovante de Adiantamento');
      } else if (status === ShipmentStatus.AguardandoDescarga) {
        keys.push('unloaded_tonnage', 'unloadedTonnage', 'Comprovante de Descarga');
      } else if (status === ShipmentStatus.ValidacaoTicket) {
        keys.push('ticket_validated', 'ticketValidated');
      } else if (status === ShipmentStatus.AguardandoPagamentoSaldo) {
        keys.push('balance_to_receive_value', 'discount_value', 'net_balance_value', 'is_breakage_waived', 'balanceToReceiveValue', 'discountValue', 'netBalanceValue', 'isBreakageWaived', 'Comprovante de Saldo');
      }
      return keys;
    };

    // CRITICAL: Only remove keys associated with currentStatus being undone; never remove keys of previousStatus
    const keysToRemove = Array.from(new Set(getDocKeysForStatus(currentStatus)));

    const updatedDocuments = { ...(shipment.documents || {}) };

    keysToRemove.forEach(key => {
      if (updatedDocuments[key]) {
        delete updatedDocuments[key];
      }
    });

    let updatedCargo: Cargo | undefined;
    if (currentStatus === ShipmentStatus.AguardandoDescarga) {
        const cargo = cargos.find(c => c.id === shipment.cargoId);
        if (cargo) {
            const newLoadedVolume = Math.max(0, cargo.loadedVolume - shipment.shipmentTonnage);
            updatedCargo = {
                ...cargo,
                loadedVolume: newLoadedVolume,
                history: [...cargo.history, createHistoryLog(`Volume carregado estornado devido à reversão do embarque ${shipmentId} (Status revertido para ${previousStatus}).`)]
            };
        }
    } else if (currentStatus === ShipmentStatus.Cancelado) {
        const cargo = cargos.find(c => c.id === shipment.cargoId);
        if (cargo) {
            const wasLoaded = Object.values(ShipmentStatus).indexOf(previousStatus) >= Object.values(ShipmentStatus).indexOf(ShipmentStatus.AguardandoDescarga);
            const newScheduledVolume = cargo.scheduledVolume + shipment.shipmentTonnage;
            const newLoadedVolume = wasLoaded ? cargo.loadedVolume + shipment.shipmentTonnage : cargo.loadedVolume;
            updatedCargo = {
                ...cargo,
                scheduledVolume: newScheduledVolume,
                loadedVolume: newLoadedVolume,
                history: [...cargo.history, createHistoryLog(`Volumes restaurados devido à reversão do cancelamento do embarque ${shipmentId} (Status restaurado para "${previousStatus}").`)]
            };
        }
    }

    const updatedShipment: Shipment = {
        ...shipment,
        status: previousStatus,
        statusHistory: historyCopy,
        cancellationReason: currentStatus === ShipmentStatus.Cancelado ? undefined : shipment.cancellationReason,
        documents: Object.keys(updatedDocuments).length > 0 ? updatedDocuments : undefined,
        riskReleaseCode: keysToRemove.includes('riskReleaseCode') ? undefined : shipment.riskReleaseCode,
        riskQueryType: keysToRemove.includes('riskQueryType') ? undefined : shipment.riskQueryType,
        riskQueryCost: keysToRemove.includes('riskQueryCost') ? undefined : shipment.riskQueryCost,
        cteNumber: (!isCteApplicableForStatus(previousStatus) || keysToRemove.includes('cteNumber')) ? undefined : (shipment.cteNumber || shipment.documents?.cte_number),
        cteEmissionDate: (!isCteApplicableForStatus(previousStatus) || keysToRemove.includes('cteEmissionDate')) ? undefined : (shipment.cteEmissionDate || shipment.documents?.cte_emission_date),
        nfeNumber: keysToRemove.includes('nfeNumber') ? undefined : (shipment.nfeNumber || shipment.documents?.nfe_number),
        mdfeNumber: keysToRemove.includes('mdfeNumber') ? undefined : (shipment.mdfeNumber || shipment.documents?.mdfe_number),
        advancePercentage: keysToRemove.includes('advancePercentage') ? undefined : shipment.advancePercentage,
        advanceValue: keysToRemove.includes('advanceValue') ? undefined : shipment.advanceValue,
        tollValue: keysToRemove.includes('tollValue') ? undefined : shipment.tollValue,
        unloadedTonnage: keysToRemove.includes('unloadedTonnage') ? undefined : shipment.unloadedTonnage,
        balanceToReceiveValue: keysToRemove.includes('balanceToReceiveValue') ? undefined : shipment.balanceToReceiveValue,
        discountValue: keysToRemove.includes('discountValue') ? undefined : shipment.discountValue,
        isBreakageWaived: keysToRemove.includes('isBreakageWaived') ? undefined : shipment.isBreakageWaived,
        netBalanceValue: keysToRemove.includes('netBalanceValue') ? undefined : shipment.netBalanceValue,
        history: [...shipment.history, createHistoryLog(`Status revertido de "${currentStatus}" para "${previousStatus}" por ${currentUser.name}. Anexos e dados da etapa removidos para reanexação.`)]
    };

    const prevShipmentsState = shipments;
    const prevCargosState = cargos;

    setShipments((prev: Shipment[]) => prev.map(s => s.id === shipmentId ? updatedShipment : s));
    if (updatedCargo) {
        setCargos(prev => prev.map(c => c.id === updatedShipment.cargoId ? updatedCargo! : c));
    }

    try {
        await upsertShipment(updatedShipment);
        if (updatedCargo) await upsertCargo(updatedCargo);
        showToast(`Status revertido para ${previousStatus}. Anexos anteriores removidos para novo envio.`, 'success');
    } catch (err: any) {
        console.error('Erro ao salvar reversão:', err);
        setShipments(prevShipmentsState);
        setCargos(prevCargosState);
        const errMsg = err?.message || 'Erro desconhecido no banco de dados';
        showToast(`Erro ao salvar a reversão no banco de dados: ${errMsg}`, 'error');
    }
  };

  const handleReactivateLoad = async (cargoToReactivate: Cargo) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    
    const updatedCargo: Cargo = {
      ...cargoToReactivate,
      status: CargoStatus.EmAndamento,
      history: [...cargoToReactivate.history, createHistoryLog(`Carga reativada por ${currentUser.name}. Status alterado de "${cargoToReactivate.status}" para "Em Andamento".`)]
    };

    setCargos(prev => prev.map(c => c.id === cargoToReactivate.id ? updatedCargo : c));
    try {
      await upsertCargo(updatedCargo);
    } catch (err) {
      console.error('Erro ao reativar carga:', err);
      showToast("Erro ao reativar carga no banco de dados.", 'error');
    }
  };

  const handleSuspendLoad = async (cargoToSuspend: Cargo) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      showToast('Usuário em modo demonstração possui acesso apenas de visualização.', 'warning');
      return;
    }
    
    const updatedCargo: Cargo = {
      ...cargoToSuspend,
      status: CargoStatus.Suspensa,
      history: [...cargoToSuspend.history, createHistoryLog(`Carga suspensa por ${currentUser.name}.`)]
    };

    setCargos(prev => prev.map(c => c.id === cargoToSuspend.id ? updatedCargo : c));
    try {
      await upsertCargo(updatedCargo);
    } catch (err) {
      console.error('Erro ao suspender carga:', err);
      showToast("Erro ao suspender carga no banco de dados.", 'error');
    }
  };

  // --- RENDER LOGIC ---
  const renderPage = () => {
    if (!currentUser) return null;

    // We moved the isLoading check to the top-level to prevent race conditions during login.

    if (loadError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
          <p style={{ color: '#ef4444', fontSize: '16px' }}>{loadError}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Tentar novamente</button>
        </div>
      );
    }


    return (
      <React.Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/" element={<DashboardPage cargos={cargos} shipments={visibleShipments} users={users} currentUser={currentUser} clients={clients} products={products} companyLogo={companyLogo} vehicles={vehicles} drivers={drivers} onDeleteAttachment={handleDeleteShipmentAttachment} onUpdateAttachment={handleUpdateShipmentAttachment} onUpdateShipmentData={handleUpdateShipmentData} onAddAttachments={handleAddShipmentAttachments} onUpdateAnttAndBankDetails={handleUpdateShipmentAnttAndBankDetails} onUpdatePrice={handleUpdateShipmentPrice} onSwapCargo={handleSwapCargo} freightOffers={freightOffers} onSaveFreightOffer={handleSaveFreightOffer} onAcceptFreightOffer={handleAcceptFreightOffer} onConvertToCargo={(offer) => { setOfferToConvert(offer); setCurrentPage('loads'); }} onCreateShipment={handleCreateShipment} allShipments={shipments} riskQueryOptions={riskQueryOptions} />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/clients" element={<ClientsPage clients={clients} setClients={setClients} onSaveClient={handleSaveClient} onDeleteClient={handleDeleteClient} onMergeClients={handleMergeClients} currentUser={currentUser} profilePermissions={profilePermissions} />} />
          <Route path="/owners" element={<OwnersPage owners={owners} setOwners={setOwners} onSaveOwner={handleSaveOwner} currentUser={currentUser} profilePermissions={profilePermissions} />} />
          <Route path="/drivers" element={<DriversPage drivers={drivers} setDrivers={setDrivers} onSaveDriver={handleSaveDriver} owners={owners} currentUser={currentUser} profilePermissions={profilePermissions} shipments={visibleShipments} cargos={cargos} />} />
          <Route path="/vehicles" element={<VehiclesPage vehicles={vehicles} setVehicles={setVehicles} onSaveVehicle={handleSaveVehicle} owners={owners} currentUser={currentUser} profilePermissions={profilePermissions} shipments={visibleShipments} cargos={cargos} />} />
          <Route path="/loads" element={<LoadsPage loads={activeLoads} setLoads={setCargos} clients={clients} products={products} onSaveLoad={handleSaveLoad} onBulkSaveLoads={handleBulkSaveLoads} onReactivateLoad={handleReactivateLoad} onSuspendLoad={handleSuspendLoad} onUpdatePrice={handleUpdateShipmentPrice} currentUser={currentUser} profilePermissions={profilePermissions} users={users} shipments={visibleShipments} allShipments={shipments} onDeleteLoad={handleDeleteCargo} onModalStateChange={setIsAnyModalOpen} companyLogo={companyLogo} vehicles={vehicles} drivers={drivers} onDeleteAttachment={handleDeleteShipmentAttachment} branches={branches} stays={stays} tickets={tickets} offerToConvert={offerToConvert} setOfferToConvert={setOfferToConvert} onCreateShipment={handleCreateShipment} onSwapCargo={handleSwapCargo} />} />
          <Route path="/products" element={<ProductsPage products={products} onSaveProduct={handleSaveProduct} onDeleteProduct={handleDeleteProduct} currentUser={currentUser} profilePermissions={profilePermissions} />} />
          <Route path="/shipments" element={<ShipmentsPage shipments={visibleShipments} cargos={cargos} clients={clients} products={products} drivers={drivers} vehicles={vehicles} currentUser={currentUser} profilePermissions={profilePermissions} users={users} onUpdateAttachment={handleUpdateShipmentAttachment} onAddAttachments={handleAddShipmentAttachments} onUpdatePrice={handleUpdateShipmentPrice} onConfirmCancel={handleConfirmCancelShipment} onUpdateAnttAndBankDetails={handleUpdateShipmentAnttAndBankDetails} onMarkArrival={handleMarkArrival} onTransferShipment={handleTransferShipment} onDeleteShipment={handleDeleteShipment} onRevertStatus={handleRevertShipmentStatus} onUpdateScheduledDateTime={handleUpdateScheduledDateTime} onUpdateShipmentData={handleUpdateShipmentData} onDeleteAttachment={handleDeleteShipmentAttachment} onSwapCargo={handleSwapCargo} activeLocks={activeLocks} onModalStateChange={setIsAnyModalOpen} companyLogo={companyLogo} stays={stays} tickets={tickets} riskQueryOptions={riskQueryOptions} onBatchUpdateShipments={handleBatchUpdateShipments} />} />
          <Route path="/operational-loads" element={<OperationalLoadsPage loads={inProgressLoads} clients={clients} products={products} drivers={drivers} vehicles={vehicles} onCreateShipment={handleCreateShipment} onSaveLoad={handleSaveLoad} onBulkSaveLoads={handleBulkSaveLoads} onReactivateLoad={handleReactivateLoad} onSuspendLoad={handleSuspendLoad} currentUser={currentUser} profilePermissions={profilePermissions} shipments={visibleShipments} allShipments={shipments} users={users} onDeleteLoad={handleDeleteCargo} onUpdatePrice={handleUpdateShipmentPrice} onUpdateShipmentData={handleUpdateShipmentData} onRequestLoadOrder={handleRequestLoadOrder} onModalStateChange={setIsAnyModalOpen} onDeleteAttachment={handleDeleteShipmentAttachment} branches={branches} stays={stays} tickets={tickets} onUpdateAttachment={handleUpdateShipmentAttachment} onAddAttachments={handleAddShipmentAttachments} riskQueryOptions={riskQueryOptions} onSwapCargo={handleSwapCargo} />} />
          <Route path="/operational-map" element={<OperationalMapPage cargos={cargos} shipments={shipments} clients={clients} products={products} drivers={drivers} vehicles={vehicles} onCreateShipment={handleCreateShipment} currentUser={currentUser} users={users} onModalStateChange={setIsAnyModalOpen} onDeleteAttachment={handleDeleteShipmentAttachment} />} />
          <Route path="/financial" element={<CommissionsPage shipments={visibleShipments} cargos={cargos} users={users} stays={stays} clients={clients} />} />
          <Route path="/reports" element={!can('read', currentUser, 'reports', profilePermissions) ? <Navigate to="/" replace /> : <ReportsPage shipments={visibleShipments} embarcadores={visibleEmbarcadores} cargos={cargos} users={users} currentUser={currentUser} clients={clients} branches={branches} stays={stays} companyLogo={companyLogo} onSaveUser={handleSaveUser} drivers={drivers} vehicles={vehicles} products={products} onUpdateAttachment={handleUpdateShipmentAttachment} onBatchUpdateShipments={handleBatchUpdateShipments} onUpdateShipmentData={handleUpdateShipmentData} />} />
          <Route path="/users-register" element={<UsersPage users={users} setUsers={setUsers} onSaveUser={handleSaveUser} currentUser={currentUser} profilePermissions={profilePermissions} onSavePermissions={handleSavePermissions} clients={clients} onDeleteUser={handleDeleteUser} branches={branches} cargos={cargos} shipments={shipments} owners={owners} drivers={drivers} vehicles={vehicles} products={products} freightOffers={freightOffers} stays={stays} tickets={tickets} riskQueryOptions={riskQueryOptions} companyLogo={companyLogo} />} />
          <Route path="/appearance" element={<AppearancePage currentLogo={companyLogo} onSaveLogo={handleSaveLogo} currentTheme={themeImage} onSaveTheme={handleSaveThemeImage} themeMode={themeMode} onThemeModeChange={handleThemeModeChange} />} />
          <Route path="/system-monitor" element={<SystemMonitorPage currentUser={currentUser} profilePermissions={profilePermissions} onSavePermissions={handleSavePermissions} />} />
          <Route path="/shipment-history" element={<ShipmentHistoryPage shipments={visibleShipments} cargos={cargos} drivers={drivers} users={users} currentUser={currentUser} clients={clients} products={products} vehicles={vehicles} onDeleteShipment={handleDeleteShipment} onRevertStatus={handleRevertShipmentStatus} onDeleteAttachment={handleDeleteShipmentAttachment} onUpdatePrice={handleUpdateShipmentPrice} onUpdateShipmentData={handleUpdateShipmentData} onUpdateAttachment={handleUpdateShipmentAttachment} stays={stays} riskQueryOptions={riskQueryOptions} />} />
          <Route path="/load-history" element={<LoadHistoryPage loads={closedLoads} clients={clients} products={products} users={users} currentUser={currentUser} shipments={shipments} onDeleteLoad={handleDeleteCargo} onReactivateLoad={handleReactivateLoad} />} />
          <Route path="/layover-calculator" element={<LayoverCalculatorPage currentUser={currentUser} shipments={shipments} cargos={cargos} clients={clients} />} />
          <Route path="/freight-quote" element={<FreightQuotePage currentUser={currentUser} cargos={cargos} />} />
          <Route path="/tools-history" element={<ToolsHistoryPage currentUser={currentUser} shipments={shipments} cargos={cargos} clients={clients} />} />
          <Route path="/branches" element={<BranchesPage branches={branches} onSaveBranch={handleSaveBranch} onDeleteBranch={handleDeleteBranch} currentUser={currentUser} profilePermissions={profilePermissions} />} />
          <Route path="/risk-management" element={!can('read', currentUser, 'risk-management', profilePermissions) ? <Navigate to="/" replace /> : <RiskManagementPage shipments={visibleShipments} cargos={cargos} clients={clients} products={products} drivers={drivers} vehicles={vehicles} users={users} currentUser={currentUser} companyLogo={companyLogo} riskQueryOptions={riskQueryOptions} onSaveRiskQueryOption={handleSaveRiskQueryOption} onDeleteRiskQueryOption={handleDeleteRiskQueryOption} onRestoreRiskQueryDefaults={handleRestoreRiskQueryDefaults} profilePermissions={profilePermissions} onUpdatePrice={handleUpdateShipmentPrice} onUpdateShipmentData={handleUpdateShipmentData} onAddAttachments={handleAddShipmentAttachments} onDeleteAttachment={handleDeleteShipmentAttachment} onModalStateChange={setIsAnyModalOpen} onSwapCargo={handleSwapCargo} />} />
          <Route path="/risk-query-types" element={!can('read', currentUser, 'risk-query-types', profilePermissions) ? <Navigate to="/" replace /> : <RiskQueryTypesPage riskQueryOptions={riskQueryOptions} onSaveOption={handleSaveRiskQueryOption} onDeleteOption={handleDeleteRiskQueryOption} onRestoreDefaults={handleRestoreRiskQueryDefaults} currentUser={currentUser} profilePermissions={profilePermissions} />} />
          <Route path="/freight-offers-history" element={!can('read', currentUser, 'freight-offers-history', profilePermissions) ? <Navigate to="/" replace /> : <FreightOffersHistoryPage currentUser={currentUser} freightOffers={freightOffers} clients={clients} products={products} cargos={cargos} users={users} onSaveFreightOffer={handleSaveFreightOffer} onDeleteFreightOffer={handleDeleteFreightOffer} onConvertToCargo={(offer) => { setOfferToConvert(offer); setCurrentPage('loads'); }} />} />
          <Route path="/whatsapp" element={!can('read', currentUser, 'whatsapp', profilePermissions) ? <Navigate to="/" replace /> : <WhatsAppManagementPage currentUser={currentUser} />} />
          <Route path="*" element={<DashboardPage cargos={cargos} shipments={visibleShipments} users={users} currentUser={currentUser} clients={clients} products={products} companyLogo={companyLogo} vehicles={vehicles} drivers={drivers} onDeleteAttachment={handleDeleteShipmentAttachment} onUpdateAttachment={handleUpdateShipmentAttachment} onUpdateShipmentData={handleUpdateShipmentData} onAddAttachments={handleAddShipmentAttachments} onUpdateAnttAndBankDetails={handleUpdateShipmentAnttAndBankDetails} onUpdatePrice={handleUpdateShipmentPrice} onSwapCargo={handleSwapCargo} freightOffers={freightOffers} onSaveFreightOffer={handleSaveFreightOffer} onAcceptFreightOffer={handleAcceptFreightOffer} onDeleteFreightOffer={handleDeleteFreightOffer} onCreateShipment={handleCreateShipment} allShipments={shipments} riskQueryOptions={riskQueryOptions} />} />
        </Routes>
      </React.Suspense>
    );
  };

  // Only show the full-screen loader if it's the initial load (no data yet) or checking auth
  if (isAuthChecking || isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', background: '#f9fafb' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6b7280', fontSize: '18px', fontWeight: 500 }}>Carregando Transcunha Logística...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (location.pathname === '/baixar-app') {
    return (
      <React.Suspense fallback={<PageLoadingFallback />}>
        <DownloadAppPage companyLogo={companyLogo} />
      </React.Suspense>
    );
  }

  if (!currentUser) {
    return (
      <React.Suspense fallback={<PageLoadingFallback />}>
        <LoginPage onLogin={handleLogin} users={users} companyLogo={companyLogo} profilePermissions={profilePermissions} />
      </React.Suspense>
    );
  }

  if (currentUser.profile === UserProfile.Motorista) {
    return (
      <>
        <DriverPortal
          currentUser={currentUser}
          onLogout={handleLogout}
          cargos={activeLoads}
          shipments={visibleShipments}
          products={products}
          drivers={drivers}
          vehicles={vehicles}
          onRequestLoadOrder={handleRequestLoadOrder}
          onUpdateShipmentAttachment={handleUpdateShipmentAttachment}
          companyLogo={companyLogo}
        />
        <SelectEmbarcadorModal
          isOpen={isSelectEmbarcadorModalOpen}
          onClose={() => setIsSelectEmbarcadorModalOpen(false)}
          onConfirm={handleConfirmRequestOrder}
          users={users}
          cargo={selectedCargoForRequest}
        />
        {currentUser?.requirePasswordChange && (
          <PasswordChangeModal 
            user={currentUser} 
            onPasswordChange={handlePasswordChange} 
            onCancel={handleLogout}
          />
        )}
      </>
    );
  }

  const operationalPages: Page[] = ['loads', 'shipments', 'shipment-history', 'load-history', 'operational-loads', 'operational-map', 'risk-management', 'risk-query-types', 'whatsapp'];
  const isOperationalPage = operationalPages.includes(currentPage);

  return (
    <div 
      className="relative flex flex-col h-screen bg-[#f8fafc] dark:bg-[#070c18] text-slate-800 dark:text-slate-100 overflow-hidden font-sans portal-theme-bg"
      style={{ '--theme-bg': themeImage ? `url("${themeImage.replace(/"/g, '\\"')}")` : 'none' } as React.CSSProperties}
    >
      {/* Background Grid Pattern & Ambient Lighting (Model identical to Login Page) */}
      {!themeImage && (
        <>
          <div 
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(59, 130, 246, 0.05) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(59, 130, 246, 0.05) 1px, transparent 1px)
              `,
              backgroundSize: '48px 48px'
            }}
          />
          {/* Soft Radial Ambient Lighting */}
          <div className="absolute top-0 left-1/4 w-[600px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
          <div className="absolute top-1/2 right-10 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none z-0" />
        </>
      )}

      <TopNavBar
        user={currentUser}
        onLogout={handleLogout}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        profilePermissions={profilePermissions}
        companyLogo={companyLogo}
        onOpenTickets={() => setIsTicketModalOpen(true)}
        tickets={tickets}
        shipments={shipments}
        freightOffers={freightOffers}
        cargos={cargos}
        drivers={drivers}
        clients={clients}
        products={products}
        vehicles={vehicles}
        users={users}
        themeMode={themeMode}
        onThemeModeChange={handleThemeModeChange}
        onAcceptOrderRequest={handleAcceptOrderRequestFromNotification}
        onRefuseOrderRequest={handleRefuseOrderRequestFromNotification}
        onSaveFreightOffer={handleSaveFreightOffer}
        onOpenUpdates={() => setIsUpdateModalOpen(true)}
      />
      <main className="relative z-10 flex-1 overflow-y-auto" style={{ zoom: 0.72 }}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
            {renderPage()}
        </div>
      </main>
       <SelectEmbarcadorModal
         isOpen={isSelectEmbarcadorModalOpen}
         onClose={() => setIsSelectEmbarcadorModalOpen(false)}
         onConfirm={handleConfirmRequestOrder}
         users={users}
         cargo={selectedCargoForRequest}
       />
       <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        tickets={tickets}
        users={users}
        currentUser={currentUser}
        onSave={handleSaveTicket}
        onUpdate={handleUpdateTicket}
        onDelete={handleDeleteTicket}
        cargos={cargos}
        shipments={shipments}
        onNavigateTo={(type) => {
          if (type === 'cargo') setCurrentPage('loads');
          if (type === 'shipment') setCurrentPage('shipments');
        }}
      />
      {offerForNewShipment && (
        <NewShipmentModal
          isOpen={!!offerForNewShipment}
          onClose={() => setOfferForNewShipment(null)}
          onSave={async (data) => {
            const history = [...(offerForNewShipment.history || []), {
              id: `log_${Date.now()}_sys`,
              userId: currentUser?.id || 'system',
              timestamp: new Date().toISOString(),
              description: `Solicitação de ordem aceita por ${currentUser?.name || 'Embarcador'}. Embarque criado com sucesso.`
            }];
            await handleSaveFreightOffer({ ...offerForNewShipment, status: FreightOfferStatus.Aceita, history });
            await handleCreateShipment({
              cargoId: offerForNewShipment.cargoId,
              ...data
            });
            setOfferForNewShipment(null);
          }}
          cargo={cargos.find(c => c.id === offerForNewShipment.cargoId) || null}
          drivers={drivers}
          clients={clients}
          vehicles={vehicles}
          currentUser={currentUser}
          shipments={shipments}
          users={users}
          offer={offerForNewShipment}
        />
      )}
      {currentUser?.requirePasswordChange && (
        <PasswordChangeModal 
          user={currentUser} 
          onPasswordChange={handlePasswordChange} 
          onCancel={handleLogout}
        />
      )}
      <SystemUpdateModal 
        isOpen={isUpdateModalOpen} 
        onClose={() => setIsUpdateModalOpen(false)} 
        currentUser={currentUser} 
      />

      {/* JANELA FLUTUANTE GLOBAL DE WHATSAPP (SOBREPOSTA A TODAS AS TELAS E CABEÇALHO) */}
      {isGlobalWhatsAppFloatingOpen && (
        <WhatsAppChatPanel
          mode="floating"
          onClose={() => setIsGlobalWhatsAppFloatingOpen(false)}
          initialPhone={globalWhatsAppInitialPhone}
          initialName={globalWhatsAppInitialName}
        />
      )}
    </div>
  );
};

export default App;
