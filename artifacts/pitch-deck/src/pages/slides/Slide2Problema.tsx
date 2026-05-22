export default function Slide2Problema() {
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
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Secao 01</div>
            <div style={{ fontSize: "1vw", fontWeight: 600, fontFamily: "monospace" }}>DIAGNOSTICO</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Ref.</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>PRB-01X</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", marginTop: "3vh", marginBottom: "3vh" }}>
          <h2 style={{ fontSize: "3vw", fontWeight: 300, margin: "0 0 4vh 0", letterSpacing: "0.05em" }}>O PROBLEMA</h2>

          {/* Issue rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.8vh" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "2vw", borderBottom: "0.5px solid rgba(255,255,255,0.1)", paddingBottom: "1.8vh" }}>
              <div style={{ fontFamily: "monospace", fontSize: "1vw", color: "#BAE6FD", minWidth: "5vw", opacity: 0.7 }}>ERR-01</div>
              <div style={{ flex: 1, height: "1px", borderBottom: "1px dotted rgba(255,255,255,0.2)" }} />
              <div style={{ fontSize: "1.3vw", fontWeight: 300, maxWidth: "55vw" }}>Romaneios feitos a mao ou em planilhas Excel</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "2vw", borderBottom: "0.5px solid rgba(255,255,255,0.1)", paddingBottom: "1.8vh" }}>
              <div style={{ fontFamily: "monospace", fontSize: "1vw", color: "#BAE6FD", minWidth: "5vw", opacity: 0.7 }}>ERR-02</div>
              <div style={{ flex: 1, height: "1px", borderBottom: "1px dotted rgba(255,255,255,0.2)" }} />
              <div style={{ fontSize: "1.3vw", fontWeight: 300, maxWidth: "55vw" }}>Erros de digitacao causam pacotes perdidos ou mal entregues</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "2vw", borderBottom: "0.5px solid rgba(255,255,255,0.1)", paddingBottom: "1.8vh" }}>
              <div style={{ fontFamily: "monospace", fontSize: "1vw", color: "#BAE6FD", minWidth: "5vw", opacity: 0.7 }}>ERR-03</div>
              <div style={{ flex: 1, height: "1px", borderBottom: "1px dotted rgba(255,255,255,0.2)" }} />
              <div style={{ fontSize: "1.3vw", fontWeight: 300, maxWidth: "55vw" }}>Sem controle de bipagem pre-sorter</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "2vw", borderBottom: "0.5px solid rgba(255,255,255,0.1)", paddingBottom: "1.8vh" }}>
              <div style={{ fontFamily: "monospace", fontSize: "1vw", color: "#BAE6FD", minWidth: "5vw", opacity: 0.7 }}>ERR-04</div>
              <div style={{ flex: 1, height: "1px", borderBottom: "1px dotted rgba(255,255,255,0.2)" }} />
              <div style={{ fontSize: "1.3vw", fontWeight: 300, maxWidth: "55vw" }}>Pagamento de motoristas calculado manualmente</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "2vw" }}>
              <div style={{ fontFamily: "monospace", fontSize: "1vw", color: "#BAE6FD", minWidth: "5vw", opacity: 0.7 }}>ERR-05</div>
              <div style={{ flex: 1, height: "1px", borderBottom: "1px dotted rgba(255,255,255,0.2)" }} />
              <div style={{ fontSize: "1.3vw", fontWeight: 300, maxWidth: "55vw" }}>Sem historico centralizado de entregas</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.2)", paddingTop: "1.5vh" }}>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Impacto</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>OPERACIONAL</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Criticidade</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>ALTA</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Pagina</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>02</div>
          </div>
        </div>
      </div>
    </div>
  );
}
