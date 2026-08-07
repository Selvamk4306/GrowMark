import React, { createContext, useState, useContext, useEffect } from 'react';

type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState('English');

  useEffect(() => {
    const saved = localStorage.getItem('app_language');
    if (saved) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = async (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
    localStorage.setItem('has_selected_language', 'true');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
