export default function Slide4Funcionalidades() {
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
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Secao 03</div>
            <div style={{ fontSize: "1vw", fontWeight: 600, fontFamily: "monospace" }}>MODULOS DO SISTEMA</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Ref.</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>FNC-03X</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, marginTop: "2.5vh", marginBottom: "2.5vh" }}>
          <h2 style={{ fontSize: "2.8vw", fontWeight: 300, margin: "0 0 3vh 0", letterSpacing: "0.05em" }}>FUNCIONALIDADES</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5vw" }}>
            {/* Card 1 */}
            <div style={{ border: "1px solid rgba(255,255,255,0.25)", padding: "2vh 1.5vw", background: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column", gap: "0.8vh" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7, letterSpacing: "0.1em" }}>MOD-01 · CADASTRO</div>
              <div style={{ width: "2vw", height: "1px", background: "rgba(255,255,255,0.3)" }} />
              <div style={{ fontSize: "1.1vw", lineHeight: 1.5, fontWeight: 300 }}>Registro de pacotes por operacao. Importacao em lote via CSV/XLSX.</div>
            </div>
            {/* Card 2 */}
            <div style={{ border: "1px solid rgba(255,255,255,0.25)", padding: "2vh 1.5vw", background: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column", gap: "0.8vh" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7, letterSpacing: "0.1em" }}>MOD-02 · PRE-SORTER</div>
              <div style={{ width: "2vw", height: "1px", background: "rgba(255,255,255,0.3)" }} />
              <div style={{ fontSize: "1.1vw", lineHeight: 1.5, fontWeight: 300 }}>Bipagem de pacotes com sons industriais. Filtro por rota ou cidade.</div>
            </div>
            {/* Card 3 */}
            <div style={{ border: "1px solid rgba(255,255,255,0.25)", padding: "2vh 1.5vw", background: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column", gap: "0.8vh" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7, letterSpacing: "0.1em" }}>MOD-03 · ROMANEIO PDF</div>
              <div style={{ width: "2vw", height: "1px", background: "rgba(255,255,255,0.3)" }} />
              <div style={{ fontSize: "1.1vw", lineHeight: 1.5, fontWeight: 300 }}>Geracao de PDF landscape A4 com layout profissional e assinaturas.</div>
            </div>
            {/* Card 4 */}
            <div style={{ border: "1px solid rgba(255,255,255,0.25)", padding: "2vh 1.5vw", background: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column", gap: "0.8vh" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7, letterSpacing: "0.1em" }}>MOD-04 · FINANCEIRO</div>
              <div style={{ width: "2vw", height: "1px", background: "rgba(255,255,255,0.3)" }} />
              <div style={{ fontSize: "1.1vw", lineHeight: 1.5, fontWeight: 300 }}>Status ABERTO → ENTREGUE → PAGO. Calculo km × valor/km.</div>
            </div>
            {/* Card 5 */}
            <div style={{ border: "1px solid rgba(255,255,255,0.25)", padding: "2vh 1.5vw", background: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column", gap: "0.8vh" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7, letterSpacing: "0.1em" }}>MOD-05 · DASHBOARD</div>
              <div style={{ width: "2vw", height: "1px", background: "rgba(255,255,255,0.3)" }} />
              <div style={{ fontSize: "1.1vw", lineHeight: 1.5, fontWeight: 300 }}>Estatisticas em tempo real. Pacotes, bipagens, operadores, rotas.</div>
            </div>
            {/* Card 6 */}
            <div style={{ border: "1px solid rgba(255,255,255,0.25)", padding: "2vh 1.5vw", background: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column", gap: "0.8vh" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7, letterSpacing: "0.1em" }}>MOD-06 · HISTORICO</div>
              <div style={{ width: "2vw", height: "1px", background: "rgba(255,255,255,0.3)" }} />
              <div style={{ fontSize: "1.1vw", lineHeight: 1.5, fontWeight: 300 }}>Listagem de scans com filtros por data, cidade e operador.</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.2)", paddingTop: "1.5vh" }}>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Modulos</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>06 ATIVOS</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Status</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>PRODUCAO</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Pagina</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>04</div>
          </div>
        </div>
      </div>
    </div>
  );
}
