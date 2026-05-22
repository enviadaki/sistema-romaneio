export default function Slide7Clerk() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#FFFFFF", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", padding: "5vh 5vw", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4.5vh" }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: "-1vw", top: "1.5vh", width: "22vw", height: "3vh", backgroundColor: "#0A1628", opacity: 0.08, zIndex: 0 }} />
          <h2 style={{ fontSize: "3.2vw", fontWeight: 900, color: "#0A1628", margin: 0, lineHeight: 1, letterSpacing: "-0.03em", position: "relative", zIndex: 1 }}>
            Passo 4 — Autenticação
          </h2>
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0" }}>Clerk</div>
      </div>

      <div style={{ display: "flex", gap: "3vw", flex: 1 }}>
        {/* Left: steps */}
        <div style={{ flex: 1.2, display: "flex", flexDirection: "column", gap: "2.2vh" }}>
          <div style={{ display: "flex", gap: "1.5vw" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1vw", color: "#A0AEC0", fontWeight: 600, minWidth: "2vw" }}>1</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1vw", fontWeight: 700, color: "#0A1628", marginBottom: "0.4vh" }}>Criar conta gratuita no Clerk</div>
              <div style={{ fontSize: "0.95vw", color: "#4A5568" }}>Acesse clerk.com e crie uma conta no nome do cliente. O plano gratuito suporta até 10.000 usuários/mês.</div>
            </div>
          </div>

          <div style={{ width: "100%", height: "1px", backgroundColor: "#E2E8F0" }} />

          <div style={{ display: "flex", gap: "1.5vw" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1vw", color: "#A0AEC0", fontWeight: 600, minWidth: "2vw" }}>2</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1vw", fontWeight: 700, color: "#0A1628", marginBottom: "0.4vh" }}>Criar nova Application</div>
              <div style={{ fontSize: "0.95vw", color: "#4A5568" }}>No painel Clerk, crie uma Application com o nome do sistema. Escolha "Email" como método de login.</div>
            </div>
          </div>

          <div style={{ width: "100%", height: "1px", backgroundColor: "#E2E8F0" }} />

          <div style={{ display: "flex", gap: "1.5vw" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1vw", color: "#A0AEC0", fontWeight: 600, minWidth: "2vw" }}>3</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1vw", fontWeight: 700, color: "#0A1628", marginBottom: "0.4vh" }}>Configurar domínio</div>
              <div style={{ fontSize: "0.95vw", color: "#4A5568" }}>Em Settings → Domains, adicione o domínio do cliente (ex: seudominio.com.br). O Clerk valida via DNS.</div>
            </div>
          </div>

          <div style={{ width: "100%", height: "1px", backgroundColor: "#E2E8F0" }} />

          <div style={{ display: "flex", gap: "1.5vw" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1vw", color: "#A0AEC0", fontWeight: 600, minWidth: "2vw" }}>4</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1vw", fontWeight: 700, color: "#0A1628", marginBottom: "0.4vh" }}>Copiar as chaves de API</div>
              <div style={{ fontSize: "0.95vw", color: "#4A5568" }}>Em API Keys, copie a chave secreta e a chave pública. Elas vão para as variáveis de ambiente da API e do frontend.</div>
            </div>
          </div>
        </div>

        {/* Right: keys box */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2vh" }}>
          <div style={{ backgroundColor: "#0A1628", padding: "3vh 2.5vw", color: "#FFFFFF", flex: 1 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", marginBottom: "2vh" }}>CHAVES NECESSÁRIAS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2vh" }}>
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.82vw", color: "#A0AEC0", marginBottom: "0.5vh" }}>API (backend)</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#FFFFFF", backgroundColor: "rgba(255,255,255,0.07)", padding: "0.8vh 1vw" }}>
                  CLERK_SECRET_KEY=sk_live_...
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.82vw", color: "#A0AEC0", marginBottom: "0.5vh" }}>Frontend (público)</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#FFFFFF", backgroundColor: "rgba(255,255,255,0.07)", padding: "0.8vh 1vw" }}>
                  VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
                </div>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.5vh", fontSize: "0.9vw", color: "#E2E8F0", lineHeight: 1.6 }}>
                Nunca exponha a chave secreta (<strong>sk_live_...</strong>) no frontend ou em repositórios públicos.
              </div>
            </div>
          </div>

          <div style={{ border: "1px solid #E2E8F0", padding: "2vh 2.5vw" }}>
            <div style={{ fontSize: "0.85vw", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#718096", marginBottom: "1vh" }}>Custo</div>
            <div style={{ fontSize: "1.2vw", fontWeight: 800, color: "#0A1628" }}>Gratuito</div>
            <div style={{ fontSize: "0.9vw", color: "#4A5568", marginTop: "0.5vh" }}>até 10.000 MAU (usuários ativos/mês)</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", right: "5vw", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0" }}>Autenticação / Guia de Implantação</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#0A1628", fontWeight: 600 }}>07</div>
      </div>
    </div>
  );
}
