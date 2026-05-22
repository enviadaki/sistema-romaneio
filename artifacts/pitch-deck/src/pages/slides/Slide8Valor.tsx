export default function Slide8Valor() {
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
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Secao 07</div>
            <div style={{ fontSize: "1vw", fontWeight: 600, fontFamily: "monospace" }}>ANALISE DE VALOR</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Ref.</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>VAL-07X</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "2.5vh" }}>
          <h2 style={{ fontSize: "2.8vw", fontWeight: 300, margin: 0, letterSpacing: "0.05em" }}>VALOR DE MERCADO</h2>

          {/* Pricing rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1vh" }}>
            <div style={{ display: "flex", gap: "2vw" }}>
              {/* Tier 1 */}
              <div style={{ flex: 1, border: "1px solid rgba(255,255,255,0.2)", padding: "1.5vh 1.5vw", background: "rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.6, marginBottom: "0.8vh" }}>FREELANCER PLENO (BR)</div>
                <div style={{ fontSize: "2vw", fontWeight: 300, fontFamily: "monospace" }}>R$ 18k – 28k</div>
              </div>
              {/* Tier 2 */}
              <div style={{ flex: 1, border: "1px solid rgba(255,255,255,0.2)", padding: "1.5vh 1.5vw", background: "rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.6, marginBottom: "0.8vh" }}>AGENCIA PEQUENA (BR)</div>
                <div style={{ fontSize: "2vw", fontWeight: 300, fontFamily: "monospace" }}>R$ 35k – 60k</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "2vw" }}>
              {/* Tier 3 */}
              <div style={{ flex: 1, border: "1px solid rgba(255,255,255,0.3)", padding: "1.5vh 1.5vw", background: "rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.8, marginBottom: "0.8vh" }}>SOFTWARE HOUSE (BR)</div>
                <div style={{ fontSize: "2vw", fontWeight: 300, fontFamily: "monospace" }}>R$ 60k – 120k</div>
              </div>
              {/* Tier 4 */}
              <div style={{ flex: 1, border: "1px solid rgba(255,255,255,0.2)", padding: "1.5vh 1.5vw", background: "rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.6, marginBottom: "0.8vh" }}>MERCADO INTERNACIONAL</div>
                <div style={{ fontSize: "2vw", fontWeight: 300, fontFamily: "monospace" }}>US$ 15k – 40k</div>
              </div>
            </div>
          </div>

          {/* ROI banner */}
          <div style={{ border: "1px solid rgba(255,255,255,0.4)", padding: "1.8vh 2vw", background: "rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.8, marginBottom: "0.5vh" }}>RETORNO DO INVESTIMENTO</div>
              <div style={{ fontSize: "1.2vw", fontFamily: "monospace" }}>ROI estimado: recuperado em 2 a 4 meses de operacao</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.8, marginBottom: "0.5vh" }}>ECONOMIA DIARIA</div>
              <div style={{ fontSize: "1.2vw", fontFamily: "monospace" }}>Horas de trabalho manual eliminadas</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.2)", paddingTop: "1.5vh" }}>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Base</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>MERCADO 2026</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Tipo</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>SOFTWARE SOB DEMANDA</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Pagina</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>08</div>
          </div>
        </div>
      </div>
    </div>
  );
}
