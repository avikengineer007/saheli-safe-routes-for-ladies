import React, { createContext, useContext, useState } from 'react';
import { AgeGroup } from '../types';

interface ElderlyModeContextType {
  ageGroup: AgeGroup;
  setAgeGroup: (group: AgeGroup) => void;
  isElderlyMode: boolean;
  toggleElderlyMode: () => void;
  caregiverLinked: boolean;
  setCaregiverLinked: (linked: boolean) => void;
  caregiverPhone: string;
  setCaregiverPhone: (phone: string) => void;
}

const ElderlyModeContext = createContext<ElderlyModeContextType | undefined>(undefined);

export const ElderlyModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ageGroup, setAgeGroupState] = useState<AgeGroup>('adult');
  const [isElderlyMode, setIsElderlyMode] = useState<boolean>(false);
  const [caregiverLinked, setCaregiverLinked] = useState<boolean>(false);
  const [caregiverPhone, setCaregiverPhone] = useState<string>('');

  const setAgeGroup = (group: AgeGroup) => {
    setAgeGroupState(group);
    setIsElderlyMode(group === 'elderly');
  };

  const toggleElderlyMode = () => {
    setIsElderlyMode(prev => !prev);
  };

  return (
    <ElderlyModeContext.Provider
      value={{
        ageGroup,
        setAgeGroup,
        isElderlyMode,
        toggleElderlyMode,
        caregiverLinked,
        setCaregiverLinked,
        caregiverPhone,
        setCaregiverPhone
      }}
    >
      {children}
    </ElderlyModeContext.Provider>
  );
};

export const useElderlyMode = () => {
  const context = useContext(ElderlyModeContext);
  if (!context) {
    throw new Error('useElderlyMode must be used within an ElderlyModeProvider');
  }
  return context;
};
