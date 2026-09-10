"use client";

import {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { degrees, PDFDocument, StandardFonts, type PDFImage } from "pdf-lib";

type LogoPlacement = {
  x: number;
  y: number;
  width: number;
  opacity: number;
  rotation: number;
};

type TextFontId =
  | "helvetica"
  | "helveticaBold"
  | "helveticaOblique"
  | "helveticaBoldOblique"
  | "times"
  | "timesBold"
  | "timesItalic"
  | "timesBoldItalic"
  | "courier"
  | "courierBold"
  | "courierOblique"
  | "courierBoldOblique";

type TextAlign = "left" | "center" | "right";

type TextPlacement = {
  x: number;
  y: number;
  width: number;
  fontSize: number;
  rotation: number;
  font: TextFontId;
  align: TextAlign;
};

type PdfMetrics = {
  width: number;
  height: number;
  pageCount: number;
};

type SavedConfig = {
  logoPlacement: LogoPlacement;
  textPlacement: TextPlacement;
  customText: string;
  applyToAll: boolean;
};

const DEFAULT_LOGO_PLACEMENT: LogoPlacement = {
  x: 0.64,
  y: 0.78,
  width: 0.26,
  opacity: 1,
  rotation: 0,
};

const DEFAULT_TEXT_PLACEMENT: TextPlacement = {
  x: 0.08,
  y: 0.08,
  width: 0.42,
  fontSize: 16,
  rotation: 0,
  font: "helvetica",
  align: "left",
};

const FONT_OPTIONS: Array<{
  id: TextFontId;
  label: string;
  pdf: StandardFonts;
  cssFamily: string;
  cssWeight?: number;
  cssStyle?: "normal" | "italic";
}> = [
  { id: "helvetica", label: "Helvetica", pdf: StandardFonts.Helvetica, cssFamily: "Helvetica, Arial, sans-serif" },
  { id: "helveticaBold", label: "Helvetica Negrito", pdf: StandardFonts.HelveticaBold, cssFamily: "Helvetica, Arial, sans-serif", cssWeight: 700 },
  { id: "helveticaOblique", label: "Helvetica Itálico", pdf: StandardFonts.HelveticaOblique, cssFamily: "Helvetica, Arial, sans-serif", cssStyle: "italic" },
  { id: "helveticaBoldOblique", label: "Helvetica Negrito Itálico", pdf: StandardFonts.HelveticaBoldOblique, cssFamily: "Helvetica, Arial, sans-serif", cssWeight: 700, cssStyle: "italic" },
  { id: "times", label: "Times Roman", pdf: StandardFonts.TimesRoman, cssFamily: '"Times New Roman", Times, serif' },
  { id: "timesBold", label: "Times Negrito", pdf: StandardFonts.TimesRomanBold, cssFamily: '"Times New Roman", Times, serif', cssWeight: 700 },
  { id: "timesItalic", label: "Times Itálico", pdf: StandardFonts.TimesRomanItalic, cssFamily: '"Times New Roman", Times, serif', cssStyle: "italic" },
  { id: "timesBoldItalic", label: "Times Negrito Itálico", pdf: StandardFonts.TimesRomanBoldItalic, cssFamily: '"Times New Roman", Times, serif', cssWeight: 700, cssStyle: "italic" },
  { id: "courier", label: "Courier", pdf: StandardFonts.Courier, cssFamily: '"Courier New", Courier, monospace' },
  { id: "courierBold", label: "Courier Negrito", pdf: StandardFonts.CourierBold, cssFamily: '"Courier New", Courier, monospace', cssWeight: 700 },
  { id: "courierOblique", label: "Courier Itálico", pdf: StandardFonts.CourierOblique, cssFamily: '"Courier New", Courier, monospace', cssStyle: "italic" },
  { id: "courierBoldOblique", label: "Courier Negrito Itálico", pdf: StandardFonts.CourierBoldOblique, cssFamily: '"Courier New", Courier, monospace', cssWeight: 700, cssStyle: "italic" },
];

const STORAGE_KEY = "etiqueta-logo-config-v4";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeRotation(value: number) {
  const normalized = ((value + 180) % 360 + 360) % 360 - 180;
  return normalized === -180 && value > 0 ? 180 : normalized;
}

function formatMb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fileBaseName(name: string) {
  return name.replace(/\.pdf$/i, "");
}

export default function LabelEditor() {
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoAspect, setLogoAspect] = useState(2.6);
  const [logoPlacement, setLogoPlacement] = useState<LogoPlacement>(DEFAULT_LOGO_PLACEMENT);
  const [textPlacement, setTextPlacement] = useState<TextPlacement>(DEFAULT_TEXT_PLACEMENT);
  const [customText, setCustomText] = useState("");
  const [applyToAll, setApplyToAll] = useState(true);
  const [metrics, setMetrics] = useState<PdfMetrics | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [previewScale, setPreviewScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Envie um ou mais PDFs de etiquetas para começar.");
  const [error, setError] = useState("");
  const [selectedElement, setSelectedElement] = useState<"logo" | "text" | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pdfBytesRef = useRef<ArrayBuffer | null>(null);
  const pdfJsDocRef = useRef<any>(null);
  const dragRef = useRef<null | {
    mode: "logo-move" | "logo-resize" | "text-move";
    startX: number;
    startY: number;
    startLogo: LogoPlacement;
    startText: TextPlacement;
  }>(null);

  useEffect(() => {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem("etiqueta-logo-config-v3") ??
      localStorage.getItem("etiqueta-logo-config-v2");
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as Partial<SavedConfig>;
      if (saved.logoPlacement) {
        setLogoPlacement({
          ...DEFAULT_LOGO_PLACEMENT,
          ...saved.logoPlacement,
        });
      }
      if (saved.textPlacement) {
        setTextPlacement({
          ...DEFAULT_TEXT_PLACEMENT,
          ...saved.textPlacement,
        });
      }
      if (typeof saved.customText === "string") setCustomText(saved.customText);
      if (typeof saved.applyToAll === "boolean") setApplyToAll(saved.applyToAll);
    } catch {
      // Ignora configuração local inválida.
    }
  }, []);

  useEffect(() => {
    return () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
    };
  }, [logoUrl]);

  async function mergePdfFiles(files: File[]) {
    if (files.length === 1) return files[0].arrayBuffer();

    const merged = await PDFDocument.create();
    for (const file of files) {
      const source = await PDFDocument.load(await file.arrayBuffer());
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    }

    const mergedBytes = await merged.save();
    const copy = new Uint8Array(mergedBytes.byteLength);
    copy.set(mergedBytes);
    return copy.buffer;
  }

  async function loadPdfs(files: File[]) {
    setBusy(true);
    setError("");
    setMessage(files.length > 1 ? "Unindo e carregando etiquetas..." : "Carregando etiquetas...");

    try {
      const bytes = await mergePdfFiles(files);
      pdfBytesRef.current = bytes;

      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
      pdfJsDocRef.current = doc;
      const firstPage = await doc.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });

      setPdfFiles(files);
      setMetrics({ width: viewport.width, height: viewport.height, pageCount: doc.numPages });
      setPageNumber(1);
      setMessage(
        `${doc.numPages} etiqueta${doc.numPages === 1 ? "" : "s"} carregada${doc.numPages === 1 ? "" : "s"}` +
          `${files.length > 1 ? ` em ${files.length} PDFs` : ""}.`,
      );
      requestAnimationFrame(() => renderPage(1, doc));
    } catch (err) {
      console.error(err);
      setPdfFiles([]);
      setMetrics(null);
      setError("Não foi possível abrir um dos PDFs. Verifique os arquivos e tente novamente.");
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

    setPreviewScale(scale);
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
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const invalid = files.find((file) => file.type !== "application/pdf");
    if (invalid) {
      setError(`O arquivo “${invalid.name}” não é um PDF.`);
      return;
    }

    loadPdfs(files);
  }

  function onLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("A logo precisa estar em PNG ou JPG.");
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
      setSelectedElement("logo");
      setMessage("Logo carregada. Clique nela para selecionar, arrastar, redimensionar ou excluir.");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Não foi possível ler essa imagem.");
    };
    image.src = url;
  }

  const selectedFont = useMemo(
    () => FONT_OPTIONS.find((option) => option.id === textPlacement.font) ?? FONT_OPTIONS[0],
    [textPlacement.font],
  );

  const logoHeightPercent = useMemo(() => {
    if (!metrics) return 10;
    return (logoPlacement.width * metrics.width / logoAspect / metrics.height) * 100;
  }, [metrics, logoPlacement.width, logoAspect]);

  function pointerDown(
    event: ReactPointerEvent,
    mode: "logo-move" | "logo-resize" | "text-move",
  ) {
    if (!stageRef.current) return;
    if ((mode === "logo-move" || mode === "logo-resize") && !logoFile) return;
    if (mode === "text-move" && !customText.trim()) return;

    event.preventDefault();
    event.stopPropagation();
    setSelectedElement(mode.startsWith("logo") ? "logo" : "text");
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startLogo: { ...logoPlacement },
      startText: { ...textPlacement },
    };
  }

  function pointerMove(event: ReactPointerEvent) {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;

    const rect = stage.getBoundingClientRect();
    const dx = (event.clientX - drag.startX) / rect.width;
    const dy = (event.clientY - drag.startY) / rect.height;

    if (drag.mode === "logo-move") {
      const nextX = clamp(drag.startLogo.x + dx, 0, 1 - drag.startLogo.width);
      const logoHeightNorm = logoHeightPercent / 100;
      const nextY = clamp(drag.startLogo.y + dy, 0, 1 - logoHeightNorm);
      setLogoPlacement((current) => ({ ...current, x: nextX, y: nextY }));
      return;
    }

    if (drag.mode === "logo-resize") {
      const minWidth = 0.05;
      const maxWidth = 1 - drag.startLogo.x;
      const nextWidth = clamp(drag.startLogo.width + dx, minWidth, maxWidth);
      setLogoPlacement((current) => ({ ...current, width: nextWidth }));
      return;
    }

    if (drag.mode === "text-move") {
      const nextX = clamp(drag.startText.x + dx, 0, 1 - drag.startText.width);
      const nextY = clamp(drag.startText.y + dy, 0, 0.98);
      setTextPlacement((current) => ({ ...current, x: nextX, y: nextY }));
    }
  }

  function pointerUp(event: ReactPointerEvent) {
    if (dragRef.current) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // O pointer capture pode já ter sido liberado.
      }
    }
    dragRef.current = null;
  }

  function deleteElement(element: "logo" | "text") {
    if (element === "logo") {
      setLogoFile(null);
      setLogoUrl("");
      setMessage("Logo removida da etiqueta.");
    } else {
      setCustomText("");
      setMessage("Texto removido da etiqueta.");
    }
    setSelectedElement(null);
  }

  function deleteSelectedElement() {
    if (!selectedElement) return;
    deleteElement(selectedElement);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!selectedElement || (event.key !== "Delete" && event.key !== "Backspace")) return;

      const target = event.target as HTMLElement | null;
      const isEditing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (isEditing) return;

      event.preventDefault();
      deleteSelectedElement();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedElement]);

  function saveConfig() {
    const config: SavedConfig = {
      logoPlacement,
      textPlacement,
      customText,
      applyToAll,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setMessage("Configuração salva neste navegador.");
  }

  function resetConfig() {
    setLogoPlacement(DEFAULT_LOGO_PLACEMENT);
    setTextPlacement(DEFAULT_TEXT_PLACEMENT);
    setCustomText("");
    setApplyToAll(true);
    setSelectedElement(null);
    setMessage("Configuração restaurada.");
  }

  function getTargetPages(doc: PDFDocument) {
    if (applyToAll) return doc.getPages();
    const page = doc.getPage(pageNumber - 1);
    return [page];
  }

  async function buildPdf() {
    if (!pdfBytesRef.current) {
      throw new Error("Envie pelo menos um PDF antes de gerar.");
    }

    const hasLogo = Boolean(logoFile);
    const hasText = Boolean(customText.trim());
    if (!hasLogo && !hasText) {
      throw new Error("Adicione uma logo ou um texto personalizado antes de gerar.");
    }

    const sourceBytes = pdfBytesRef.current.slice(0);
    const doc = await PDFDocument.load(sourceBytes);
    const targetPages = getTargetPages(doc);

    let logoImage: PDFImage | null = null;
    if (logoFile) {
      const logoBytes = await logoFile.arrayBuffer();
      logoImage = logoFile.type === "image/png"
        ? await doc.embedPng(logoBytes)
        : await doc.embedJpg(logoBytes);
    }

    const font = hasText ? await doc.embedFont(selectedFont.pdf) : null;

    for (const page of targetPages) {
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();

      if (logoImage) {
        const width = logoPlacement.width * pageWidth;
        const height = width / logoAspect;
        const x0 = logoPlacement.x * pageWidth;
        const y0 = pageHeight - logoPlacement.y * pageHeight - height;
        const angle = (logoPlacement.rotation * Math.PI) / 180;

        // Ajusta a origem para que a rotação aconteça visualmente pelo centro da logo,
        // igual à pré-visualização CSS.
        const centerX = x0 + width / 2;
        const centerY = y0 + height / 2;
        const rotatedHalfX = Math.cos(angle) * (width / 2) - Math.sin(angle) * (height / 2);
        const rotatedHalfY = Math.sin(angle) * (width / 2) + Math.cos(angle) * (height / 2);
        const drawX = centerX - rotatedHalfX;
        const drawY = centerY - rotatedHalfY;

        page.drawImage(logoImage, {
          x: drawX,
          y: drawY,
          width,
          height,
          opacity: logoPlacement.opacity,
          rotate: degrees(logoPlacement.rotation),
        });
      }

      if (font && customText.trim()) {
        const fontSize = textPlacement.fontSize;
        const lines = customText.replace(/\r/g, "").split("\n");
        const lineHeight = fontSize * 1.2;
        const pivotX = textPlacement.x * pageWidth;
        const pivotY = pageHeight - textPlacement.y * pageHeight;
        const pdfRotation = -textPlacement.rotation;
        const angle = (pdfRotation * Math.PI) / 180;

        const boxWidth = textPlacement.width * pageWidth;

        lines.forEach((line, index) => {
          if (!line) return;

          const lineWidth = font.widthOfTextAtSize(line, fontSize);
          const alignmentOffset =
            textPlacement.align === "center"
              ? Math.max(0, (boxWidth - lineWidth) / 2)
              : textPlacement.align === "right"
                ? Math.max(0, boxWidth - lineWidth)
                : 0;

          // A rotação usa o canto superior esquerdo da caixa de texto como pivô,
          // exatamente como na pré-visualização.
          const baselineOffset = fontSize + index * lineHeight;
          const localX = alignmentOffset;
          const localY = -baselineOffset;
          const rotatedX = localX * Math.cos(angle) - localY * Math.sin(angle);
          const rotatedY = localX * Math.sin(angle) + localY * Math.cos(angle);

          page.drawText(line, {
            x: pivotX + rotatedX,
            y: pivotY + rotatedY,
            size: fontSize,
            font,
            rotate: degrees(pdfRotation),
          });
        });
      }
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
      a.download = pdfFiles.length === 1
        ? `${fileBaseName(pdfFiles[0].name)}-padronizado.pdf`
        : "etiquetas-padronizadas.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        applyToAll
          ? "PDF final gerado com a mesma configuração em todas as etiquetas."
          : `PDF final gerado aplicando somente na etiqueta ${pageNumber}.`,
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Erro ao gerar o PDF.";
      if (/WinAnsi|encode/i.test(detail)) {
        setError("O texto contém um caractere não suportado. Remova emojis ou símbolos especiais e tente novamente.");
      } else {
        setError(detail);
      }
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
      const detail = err instanceof Error ? err.message : "Erro ao preparar a impressão.";
      if (/WinAnsi|encode/i.test(detail)) {
        setError("O texto contém um caractere não suportado. Remova emojis ou símbolos especiais e tente novamente.");
      } else {
        setError(detail);
      }
    } finally {
      setBusy(false);
    }
  }

  const canGenerate = pdfFiles.length > 0 && (Boolean(logoFile) || Boolean(customText.trim()));

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ETIQUETAS E-COMMERCE</p>
          <h1>Logo nas Etiquetas</h1>
          <p className="subtitle">
            Padronize todas as etiquetas com logo, texto, rotação e fontes personalizadas.
          </p>
        </div>
        <div className="topbar-actions">
          <div className="version-badge">V5 · seleção + editor de texto</div>
          <div className="privacy-badge">Processamento local no navegador</div>
        </div>
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

          {!pdfFiles.length ? (
            <label className="dropzone">
              <input type="file" accept="application/pdf" multiple onChange={onPdfChange} />
              <span className="drop-icon">PDF</span>
              <strong>Escolher um ou vários PDFs</strong>
              <small>Todos os PDFs selecionados serão unidos em uma sequência de etiquetas.</small>
            </label>
          ) : (
            <>
              <div className="loaded-files">
                <div>
                  <strong>{metrics?.pageCount ?? 0} etiquetas</strong>
                  <span>{pdfFiles.length} PDF{pdfFiles.length === 1 ? "" : "s"} carregado{pdfFiles.length === 1 ? "" : "s"}</span>
                </div>
                <label className="reload-pdf-button">
                  <input type="file" accept="application/pdf" multiple onChange={onPdfChange} />
                  <span className="reload-pdf-icon">＋</span>
                  <span>Carregar outro PDF</span>
                </label>
              </div>

              <div className="stage-wrap">
                <div
                  className="pdf-stage"
                  ref={stageRef}
                  onPointerDown={() => setSelectedElement(null)}
                  onPointerMove={pointerMove}
                  onPointerUp={pointerUp}
                  onPointerCancel={pointerUp}
                >
                  <canvas ref={canvasRef} />

                  {logoUrl && (
                    <div
                      className={`logo-overlay ${selectedElement === "logo" ? "selected" : ""}`}
                      style={{
                        left: `${logoPlacement.x * 100}%`,
                        top: `${logoPlacement.y * 100}%`,
                        width: `${logoPlacement.width * 100}%`,
                        opacity: logoPlacement.opacity,
                        transform: `rotate(${logoPlacement.rotation}deg)`,
                      }}
                      onPointerDown={(e) => pointerDown(e, "logo-move")}
                    >
                      <img src={logoUrl} alt="Logo sobre a etiqueta" draggable={false} />
                      {selectedElement === "logo" && (
                        <>
                          <button
                            type="button"
                            className="element-trash"
                            style={{ transform: `rotate(${-logoPlacement.rotation}deg)` }}
                            aria-label="Excluir logo"
                            title="Excluir logo"
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteElement("logo");
                            }}
                          >
                            🗑
                          </button>
                          <button
                            type="button"
                            className="resize-handle"
                            aria-label="Redimensionar logo"
                            onPointerDown={(e) => pointerDown(e, "logo-resize")}
                          />
                        </>
                      )}
                    </div>
                  )}

                  {customText.trim() && (
                    <div
                      className={`text-overlay ${selectedElement === "text" ? "selected" : ""}`}
                      style={{
                        left: `${textPlacement.x * 100}%`,
                        top: `${textPlacement.y * 100}%`,
                        width: `${textPlacement.width * 100}%`,
                        fontSize: `${textPlacement.fontSize * previewScale}px`,
                        textAlign: textPlacement.align,
                        transform: `rotate(${textPlacement.rotation}deg)`,
                        transformOrigin: "top left",
                        fontFamily: selectedFont.cssFamily,
                        fontWeight: selectedFont.cssWeight ?? 400,
                        fontStyle: selectedFont.cssStyle ?? "normal",
                      }}
                      onPointerDown={(e) => pointerDown(e, "text-move")}
                    >
                      <span>{customText}</span>
                      {selectedElement === "text" && (
                        <button
                          type="button"
                          className="element-trash"
                          style={{ transform: `rotate(${-textPlacement.rotation}deg)` }}
                          aria-label="Excluir texto"
                          title="Excluir texto"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteElement("text");
                          }}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="page-nav">
                <button type="button" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)}>
                  ← Anterior
                </button>
                <button
                  type="button"
                  disabled={!metrics || pageNumber >= metrics.pageCount}
                  onClick={() => setPageNumber((p) => p + 1)}
                >
                  Próxima →
                </button>
              </div>
            </>
          )}
        </div>

        <aside className="controls-card">
          <div className="card-heading">
            <div><span className="step">2</span><strong>Padronização</strong></div>
          </div>

          <label className="apply-all-toggle">
            <input
              type="checkbox"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
            />
            <span className="toggle-track"><span /></span>
            <span className="toggle-copy">
              <strong>Aplicar em todas as etiquetas</strong>
              <small>
                {applyToAll
                  ? `Logo e texto serão repetidos nas ${metrics?.pageCount ?? "todas as"} etiquetas.`
                  : `As alterações serão aplicadas somente na etiqueta ${pageNumber}.`}
              </small>
            </span>
          </label>

          <div className={`selection-toolbar ${selectedElement ? "has-selection" : ""}`}>
            <div>
              <span>ELEMENTO SELECIONADO</span>
              <strong>
                {selectedElement === "logo"
                  ? "Logo"
                  : selectedElement === "text"
                    ? "Texto personalizado"
                    : "Clique na logo ou no texto"}
              </strong>
            </div>
            <button
              type="button"
              className="delete-selected"
              disabled={!selectedElement}
              onClick={deleteSelectedElement}
              title="Excluir elemento selecionado"
            >
              <span aria-hidden="true">🗑</span>
              Excluir
            </button>
          </div>
          <p className="delete-shortcut">Dica: com um elemento selecionado, pressione <kbd>Delete</kbd> ou <kbd>Backspace</kbd>.</p>

          <div className="section-label">LOGO</div>
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
                value={(logoPlacement.x * 100).toFixed(1)}
                onChange={(e) => setLogoPlacement((p) => ({
                  ...p,
                  x: clamp(Number(e.target.value) / 100, 0, 1 - p.width),
                }))}
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
                value={(logoPlacement.y * 100).toFixed(1)}
                onChange={(e) => setLogoPlacement((p) => ({
                  ...p,
                  y: clamp(Number(e.target.value) / 100, 0, 1),
                }))}
              />
              <em>%</em>
            </label>
          </div>

          <label className="range-field">
            <span><b>Tamanho da logo</b><strong>{Math.round(logoPlacement.width * 100)}%</strong></span>
            <input
              type="range"
              min="5"
              max="80"
              value={logoPlacement.width * 100}
              onChange={(e) => setLogoPlacement((p) => ({ ...p, width: Number(e.target.value) / 100 }))}
            />
          </label>

          <label className="range-field">
            <span><b>Girar logo</b><strong>{Math.round(logoPlacement.rotation)}°</strong></span>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={logoPlacement.rotation}
              onChange={(e) => setLogoPlacement((p) => ({ ...p, rotation: Number(e.target.value) }))}
            />
          </label>

          <div className="rotation-buttons">
            <button type="button" className="ghost" onClick={() => setLogoPlacement((p) => ({ ...p, rotation: normalizeRotation(p.rotation - 90) }))}>↶ 90°</button>
            <button type="button" className="ghost" onClick={() => setLogoPlacement((p) => ({ ...p, rotation: 0 }))}>0°</button>
            <button type="button" className="ghost" onClick={() => setLogoPlacement((p) => ({ ...p, rotation: normalizeRotation(p.rotation + 90) }))}>90° ↷</button>
          </div>

          <label className="range-field">
            <span><b>Opacidade</b><strong>{Math.round(logoPlacement.opacity * 100)}%</strong></span>
            <input
              type="range"
              min="10"
              max="100"
              value={logoPlacement.opacity * 100}
              onChange={(e) => setLogoPlacement((p) => ({ ...p, opacity: Number(e.target.value) / 100 }))}
            />
          </label>

          <div className="section-label">TEXTO PERSONALIZADO</div>
          <label className="text-field">
            <span>Texto que aparecerá na etiqueta</span>
            <textarea
              rows={3}
              value={customText}
              maxLength={180}
              placeholder="Ex.: Obrigado pela compra!"
              onFocus={() => {
                if (customText.trim()) setSelectedElement("text");
              }}
              onChange={(e) => {
                const value = e.target.value;
                setCustomText(value);
                if (value.trim()) setSelectedElement("text");
                else if (selectedElement === "text") setSelectedElement(null);
              }}
            />
            <small>{customText.length}/180 caracteres · arraste o texto na prévia para posicionar</small>
          </label>

          <label className="select-field">
            <span>Fonte do texto</span>
            <select
              value={textPlacement.font}
              onChange={(e) => setTextPlacement((p) => ({ ...p, font: e.target.value as TextFontId }))}
            >
              {FONT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>

          <div className="text-editor-toolbar" role="group" aria-label="Alinhamento do texto">
            <span>Alinhamento</span>
            <div className="alignment-buttons">
              {([
                ["left", "Esquerda", "≡"],
                ["center", "Centro", "≡"],
                ["right", "Direita", "≡"],
              ] as const).map(([align, label, icon]) => (
                <button
                  key={align}
                  type="button"
                  className={`align-button align-${align} ${textPlacement.align === align ? "active" : ""}`}
                  onClick={() => {
                    setTextPlacement((p) => ({ ...p, align }));
                    if (customText.trim()) setSelectedElement("text");
                  }}
                  title={`Alinhar à ${label.toLowerCase()}`}
                  aria-label={`Alinhar texto à ${label.toLowerCase()}`}
                >
                  <span aria-hidden="true">{icon}</span>
                  <small>{label}</small>
                </button>
              ))}
            </div>
          </div>

          <label className="range-field">
            <span><b>Largura da caixa de texto</b><strong>{Math.round(textPlacement.width * 100)}%</strong></span>
            <input
              type="range"
              min="15"
              max="90"
              step="1"
              value={textPlacement.width * 100}
              onChange={(e) => setTextPlacement((p) => ({
                ...p,
                width: Number(e.target.value) / 100,
                x: clamp(p.x, 0, 1 - Number(e.target.value) / 100),
              }))}
            />
          </label>

          <label className="range-field">
            <span><b>Tamanho do texto</b><strong>{Math.round(textPlacement.fontSize)} pt</strong></span>
            <input
              type="range"
              min="8"
              max="48"
              step="1"
              value={textPlacement.fontSize}
              onChange={(e) => setTextPlacement((p) => ({ ...p, fontSize: Number(e.target.value) }))}
            />
          </label>

          <label className="range-field">
            <span><b>Girar texto</b><strong>{Math.round(textPlacement.rotation)}°</strong></span>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={textPlacement.rotation}
              onChange={(e) => setTextPlacement((p) => ({ ...p, rotation: Number(e.target.value) }))}
            />
          </label>

          <div className="rotation-buttons">
            <button type="button" className="ghost" onClick={() => setTextPlacement((p) => ({ ...p, rotation: normalizeRotation(p.rotation - 90) }))}>↶ 90°</button>
            <button type="button" className="ghost" onClick={() => setTextPlacement((p) => ({ ...p, rotation: 0 }))}>0°</button>
            <button type="button" className="ghost" onClick={() => setTextPlacement((p) => ({ ...p, rotation: normalizeRotation(p.rotation + 90) }))}>90° ↷</button>
          </div>

          <div className="hint">
            <strong>Posicionamento visual</strong>
            <p>Clique na logo ou no texto para selecionar. O item selecionado pode ser arrastado, editado e excluído pela lixeira ou pela tecla Delete.</p>
          </div>

          <div className="two-buttons">
            <button type="button" className="ghost" onClick={resetConfig}>Restaurar</button>
            <button type="button" className="ghost" onClick={saveConfig}>Salvar configuração</button>
          </div>

          <div className={applyToAll ? "apply-note" : "apply-note single-page"}>
            <span>{applyToAll ? "✓" : "1"}</span>
            <p>
              <strong>{applyToAll ? "Padronização ativada." : "Modo individual ativado."}</strong><br />
              {applyToAll
                ? "A mesma configuração será aplicada em todas as etiquetas carregadas, inclusive quando houver vários PDFs."
                : `Somente a página ${pageNumber} receberá a logo e o texto.`}
            </p>
          </div>

          <div className="divider" />

          <div className="card-heading compact">
            <div><span className="step">3</span><strong>Finalizar</strong></div>
          </div>

          <button type="button" className="primary" onClick={downloadPdf} disabled={busy || !canGenerate}>
            {busy ? "Processando..." : "Gerar PDF padronizado"}
          </button>
          <button type="button" className="print" onClick={printPdf} disabled={busy || !canGenerate}>
            Imprimir etiquetas
          </button>

          {(message || error) && (
            <div className={error ? "status error" : "status"}>{error || message}</div>
          )}
        </aside>
      </section>

      <footer>
        <span>Compatível com múltiplos PDFs e PDFs multipágina.</span>
        <span>Seleção e exclusão de elementos · editor de texto · Vercel · sem banco de dados</span>
      </footer>
    </main>
  );
}
