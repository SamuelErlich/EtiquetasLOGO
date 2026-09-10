"use client";

import { ChangeEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";

type Placement = {
  x: number;
  y: number;
  width: number;
  opacity: number;
};

type PdfMetrics = {
  width: number;
  height: number;
  pageCount: number;
};

const DEFAULT_PLACEMENT: Placement = {
  x: 0.64,
  y: 0.78,
  width: 0.26,
  opacity: 1,
};

const STORAGE_KEY = "etiqueta-logo-placement-v1";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatMb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function LabelEditor() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoAspect, setLogoAspect] = useState(2.6);
  const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT);
  const [metrics, setMetrics] = useState<PdfMetrics | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Envie um PDF de etiquetas para começar.");
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pdfBytesRef = useRef<ArrayBuffer | null>(null);
  const pdfJsDocRef = useRef<any>(null);
  const dragRef = useRef<null | {
    mode: "move" | "resize";
    startX: number;
    startY: number;
    startPlacement: Placement;
  }>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Placement;
      if (
        typeof saved.x === "number" &&
        typeof saved.y === "number" &&
        typeof saved.width === "number" &&
        typeof saved.opacity === "number"
      ) {
        setPlacement(saved);
      }
    } catch {
      // Ignore invalid local configuration.
    }
  }, []);

  useEffect(() => {
    return () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
    };
  }, [logoUrl]);

  async function loadPdf(file: File) {
    setBusy(true);
    setError("");
    setMessage("Carregando etiquetas...");

    try {
      const bytes = await file.arrayBuffer();
      pdfBytesRef.current = bytes;

      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
      pdfJsDocRef.current = doc;
      const firstPage = await doc.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });

      setPdfFile(file);
      setMetrics({ width: viewport.width, height: viewport.height, pageCount: doc.numPages });
      setPageNumber(1);
      setMessage(`${doc.numPages} etiqueta${doc.numPages === 1 ? "" : "s"} carregada${doc.numPages === 1 ? "" : "s"}.`);
      requestAnimationFrame(() => renderPage(1, doc));
    } catch (err) {
      console.error(err);
      setPdfFile(null);
      setMetrics(null);
      setError("Não foi possível abrir este PDF. Tente outro arquivo.");
      setMessage("");
    } finally {
      setBusy(false);
    }
  }

  async function renderPage(page: number, docArg?: any) {
    const doc = docArg ?? pdfJsDocRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;

    const pdfPage = await doc.getPage(page);
    const base = pdfPage.getViewport({ scale: 1 });
    const maxWidth = Math.min(720, window.innerWidth - 64);
    const scale = Math.max(0.7, Math.min(2, maxWidth / base.width));
    const viewport = pdfPage.getViewport({ scale });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewport.width, viewport.height);

    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
  }

  useEffect(() => {
    if (!pdfJsDocRef.current) return;
    renderPage(pageNumber);
  }, [pageNumber]);

  useEffect(() => {
    const onResize = () => {
      if (pdfJsDocRef.current) renderPage(pageNumber);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pageNumber]);

  function onPdfChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Selecione um arquivo PDF.");
      return;
    }
    loadPdf(file);
  }

  function onLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError("No MVP, a logo precisa estar em PNG ou JPG.");
      return;
    }

    setError("");
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setLogoAspect(image.naturalWidth / image.naturalHeight || 1);
      setLogoFile(file);
      setLogoUrl(url);
      setMessage("Logo carregada. Arraste para a posição desejada.");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Não foi possível ler essa imagem.");
    };
    image.src = url;
  }

  const logoHeightPercent = useMemo(() => {
    if (!metrics) return 10;
    // Width is normalized by page width. Convert the physical logo height to page-height percentage.
    return (placement.width * metrics.width / logoAspect / metrics.height) * 100;
  }, [metrics, placement.width, logoAspect]);

  function pointerDown(event: ReactPointerEvent, mode: "move" | "resize") {
    if (!stageRef.current || !logoFile) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startPlacement: { ...placement },
    };
  }

  function pointerMove(event: ReactPointerEvent) {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;

    const rect = stage.getBoundingClientRect();
    const dx = (event.clientX - drag.startX) / rect.width;
    const dy = (event.clientY - drag.startY) / rect.height;

    if (drag.mode === "move") {
      const nextX = clamp(drag.startPlacement.x + dx, 0, 1 - drag.startPlacement.width);
      const logoHeightNorm = logoHeightPercent / 100;
      const nextY = clamp(drag.startPlacement.y + dy, 0, 1 - logoHeightNorm);
      setPlacement((current) => ({ ...current, x: nextX, y: nextY }));
      return;
    }

    const minWidth = 0.05;
    const maxWidth = 1 - drag.startPlacement.x;
    const nextWidth = clamp(drag.startPlacement.width + dx, minWidth, maxWidth);
    setPlacement((current) => ({ ...current, width: nextWidth }));
  }

  function pointerUp(event: ReactPointerEvent) {
    if (dragRef.current) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already be released.
      }
    }
    dragRef.current = null;
  }

  function savePlacement() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(placement));
    setMessage("Posição salva neste navegador.");
  }

  function resetPlacement() {
    setPlacement(DEFAULT_PLACEMENT);
    setMessage("Posição restaurada.");
  }

  async function buildPdf() {
    if (!pdfBytesRef.current || !logoFile) {
      throw new Error("Envie o PDF e a logo antes de gerar.");
    }

    const sourceBytes = pdfBytesRef.current.slice(0);
    const doc = await PDFDocument.load(sourceBytes);
    const logoBytes = await logoFile.arrayBuffer();
    const logoImage = logoFile.type === "image/png"
      ? await doc.embedPng(logoBytes)
      : await doc.embedJpg(logoBytes);

    for (const page of doc.getPages()) {
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      const width = placement.width * pageWidth;
      const height = width / logoAspect;
      const x = placement.x * pageWidth;
      const yFromTop = placement.y * pageHeight;
      const y = pageHeight - yFromTop - height;

      page.drawImage(logoImage, {
        x: clamp(x, 0, Math.max(0, pageWidth - width)),
        y: clamp(y, 0, Math.max(0, pageHeight - height)),
        width,
        height,
        opacity: placement.opacity,
      });
    }

    return doc.save();
  }

  async function downloadPdf() {
    setBusy(true);
    setError("");
    try {
      const bytes = await buildPdf();
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pdfFile?.name.replace(/\.pdf$/i, "") || "etiquetas"}-com-logo.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("PDF final gerado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar o PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function printPdf() {
    setBusy(true);
    setError("");
    try {
      const bytes = await buildPdf();
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.width = "1px";
      iframe.style.height = "1px";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            iframe.remove();
            URL.revokeObjectURL(url);
          }, 30000);
        }, 500);
      };
      setMessage("Abrindo a impressão do navegador...");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao preparar a impressão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ETIQUETAS E-COMMERCE</p>
          <h1>Logo nas Etiquetas</h1>
          <p className="subtitle">Posicione sua marca visualmente e aplique em todas as etiquetas do PDF.</p>
        </div>
        <div className="privacy-badge">Processamento local no navegador</div>
      </header>

      <section className="workspace">
        <div className="preview-card">
          <div className="card-heading">
            <div>
              <span className="step">1</span>
              <strong>Pré-visualização</strong>
            </div>
            {metrics && (
              <span className="page-count">Página {pageNumber} de {metrics.pageCount}</span>
            )}
          </div>

          {!pdfFile ? (
            <label className="dropzone">
              <input type="file" accept="application/pdf" onChange={onPdfChange} />
              <span className="drop-icon">PDF</span>
              <strong>Escolher PDF de etiquetas</strong>
              <small>O arquivo não precisa ser enviado para um servidor.</small>
            </label>
          ) : (
            <>
              <div className="stage-wrap">
                <div
                  className="pdf-stage"
                  ref={stageRef}
                  onPointerMove={pointerMove}
                  onPointerUp={pointerUp}
                  onPointerCancel={pointerUp}
                >
                  <canvas ref={canvasRef} />
                  {logoUrl && (
                    <div
                      className="logo-overlay"
                      style={{
                        left: `${placement.x * 100}%`,
                        top: `${placement.y * 100}%`,
                        width: `${placement.width * 100}%`,
                        opacity: placement.opacity,
                      }}
                      onPointerDown={(e) => pointerDown(e, "move")}
                    >
                      <img src={logoUrl} alt="Logo sobre a etiqueta" draggable={false} />
                      <button
                        type="button"
                        className="resize-handle"
                        aria-label="Redimensionar logo"
                        onPointerDown={(e) => pointerDown(e, "resize")}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="page-nav">
                <button type="button" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)}>← Anterior</button>
                <button type="button" disabled={!metrics || pageNumber >= metrics.pageCount} onClick={() => setPageNumber((p) => p + 1)}>Próxima →</button>
              </div>
            </>
          )}
        </div>

        <aside className="controls-card">
          <div className="card-heading">
            <div><span className="step">2</span><strong>Logo e posição</strong></div>
          </div>

          <div className="control-group">
            <label className="file-button secondary">
              <input type="file" accept="image/png,image/jpeg" onChange={onLogoChange} />
              {logoFile ? "Trocar logo" : "Escolher logo PNG/JPG"}
            </label>
            {logoFile && <small>{logoFile.name} · {formatMb(logoFile.size)}</small>}
          </div>

          <div className="field-grid">
            <label>
              <span>Posição X</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={(placement.x * 100).toFixed(1)}
                onChange={(e) => setPlacement((p) => ({ ...p, x: clamp(Number(e.target.value) / 100, 0, 1 - p.width) }))}
              />
              <em>%</em>
            </label>
            <label>
              <span>Posição Y</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={(placement.y * 100).toFixed(1)}
                onChange={(e) => setPlacement((p) => ({ ...p, y: clamp(Number(e.target.value) / 100, 0, 1) }))}
              />
              <em>%</em>
            </label>
          </div>

          <label className="range-field">
            <span><b>Tamanho</b><strong>{Math.round(placement.width * 100)}%</strong></span>
            <input
              type="range"
              min="5"
              max="80"
              value={placement.width * 100}
              onChange={(e) => setPlacement((p) => ({ ...p, width: Number(e.target.value) / 100 }))}
            />
          </label>

          <label className="range-field">
            <span><b>Opacidade</b><strong>{Math.round(placement.opacity * 100)}%</strong></span>
            <input
              type="range"
              min="10"
              max="100"
              value={placement.opacity * 100}
              onChange={(e) => setPlacement((p) => ({ ...p, opacity: Number(e.target.value) / 100 }))}
            />
          </label>

          <div className="hint">
            <strong>Como posicionar</strong>
            <p>Arraste a logo diretamente sobre a etiqueta. Use o ponto no canto inferior direito para redimensionar.</p>
          </div>

          <div className="two-buttons">
            <button type="button" className="ghost" onClick={resetPlacement}>Restaurar</button>
            <button type="button" className="ghost" onClick={savePlacement}>Salvar posição</button>
          </div>

          <div className="apply-note">
            <span>✓</span>
            <p><strong>A mesma posição será aplicada automaticamente em todas as páginas.</strong><br />A posição é proporcional ao tamanho de cada etiqueta.</p>
          </div>

          <div className="divider" />

          <div className="card-heading compact">
            <div><span className="step">3</span><strong>Finalizar</strong></div>
          </div>

          <button type="button" className="primary" onClick={downloadPdf} disabled={busy || !pdfFile || !logoFile}>
            {busy ? "Processando..." : "Gerar PDF com logo"}
          </button>
          <button type="button" className="print" onClick={printPdf} disabled={busy || !pdfFile || !logoFile}>
            Imprimir etiquetas
          </button>

          {(message || error) && (
            <div className={error ? "status error" : "status"}>{error || message}</div>
          )}
        </aside>
      </section>

      <footer>
        <span>Compatível com PDFs multipágina.</span>
        <span>PNG/JPG · Vercel · sem banco de dados</span>
      </footer>
    </main>
  );
}
