export default function Slide5ApiServer() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#FFFFFF", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", padding: "5vh 5vw", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4.5vh" }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: "-1vw", top: "1.5vh", width: "18vw", height: "3vh", backgroundColor: "#0A1628", opacity: 0.08, zIndex: 0 }} />
          <h2 style={{ fontSize: "3.2vw", fontWeight: 900, color: "#0A1628", margin: 0, lineHeight: 1, letterSpacing: "-0.03em", position: "relative", zIndex: 1 }}>
            Passo 2 — API Server
          </h2>
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0" }}>Node.js + Express</div>
      </div>

      <div style={{ display: "flex", gap: "3vw", flex: 1 }}>
        {/* Left: commands */}
        <div style={{ flex: 1.3, display: "flex", flexDirection: "column", gap: "2vh" }}>
          <div style={{ display: "flex", gap: "1.5vw" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1vw", color: "#A0AEC0", fontWeight: 600, minWidth: "2vw" }}>1</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1vw", fontWeight: 700, color: "#0A1628", marginBottom: "0.6vh" }}>Copiar os arquivos para o servidor</div>
              <div style={{ backgroundColor: "#0A1628", padding: "1.2vh 1.5vw", fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", lineHeight: 1.8 }}>
                <div>scp -r ./artifacts/api-server usuario@servidor:/opt/romaneios/</div>
                <div>scp -r ./lib usuario@servidor:/opt/romaneios/</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1.5vw" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1vw", color: "#A0AEC0", fontWeight: 600, minWidth: "2vw" }}>2</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1vw", fontWeight: 700, color: "#0A1628", marginBottom: "0.6vh" }}>Instalar dependências e build</div>
              <div style={{ backgroundColor: "#0A1628", padding: "1.2vh 1.5vw", fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", lineHeight: 1.8 }}>
                <div>cd /opt/romaneios</div>
                <div>pnpm install</div>
                <div>pnpm --filter @workspace/api-server run build</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1.5vw" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1vw", color: "#A0AEC0", fontWeight: 600, minWidth: "2vw" }}>3</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1vw", fontWeight: 700, color: "#0A1628", marginBottom: "0.6vh" }}>Executar com PM2 (processo persistente)</div>
              <div style={{ backgroundColor: "#0A1628", padding: "1.2vh 1.5vw", fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", lineHeight: 1.8 }}>
                <div>npm install -g pm2</div>
                <div>pm2 start dist/index.js --name romaneios-api</div>
                <div>pm2 save &amp;&amp; pm2 startup</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: PM2 info + test */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2vh" }}>
          <div style={{ backgroundColor: "#0A1628", padding: "3vh 2.5vw", color: "#FFFFFF", flex: 1 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", marginBottom: "1.5vh" }}>POR QUE PM2?</div>
            <div style={{ fontSize: "1vw", color: "#E2E8F0", lineHeight: 1.7 }}>
              O PM2 garante que a API reinicie automaticamente após uma queda ou reinicialização do servidor. Substitui a necessidade de um serviço systemd manual.
            </div>
            <div style={{ marginTop: "2vh", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.5vh" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", marginBottom: "0.8vh" }}>MONITORAR LOGS</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", backgroundColor: "rgba(255,255,255,0.07)", padding: "1vh 1vw" }}>
                pm2 logs romaneios-api
              </div>
            </div>
          </div>

          <div style={{ border: "1px solid #E2E8F0", padding: "2vh 2.5vw", backgroundColor: "#F7FAFC" }}>
            <div style={{ fontSize: "0.85vw", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#718096", marginBottom: "1vh" }}>Verificar se está rodando</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#0A1628", backgroundColor: "#FFFFFF", padding: "1vh 1vw", border: "1px solid #E2E8F0" }}>
              curl http://localhost:5000/api/healthz
            </div>
            <div style={{ marginTop: "1vh", fontSize: "0.9vw", color: "#4A5568" }}>Deve retornar: <strong style={{ color: "#0A1628" }}>200 OK</strong></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", right: "5vw", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0" }}>API Server / Guia de Implantação</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#0A1628", fontWeight: 600 }}>05</div>
      </div>
    </div>
  );
}
