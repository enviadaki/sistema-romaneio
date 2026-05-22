export default function Slide7Tempo() {
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
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Secao 06</div>
            <div style={{ fontSize: "1vw", fontWeight: 600, fontFamily: "monospace" }}>CRONOGRAMA DE ENTREGA</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Ref.</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>TMP-06X</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", gap: "4vw", marginTop: "2.5vh", marginBottom: "2.5vh" }}>
          {/* Left: header + comparison */}
          <div style={{ flex: 1.2, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h2 style={{ fontSize: "2.8vw", fontWeight: 300, margin: "0 0 3vh 0", letterSpacing: "0.05em" }}>TEMPO DE DESENVOLVIMENTO</h2>

            {/* Comparison */}
            <div style={{ display: "flex", gap: "2vw" }}>
              <div style={{ flex: 1, border: "1px solid rgba(255,255,255,0.2)", padding: "2vh 1.5vw", background: "rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.6, marginBottom: "1vh" }}>DEV HUMANO (SOLO)</div>
                <div style={{ fontSize: "4vw", fontWeight: 300, fontFamily: "monospace", lineHeight: 1 }}>3–5</div>
                <div style={{ fontSize: "1.1vw", opacity: 0.6, marginTop: "0.5vh" }}>meses</div>
                <div style={{ borderTop: "1px dashed rgba(255,255,255,0.15)", marginTop: "1.5vh", paddingTop: "1vh", fontSize: "0.85vw", opacity: 0.5 }}>Estimativa de mercado</div>
              </div>
              <div style={{ flex: 1, border: "1px solid rgba(255,255,255,0.4)", padding: "2vh 1.5vw", background: "rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.9, marginBottom: "1vh" }}>COM IA</div>
                <div style={{ fontSize: "4vw", fontWeight: 300, fontFamily: "monospace", lineHeight: 1 }}>dias</div>
                <div style={{ fontSize: "1.1vw", opacity: 0.6, marginTop: "0.5vh" }}>para o mesmo resultado</div>
                <div style={{ borderTop: "1px dashed rgba(255,255,255,0.2)", marginTop: "1.5vh", paddingTop: "1vh", fontSize: "0.85vw", opacity: 0.7, color: "#BAE6FD" }}>Entregue neste projeto</div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: "1px", background: "rgba(255,255,255,0.15)" }} />

          {/* Right: deliverables */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "1.5vh" }}>
            <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.6, letterSpacing: "0.1em", marginBottom: "0.5vh" }}>ENTREGAVEIS</div>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
              <div style={{ fontSize: "0.9vw", color: "#BAE6FD", fontFamily: "monospace", minWidth: "4vw" }}>01</div>
              <div style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.2)" }} />
              <div style={{ fontSize: "1vw" }}>12+ modulos completos</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
              <div style={{ fontSize: "0.9vw", color: "#BAE6FD", fontFamily: "monospace", minWidth: "4vw" }}>02</div>
              <div style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.2)" }} />
              <div style={{ fontSize: "1vw" }}>6+ tabelas relacionais no BD</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
              <div style={{ fontSize: "0.9vw", color: "#BAE6FD", fontFamily: "monospace", minWidth: "4vw" }}>03</div>
              <div style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.2)" }} />
              <div style={{ fontSize: "1vw" }}>API RESTful documentada</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
              <div style={{ fontSize: "0.9vw", color: "#BAE6FD", fontFamily: "monospace", minWidth: "4vw" }}>04</div>
              <div style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.2)" }} />
              <div style={{ fontSize: "1vw" }}>Autenticacao em producao</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
              <div style={{ fontSize: "0.9vw", color: "#BAE6FD", fontFamily: "monospace", minWidth: "4vw" }}>05</div>
              <div style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.2)" }} />
              <div style={{ fontSize: "1vw" }}>Deploy em producao ativo</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
              <div style={{ fontSize: "0.9vw", color: "#BAE6FD", fontFamily: "monospace", minWidth: "4vw" }}>06</div>
              <div style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.2)" }} />
              <div style={{ fontSize: "1vw" }}>Dados reais integrados</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.2)", paddingTop: "1.5vh" }}>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Reducao de prazo</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>90%+</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Disponibilidade</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>IMEDIATA</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Pagina</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>07</div>
          </div>
        </div>
      </div>
    </div>
  );
}
