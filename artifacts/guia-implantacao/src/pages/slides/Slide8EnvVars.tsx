export default function Slide8EnvVars() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#FFFFFF", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", padding: "5vh 5vw", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4vh" }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: "-1vw", top: "1.5vh", width: "25vw", height: "3vh", backgroundColor: "#0A1628", opacity: 0.08, zIndex: 0 }} />
          <h2 style={{ fontSize: "3.2vw", fontWeight: 900, color: "#0A1628", margin: 0, lineHeight: 1, letterSpacing: "-0.03em", position: "relative", zIndex: 1 }}>
            Variáveis de Ambiente
          </h2>
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0" }}>Arquivo .env</div>
      </div>

      <div style={{ display: "flex", gap: "3vw", flex: 1 }}>
        {/* Left: API env file */}
        <div style={{ flex: 1.2, display: "flex", flexDirection: "column", gap: "2vh" }}>
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.2vh" }}>
              artifacts/api-server/.env
            </div>
            <div style={{ backgroundColor: "#0A1628", padding: "2vh 2vw", fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", lineHeight: 2 }}>
              <div><span style={{ color: "#718096" }}># Banco de dados</span></div>
              <div>DATABASE_URL=postgresql://app:SENHA@localhost:5432/romaneios</div>
              <div style={{ marginTop: "0.5vh" }}><span style={{ color: "#718096" }}># Clerk — chave secreta (backend)</span></div>
              <div>CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxx</div>
              <div style={{ marginTop: "0.5vh" }}><span style={{ color: "#718096" }}># Sessão</span></div>
              <div>SESSION_SECRET=string_aleatoria_longa_e_segura</div>
              <div style={{ marginTop: "0.5vh" }}><span style={{ color: "#718096" }}># Ambiente</span></div>
              <div>NODE_ENV=production</div>
              <div>PORT=5000</div>
            </div>
          </div>

          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.2vh" }}>
              artifacts/romaneio/.env (build)
            </div>
            <div style={{ backgroundColor: "#F7FAFC", border: "1px solid #E2E8F0", padding: "2vh 2vw", fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#4A5568", lineHeight: 2 }}>
              <div><span style={{ color: "#A0AEC0" }}># Clerk — chave pública (frontend)</span></div>
              <div style={{ color: "#0A1628" }}>VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxx</div>
            </div>
          </div>
        </div>

        {/* Right: notes */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2vh" }}>
          <div style={{ backgroundColor: "#0A1628", padding: "3vh 2.5vw", color: "#FFFFFF" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", marginBottom: "2vh" }}>GERAR SESSION_SECRET</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.82vw", color: "#A0AEC0", backgroundColor: "rgba(255,255,255,0.07)", padding: "1vh 1vw", lineHeight: 1.8 }}>
              openssl rand -base64 48
            </div>
            <div style={{ marginTop: "1.5vh", fontSize: "0.9vw", color: "#E2E8F0", lineHeight: 1.6 }}>
              Use o comando acima para gerar uma string segura. Nunca reutilize o valor do ambiente de desenvolvimento.
            </div>
          </div>

          <div style={{ border: "1px solid #E2E8F0", padding: "2.5vh 2.5vw", backgroundColor: "#F7FAFC" }}>
            <div style={{ fontSize: "0.85vw", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#718096", marginBottom: "1.5vh" }}>Segurança</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
              <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
                <div style={{ color: "#0A1628", fontWeight: 700, fontSize: "1.1vw", marginTop: "-0.2vh" }}>—</div>
                <div style={{ fontSize: "0.95vw", color: "#4A5568" }}>Nunca commitar o .env no Git</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
                <div style={{ color: "#0A1628", fontWeight: 700, fontSize: "1.1vw", marginTop: "-0.2vh" }}>—</div>
                <div style={{ fontSize: "0.95vw", color: "#4A5568" }}>Permissão do arquivo: chmod 600 .env</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
                <div style={{ color: "#0A1628", fontWeight: 700, fontSize: "1.1vw", marginTop: "-0.2vh" }}>—</div>
                <div style={{ fontSize: "0.95vw", color: "#4A5568" }}>Trocar SESSION_SECRET ao migrar</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
                <div style={{ color: "#0A1628", fontWeight: 700, fontSize: "1.1vw", marginTop: "-0.2vh" }}>—</div>
                <div style={{ fontSize: "0.95vw", color: "#4A5568" }}>Chave sk_live_ nunca vai para o frontend</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", right: "5vw", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0" }}>Variáveis de Ambiente / Guia de Implantação</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#0A1628", fontWeight: 600 }}>08</div>
      </div>
    </div>
  );
}
