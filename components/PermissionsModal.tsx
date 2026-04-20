
import React, { useState, useEffect } from 'react';
import type { ProfilePermissions, Page, CrudPermissions } from '../types';
import { UserProfile } from '../types';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (permissions: ProfilePermissions) => void;
  permissions: ProfilePermissions;
}

// FIX: Added missing 'layover-calculator' and 'freight-quote' properties to match Page type definition.
const PAGE_NAMES: Record<Page, string> = {
  'dashboard': 'Dashboard',
  'clients': 'Clientes',
  'owners': 'Proprietários',
  'embarcadores': 'Embarcadores',
  'drivers': 'Motoristas',
  'vehicles': 'Veículos',
  'loads': 'Cargas (Cadastro)',
  'products': 'Produtos',
  'shipments': 'Embarques',
  'shipment-history': 'Histórico de Embarques',
  'load-history': 'Histórico de Cargas',
  'financial': 'Financeiro',
  'reports': 'Relatórios',
  'operational-loads': 'Cargas (Operacional)',
  'operational-map': 'Mapa Operacional',
  'users-register': 'Gerenciar Usuários',
  'commissions': 'Comissões',
  'appearance': 'Aparência',
  'layover-calculator': 'Cálculo de Estadias',
  'freight-quote': 'Cotação de Frete',
  'ai-assistant': 'Assistente de IA',
  'tools-history': 'Histórico de Ferramentas',
};

const PERMISSION_NAMES: Record<keyof CrudPermissions, string> = {
  read: 'Ver',
  create: 'Criar',
  update: 'Editar',
  delete: 'Excluir',
};

const PermissionsModal: React.FC<PermissionsModalProps> = ({ isOpen, onClose, onSave, permissions }) => {
  const [editablePermissions, setEditablePermissions] = useState<ProfilePermissions>({});
  const [selectedProfile, setSelectedProfile] = useState<UserProfile>(UserProfile.Comercial);

  useEffect(() => {
    // Deep copy of permissions to avoid direct mutation
    if (isOpen) {
      setEditablePermissions(JSON.parse(JSON.stringify(permissions)));
    }
  }, [permissions, isOpen]);

  const handleCheckboxChange = (page: Page, action: keyof CrudPermissions) => {
    setEditablePermissions(prev => {
      const newPermissions = { ...prev };
      if (!newPermissions[selectedProfile]) newPermissions[selectedProfile] = {};
      if (!newPermissions[selectedProfile]![page]) {
        newPermissions[selectedProfile]![page] = { read: false, create: false, update: false, delete: false };
      }
      
      const newPageState = { ...newPermissions[selectedProfile]![page]! };
      newPageState[action] = !newPageState[action];

      // If 'read' is disabled, all other actions for that page should also be disabled
      if (action === 'read' && !newPageState.read) {
        newPageState.create = false;
        newPageState.update = false;
        newPageState.delete = false;
      }
      
      // If any other action is enabled, 'read' must also be enabled
      if (action !== 'read' && newPageState[action]) {
        newPageState.read = true;
      }

      newPermissions[selectedProfile]![page] = newPageState;
      return newPermissions;
    });
  };

  const handleSave = () => {
    onSave(editablePermissions);
    onClose();
  };

  if (!isOpen) return null;

  const currentProfilePermissions = editablePermissions[selectedProfile] || {};
  const availableProfiles = Object.values(UserProfile).filter(p => p !== UserProfile.Admin);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Gerenciar Permissões de Perfis</h2>
        
        <div className="mb-4">
            <label htmlFor="profile-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Selecione o perfil para editar:</label>
            <select
                id="profile-select"
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value as UserProfile)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
                {availableProfiles.map(profile => (
                    <option key={profile} value={profile}>{profile}</option>
                ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">O perfil "Administrador do Sistema" tem acesso irrestrito a todas as funcionalidades.</p>
        </div>

        <div className="flex-1 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">Módulo / Página</th>
                        {Object.entries(PERMISSION_NAMES).map(([key, name]) => (
                            <th key={key} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">{name}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {(Object.keys(PAGE_NAMES) as Page[]).sort((a, b) => PAGE_NAMES[a].localeCompare(PAGE_NAMES[b])).map(page => {
                        const pagePerms = currentProfilePermissions[page] || { read: false, create: false, update: false, delete: false };
                        return (
                            <tr key={page}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{PAGE_NAMES[page]}</td>
                                {(Object.keys(PERMISSION_NAMES) as (keyof CrudPermissions)[]).map(action => (
                                    <td key={action} className="px-6 py-4 whitespace-nowrap text-center">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={pagePerms[action]}
                                            onChange={() => handleCheckboxChange(page, action)}
                                        />
                                    </td>
                                ))}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
        
        <div className="mt-6 flex justify-end space-x-4 border-t dark:border-gray-700 pt-4">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} className="py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary-dark">
            Salvar Permissões
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionsModal;