# Auditoria de bugs — V6

## Causa principal encontrada

A pré-visualização era desenhada pelo PDF.js, que considera a área visível real da página (`view`/CropBox), rotação e `UserUnit`. Já o PDF final usava `page.getWidth()` / `page.getHeight()` do pdf-lib e calculava X/Y diretamente. Em determinados PDFs, esses dois sistemas de coordenadas não representam a mesma área. O resultado era a logo/texto parecerem corretos na tela, mas serem gravados fora da área visível ou em outra orientação no PDF final.

## Correção

A V6 usa a matriz `viewport.transform` do PDF.js e sua inversa para converter cada ponto visual para coordenadas reais do PDF. A transformação é executada individualmente em cada página.

## Compatibilidade de driver

Alguns drivers/visualizadores térmicos podem ter dificuldade com transparência, camadas adicionadas ou estruturas PDF mais novas. A V6 inclui um modo de compatibilidade que rasteriza o PDF final em 203 DPI após aplicar a arte. Isso transforma cada página em uma única camada visual.

## Impressão

O iframe invisível foi removido. O PDF final é aberto numa aba real para que o operador veja o arquivo final antes do comando de impressão.

## Teste geométrico

`scripts/test-geometry.mjs` cobre matrizes equivalentes a páginas rotacionadas, deslocadas e escaladas e verifica que os cantos reconstruídos retornam exatamente à posição visual esperada.
