import { createContext, useContext, useState } from "react";

export const OPERATIONS = ["LOGGI", "AMAZON"] as const;
export type Operation = (typeof OPERATIONS)[number];

interface OperationContextValue {
  operation: Operation;
  setOperation: (op: Operation) => void;
}

const OperationContext = createContext<OperationContextValue>({
  operation: "LOGGI",
  setOperation: () => {},
});

export function OperationProvider({ children }: { children: React.ReactNode }) {
  const [operation, setOperationState] = useState<Operation>(() => {
    const stored = localStorage.getItem("selectedOperation");
    return stored === "LOGGI" || stored === "AMAZON" ? stored : "LOGGI";
  });

  const setOperation = (op: Operation) => {
    setOperationState(op);
    localStorage.setItem("selectedOperation", op);
  };

  return (
    <OperationContext.Provider value={{ operation, setOperation }}>
      {children}
    </OperationContext.Provider>
  );
}

export function useOperation() {
  return useContext(OperationContext);
}
