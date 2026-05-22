export default function Slide1Title() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#1B3A5C", fontFamily: "'Inter', sans-serif", color: "#FFFFFF" }}>
      {/* Blueprint grids */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "2vw 2vh" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "10vw 10vh" }} />
      {/* Borders */}
      <div style={{ position: "absolute", top: "3vh", left: "3vw", right: "3vw", bottom: "3vh", border: "1px solid rgba(255,255,255,0.2)" }} />
      <div style={{ position: "absolute", top: "5vh", left: "5vw", right: "5vw", bottom: "5vh", border: "0.5px solid rgba(255,255,255,0.1)" }} />

      <div style={{ padding: "7vh 7vw", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", position: "relative", boxSizing: "border-box" }}>
        {/* Top meta */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Documento</div>
            <div style={{ fontSize: "1vw", fontWeight: 600, fontFamily: "monospace" }}>SYS-ROM-001</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Data</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>2026-05-22</div>
          </div>
        </div>

        {/* Hero content */}
        <div>
          <div style={{ fontSize: "0.8vw", textTransform: "uppercase", letterSpacing: "0.3em", opacity: 0.5, marginBottom: "1.5vh" }}>
            Projeto
          </div>
          <h1 style={{ fontSize: "6vw", fontWeight: 300, lineHeight: 0.9, margin: 0, letterSpacing: "0.05em" }}>
            SISTEMA DE
          </h1>
          <h1 style={{ fontSize: "6vw", fontWeight: 300, lineHeight: 0.9, margin: 0, letterSpacing: "0.05em" }}>
            ROMANEIOS
          </h1>
          <div style={{ width: "8vw", height: "1px", background: "rgba(255,255,255,0.4)", marginTop: "2vh" }} />
          <p style={{ fontSize: "1.3vw", opacity: 0.65, marginTop: "1.5vh", maxWidth: "42vw", lineHeight: 1.6, fontWeight: 300 }}>
            Software de gestão logística desenvolvido sob medida. Multi-operação · Rastreamento · Pagamentos · PDF Automatizado
          </p>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.2)", paddingTop: "1.5vh" }}>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Desenvolvido por</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>Tecnologia sob demanda</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Operacoes</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>LOGGI · AMAZON · SHOPEE · IMILE</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Versao</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>1.0</div>
          </div>
        </div>
      </div>
    </div>
  );
}
