export default function Slide6Frontend() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#FFFFFF", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", padding: "5vh 5vw", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4.5vh" }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: "-1vw", top: "1.5vh", width: "21vw", height: "3vh", backgroundColor: "#0A1628", opacity: 0.08, zIndex: 0 }} />
          <h2 style={{ fontSize: "3.2vw", fontWeight: 900, color: "#0A1628", margin: 0, lineHeight: 1, letterSpacing: "-0.03em", position: "relative", zIndex: 1 }}>
            Passo 3 — Frontend
          </h2>
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0" }}>React + Nginx</div>
      </div>

      <div style={{ display: "flex", gap: "3vw", flex: 1 }}>
        {/* Left: build + deploy */}
        <div style={{ flex: 1.2, display: "flex", flexDirection: "column", gap: "2vh" }}>
          <div style={{ display: "flex", gap: "1.5vw" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1vw", color: "#A0AEC0", fontWeight: 600, minWidth: "2vw" }}>1</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1vw", fontWeight: 700, color: "#0A1628", marginBottom: "0.6vh" }}>Gerar os arquivos estáticos</div>
              <div style={{ backgroundColor: "#0A1628", padding: "1.2vh 1.5vw", fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", lineHeight: 1.8 }}>
                <div>pnpm --filter @workspace/romaneio run build</div>
                <div style={{ color: "#4A5568" }}># Gera: artifacts/romaneio/dist/</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1.5vw" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1vw", color: "#A0AEC0", fontWeight: 600, minWidth: "2vw" }}>2</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1vw", fontWeight: 700, color: "#0A1628", marginBottom: "0.6vh" }}>Copiar para o Nginx</div>
              <div style={{ backgroundColor: "#0A1628", padding: "1.2vh 1.5vw", fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", lineHeight: 1.8 }}>
                <div>cp -r artifacts/romaneio/dist/* /var/www/romaneios/</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1.5vw" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1vw", color: "#A0AEC0", fontWeight: 600, minWidth: "2vw" }}>3</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1vw", fontWeight: 700, color: "#0A1628", marginBottom: "0.6vh" }}>Configurar Nginx</div>
              <div style={{ backgroundColor: "#0A1628", padding: "1.2vh 1.5vw", fontFamily: "'DM Mono', monospace", fontSize: "0.82vw", color: "#A0AEC0", lineHeight: 1.8 }}>
                <div>server {"{"}</div>
                <div style={{ paddingLeft: "1.5vw" }}>listen 80;</div>
                <div style={{ paddingLeft: "1.5vw" }}>server_name seudominio.com.br;</div>
                <div style={{ paddingLeft: "1.5vw" }}>root /var/www/romaneios;</div>
                <div style={{ paddingLeft: "1.5vw" }}>try_files $uri $uri/ /index.html;</div>
                <div style={{ paddingLeft: "1.5vw" }}>location /api {"{"}</div>
                <div style={{ paddingLeft: "3vw" }}>proxy_pass http://localhost:5000;</div>
                <div style={{ paddingLeft: "1.5vw" }}>{"}"}</div>
                <div>{"}"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: HTTPS + tip */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2vh" }}>
          <div style={{ backgroundColor: "#0A1628", padding: "3vh 2.5vw", color: "#FFFFFF" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#A0AEC0", marginBottom: "1.5vh" }}>HTTPS (obrigatório para Clerk)</div>
            <div style={{ fontSize: "1vw", color: "#E2E8F0", lineHeight: 1.7, marginBottom: "1.5vh" }}>
              Instale um certificado SSL gratuito com Certbot:
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.82vw", color: "#A0AEC0", backgroundColor: "rgba(255,255,255,0.07)", padding: "1vh 1vw", lineHeight: 1.8 }}>
              <div>apt install certbot python3-certbot-nginx</div>
              <div>certbot --nginx -d seudominio.com.br</div>
            </div>
          </div>

          <div style={{ border: "1px solid #E2E8F0", padding: "2.5vh 2.5vw", backgroundColor: "#F7FAFC", flex: 1 }}>
            <div style={{ fontSize: "0.85vw", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#718096", marginBottom: "1.5vh" }}>Reiniciar Nginx</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85vw", color: "#0A1628", backgroundColor: "#FFFFFF", padding: "1vh 1vw", border: "1px solid #E2E8F0", marginBottom: "1.5vh" }}>
              nginx -t &amp;&amp; systemctl reload nginx
            </div>
            <div style={{ fontSize: "0.95vw", color: "#4A5568", lineHeight: 1.6 }}>
              Acesse <strong style={{ color: "#0A1628" }}>https://seudominio.com.br</strong> no navegador para confirmar que o frontend está no ar.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", right: "5vw", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#A0AEC0" }}>Frontend / Guia de Implantação</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9vw", color: "#0A1628", fontWeight: 600 }}>06</div>
      </div>
    </div>
  );
}
