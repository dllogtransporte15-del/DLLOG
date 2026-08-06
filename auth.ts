
import type { User, Page, ProfilePermissions, CrudPermissions } from './types';
import { UserProfile } from './types';

const allPages: Page[] = ['dashboard', 'clients', 'owners', 'embarcadores', 'drivers', 'vehicles', 'loads', 'shipments', 'financial', 'reports', 'operational-loads', 'operational-map', 'users-register', 'commissions', 'appearance', 'shipment-history', 'load-history', 'layover-calculator', 'freight-quote', 'ai-assistant', 'tools-history', 'branches', 'system-monitor', 'freight-offers-history'];

const createPermissions = (pages: Page[], readOnly = false): { [key in Page]?: CrudPermissions } => {
  const permissions: { [key in Page]?: CrudPermissions } = {};
  for (const page of allPages) {
    const canAccess = pages.includes(page);
    permissions[page] = {
      read: canAccess,
      create: canAccess && !readOnly,
      update: canAccess && !readOnly,
      delete: canAccess && !readOnly,
    };
  }
  return permissions;
};

const supervisorAndDiretorPages = allPages.filter(p => p !== 'appearance');
export const INITIAL_PERMISSIONS: ProfilePermissions = {
  [UserProfile.Comercial]: createPermissions(['dashboard', 'clients', 'owners', 'drivers', 'vehicles', 'loads', 'shipments', 'reports', 'operational-loads', 'financial', 'operational-map', 'commissions', 'shipment-history', 'load-history', 'layover-calculator', 'freight-quote', 'freight-offers-history']),
  [UserProfile.Fiscal]: createPermissions(['dashboard', 'shipments', 'shipment-history', 'load-history'], true),
  [UserProfile.Financeiro]: createPermissions(['dashboard', 'shipments', 'reports', 'financial', 'commissions', 'shipment-history', 'load-history'], true),
  [UserProfile.Embarcador]: createPermissions(['dashboard', 'reports', 'operational-loads', 'shipments', 'operational-map', 'shipment-history', 'load-history', 'layover-calculator'], true),
  [UserProfile.Cliente]: createPermissions(['dashboard', 'loads', 'shipments', 'shipment-history', 'load-history', 'operational-loads', 'freight-offers-history'], true),
  [UserProfile.Supervisor]: createPermissions(supervisorAndDiretorPages),
  [UserProfile.Diretor]: createPermissions(supervisorAndDiretorPages, true),
  [UserProfile.Motorista]: createPermissions(['operational-loads', 'shipment-history'], true),
};

if (INITIAL_PERMISSIONS[UserProfile.Fiscal] && INITIAL_PERMISSIONS[UserProfile.Fiscal]!['shipments']) {
    INITIAL_PERMISSIONS[UserProfile.Fiscal]!['shipments']!.delete = true;
}

// Specifically grant 'create' permission for 'shipments' to 'Embarcador' profile
if (INITIAL_PERMISSIONS[UserProfile.Embarcador] && INITIAL_PERMISSIONS[UserProfile.Embarcador]!['shipments']) {
    INITIAL_PERMISSIONS[UserProfile.Embarcador]!['shipments']!.create = true;
}


export const can = (
  action: keyof CrudPermissions,
  user: User | null,
  page: Page,
  permissions: ProfilePermissions
): boolean => {
  if (!user) return false;
  
  // Admin can do everything, always.
  if (user.profile === UserProfile.Admin) return true;

  // Explicitly block 'reports' for 'Fiscal' profile as requested, overriding DB
  if (user.profile === UserProfile.Fiscal && page === 'reports') return false;

  // Check User-specific custom permissions first
  if (user.customPermissions && user.customPermissions[page]) {
    return user.customPermissions[page]![action];
  }

  const userProfilePermissions = permissions[user.profile];
  const pagePermissions = userProfilePermissions?.[page] ?? INITIAL_PERMISSIONS[user.profile]?.[page];
  if (!pagePermissions) return false;

  return pagePermissions[action];
};

