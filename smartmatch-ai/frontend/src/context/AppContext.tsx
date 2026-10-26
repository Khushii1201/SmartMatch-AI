import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Candidate, MatchReport, PageId } from '../types';
import { api } from '../services/api';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface AppContextType {
  activeCandidate: Candidate | null;
  setActiveCandidate: (candidate: Candidate | null) => void;
  candidates: Candidate[];
  refreshCandidates: () => Promise<void>;
  lastMatchReport: MatchReport | null;
  setLastMatchReport: (report: MatchReport | null) => void;
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  isBackendHealthy: boolean | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeCandidate, setActiveCandidateState] = useState<Candidate | null>(null);
  const [lastMatchReport, setLastMatchReport] = useState<MatchReport | null>(null);
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setActiveCandidate = useCallback((candidate: Candidate | null) => {
    setActiveCandidateState(candidate);
    if (candidate) {
      localStorage.setItem('smartmatch_active_candidate_id', candidate.id.toString());
    } else {
      localStorage.removeItem('smartmatch_active_candidate_id');
    }
  }, []);

  const refreshCandidates = useCallback(async () => {
    try {
      const list = await api.listCandidates();
      setCandidates(list);
      setIsBackendHealthy(true);

      // Restore active candidate if possible
      const savedId = localStorage.getItem('smartmatch_active_candidate_id');
      if (savedId) {
        const found = list.find((c) => c.id.toString() === savedId);
        if (found) {
          setActiveCandidateState(found);
        } else if (list.length > 0 && !activeCandidate) {
          setActiveCandidateState(list[0]);
        }
      } else if (list.length > 0 && !activeCandidate) {
        setActiveCandidateState(list[0]);
      }
    } catch {
      setIsBackendHealthy(false);
    }
  }, [activeCandidate]);

  useEffect(() => {
    refreshCandidates();
  }, []);

  return (
    <AppContext.Provider
      value={{
        activeCandidate,
        setActiveCandidate,
        candidates,
        refreshCandidates,
        lastMatchReport,
        setLastMatchReport,
        currentPage,
        setCurrentPage,
        toasts,
        addToast,
        removeToast,
        isBackendHealthy,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
