---
name: Devoluções sem Arco
description: Regra de isolamento entre protocolos de devolução e a integração Arco.
---

A área de protocolos de devolução deve consultar pacotes exclusivamente no cadastro local. Ela não pode chamar, enviar dados, atualizar, depender ou expor controles relacionados ao Arco.

**Why:** O fluxo de devoluções precisa aceitar itens rastreáveis e manuais sem produzir efeitos externos nem alterar o comportamento da integração existente.

**How to apply:** Em qualquer evolução de devoluções, mantenha buscas e gravações dentro do banco local. Itens não encontrados devem virar itens manuais “Sem rastreabilidade”.