import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SimulationContextType {
  isSimulation: boolean;
  enableSimulation: () => void;
  disableSimulation: () => void;
}

const SimulationContext = createContext<SimulationContextType>({
  isSimulation: false,
  enableSimulation: () => {},
  disableSimulation: () => {},
});

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [isSimulation, setIsSimulation] = useState(false);
  const queryClient = useQueryClient();

  const enableSimulation = useCallback(() => {
    setIsSimulation(true);
    toast.info('Modo Simulação ativado. Nenhuma alteração será salva no banco de dados.');
  }, []);

  const disableSimulation = useCallback(() => {
    setIsSimulation(false);
    // Invalidate all queries to refetch real data from DB
    queryClient.invalidateQueries();
    toast.info('Modo Simulação desativado. Dados restaurados do banco de dados.');
  }, [queryClient]);

  return (
    <SimulationContext.Provider value={{ isSimulation, enableSimulation, disableSimulation }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  return useContext(SimulationContext);
}
