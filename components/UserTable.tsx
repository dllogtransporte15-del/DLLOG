
import React from 'react';
import type { User, Client } from '../types';
import { UserProfile } from '../types';
import { WhatsAppIcon } from './icons';
import { Building2 } from 'lucide-react';

interface UserTableProps {
  users: User[];
  onEdit?: (user: User) => void;
  onDelete?: (userId: string) => void;
  clients?: Client[];
}

const UserTable: React.FC<UserTableProps> = ({ users, onEdit, onDelete, clients }) => {
  const getWhatsAppUrl = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    const finalDigits = (digits.length === 10 || digits.length === 11) ? `55${digits}` : digits;
    return `https://wa.me/${finalDigits}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 text-left">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="w-24 px-3 sm:px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">ID</th>
              <th scope="col" className="px-3 sm:px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">Nome</th>
              <th scope="col" className="px-3 sm:px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">Email</th>
              <th scope="col" className="w-36 px-3 sm:px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">Telefone</th>
              <th scope="col" className="w-44 px-3 sm:px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">Perfil</th>
              <th scope="col" className="w-24 px-3 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">Status</th>
              {(onEdit || onDelete) && (
                <th scope="col" className="w-28 px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {user.id}
                  </span>
                </td>
                <td className="px-3 sm:px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                  {user.name}
                </td>
                <td className="px-3 sm:px-4 py-3 text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px] lg:max-w-xs xl:max-w-none" title={user.email}>
                  {user.email}
                </td>
                <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {user.phone ? (
                    <div className="flex items-center space-x-1.5">
                      <span>{user.phone}</span>
                      <a 
                        href={getWhatsAppUrl(user.phone)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center justify-center hover:scale-110 transition-transform text-emerald-600"
                        title="Conversar no WhatsApp"
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-600">-</span>
                  )}
                </td>
                <td className="px-3 sm:px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-gray-900 dark:text-white">{user.profile}</span>
                    {user.profile === UserProfile.Cliente && user.clientId && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium truncate max-w-[160px]" title={clients?.find(c => c.id === user.clientId)?.nomeFantasia || clients?.find(c => c.id === user.clientId)?.razaoSocial}>
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        {clients?.find(c => c.id === user.clientId)?.nomeFantasia || clients?.find(c => c.id === user.clientId)?.razaoSocial || `Cliente: ${user.clientId}`}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-center">
                  <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${user.active ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {user.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                {(onEdit || onDelete) && (
                  <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="inline-flex items-center justify-end gap-3">
                      {onEdit && (
                        <button onClick={() => onEdit(user)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">Editar</button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(user.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Excluir</button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={(onEdit || onDelete) ? 7 : 6} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  Nenhum usuário encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserTable;
