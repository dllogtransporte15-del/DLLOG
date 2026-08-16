
import React, { useState, useEffect } from 'react';
import type { User, Client, Branch } from '../types';
import { UserProfile } from '../types';
import { useToast } from '../hooks/useToast';
import { autoFormatInput } from '../utils/formatters';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User | Omit<User, 'id'>) => void;
  userToEdit: User | null;
  clients: Client[];
  branches: Branch[];
  defaultProfile?: UserProfile;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, userToEdit, clients, branches, defaultProfile }) => {
  const { showToast } = useToast();
  const getInitialState = (): Omit<User, 'id'> => ({
    name: '',
    email: '',
    phone: '',
    profile: defaultProfile || UserProfile.Comercial,
    active: true,
    password: '',
    clientId: undefined,
    branchId: undefined,
    hasCommercialCommission: defaultProfile === UserProfile.GerenteComercial || defaultProfile === UserProfile.Comercial,
  });

  const [user, setUser] = useState<Omit<User, 'id' | 'password'> & { password?: string }>(getInitialState());

  useEffect(() => {
    if (isOpen) {
        if(userToEdit) {
            const { password, ...userWithoutPass } = userToEdit;
            setUser({ ...userWithoutPass, password: '' }); // Don't load existing password
        } else {
            setUser(getInitialState());
        }
    }
  }, [userToEdit, isOpen, defaultProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const formattedValue = autoFormatInput(name, value);

    let updatedValue: any = formattedValue;
    if (type === 'checkbox') {
        updatedValue = (e.target as HTMLInputElement).checked;
    }
    
    setUser(prev => {
      const newState = { ...prev, [name]: updatedValue };
      if (name === 'profile' && value !== UserProfile.Cliente) {
        delete newState.clientId;
      }
      if (name === 'profile' && (value === UserProfile.GerenteComercial)) {
        newState.hasCommercialCommission = true;
      }
      return newState;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (user.profile === UserProfile.Cliente && !user.clientId) {
      showToast('Por favor, selecione um cliente para associar a este usuário.', 'warning');
      return;
    }

    const userToSave: any = { ...user };

    if (userToEdit) {
      userToSave.id = userToEdit.id;
      // If password field is empty on edit, don't change it
      if (!user.password) {
        delete userToSave.password;
      }
    } else {
      // Password is required for new users
      if (!user.password) {
        showToast('O campo de senha é obrigatório para novos usuários.', 'warning');
        return;
      }
    }

    onSave(userToSave);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            {userToEdit ? 'Editar Usuário' : 'Novo Usuário'}
            {userToEdit && (
              <span className="text-sm font-mono font-bold px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800">
                ID: {userToEdit.id}
              </span>
            )}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="name" value={user.name} onChange={handleChange} placeholder="Nome Completo" className="p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600" required />
          <input name="email" value={user.email} onChange={handleChange} type="email" placeholder="Email de Acesso" className="p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600" required />
          <input name="phone" value={user.phone || ''} onChange={handleChange} placeholder="Telefone" className="p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600" />
          <input name="password" value={user.password} onChange={handleChange} type="password" placeholder={userToEdit ? 'Nova Senha (deixe em branco para manter)' : 'Senha'} className="p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600" />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Perfil de Acesso</label>
            <select name="profile" value={user.profile} onChange={handleChange} className="mt-1 p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600">
              {Object.values(UserProfile).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {user.profile === UserProfile.Cliente && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Associar ao Cliente</label>
              <select name="clientId" value={user.clientId || ''} onChange={handleChange} className="mt-1 p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600" required>
                <option value="" disabled>Selecione um cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nomeFantasia}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Filial Associada</label>
            <select name="branchId" value={user.branchId || ''} onChange={handleChange} className="mt-1 p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600">
              <option value="">Sem filial (Padrão)</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.city}-{b.state})</option>)}
            </select>
            <p className="text-[10px] text-gray-500 mt-1">Usuários sem filial verão dados de todas as filiais (perfil admin/diretor).</p>
          </div>

          {/* ATIVAR COMISSÃO COMERCIAL (GERENTE COMERCIAL) */}
          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-800/80 space-y-2">
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="hasCommercialCommission" 
                name="hasCommercialCommission" 
                checked={user.hasCommercialCommission || false} 
                onChange={handleChange} 
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="hasCommercialCommission" className="ml-2 block text-sm font-bold text-gray-900 dark:text-gray-200 cursor-pointer">
                Ativar Comissão Comercial (Gerente Comercial)
              </label>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 pl-6">
              Personalize a base de cálculo individual deste comercial (Fixo R$, % Matriz e % Filiais):
            </p>

            {user.hasCommercialCommission && (
              <div className="space-y-3 pt-2 border-t border-blue-200/60 dark:border-blue-800/60">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Base de Cálculo do Faturamento:
                  </label>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="commercialCalculationMode" 
                        value="bruto" 
                        checked={(user.commercialCalculationMode || 'bruto') === 'bruto'} 
                        onChange={() => setUser(prev => ({ ...prev, commercialCalculationMode: 'bruto' }))} 
                        className="text-primary focus:ring-primary"
                      />
                      <span>Faturamento BRUTO</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="commercialCalculationMode" 
                        value="liquido" 
                        checked={user.commercialCalculationMode === 'liquido'} 
                        onChange={() => setUser(prev => ({ ...prev, commercialCalculationMode: 'liquido' }))} 
                        className="text-primary focus:ring-primary"
                      />
                      <span>Faturamento LÍQUIDO (Margem)</span>
                    </label>
                  </div>
                </div>

                {/* MODALIDADE AGÊNCIA (REPARTIDA) */}
                <div className="p-2.5 bg-purple-50/60 dark:bg-purple-950/40 rounded-lg border border-purple-200/70 dark:border-purple-800/70 space-y-2">
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="commercialIsAgencyMode" 
                      name="commercialIsAgencyMode" 
                      checked={user.commercialIsAgencyMode || false} 
                      onChange={(e) => setUser(prev => ({ ...prev, commercialIsAgencyMode: e.target.checked }))} 
                      className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="commercialIsAgencyMode" className="ml-2 block text-xs font-bold text-purple-950 dark:text-purple-200 cursor-pointer">
                      Ativar Modalidade Agência (Comissão Repartida entre a Equipe)
                    </label>
                  </div>
                  {user.commercialIsAgencyMode && (
                    <div className="pl-6 pt-1 space-y-1.5 text-xs">
                      <p className="text-[11px] text-purple-800 dark:text-purple-300">
                        A comissão (ex: 30%) será dividida entre os membros desta agência/filial.
                      </p>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                          Participação do Usuário na Agência (%):
                        </label>
                        <input 
                          type="number" 
                          step="1" 
                          min="1" 
                          max="100" 
                          name="commercialAgencySharePercent" 
                          value={user.commercialAgencySharePercent ?? ''} 
                          onChange={(e) => setUser(prev => ({ ...prev, commercialAgencySharePercent: parseFloat(e.target.value) || undefined }))} 
                          placeholder="Ex: 50 (Vazio = igualitária)" 
                          className="p-1 text-xs w-48 border rounded dark:bg-gray-700 dark:border-gray-600 font-mono font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300">Fixo (R$)</label>
                    <input 
                      type="number" 
                      step="100" 
                      name="commercialFixedSalary" 
                      value={user.commercialFixedSalary ?? 5000} 
                      onChange={(e) => setUser(prev => ({ ...prev, commercialFixedSalary: parseFloat(e.target.value) || 0 }))} 
                      className="mt-1 p-1.5 text-xs w-full border rounded dark:bg-gray-700 dark:border-gray-600 font-mono font-bold"
                      placeholder="5000"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300">% Matriz</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      name="commercialMatrizRate" 
                      value={user.commercialMatrizRate ?? 0.20} 
                      onChange={(e) => setUser(prev => ({ ...prev, commercialMatrizRate: parseFloat(e.target.value) || 0 }))} 
                      className="mt-1 p-1.5 text-xs w-full border rounded dark:bg-gray-700 dark:border-gray-600 font-mono font-bold"
                      placeholder="0.20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300">% Filiais</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      name="commercialFiliaisRate" 
                      value={user.commercialFiliaisRate ?? 0.10} 
                      onChange={(e) => setUser(prev => ({ ...prev, commercialFiliaisRate: parseFloat(e.target.value) || 0 }))} 
                      className="mt-1 p-1.5 text-xs w-full border rounded dark:bg-gray-700 dark:border-gray-600 font-mono font-bold"
                      placeholder="0.10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Filiais Selecionadas p/ Comissão (% Filiais):
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-xs">
                    {branches.filter(b => !b.name.toLowerCase().includes('matriz')).map(b => {
                      const nonMatrizIds = branches.filter(br => !br.name.toLowerCase().includes('matriz')).map(br => br.id);
                      const selectedIds = user.commercialSelectedBranchIds || nonMatrizIds;
                      const isChecked = selectedIds.includes(b.id);

                      return (
                        <label key={b.id} className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const updated = checked 
                                ? [...selectedIds, b.id]
                                : selectedIds.filter(id => id !== b.id);
                              setUser(prev => ({ ...prev, commercialSelectedBranchIds: updated }));
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span>{b.name} ({b.state})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input type="checkbox" id="active" name="active" checked={user.active} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
            <label htmlFor="active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Usuário Ativo</label>
          </div>

          <div className="mt-8 flex justify-between items-center">
            <div>
              {userToEdit && (
                <button 
                  type="button" 
                  onClick={() => {
                    setUser(prev => ({ ...prev, password: 'transcunha2026', requirePasswordChange: true }));
                    showToast('Senha resetada para "transcunha2026". Atenção: A alteração só será gravada ao clicar em "SALVAR".', 'info', 6000);
                  }} 
                  className="py-2 px-4 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l3.9-3.9a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.9 3.9V3.75a.75.75 0 011.5 0v10.493z" clipRule="evenodd" />
                  </svg>
                  Resetar Senha
                </button>
              )}
            </div>
            <div className="flex space-x-4">
              <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                Cancelar
              </button>
              <button type="submit" className="py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary-dark shadow-md">
                Salvar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;