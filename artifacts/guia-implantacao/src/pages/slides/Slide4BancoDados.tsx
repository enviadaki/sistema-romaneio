export default function Slide4BancoDados() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#FFFFFF", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", padding: "5vh 5vw", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4.5vh" }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: "-1vw", top: "1.5vh", width: "22vw", height: "3vh", backgroundColor: "#0A1628", opacity: 0.08, zIndex: 0 }} />
          <h2 style={{ fontSize: "3.2vw", fontWeight: 900, color: "#0A1628", margin: 0, lineHeight: 1, letterSpacing: "-0.03em", position: "relative", zIndex: 1 }}>
            Passo 1 — Banco de Dados
          </h2>
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0" }}>PostgreSQL</div>
      </div>

      <div style={{ display: "flex", gap: "3vw", flex: 1 }}>
        {/* Left: steps */}
        <div style={{ flex: 1.2, display: "flex", flexDirection: "column", gap: "2.5vh" }}>
          {/* Step A */}
          <div style={{ display: "flex", gap: "1.5vw" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1vw", color: "#A0AEC0", fontWeight: 600, minWidth: "2vw" }}>A</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#0A1628", marginBottom: "0.8vh" }}>Exportar banco atual (Replit)</div>
              <div style={{ backgroundColor: "#0A1628", padding: "1.5vh 1.5vw", fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0", lineHeight: 1.8 }}>
                pg_dump $DATABASE_URL &gt; backup_romaneios.sql
              </div>
            </div>
          </div>

          {/* Step B */}
          <div style={{ display: "flex", gap: "1.5vw" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1vw", color: "#A0AEC0", fontWeight: 600, minWidth: "2vw" }}>B</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#0A1628", marginBottom: "0.8vh" }}>Criar banco no servidor do cliente</div>
              <div style={{ backgroundColor: "#0A1628", padding: "1.5vh 1.5vw", fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0", lineHeight: 1.8 }}>
                <div>sudo -u postgres psql</div>
                <div>CREATE DATABASE romaneios;</div>
                <div>CREATE USER app WITH PASSWORD 'SENHA_SEGURA';</div>
                <div>GRANT ALL ON DATABASE romaneios TO app;</div>
              </div>
            </div>
          </div>

          {/* Step C */}
          <div style={{ display: "flex", gap: "1.5vw" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1vw", color: "#A0AEC0", fontWeight: 600, minWidth: "2vw" }}>C</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#0A1628", marginBottom: "0.8vh" }}>Importar os dados</div>
              <div style={{ backgroundColor: "#0A1628", padding: "1.5vh 1.5vw", fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0", lineHeight: 1.8 }}>
                psql -U app -d romaneios &lt; backup_romaneios.sql
              </div>
            </div>
          </div>
        </div>

        {/* Right: note box */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2vh" }}>
          <div style={{ border: "1px solid #E2E8F0", backgroundColor: "#F7FAFC", padding: "3vh 2.5vw", flex: 1 }}>
            <div style={{ fontSize: "0.85vw", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#718096", marginBottom: "2vh" }}>DATABASE_URL</div>
            <p style={{ fontSize: "1.1vw", fontWeight: 700, color: "#0A1628", lineHeight: 1.4, margin: "0 0 2vh 0" }}>
              Após criar o banco, gere a connection string e anote:
            </p>
            <div style={{ backgroundColor: "#0A1628", padding: "1.5vh 1.5vw", fontFamily: "'DM Mono', monospace", fontSize: "0.82vw", color: "#A0AEC0", lineHeight: 1.8, wordBreak: "break-all" }}>
              postgresql://app:SENHA@localhost:5432/romaneios
            </div>
            <div style={{ marginTop: "2vh", fontSize: "0.95vw", color: "#4A5568", lineHeight: 1.5 }}>
              Esta string vai para a variável <strong style={{ color: "#0A1628" }}>DATABASE_URL</strong> da API. Mantenha em local seguro.
            </div>
          </div>

          <div style={{ border: "1px solid #E2E8F0", padding: "2vh 2.5vw", backgroundColor: "#FFFBF0" }}>
            <div style={{ fontSize: "0.85vw", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#D69E2E", marginBottom: "1vh" }}>Atenção</div>
            <div style={{ fontSize: "0.95vw", color: "#4A5568", lineHeight: 1.5 }}>
              O seed automático (cidades, motoristas, conferentes) é executado na primeira inicialização da API — não é necessário importar separadamente.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", right: "5vw", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0" }}>Banco de Dados / Guia de Implantação</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#0A1628", fontWeight: 600 }}>04</div>
      </div>
    </div>
  );
}
