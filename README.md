# Logo nas Etiquetas — Next.js + Vercel

Aplicação web para personalizar etiquetas de e-commerce diretamente no navegador.

## Versão 0.6.0 — correção do fluxo de impressão

O selo visível no topo deve mostrar **V6 · impressão corrigida**.

### Correções principais

- A prévia e o PDF final agora usam a mesma geometria do PDF.js.
- Corrigido posicionamento em PDFs com **CropBox** diferente da MediaBox.
- Corrigido posicionamento em páginas com origem X/Y diferente de zero.
- Corrigido posicionamento em páginas rotacionadas em **90°, 180° e 270°**.
- Corrigida escala em PDFs com **UserUnit** diferente do padrão.
- Logo e texto são convertidos do espaço visual da prévia para o espaço PDF real página por página.
- O tamanho/aspecto da página atual é atualizado ao navegar entre etiquetas de formatos diferentes.
- Em opacidade 100%, a aplicação não cria transparência PDF desnecessária, melhorando compatibilidade com drivers térmicos.
- PDFs são salvos com `useObjectStreams: false` para maior compatibilidade com leitores/drivers antigos.
- Novo **Modo de compatibilidade máxima de impressão**, ativado por padrão: o PDF final é achatado a 203 DPI, impedindo que drivers que ignoram camadas novas deixem de imprimir logo/texto.
- O botão de impressão agora abre o **PDF final real em uma nova aba**, em vez de tentar imprimir por iframe invisível. Assim é possível conferir exatamente o arquivo que será enviado à impressora.
- Corrigida concorrência de renderização do PDF.js ao trocar páginas rapidamente.
- Ao carregar outro PDF, o documento anterior e tarefas de renderização são encerrados para reduzir inconsistências e uso de memória.
- É possível selecionar novamente o mesmo PDF ou a mesma logo no input, porque o valor do seletor é resetado após a leitura.

### Testes

Incluído `scripts/test-geometry.mjs`, que valida matematicamente a transformação usada para CropBox/origem deslocada, rotação de página, UserUnit e rotação do elemento.

Execute:

```bash
node scripts/test-geometry.mjs
```

## Recursos do editor

- Upload de um ou vários PDFs.
- PDFs multipágina e formatos mistos.
- União automática dos PDFs em uma sequência de etiquetas.
- Logo PNG/JPG.
- Seleção de logo ou texto diretamente na etiqueta.
- Exclusão com Delete/Backspace ou botão de lixeira.
- Arrastar/redimensionar/girar logo.
- Opacidade da logo.
- Texto personalizado arrastável.
- Fontes Helvetica, Times e Courier em variações normal/negrito/itálico.
- Alinhamento de texto à esquerda, centro e direita.
- Largura da caixa de texto.
- Tamanho e rotação do texto.
- Aplicar em todas as etiquetas ou somente na página atual.
- Salvar configuração no navegador.
- Gerar PDF final e abrir para impressão.
- Processamento local no navegador.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Publicar na Vercel

1. Extraia o ZIP V6.
2. Substitua **os arquivos da raiz** do repositório: `app/`, `components/`, `scripts/`, `package.json`, etc.
3. Faça commit e push para a branch conectada à Vercel.
4. Confirme que o novo deployment usa o hash desse novo commit.
5. Abra o site e verifique o selo **V6 · impressão corrigida**.

Exemplo:

```bash
git add -A
git commit -m "Corrige impressão de etiquetas V6"
git push
```

## Impressão térmica

O modo de compatibilidade máxima é recomendado para PDFs provenientes de plataformas diferentes. Ele achata o resultado a **203 DPI**, resolução nativa muito comum em impressoras térmicas de etiquetas, fazendo com que logo, texto e etiqueta original cheguem ao driver como uma única imagem por página.

Se quiser preservar o PDF totalmente vetorial, desative **Compatibilidade máxima de impressão**. A geometria corrigida continua sendo usada no modo vetorial.
