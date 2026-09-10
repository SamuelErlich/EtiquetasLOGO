# Logo nas Etiquetas — Next.js + Vercel

Aplicação web para personalizar etiquetas de e-commerce diretamente no navegador.

## Recursos

- Upload de um ou vários PDFs ao mesmo tempo.
- PDFs multipágina.
- União automática dos PDFs selecionados em uma única sequência de etiquetas.
- Upload de logo PNG/JPG.
- Arrastar e redimensionar a logo visualmente.
- Girar a logo entre -180° e 180° e atalhos de 90°.
- Ajustar opacidade.
- Inserir texto personalizado e arrastá-lo na prévia.
- Ajustar tamanho do texto.
- Opção **Aplicar em todas as etiquetas** para padronizar todas as páginas carregadas.
- Modo individual para aplicar somente na página que está sendo visualizada.
- Salvar configuração no navegador.
- Gerar PDF final.
- Imprimir pelo navegador.
- Processamento local: os PDFs não precisam ser enviados para um servidor.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Publicar na Vercel

1. Suba este projeto para um repositório no GitHub.
2. Na Vercel, clique em **Add New → Project**.
3. Importe o repositório.
4. A Vercel detectará Next.js automaticamente.
5. Clique em **Deploy**.

Também pode usar a CLI:

```bash
npm install
npm run build
npx vercel --prod
```

## Observação sobre impressão

A impressão usa a janela padrão do navegador. Para etiquetas térmicas 100×150 mm, configure o tamanho de papel correto no driver da impressora e use escala 100%/tamanho real quando necessário.
