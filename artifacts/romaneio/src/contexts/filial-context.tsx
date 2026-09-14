import { createContext, useContext, useState } from "react";

// Filial dentro da operação AMAZON (plano de filiais). Ao contrário de
// operação (OPERATIONS, fixo: LOGGI/AMAZON), a lista de filiais é dinâmica
// — cadastrada no admin — por isso não existe uma constante equivalente a
// OPERATIONS aqui; o valor selecionado é só um código de texto (ou null,
// "nenhuma filial" — LOGGI, ou operador sem restrição de filial).
interface FilialContextValue {
  filial: string | null;
  setFilial: (f: string | null) => void;
}

const FilialContext = createContext<FilialContextValue>({
  filial: null,
  setFilial: () => {},
});

export function FilialProvider({ children }: { children: React.ReactNode }) {
  const [filial, setFilialState] = useState<string | null>(() => {
    return localStorage.getItem("selectedFilial") || null;
  });

  const setFilial = (f: string | null) => {
    setFilialState(f);
    if (f) {
      localStorage.setItem("selectedFilial", f);
    } else {
      localStorage.removeItem("selectedFilial");
    }
  };

  return (
    <FilialContext.Provider value={{ filial, setFilial }}>
      {children}
    </FilialContext.Provider>
  );
}

export function useFilial() {
  return useContext(FilialContext);
}
