export default function Slide9Contato() {
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
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Secao 08</div>
            <div style={{ fontSize: "1vw", fontWeight: 600, fontFamily: "monospace" }}>PROXIMOS PASSOS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Ref.</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>END-08X</div>
          </div>
        </div>

        {/* Content: centered */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          {/* Circle emblem */}
          <div style={{ width: "12vw", height: "12vw", border: "1px solid rgba(255,255,255,0.35)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4vh", position: "relative" }}>
            <div style={{ position: "absolute", inset: "-0.8vw", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: "50%" }} />
            <div style={{ width: "7vw", height: "7vw", border: "2px solid rgba(255,255,255,0.7)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "2.5vw", fontWeight: 300 }}>&gt;_</div>
            </div>
          </div>

          <h1 style={{ fontSize: "4vw", fontWeight: 300, margin: 0, letterSpacing: "0.1em" }}>VAMOS CONVERSAR?</h1>
          <div style={{ width: "10vw", height: "1px", background: "rgba(255,255,255,0.4)", margin: "2.5vh 0" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh", marginBottom: "3.5vh" }}>
            <p style={{ fontSize: "1.3vw", opacity: 0.65, fontWeight: 300, margin: 0 }}>Adaptamos o sistema para a sua operacao</p>
            <p style={{ fontSize: "1.3vw", opacity: 0.65, fontWeight: 300, margin: 0 }}>Novos modulos, integracoes e customizacoes</p>
            <p style={{ fontSize: "1.3vw", opacity: 0.65, fontWeight: 300, margin: 0 }}>Suporte tecnico e evolucao continua</p>
          </div>

          {/* Contact boxes */}
          <div style={{ display: "flex", gap: "2vw" }}>
            <div style={{ border: "1px solid rgba(255,255,255,0.35)", padding: "1.5vh 3vw", background: "rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.5, marginBottom: "0.8vh" }}>Sistema disponivel em</div>
              <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>Producao · Nuvem · 24/7</div>
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "1.5vh 3vw", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.5, marginBottom: "0.8vh" }}>Demonstracao</div>
              <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>Ao vivo · Qualquer dispositivo</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.2)", paddingTop: "1.5vh" }}>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Status</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>PRONTO PARA ENTREGA</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Documento</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>SYS-ROM-001 · FIM</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Pagina</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>09</div>
          </div>
        </div>
      </div>
    </div>
  );
}
