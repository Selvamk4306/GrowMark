import React, { createContext, useState, useContext } from 'react';

type GlobalContextType = {
  hasAnimatedHealthScore: boolean;
  setHasAnimatedHealthScore: (val: boolean) => void;
  hasAnimatedRevenueChart: boolean;
  setHasAnimatedRevenueChart: (val: boolean) => void;
};

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasAnimatedHealthScore, setHasAnimatedHealthScore] = useState(false);
  const [hasAnimatedRevenueChart, setHasAnimatedRevenueChart] = useState(false);

  return (
    <GlobalContext.Provider value={{
      hasAnimatedHealthScore,
      setHasAnimatedHealthScore,
      hasAnimatedRevenueChart,
      setHasAnimatedRevenueChart
    }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
};
