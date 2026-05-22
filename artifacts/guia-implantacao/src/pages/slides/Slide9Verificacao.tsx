export default function Slide9Verificacao() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#0A1628", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", padding: "5vh 5vw", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "5vh" }}>
        <div style={{ fontSize: "1.3vw", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
          Sistema de Romaneios
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0" }}>
          Verificação pós-deploy
        </div>
      </div>

      {/* Hero title */}
      <div style={{ position: "relative", marginBottom: "5vh" }}>
        <div style={{ position: "absolute", left: "-2vw", top: "1vh", width: "35vw", height: "5vh", backgroundColor: "#FFFFFF", opacity: 0.05, zIndex: 0 }} />
        <h2 style={{ fontSize: "5vw", fontWeight: 900, color: "#FFFFFF", margin: 0, lineHeight: 1, letterSpacing: "-0.04em", position: "relative", zIndex: 1 }}>
          Checklist Final
        </h2>
      </div>

      {/* Content */}
      <div style={{ display: "flex", gap: "3vw", flex: 1 }}>
        {/* Checklist */}
        <div style={{ flex: 1.3, display: "flex", flexDirection: "column", gap: "1.8vh" }}>
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "1.8vh" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1vw", color: "#A0AEC0", minWidth: "3vw" }}>01</div>
            <div style={{ flex: 1, fontSize: "1.1vw", color: "#E2E8F0" }}>Acessar o domínio no navegador — tela de login aparece</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8vw", color: "#A0AEC0", whiteSpace: "nowrap" }}>Frontend</div>
          </div>
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "1.8vh" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1vw", color: "#A0AEC0", minWidth: "3vw" }}>02</div>
            <div style={{ flex: 1, fontSize: "1.1vw", color: "#E2E8F0" }}>GET /api/healthz retorna 200 OK</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8vw", color: "#A0AEC0", whiteSpace: "nowrap" }}>API</div>
          </div>
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "1.8vh" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1vw", color: "#A0AEC0", minWidth: "3vw" }}>03</div>
            <div style={{ flex: 1, fontSize: "1.1vw", color: "#E2E8F0" }}>Login com e-mail funciona e redireciona para o dashboard</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8vw", color: "#A0AEC0", whiteSpace: "nowrap" }}>Auth</div>
          </div>
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "1.8vh" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1vw", color: "#A0AEC0", minWidth: "3vw" }}>04</div>
            <div style={{ flex: 1, fontSize: "1.1vw", color: "#E2E8F0" }}>Cadastrar um pacote teste e bipar no Pré-Sorter</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8vw", color: "#A0AEC0", whiteSpace: "nowrap" }}>Operação</div>
          </div>
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "1.8vh" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1vw", color: "#A0AEC0", minWidth: "3vw" }}>05</div>
            <div style={{ flex: 1, fontSize: "1.1vw", color: "#E2E8F0" }}>Gerar romaneio PDF e verificar layout do documento</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8vw", color: "#A0AEC0", whiteSpace: "nowrap" }}>PDF</div>
          </div>
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1vw", color: "#A0AEC0", minWidth: "3vw" }}>06</div>
            <div style={{ flex: 1, fontSize: "1.1vw", color: "#E2E8F0" }}>Dashboard mostra estatísticas e motoristas listados</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8vw", color: "#A0AEC0", whiteSpace: "nowrap" }}>Dados</div>
          </div>
        </div>

        {/* Right: support */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2vh" }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.15)", padding: "3vh 2.5vw", flex: 1 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", marginBottom: "2vh" }}>SUPORTE TÉCNICO</div>
            <p style={{ fontSize: "1.3vw", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.4, margin: "0 0 2vh 0" }}>
              Para dúvidas ou ajustes após a implantação, entre em contato com o desenvolvedor.
            </p>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "2vh", display: "flex", flexDirection: "column", gap: "1.2vh" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0" }}>Modalidades de suporte disponíveis:</div>
              <div style={{ fontSize: "0.95vw", color: "#E2E8F0" }}>— Suporte pontual por demanda</div>
              <div style={{ fontSize: "0.95vw", color: "#E2E8F0" }}>— Contrato de manutenção mensal</div>
              <div style={{ fontSize: "0.95vw", color: "#E2E8F0" }}>— Novos módulos e customizações</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", right: "5vw", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "2vh" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0" }}>Verificação / Guia de Implantação</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#FFFFFF", fontWeight: 600 }}>09</div>
      </div>
    </div>
  );
}
