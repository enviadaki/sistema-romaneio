export default function Slide2Arquitetura() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#FFFFFF", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", padding: "5vh 5vw", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6vh" }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: "-1vw", top: "1.5vh", width: "20vw", height: "3vh", backgroundColor: "#0A1628", opacity: 0.08, zIndex: 0 }} />
          <h2 style={{ fontSize: "3.2vw", fontWeight: 900, color: "#0A1628", margin: 0, lineHeight: 1, letterSpacing: "-0.03em", position: "relative", zIndex: 1 }}>
            Arquitetura do Sistema
          </h2>
        </div>
        <div style={{ fontSize: "1.1vw", fontWeight: 800, color: "#0A1628", letterSpacing: "-0.02em" }}>Sistema de Romaneios</div>
      </div>

      {/* 3 Components */}
      <div style={{ display: "flex", gap: "2vw", flex: 1 }}>
        {/* Component 1: DB */}
        <div style={{ flex: 1, backgroundColor: "#0A1628", color: "#FFFFFF", padding: "3.5vh 2.5vw", display: "flex", flexDirection: "column", gap: "1.5vh" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0" }}>COMPONENTE 01</div>
          <div style={{ fontSize: "1.8vw", fontWeight: 800, letterSpacing: "-0.02em" }}>Banco de Dados</div>
          <div style={{ width: "2vw", height: "2px", backgroundColor: "#A0AEC0" }} />
          <div style={{ fontSize: "1vw", color: "#E2E8F0", lineHeight: 1.6 }}>PostgreSQL 14+</div>
          <div style={{ fontSize: "1vw", color: "#E2E8F0", lineHeight: 1.6 }}>Armazena pacotes, scans, entregas, motoristas</div>
          <div style={{ marginTop: "auto" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0", backgroundColor: "rgba(255,255,255,0.07)", padding: "1vh 1vw" }}>
              porta: 5432
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div style={{ display: "flex", alignItems: "center", fontSize: "2vw", color: "#A0AEC0", fontWeight: 300 }}>→</div>

        {/* Component 2: API */}
        <div style={{ flex: 1, border: "2px solid #0A1628", padding: "3.5vh 2.5vw", display: "flex", flexDirection: "column", gap: "1.5vh" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0" }}>COMPONENTE 02</div>
          <div style={{ fontSize: "1.8vw", fontWeight: 800, color: "#0A1628", letterSpacing: "-0.02em" }}>API Server</div>
          <div style={{ width: "2vw", height: "2px", backgroundColor: "#0A1628" }} />
          <div style={{ fontSize: "1vw", color: "#4A5568", lineHeight: 1.6 }}>Node.js 24 + Express 5</div>
          <div style={{ fontSize: "1vw", color: "#4A5568", lineHeight: 1.6 }}>Toda a lógica de negócio, rotas REST, autenticação</div>
          <div style={{ marginTop: "auto" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#4A5568", backgroundColor: "#F7FAFC", padding: "1vh 1vw", border: "1px solid #E2E8F0" }}>
              porta: 5000 / /api
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div style={{ display: "flex", alignItems: "center", fontSize: "2vw", color: "#A0AEC0", fontWeight: 300 }}>→</div>

        {/* Component 3: Frontend */}
        <div style={{ flex: 1, border: "1px solid #E2E8F0", backgroundColor: "#F7FAFC", padding: "3.5vh 2.5vw", display: "flex", flexDirection: "column", gap: "1.5vh" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0" }}>COMPONENTE 03</div>
          <div style={{ fontSize: "1.8vw", fontWeight: 800, color: "#0A1628", letterSpacing: "-0.02em" }}>Frontend</div>
          <div style={{ width: "2vw", height: "2px", backgroundColor: "#E2E8F0" }} />
          <div style={{ fontSize: "1vw", color: "#4A5568", lineHeight: 1.6 }}>React + Vite (arquivos estáticos)</div>
          <div style={{ fontSize: "1vw", color: "#4A5568", lineHeight: 1.6 }}>Servido via Nginx ou CDN</div>
          <div style={{ marginTop: "auto" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#4A5568", backgroundColor: "#FFFFFF", padding: "1vh 1vw", border: "1px solid #E2E8F0" }}>
              porta: 80 / 443
            </div>
          </div>
        </div>
      </div>

      {/* Auth note */}
      <div style={{ marginTop: "2.5vh", padding: "1.5vh 2vw", backgroundColor: "#F7FAFC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "2vw" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", whiteSpace: "nowrap" }}>AUTH</div>
        <div style={{ width: "1px", height: "2.5vh", backgroundColor: "#E2E8F0" }} />
        <div style={{ fontSize: "1vw", color: "#4A5568" }}>Autenticação via <strong style={{ color: "#0A1628" }}>Clerk</strong> — requer conta criada no nome do cliente e chaves de API configuradas nas variáveis de ambiente</div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", right: "5vw", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0" }}>Visão Geral / Guia de Implantação</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#0A1628", fontWeight: 600 }}>02</div>
      </div>
    </div>
  );
}
