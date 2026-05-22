export default function Slide3Solucao() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#1B3A5C", fontFamily: "'Inter', sans-serif", color: "#FFFFFF" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "2vw 2vh" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "10vw 10vh" }} />
      <div style={{ position: "absolute", top: "3vh", left: "3vw", right: "3vw", bottom: "3vh", border: "1px solid rgba(255,255,255,0.2)" }} />
      <div style={{ position: "absolute", top: "5vh", left: "5vw", right: "5vw", bottom: "5vh", border: "0.5px solid rgba(255,255,255,0.1)" }} />

      <div style={{ padding: "7vh 7vw", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", position: "relative", boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Secao 02</div>
            <div style={{ fontSize: "1vw", fontWeight: 600, fontFamily: "monospace" }}>ARQUITETURA DA SOLUCAO</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Ref.</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>SOL-02X</div>
          </div>
        </div>

        {/* Content: two columns */}
        <div style={{ flex: 1, display: "flex", gap: "4vw", marginTop: "3vh", marginBottom: "3vh" }}>
          {/* Left: title + subtitle */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h2 style={{ fontSize: "3.5vw", fontWeight: 300, lineHeight: 1.0, margin: "0 0 2vh 0", letterSpacing: "0.05em" }}>A SOLUCAO</h2>
            <div style={{ width: "5vw", height: "1px", background: "rgba(255,255,255,0.4)", marginBottom: "2vh" }} />
            <p style={{ fontSize: "1.3vw", opacity: 0.65, lineHeight: 1.7, fontWeight: 300 }}>
              Sistema web completo, acessivel de qualquer dispositivo. Centraliza toda a operacao logistica em um unico ambiente.
            </p>
            <div style={{ marginTop: "3vh", border: "1px solid rgba(255,255,255,0.25)", padding: "1.5vh 1.5vw", background: "rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7, marginBottom: "0.8vh" }}>STATUS DO SISTEMA</div>
              <div style={{ fontSize: "1.1vw", fontFamily: "monospace" }}>EM PRODUCAO · DISPONIVEL</div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: "1px", background: "rgba(255,255,255,0.15)" }} />

          {/* Right: capabilities list */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "1.5vh" }}>
            <div style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "1.2vh 1.2vw", background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7 }}>CAP-01</div>
              <div style={{ fontSize: "1.2vw", marginTop: "0.4vh" }}>Cadastro e rastreamento de pacotes por operacao</div>
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "1.2vh 1.2vw", background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7 }}>CAP-02</div>
              <div style={{ fontSize: "1.2vw", marginTop: "0.4vh" }}>Bipagem em tempo real com confirmacao sonora</div>
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "1.2vh 1.2vw", background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7 }}>CAP-03</div>
              <div style={{ fontSize: "1.2vw", marginTop: "0.4vh" }}>Geracao automatica de PDF profissional</div>
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "1.2vh 1.2vw", background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7 }}>CAP-04</div>
              <div style={{ fontSize: "1.2vw", marginTop: "0.4vh" }}>Controle financeiro integrado de motoristas</div>
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "1.2vh 1.2vw", background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7 }}>CAP-05</div>
              <div style={{ fontSize: "1.2vw", marginTop: "0.4vh" }}>Multi-operacao: LOGGI · AMAZON · SHOPEE · IMILE</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.2)", paddingTop: "1.5vh" }}>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Tipo</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>WEB APP</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Acesso</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>QUALQUER DISPOSITIVO</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Pagina</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>03</div>
          </div>
        </div>
      </div>
    </div>
  );
}
