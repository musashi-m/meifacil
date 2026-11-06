# 🚀 Facilita MEI - Emissor Rápido de Guias DAS & Central NFS-e Nacional

Solução completa desenvolvida para facilitar a rotina de emissão de guias do MEI (DAS) e emissão de notas no Portal da NFS-e Nacional da Receita Federal:
1. **Extensão para Navegador (Chrome / Edge / Brave)**: Preenche o CNPJ com 1 clique direto no site oficial do PGMEI e preenche login/senha automaticamente no **Portal da NFS-e Nacional (`nfse.gov.br`)**.
2. **Web App / PWA (Celular e PC)**: Painel completo para acompanhar o mês, copiar CNPJ, guardar senhas da NFS-e de forma segura, disparar mensagem de WhatsApp para o cliente com PDF anexado, Pix e Código de Barras.

---

## 💻 1. Como instalar a Extensão no Computador (Chrome / Edge / Brave)

Leva menos de 1 minuto e não precisa instalar nada de loja:

1. Abra seu navegador (Chrome, Edge, Brave, Opera, etc.).
2. Acesse a tela de extensões:
   - No Chrome: digite `chrome://extensions` na barra de endereços.
   - No Edge: digite `edge://extensions`.
3. No canto superior direito, ative a chave **"Modo do desenvolvedor"** (Developer mode).
4. Clique no botão **"Carregar sem compactação"** (ou *Load unpacked*).
5. Selecione a pasta `extension` (localizada dentro de `c:\Users\Vinicius\Downloads\EI\extension`).
6. Pronto! O ícone verde do **Facilita MEI** vai aparecer na barra de ferramentas do seu navegador (dica: clique no ícone de "quebra-cabeça" das extensões e fixe o Facilita MEI).

### Como usar a extensão no dia a dia:
* **Cadastrar MEIs**: Clique no ícone da extensão -> Aba **"Cadastrar"** -> Digite o CNPJ. A extensão consulta a Receita Federal (BrasilAPI) e já puxa a Razão Social e Nome Fantasia na hora!
* **Preenchimento Automático**: Quando você abrir a página oficial do [PGMEI da Receita Federal](https://www8.receita.fazenda.gov.br/simplesnacional/aplicacoes/atspo/pgmei.app/identificacao), vai aparecer um widget flutuante no canto da tela com a sua lista de MEIs.
* Basta dar **1 clique no nome do cliente** e o CNPJ é colado no campo automaticamente, já focando no botão de continuar!

---

## 📱 2. Como usar o Web App no Celular (ou PC)

O Web App foi desenhado pensando na facilidade no celular:

### Testar localmente no computador:
* Abra o terminal na pasta e execute:
  ```bash
  npm start
  ```
  Ou simplesmente abra o arquivo `webapp/index.html` no seu navegador!

### Usar no Celular (PWA):
1. Você pode hospedar a pasta `webapp` gratuitamente em 1 clique em serviços como **Vercel**, **Netlify Drop** (só arrastar a pasta `webapp` no site [app.netlify.com/drop](https://app.netlify.com/drop)), **Cloudflare Pages** ou **GitHub Pages**.
2. Ao abrir o link no seu celular (Chrome no Android ou Safari no iPhone):
   - Toque no menu do navegador (3 pontinhos ou botão de compartilhar).
   - Escolha **"Adicionar à tela de início"** ou **"Instalar aplicativo"**.
3. O Facilita MEI vai virar um aplicativo com ícone na tela do seu celular!

### Recursos do Web App:
* ⚡ **Botão "Emitir no PGMEI"**: Copia o CNPJ para a área de transferência com 1 toque, marca o status daquele cliente como "Emitido" no mês e abre o portal da Receita Federal.
* 📎 **Anexo de Guia (PDF) & Compartilhamento Nativo**: Permite anexar o PDF do DAS gerado. No celular (Android / iOS), ao clicar em WhatsApp, o sistema aciona o compartilhamento nativo já com o **arquivo PDF anexado** na conversa!
* 🔑 **Pix Copia e Cola & Código de Barras**: Campos para colar o Pix e o código de barras com 1 toque. No card do cliente, aparecem botões rápidos para copiar o Pix na hora, e na mensagem do WhatsApp eles vão formatados prontos para o cliente pagar no app do banco.
* 💬 **Botão "WhatsApp Inteligente"**: Envia a mensagem completa com o mês de competência, Pix, código de barras e o arquivo anexo.
* 📅 **Controle do Mês**: Indicador visual de quem está **Pendente**, **Emitido** ou **Pago** na competência atual.
* 🔍 **Busca Automática de CNPJ**: Digitou os 14 números do CNPJ, ele preenche a Razão Social e situação cadastral sozinho.

---

## 🔄 3. Sincronização entre o Computador e o Celular

Os dados são 100% compatíveis:
1. Cadastrou no computador pela extensão? Vá na aba **"Sincronizar"** e clique em **"Exportar Backup (.json)"**.
2. Abra o Web App no celular (ou envie o arquivinho `.json` pro seu WhatsApp), clique no ícone de sincronizar no topo e escolha **"Importar Backup"**.
3. Todos os seus clientes vão aparecer no celular instantaneamente!

