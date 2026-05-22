export default function Slide5Dados() {
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
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Secao 04</div>
            <div style={{ fontSize: "1vw", fontWeight: 600, fontFamily: "monospace" }}>DADOS DE REFERENCIA</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Ref.</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>DAT-04X</div>
          </div>
        </div>

        {/* Big stats */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "2vh" }}>
          <p style={{ fontSize: "1.1vw", opacity: 0.5, margin: "0 0 1vh 0", fontWeight: 300, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace" }}>Dados reais ja integrados ao sistema</p>

          <div style={{ display: "flex", gap: "2vw" }}>
            {/* Stat 1 */}
            <div style={{ flex: 1, border: "1px solid rgba(255,255,255,0.3)", padding: "2.5vh 2vw", background: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7, marginBottom: "1vh" }}>CIDADES CADASTRADAS</div>
              <div style={{ fontSize: "7vw", fontWeight: 300, lineHeight: 1, fontFamily: "monospace" }}>74</div>
              <div style={{ borderTop: "1px dashed rgba(255,255,255,0.2)", paddingTop: "1vh", marginTop: "1vh", fontSize: "0.9vw", opacity: 0.55 }}>Sudoeste da Bahia</div>
            </div>
            {/* Stat 2 */}
            <div style={{ flex: 1, border: "1px solid rgba(255,255,255,0.3)", padding: "2.5vh 2vw", background: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7, marginBottom: "1vh" }}>MOTORISTAS</div>
              <div style={{ fontSize: "7vw", fontWeight: 300, lineHeight: 1, fontFamily: "monospace" }}>21</div>
              <div style={{ borderTop: "1px dashed rgba(255,255,255,0.2)", paddingTop: "1vh", marginTop: "1vh", fontSize: "0.9vw", opacity: 0.55 }}>Com contato e calculo por km</div>
            </div>
            {/* Stat 3 */}
            <div style={{ flex: 1, border: "1px solid rgba(255,255,255,0.3)", padding: "2.5vh 2vw", background: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7, marginBottom: "1vh" }}>OPERACOES ATIVAS</div>
              <div style={{ fontSize: "7vw", fontWeight: 300, lineHeight: 1, fontFamily: "monospace" }}>04</div>
              <div style={{ borderTop: "1px dashed rgba(255,255,255,0.2)", paddingTop: "1vh", marginTop: "1vh", fontSize: "0.9vw", opacity: 0.55 }}>LOGGI · AMAZON · SHOPEE · IMILE</div>
            </div>
          </div>

          {/* Detail row */}
          <div style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "1.5vh 2vw", background: "rgba(255,255,255,0.02)", display: "flex", gap: "3vw" }}>
            <div>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.6, marginBottom: "0.4vh" }}>CONFERENTES</div>
              <div style={{ fontSize: "1.1vw", fontFamily: "monospace" }}>10 cadastrados</div>
            </div>
            <div style={{ width: "1px", background: "rgba(255,255,255,0.15)" }} />
            <div>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.6, marginBottom: "0.4vh" }}>SEED AUTOMATICO</div>
              <div style={{ fontSize: "1.1vw", fontFamily: "monospace" }}>Populado na primeira inicializacao</div>
            </div>
            <div style={{ width: "1px", background: "rgba(255,255,255,0.15)" }} />
            <div>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.6, marginBottom: "0.4vh" }}>REGIAO</div>
              <div style={{ fontSize: "1.1vw", fontFamily: "monospace" }}>Sudoeste e Sul da Bahia</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.2)", paddingTop: "1.5vh" }}>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Fonte</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>DADOS REAIS</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Sincronizacao</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>AUTOMATICA</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Pagina</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>05</div>
          </div>
        </div>
      </div>
    </div>
  );
}
