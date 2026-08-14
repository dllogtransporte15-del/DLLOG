
import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import UserTable from '../components/UserTable';
import UserFilter, { UserFilters } from '../components/UserFilter';
import UserFormModal from '../components/UserFormModal';
import PermissionsModal from '../components/PermissionsModal';
import type { User, ProfilePermissions, Client, Branch } from '../types';
import { UserProfile } from '../types';
import { can } from '../auth';
import { Building2, Globe, Users } from 'lucide-react';

export type UserTabType = 'internal' | 'external' | 'all';

interface UsersPageProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  onSaveUser: (userData: User | Omit<User, 'id'>) => void;
  currentUser: User;
  profilePermissions: ProfilePermissions;
  onSavePermissions: (permissions: ProfilePermissions) => void;
  clients: Client[];
  onDeleteUser: (userId: string) => void;
  branches: Branch[];
}

export const isExternalUserProfile = (profile?: UserProfile | string): boolean => {
  return profile === UserProfile.Cliente || profile === UserProfile.Motorista;
};

const UsersPage: React.FC<UsersPageProps> = ({ users, setUsers, onSaveUser, currentUser, profilePermissions, onSavePermissions, clients, onDeleteUser, branches }) => {
  const [activeTab, setActiveTab] = useState<UserTabType>('internal');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [filters, setFilters] = useState<UserFilters>({
    id: '',
    name: '',
    profile: '',
    status: '',
  });

  const canCreateUser = can('create', currentUser, 'users-register', profilePermissions);
  const canUpdateUser = can('update', currentUser, 'users-register', profilePermissions);
  const canDeleteUser = can('delete', currentUser, 'users-register', profilePermissions);

  const internalCount = useMemo(() => users.filter(u => !isExternalUserProfile(u.profile)).length, [users]);
  const externalCount = useMemo(() => users.filter(u => isExternalUserProfile(u.profile)).length, [users]);
  const allCount = users.length;

  const availableProfiles = useMemo(() => {
    if (activeTab === 'internal') {
      return Object.values(UserProfile).filter(p => !isExternalUserProfile(p));
    }
    if (activeTab === 'external') {
      return Object.values(UserProfile).filter(p => isExternalUserProfile(p));
    }
    return Object.values(UserProfile);
  }, [activeTab]);

  const handleTabChange = (tab: UserTabType) => {
    setActiveTab(tab);
    if (filters.profile) {
      const isExt = isExternalUserProfile(filters.profile as UserProfile);
      if (tab === 'internal' && isExt) {
        setFilters(prev => ({ ...prev, profile: '' }));
      } else if (tab === 'external' && !isExt) {
        setFilters(prev => ({ ...prev, profile: '' }));
      }
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Category Tab Filter
      if (activeTab === 'internal' && isExternalUserProfile(user.profile)) return false;
      if (activeTab === 'external' && !isExternalUserProfile(user.profile)) return false;

      // Inputs & Dropdown Filters
      const idMatch = !filters.id || (user.id && user.id.toLowerCase().includes(filters.id.toLowerCase()));
      const nameMatch = !filters.name || (user.name && user.name.toLowerCase().includes(filters.name.toLowerCase()));
      const profileMatch = !filters.profile || user.profile === filters.profile;
      const statusMatch = !filters.status || (filters.status === 'active' ? user.active === true : user.active === false);

      return idMatch && nameMatch && profileMatch && statusMatch;
    });
  }, [users, filters, activeTab]);

  const handleOpenUserModal = () => {
    setUserToEdit(null);
    setIsUserModalOpen(true);
  };
  const handleCloseUserModal = () => setIsUserModalOpen(false);
  const handleEditUser = (user: User) => {
    setUserToEdit(user);
    setIsUserModalOpen(true);
  };
  const handleDeleteUser = (userId: string) => {
    onDeleteUser(userId);
  };
  const handleSaveUser = (user: User | Omit<User, 'id'>) => {
    onSaveUser(user);
    handleCloseUserModal();
  };

  const defaultProfileForNewUser = activeTab === 'external' ? UserProfile.Cliente : UserProfile.Comercial;

  return (
    <>
      <Header title="Gerenciar Usuários">
          {canUpdateUser && (
              <button
                  onClick={() => setIsPermissionsModalOpen(true)}
                  className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 font-medium text-sm transition-colors"
              >
                  Gerenciar Permissões
              </button>
          )}
          {canCreateUser && (
              <button
                  onClick={handleOpenUserModal}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-medium text-sm transition-colors"
              >
                  {activeTab === 'external' ? 'Adicionar Cliente' : 'Adicionar Usuário'}
              </button>
          )}
      </Header>

      {/* Tabs: Usuários Internos vs Usuários Externos vs Todos */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-lg px-4 shadow-sm">
        <nav className="-mb-px flex space-x-4 sm:space-x-8" aria-label="Tabs">
          <button
            onClick={() => handleTabChange('internal')}
            className={`whitespace-nowrap flex items-center py-4 px-2 border-b-2 font-medium text-sm transition-all duration-200 ${
              activeTab === 'internal'
                ? 'border-primary text-primary dark:border-blue-400 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Building2 className="w-4 h-4 mr-2" />
            <span>Usuários Internos</span>
            <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full font-bold transition-colors ${
              activeTab === 'internal'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {internalCount}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('external')}
            className={`whitespace-nowrap flex items-center py-4 px-2 border-b-2 font-medium text-sm transition-all duration-200 ${
              activeTab === 'external'
                ? 'border-primary text-primary dark:border-blue-400 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Globe className="w-4 h-4 mr-2" />
            <span>Usuários Externos (Clientes)</span>
            <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full font-bold transition-colors ${
              activeTab === 'external'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {externalCount}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('all')}
            className={`whitespace-nowrap flex items-center py-4 px-2 border-b-2 font-medium text-sm transition-all duration-200 ${
              activeTab === 'all'
                ? 'border-primary text-primary dark:border-blue-400 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            <span>Todos</span>
            <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full font-bold transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {allCount}
            </span>
          </button>
        </nav>
      </div>

      <UserFilter 
        filters={filters} 
        onFilterChange={setFilters} 
        availableProfiles={availableProfiles}
      />

      <UserTable 
        users={filteredUsers} 
        onEdit={canUpdateUser ? handleEditUser : undefined} 
        onDelete={canDeleteUser ? handleDeleteUser : undefined}
        clients={clients}
      />

      <UserFormModal
        isOpen={isUserModalOpen}
        onClose={handleCloseUserModal}
        onSave={handleSaveUser}
        userToEdit={userToEdit}
        clients={clients}
        branches={branches}
        defaultProfile={defaultProfileForNewUser}
      />
      
      <PermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        onSaveProfilePermissions={onSavePermissions}
        onSaveUserPermissions={(userId, customPermissions) => {
          const user = users.find(u => u.id === userId);
          if (user) {
            onSaveUser({ ...user, customPermissions });
          }
        }}
        permissions={profilePermissions}
        users={users}
      />
    </>
  );
};

export default UsersPage;