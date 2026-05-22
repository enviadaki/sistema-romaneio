export default function Slide1Capa() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#FFFFFF", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", padding: "5vh 5vw" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: "1.5vw", fontWeight: 800, color: "#0A1628", letterSpacing: "-0.02em" }}>
          Sistema de Romaneios
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#4A5568", display: "flex", flexDirection: "column", gap: "1vh", textAlign: "right" }}>
          <div><span style={{ color: "#A0AEC0", marginRight: "1vw" }}>Documento:</span>Guia de Implantação</div>
          <div><span style={{ color: "#A0AEC0", marginRight: "1vw" }}>Versão:</span>1.0</div>
          <div><span style={{ color: "#A0AEC0", marginRight: "1vw" }}>Data:</span>2026-05-22</div>
          <div><span style={{ color: "#A0AEC0", marginRight: "1vw" }}>Status:</span>Confidencial</div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ position: "absolute", bottom: "14vh", left: "5vw", width: "90vw" }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: "-2vw", top: "2vh", width: "32vw", height: "5vh", backgroundColor: "#0A1628", opacity: 0.08, zIndex: 0 }} />
          <h1 style={{ fontSize: "7vw", fontWeight: 900, color: "#0A1628", margin: 0, lineHeight: 1, letterSpacing: "-0.04em", position: "relative", zIndex: 1 }}>
            Guia de Implantação
          </h1>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "5vh" }}>
          <p style={{ fontSize: "1.7vw", fontWeight: 500, color: "#4A5568", margin: 0, maxWidth: "52vw", lineHeight: 1.4 }}>
            Manual técnico completo para instalação do Sistema de Romaneios no servidor do cliente.
          </p>
          <div style={{ width: "28vw", height: "1px", backgroundColor: "#E2E8F0" }} />
        </div>
      </div>
    </div>
  );
}
