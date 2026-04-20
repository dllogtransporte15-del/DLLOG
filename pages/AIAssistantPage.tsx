import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import { GoogleGenAI } from '@google/genai';

const AIAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState((import.meta as any).env?.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '');
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !apiKey) return;
    
    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
            ...messages.map(m => ({
                role: m.role as any,
                parts: [{ text: m.content }]
            })),
            { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
            tools: [{ googleSearch: {} }],
            thinkingConfig: {
                thinkingLevel: 'HIGH' as any
            }
        }
      });

      const modelText = response.text || 'Nenhuma resposta recebida.';
      setMessages(prev => [...prev, { role: 'model', content: modelText }]);
    } catch (error: any) {
        console.error("Erro na API Gemini:", error);
        setMessages(prev => [...prev, { role: 'model', content: `Erro: ${error.message || 'Ocorreu um erro ao conectar ao assistente.'}` }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSaveKey = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setApiKey(val);
      localStorage.setItem('gemini_api_key', val);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <Header title="Assistente de Logística (IA)" />
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700 flex flex-col h-[70vh]">
        {!apiKey && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md text-yellow-800 dark:text-yellow-200 text-sm">
                <p className="font-bold mb-2">Chave de API necessária</p>
                <p className="mb-2">Para usar o assistente, insira sua chave do Google AI Studio abaixo. Ela ficará salva apenas no seu navegador.</p>
                <input 
                    type="password" 
                    placeholder="Sua API Key do Gemini (AIzaSy...)" 
                    onChange={handleSaveKey}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-white mt-2"
                />
            </div>
        )}
        
        <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700 space-y-4">
            {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                    <svg className="w-16 h-16 mb-4 text-primary opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p className="text-lg font-medium text-center">Como posso ajudar com a logística hoje?</p>
                    <p className="text-sm mt-2 opacity-75 text-center max-w-sm">O assistente tem acesso à internet via Google Search para cotações, rotas e pesquisas em tempo real.</p>
                </div>
            ) : (
                messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${
                            msg.role === 'user' 
                            ? 'bg-primary text-white rounded-br-none' 
                            : 'bg-white dark:bg-gray-700 border dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-bl-none shadow-sm'
                        }`}>
                            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                        </div>
                    </div>
                ))
            )}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg rounded-bl-none p-3 shadow-sm">
                        <div className="flex space-x-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={endOfMessagesRef} />
        </div>
        
        <div className="flex gap-2 relative">
            <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                placeholder="Pergunte algo ao assistente..."
                className="flex-1 resize-none h-12 p-3 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                disabled={!apiKey || isLoading}
            />
            <button
                onClick={handleSend}
                disabled={!input.trim() || !apiKey || isLoading}
                className="px-6 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center justify-center"
            >
                Enviar
            </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPage;
