
import React, { useRef, useState } from 'react';

interface CompanyLogoUploaderProps {
  currentLogo: string | null;
  onSaveLogo: (logoBase64: string) => void;
}

const CompanyLogoUploader: React.FC<CompanyLogoUploaderProps> = ({ currentLogo, onSaveLogo }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif'].includes(file.type)) {
      setError('Tipo de arquivo inválido. Use JPG, PNG, GIF ou SVG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      setError('O arquivo é muito grande. O limite é 2MB.');
      return;
    }
    setError('');

    const reader = new FileReader();
    reader.onload = () => {
      onSaveLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Logo da Empresa</h3>
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center overflow-hidden border dark:border-gray-200 dark:dark:border-gray-600">
          {currentLogo ? (
            <img src={currentLogo} alt="Logo Atual" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-center text-gray-400 p-2">Sem Logo</span>
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Faça o upload do logo que será exibido na barra lateral e na tela de login (limite de 2MB).
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/png, image/jpeg, image/gif, image/svg+xml"
          />
          <button
            onClick={handleButtonClick}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark"
          >
            Alterar Logo
          </button>
          {error && <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default CompanyLogoUploader;
