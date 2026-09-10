# Logo nas Etiquetas — MVP Vercel

Aplicação web para adicionar uma logo em etiquetas de e-commerce em PDF.

## O que já funciona

- Upload de PDF multipágina.
- Pré-visualização das páginas.
- Upload de logo PNG ou JPG.
- Arrastar a logo livremente sobre a etiqueta.
- Redimensionar pelo canto inferior direito.
- Ajustar X, Y, tamanho e opacidade.
- Salvar a posição no navegador (LocalStorage).
- Aplicar a mesma posição proporcional em todas as páginas.
- Gerar e baixar um novo PDF mantendo o PDF original em formato vetorial.
- Abrir a impressão pelo navegador.
- Processamento do arquivo no navegador; não há banco de dados no MVP.

## Rodar localmente

Requer Node.js 20.9 ou superior.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Publicar na Vercel

1. Crie um repositório no GitHub e envie estes arquivos.
2. Entre na Vercel e selecione **Add New > Project**.
3. Importe o repositório.
4. Framework: **Next.js** (detectado automaticamente).
5. Clique em **Deploy**.

O script `postinstall` copia automaticamente o worker do PDF.js para a pasta `public` durante o deploy.

## Observação sobre impressão

Navegadores não permitem impressão silenciosa universal por segurança. O botão **Imprimir etiquetas** tenta abrir a caixa de impressão do navegador. Configure sua impressora térmica (ex.: 100 x 150 mm / 4x6) no sistema operacional e use escala 100% / margens mínimas ou nenhuma.

## Próximas melhorias recomendadas

- Presets Shopee / Mercado Livre / TikTok Shop.
- Múltiplas logos salvas.
- Zona de segurança para códigos de barras e QR Codes.
- Rotação da logo.
- Modo lote com vários PDFs ao mesmo tempo.
- Detecção automática do tamanho físico da etiqueta em mm.
