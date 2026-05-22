export default function Slide3Prereqs() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#FFFFFF", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", padding: "5vh 5vw", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "5vh" }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: "-1vw", top: "1.5vh", width: "16vw", height: "3vh", backgroundColor: "#0A1628", opacity: 0.08, zIndex: 0 }} />
          <h2 style={{ fontSize: "3.2vw", fontWeight: 900, color: "#0A1628", margin: 0, lineHeight: 1, letterSpacing: "-0.03em", position: "relative", zIndex: 1 }}>
            Pré-requisitos
          </h2>
        </div>
        <div style={{ fontSize: "1.1vw", fontWeight: 800, color: "#0A1628" }}>Sistema de Romaneios</div>
      </div>

      <div style={{ display: "flex", gap: "3vw", flex: 1 }}>
        {/* Left column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2.5vh" }}>
          {/* Server specs */}
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.5vh" }}>Servidor</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
              <div style={{ display: "flex", gap: "2vw", borderBottom: "1px solid #E2E8F0", paddingBottom: "1.2vh" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0", minWidth: "8vw" }}>CPU</div>
                <div style={{ fontSize: "1vw", color: "#0A1628", fontWeight: 600 }}>2 vCPU mínimo</div>
              </div>
              <div style={{ display: "flex", gap: "2vw", borderBottom: "1px solid #E2E8F0", paddingBottom: "1.2vh" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0", minWidth: "8vw" }}>RAM</div>
                <div style={{ fontSize: "1vw", color: "#0A1628", fontWeight: 600 }}>2 GB mínimo (4 GB recomendado)</div>
              </div>
              <div style={{ display: "flex", gap: "2vw", borderBottom: "1px solid #E2E8F0", paddingBottom: "1.2vh" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0", minWidth: "8vw" }}>Disco</div>
                <div style={{ fontSize: "1vw", color: "#0A1628", fontWeight: 600 }}>20 GB SSD mínimo</div>
              </div>
              <div style={{ display: "flex", gap: "2vw" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0", minWidth: "8vw" }}>SO</div>
                <div style={{ fontSize: "1vw", color: "#0A1628", fontWeight: 600 }}>Ubuntu 22.04 LTS ou Debian 12</div>
              </div>
            </div>
          </div>

          <div style={{ width: "100%", height: "1px", backgroundColor: "#E2E8F0" }} />

          {/* Software */}
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.5vh" }}>Software necessário</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
              <div style={{ display: "flex", gap: "2vw", borderBottom: "1px solid #E2E8F0", paddingBottom: "1.2vh" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0", minWidth: "8vw" }}>Node.js</div>
                <div style={{ fontSize: "1vw", color: "#0A1628", fontWeight: 600 }}>v20+ (recomendado v24)</div>
              </div>
              <div style={{ display: "flex", gap: "2vw", borderBottom: "1px solid #E2E8F0", paddingBottom: "1.2vh" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0", minWidth: "8vw" }}>pnpm</div>
                <div style={{ fontSize: "1vw", color: "#0A1628", fontWeight: 600 }}>v9+ (gerenciador de pacotes)</div>
              </div>
              <div style={{ display: "flex", gap: "2vw", borderBottom: "1px solid #E2E8F0", paddingBottom: "1.2vh" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0", minWidth: "8vw" }}>PostgreSQL</div>
                <div style={{ fontSize: "1vw", color: "#0A1628", fontWeight: 600 }}>v14+</div>
              </div>
              <div style={{ display: "flex", gap: "2vw" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0", minWidth: "8vw" }}>Nginx</div>
                <div style={{ fontSize: "1vw", color: "#0A1628", fontWeight: 600 }}>para servir o frontend</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2.5vh" }}>
          {/* Ports */}
          <div style={{ backgroundColor: "#F7FAFC", border: "1px solid #E2E8F0", padding: "3vh 2.5vw" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2vh" }}>Portas a liberar no firewall</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.3vw", fontWeight: 600, color: "#0A1628" }}>:80</div>
                <div style={{ fontSize: "1vw", color: "#4A5568" }}>HTTP — Frontend</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.3vw", fontWeight: 600, color: "#0A1628" }}>:443</div>
                <div style={{ fontSize: "1vw", color: "#4A5568" }}>HTTPS — Frontend + API</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.3vw", fontWeight: 600, color: "#0A1628" }}>:5000</div>
                <div style={{ fontSize: "1vw", color: "#4A5568" }}>API (interno, não expor)</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.3vw", fontWeight: 600, color: "#0A1628" }}>:5432</div>
                <div style={{ fontSize: "1vw", color: "#4A5568" }}>PostgreSQL (interno apenas)</div>
              </div>
            </div>
          </div>

          {/* Domain */}
          <div style={{ backgroundColor: "#0A1628", padding: "3vh 2.5vw", color: "#FFFFFF" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.5vh" }}>Domínio</div>
            <div style={{ fontSize: "1.1vw", color: "#E2E8F0", lineHeight: 1.6 }}>
              Um domínio é <strong>obrigatório</strong> para que o Clerk (autenticação) funcione corretamente em produção. Configure o DNS para apontar para o IP do servidor antes de iniciar a instalação.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", right: "5vw", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0" }}>Pré-requisitos / Guia de Implantação</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#0A1628", fontWeight: 600 }}>03</div>
      </div>
    </div>
  );
}
