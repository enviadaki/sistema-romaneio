export default function Slide6Stack() {
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
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Secao 05</div>
            <div style={{ fontSize: "1vw", fontWeight: 600, fontFamily: "monospace" }}>ESPECIFICACOES TECNICAS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Ref.</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>TEC-05X</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", gap: "4vw", marginTop: "2.5vh", marginBottom: "2.5vh" }}>
          {/* Left: title + specs */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h2 style={{ fontSize: "2.8vw", fontWeight: 300, margin: "0 0 3vh 0", letterSpacing: "0.05em" }}>STACK TECNOLOGICA</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#BAE6FD", fontFamily: "monospace", minWidth: "10vw" }}>Frontend</div>
                <div style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.25)" }} />
                <div style={{ fontSize: "1.1vw", fontFamily: "monospace", fontWeight: 600 }}>React + Vite + TypeScript</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#BAE6FD", fontFamily: "monospace", minWidth: "10vw" }}>Backend</div>
                <div style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.25)" }} />
                <div style={{ fontSize: "1.1vw", fontFamily: "monospace", fontWeight: 600 }}>Node.js + Express 5</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#BAE6FD", fontFamily: "monospace", minWidth: "10vw" }}>Banco de Dados</div>
                <div style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.25)" }} />
                <div style={{ fontSize: "1.1vw", fontFamily: "monospace", fontWeight: 600 }}>PostgreSQL + Drizzle ORM</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#BAE6FD", fontFamily: "monospace", minWidth: "10vw" }}>Autenticacao</div>
                <div style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.25)" }} />
                <div style={{ fontSize: "1.1vw", fontFamily: "monospace", fontWeight: 600 }}>Clerk (producao segura)</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#BAE6FD", fontFamily: "monospace", minWidth: "10vw" }}>Validacao</div>
                <div style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.25)" }} />
                <div style={{ fontSize: "1.1vw", fontFamily: "monospace", fontWeight: 600 }}>Zod · Drizzle-Zod</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#BAE6FD", fontFamily: "monospace", minWidth: "10vw" }}>PDF</div>
                <div style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.25)" }} />
                <div style={{ fontSize: "1.1vw", fontFamily: "monospace", fontWeight: 600 }}>jsPDF + AutoTable</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ fontSize: "0.9vw", color: "#BAE6FD", fontFamily: "monospace", minWidth: "10vw" }}>Deploy</div>
                <div style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.25)" }} />
                <div style={{ fontSize: "1.1vw", fontFamily: "monospace", fontWeight: 600 }}>Nuvem · Dominio proprio</div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: "1px", background: "rgba(255,255,255,0.15)" }} />

          {/* Right: title block */}
          <div style={{ width: "30vw", display: "flex", flexDirection: "column", justifyContent: "center", gap: "2vh" }}>
            <div style={{ border: "1px solid rgba(255,255,255,0.3)", padding: "2vh 1.5vw", background: "rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7, marginBottom: "0.8vh" }}>ARQUITETURA</div>
              <div style={{ fontSize: "1.1vw", fontFamily: "monospace" }}>pnpm Monorepo</div>
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.3)", padding: "2vh 1.5vw", background: "rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7, marginBottom: "0.8vh" }}>TABELAS NO BD</div>
              <div style={{ fontSize: "1.1vw", fontFamily: "monospace" }}>6+ tabelas relacionais</div>
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.3)", padding: "2vh 1.5vw", background: "rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7, marginBottom: "0.8vh" }}>AMBIENTE</div>
              <div style={{ fontSize: "1.1vw", fontFamily: "monospace" }}>Node.js 24 · TS 5.9</div>
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.3)", padding: "2vh 1.5vw", background: "rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: "0.7vw", fontFamily: "monospace", color: "#BAE6FD", opacity: 0.7, marginBottom: "0.8vh" }}>SEGURANCA</div>
              <div style={{ fontSize: "1.1vw", fontFamily: "monospace" }}>Auth + Proxy mTLS</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.2)", paddingTop: "1.5vh" }}>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Revisao</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>PRODUCAO</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Pacotes</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>OPEN SOURCE</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4 }}>Pagina</div>
            <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>06</div>
          </div>
        </div>
      </div>
    </div>
  );
}
