# Logo nas Etiquetas — Next.js + Vercel

Aplicação web para personalizar etiquetas de e-commerce diretamente no navegador.

## Recursos

- Upload de um ou vários PDFs ao mesmo tempo.
- PDFs multipágina.
- União automática dos PDFs selecionados em uma única sequência de etiquetas.
- Upload de logo PNG/JPG.
- Selecionar logo ou texto diretamente na etiqueta.
- Excluir o elemento selecionado pela tecla Delete/Backspace ou pelo botão de lixeira.
- Arrastar e redimensionar a logo visualmente.
- Girar a logo entre -180° e 180° e atalhos de 90°.
- Ajustar opacidade.
- Inserir texto personalizado e arrastá-lo na prévia.
- Mini editor de texto com alinhamento à esquerda, centralizado e à direita.
- Ajustar a largura da caixa de texto para controlar o alinhamento.
- Ajustar tamanho do texto.
- Opção **Aplicar em todas as etiquetas** para padronizar todas as páginas carregadas.
- Modo individual para aplicar somente na página que está sendo visualizada.
- Salvar configuração no navegador.
- Gerar PDF final.
- Imprimir pelo navegador.
- Botão destacado **Carregar outro PDF** para iniciar rapidamente um novo lote.
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


## Novidades da versão 4

- Seleção visual de elementos: clique na logo ou no texto para selecionar.
- O elemento selecionado recebe contorno de edição apenas na interface; esse contorno não aparece no PDF final.
- Exclusão por **Delete**, **Backspace**, botão **Excluir** ou lixeira flutuante sobre o elemento.
- Mini editor de texto com alinhamento à esquerda, centralizado e à direita.
- Controle de largura da caixa de texto, mantendo o alinhamento consistente entre a prévia e o PDF final.
- Botão maior e mais visível **Carregar outro PDF**.
- Mantidas rotação independente de logo/texto, fontes, múltiplos PDFs e a opção **Aplicar em todas as etiquetas**.

### Compatibilidade

Configurações salvas nas versões 2 e 3 continuam sendo lidas. Campos novos, como alinhamento e largura da caixa de texto, recebem valores padrão automaticamente.
