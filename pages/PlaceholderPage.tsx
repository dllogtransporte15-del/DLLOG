
import React from 'react';
import Header from '../components/Header';
import { PackageIcon } from '../components/icons/PackageIcon';

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  return (
    <>
      <Header title={title} />
      <div className="flex flex-col items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <PackageIcon className="w-24 h-24 text-gray-300 dark:text-gray-600" />
        <h2 className="mt-6 text-2xl font-semibold text-gray-700 dark:text-gray-200">
          Módulo em Construção
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          A funcionalidade de "{title}" está sendo desenvolvida e estará disponível em breve.
        </p>
      </div>
    </>
  );
};

export default PlaceholderPage;
