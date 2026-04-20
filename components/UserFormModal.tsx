
import React, { useState, useEffect } from 'react';
import type { User, Client } from '../types';
import { UserProfile } from '../types';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User | Omit<User, 'id'>) => void;
  userToEdit: User | null;
  clients: Client[];
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, userToEdit, clients }) => {
  const getInitialState = (): Omit<User, 'id'> => ({
    name: '',
    email: '',
    profile: UserProfile.Comercial,
    active: true,
    password: '',
    clientId: undefined,
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
  }, [userToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    let updatedValue: any = value;
    if (type === 'checkbox') {
        updatedValue = (e.target as HTMLInputElement).checked;
    }
    
    setUser(prev => {
      const newState = { ...prev, [name]: updatedValue };
      if (name === 'profile' && value !== UserProfile.Cliente) {
        delete newState.clientId;
      }
      return newState;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (user.profile === UserProfile.Cliente && !user.clientId) {
      alert('Por favor, selecione um cliente para associar a este usuário.');
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
        alert('O campo de senha é obrigatório para novos usuários.');
        return;
      }
    }

    onSave(userToSave);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">{userToEdit ? 'Editar Usuário' : 'Novo Usuário'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="name" value={user.name} onChange={handleChange} placeholder="Nome Completo" className="p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600" required />
          <input name="email" value={user.email} onChange={handleChange} type="email" placeholder="Email de Acesso" className="p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600" required />
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

          <div className="flex items-center">
            <input type="checkbox" id="active" name="active" checked={user.active} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
            <label htmlFor="active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Usuário Ativo</label>
          </div>

          <div className="mt-8 flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
              Cancelar
            </button>
            <button type="submit" className="py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary-dark">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;