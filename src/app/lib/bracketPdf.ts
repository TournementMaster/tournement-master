import {
  buildLayoutFromRounds,
  type PrintInput,
  type RoundMatch,
} from "./bracketPrintLayout";

type ParsedCard = {
  x: number;
  y: number;
  w: number;
  h: number;
  p1: string;
  p2: string;
  c1: string;
  c2: string;
  winner?: 0 | 1;
  matchId?: string;
};

const MM_ROUND = 0.1;
const CONNECTOR_W_MM = 0.25;
const CARD_BORDER_MM = 0.25;
const DEBUG = false;
const FONT_STACK = 'system-ui, "Segoe UI", Arial, sans-serif';

let measureCanvas: HTMLCanvasElement | null = null;
let measureCtx: CanvasRenderingContext2D | null = null;

function mm(v: number): number {
  return Math.round(v / MM_ROUND) * MM_ROUND;
}

function esc(s: string): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

function ensureMetaAndLang() {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("lang", "tr");
  let meta = document.querySelector("meta[charset]") as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("charset", "utf-8");
    document.head.prepend(meta);
  } else if ((meta.getAttribute("charset") || "").toLowerCase() !== "utf-8") {
    meta.setAttribute("charset", "utf-8");
  }
}

async function ensurePrintTypographyReady(): Promise<void> {
  ensureMetaAndLang();
  await document.fonts.ready;
}

function num(v: string | null, d = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function clusterByX(cards: ParsedCard[]): ParsedCard[][] {
  const sorted = [...cards].sort((a, b) => a.x - b.x);
  const groups: ParsedCard[][] = [];
  const tol = 1.5;
  for (const c of sorted) {
    const g = groups.find((x) => Math.abs(x[0].x - c.x) <= tol);
    if (g) g.push(c);
    else groups.push([c]);
  }
  groups.forEach((g) => g.sort((a, b) => a.y - b.y));
  groups.sort((a, b) => a[0].x - b[0].x);
  return groups;
}

function parseFromLiveSvg(svg: SVGSVGElement): RoundMatch[][] {
  const rects = Array.from(svg.querySelectorAll<SVGRectElement>("rect.rect"));
  if (!rects.length) throw new Error("Braket kutuları okunamadı.");

  const cards: ParsedCard[] = rects.map((r) => {
    const g = r.parentElement as SVGGElement | null;
    const x = num(r.getAttribute("x"));
    const y = num(r.getAttribute("y"));
    const w = num(r.getAttribute("width"));
    const h = num(r.getAttribute("height"));

    const txt = g
      ? Array.from(g.querySelectorAll<SVGTextElement>("text.txt"))
      : [];
    const sortedTxt = txt
      .map((t) => ({ t, y: num(t.getAttribute("y")) }))
      .sort((a, b) => a.y - b.y)
      .map((x) => x.t);

    const name1 = sortedTxt[0];
    const club1 = sortedTxt[1];
    const name2 = sortedTxt[2];
    const club2 = sortedTxt[3];

    const p1 = esc(name1?.textContent || "—");
    const c1 = esc(club1?.textContent || "");
    const p2 = esc(name2?.textContent || "—");
    const c2 = esc(club2?.textContent || "");
    const w1 = !!name1?.querySelector("tspan.tick");
    const w2 = !!name2?.querySelector("tspan.tick");

    const id =
      esc((g?.querySelector("text.mno-txt")?.textContent || "") as string) ||
      undefined;

    return {
      x,
      y,
      w,
      h,
      p1,
      c1,
      p2,
      c2,
      winner: w1 ? 0 : w2 ? 1 : undefined,
      matchId: id,
    };
  });

  const roundGroups = clusterByX(cards);
  return roundGroups.map((group, r) =>
    group.map((c, i) => ({
      round: r,
      index: i,
      id: c.matchId || `R${r + 1}-${i + 1}`,
      p1: c.p1 || "—",
      p2: c.p2 || "—",
      c1: c.c1,
      c2: c.c2,
      winner: c.winner,
    })),
  );
}

function ptToPx(pt: number): number {
  return (pt * 96) / 72;
}

function mmToCssPx(vmm: number): number {
  return (vmm * 96) / 25.4;
}

function getMeasureCtx(): CanvasRenderingContext2D {
  if (measureCtx) return measureCtx;
  measureCanvas = document.createElement("canvas");
  measureCanvas.width = 1600;
  measureCanvas.height = 200;
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) throw new Error("Metin ölçüm context oluşturulamadı.");
  try {
    (ctx as any).fontKerning = "normal";
  } catch {
    /* noop */
  }
  measureCtx = ctx;
  return measureCtx;
}

function fitText(
  text: string,
  maxWmm: number,
  fontPt: number,
  weight: 400 | 700,
): string {
  const raw = esc(text || "—");
  if (!raw) return "—";
  const ctx = getMeasureCtx();
  ctx.font = `${weight} ${ptToPx(fontPt)}px ${FONT_STACK}`;
  const maxPx = mmToCssPx(maxWmm);
  if (ctx.measureText(raw).width <= maxPx) return raw;
  let s = raw;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxPx)
    s = s.slice(0, -1);
  return `${s}…`;
}

function mmToPx(vmm: number, pxPerMm: number): number {
  return Math.round(mm(vmm) * pxPerMm);
}

function drawPageToPng(page: any): string {
  const DPI = 260;
  const pxPerMm = DPI / 25.4;
  const cw = Math.max(1, Math.round(page.pageW * pxPerMm));
  const ch = Math.max(1, Math.round(page.pageH * pxPerMm));

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("PDF sayfası çizilemedi.");
  try {
    (ctx as any).fontKerning = "normal";
  } catch {
    /* noop */
  }

  // Base page
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cw, ch);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = Math.max(1, Math.round(0.2 * pxPerMm));
  ctx.strokeRect(
    mmToPx(page.safeX, pxPerMm),
    mmToPx(page.safeY, pxPerMm),
    mmToPx(page.safeW, pxPerMm),
    mmToPx(page.safeH, pxPerMm),
  );

  // Header
  const cx = mmToPx(page.safeX + page.safeW / 2, pxPerMm);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#000";
  ctx.font = `800 ${ptToPx(25)}px ${FONT_STACK}`;
  ctx.fillText(esc(page.title), cx, mmToPx(page.safeY + 5, pxPerMm));
  ctx.font = `600 ${ptToPx(15)}px ${FONT_STACK}`;
  ctx.fillText(
    esc(`${page.groupLabel} · Sayfa ${page.pageNo}/${page.pageCount}`),
    cx,
    mmToPx(page.safeY + 9, pxPerMm),
  );

  // Connectors
  ctx.strokeStyle = "#000";
  ctx.lineWidth = Math.max(1, Math.round(CONNECTOR_W_MM * pxPerMm));
  page.lines.forEach((ln: any) => {
    const x1 = mmToPx(ln.x1, pxPerMm);
    const y1 = mmToPx(ln.y1, pxPerMm);
    const x2 = mmToPx(ln.x2, pxPerMm);
    const y2 = mmToPx(ln.y2, pxPerMm);
    const xm = Math.round((x1 + x2) / 2);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(xm, y1);
    ctx.lineTo(xm, y2);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (DEBUG) {
      ctx.fillStyle = "#d00";
      ctx.beginPath();
      ctx.arc(x1, y1, Math.max(2, Math.round(0.35 * pxPerMm)), 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x2, y2, Math.max(2, Math.round(0.35 * pxPerMm)), 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Cards + typography
  page.cards.forEach((c: any) => {
    const x = mm(c.x);
    const y = mm(c.y);
    const w = mm(c.w);
    const h = mm(c.h);
    const rowH = mm(h / 2);
    const scoreColW = 9;
    const padX = 1.7;
    const textW = Math.max(8, w - scoreColW - padX * 2);

    const xPx = mmToPx(x, pxPerMm);
    const yPx = mmToPx(y, pxPerMm);
    const wPx = mmToPx(w, pxPerMm);
    const hPx = mmToPx(h, pxPerMm);
    const rowHPx = mmToPx(rowH, pxPerMm);
    const scoreXPx = mmToPx(x + w - scoreColW, pxPerMm);

    ctx.strokeStyle = "#000";
    ctx.lineWidth = Math.max(1, Math.round(CARD_BORDER_MM * pxPerMm));
    ctx.strokeRect(xPx, yPx, wPx, hPx);
    ctx.beginPath();
    ctx.moveTo(xPx, yPx + rowHPx);
    ctx.lineTo(xPx + wPx, yPx + rowHPx);
    ctx.moveTo(scoreXPx, yPx);
    ctx.lineTo(scoreXPx, yPx + hPx);
    ctx.stroke();

    if (c.matchId) {
      ctx.textAlign = "right";
      ctx.fillStyle = "#000";
      ctx.font = `600 ${ptToPx(15.5)}px ${FONT_STACK}`;
      ctx.fillText(
        esc(c.matchId),
        mmToPx(x + w - 1, pxPerMm),
        mmToPx(y + 3.2, pxPerMm),
      );
    }

    const namePt = 17.4;
    const clubPt = 13.8;
    // İsim ve kulüp için kısaltma sınırı çok geniş (pratikte "..." ile kısaltma yok)
    const nameClubMaxWmm = 200;
    const name1 = fitText(
      c.p1 || "—",
      nameClubMaxWmm,
      namePt,
      c.winner === 0 ? 700 : 400,
    );
    const name2 = fitText(
      c.p2 || "—",
      nameClubMaxWmm,
      namePt,
      c.winner === 1 ? 700 : 400,
    );
    const club1 = fitText(c.c1 || "", nameClubMaxWmm, clubPt, 700);
    const club2 = fitText(c.c2 || "", nameClubMaxWmm, clubPt, 700);

    const topRowClipX = mmToPx(x + padX, pxPerMm);
    const topRowClipY = mmToPx(y + 0.4, pxPerMm);
    const topRowClipW = mmToPx(textW, pxPerMm);
    const topRowClipH = mmToPx(rowH - 0.8, pxPerMm);
    const bottomRowClipX = topRowClipX;
    const bottomRowClipY = mmToPx(y + rowH + 0.4, pxPerMm);
    const bottomRowClipW = topRowClipW;
    const bottomRowClipH = topRowClipH;

    const nameBaselineOffset = 2.9;
    const clubBaselineOffset = 5.3;

    ctx.textAlign = "left";
    ctx.save();
    ctx.beginPath();
    ctx.rect(topRowClipX, topRowClipY, topRowClipW, topRowClipH);
    ctx.clip();
    ctx.fillStyle = "#000";
    ctx.font = `${c.winner === 0 ? 700 : 400} ${ptToPx(namePt)}px ${FONT_STACK}`;
    ctx.fillText(
      name1,
      mmToPx(x + padX, pxPerMm),
      mmToPx(y + nameBaselineOffset, pxPerMm),
    );
    ctx.fillStyle = "#464646";
    ctx.font = `600 ${ptToPx(clubPt)}px ${FONT_STACK}`;
    ctx.fillText(
      club1,
      mmToPx(x + padX, pxPerMm),
      mmToPx(y + clubBaselineOffset, pxPerMm),
    );
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(bottomRowClipX, bottomRowClipY, bottomRowClipW, bottomRowClipH);
    ctx.clip();
    ctx.fillStyle = "#000";
    ctx.font = `${c.winner === 1 ? 700 : 400} ${ptToPx(namePt)}px ${FONT_STACK}`;
    ctx.fillText(
      name2,
      mmToPx(x + padX, pxPerMm),
      mmToPx(y + rowH + nameBaselineOffset, pxPerMm),
    );
    ctx.fillStyle = "#464646";
    ctx.font = `600 ${ptToPx(clubPt)}px ${FONT_STACK}`;
    ctx.fillText(
      club2,
      mmToPx(x + padX, pxPerMm),
      mmToPx(y + rowH + clubBaselineOffset, pxPerMm),
    );
    ctx.restore();

    // Score/note blanks
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mmToPx(x + w - scoreColW + 1, pxPerMm), mmToPx(y + 4, pxPerMm));
    ctx.lineTo(mmToPx(x + w - 1, pxPerMm), mmToPx(y + 4, pxPerMm));
    ctx.moveTo(
      mmToPx(x + w - scoreColW + 1, pxPerMm),
      mmToPx(y + rowH + 4, pxPerMm),
    );
    ctx.lineTo(mmToPx(x + w - 1, pxPerMm), mmToPx(y + rowH + 4, pxPerMm));
    ctx.moveTo(mmToPx(x + 1.1, pxPerMm), mmToPx(y + rowH - 1.1, pxPerMm));
    ctx.lineTo(
      mmToPx(x + w - scoreColW - 0.8, pxPerMm),
      mmToPx(y + rowH - 1.1, pxPerMm),
    );
    ctx.moveTo(mmToPx(x + 1.1, pxPerMm), mmToPx(y + h - 1.1, pxPerMm));
    ctx.lineTo(
      mmToPx(x + w - scoreColW - 0.8, pxPerMm),
      mmToPx(y + h - 1.1, pxPerMm),
    );
    ctx.stroke();
  });

  return canvas.toDataURL("image/png");
}

function safeName(s: string): string {
  return (
    (s || "bracket")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._ -]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "bracket"
  );
}

function validateAnchors(page: { cards: any[]; lines: any[] }) {
  const anchors: Array<{ x: number; y: number }> = [];
  page.cards.forEach((c) => {
    anchors.push({ x: mm(c.x + c.w), y: mm(c.y + c.h / 2) });
    anchors.push({ x: mm(c.x), y: mm(c.y + c.h / 2) });
  });
  for (const l of page.lines) {
    const p1 = { x: mm(l.x1), y: mm(l.y1) };
    const p2 = { x: mm(l.x2), y: mm(l.y2) };
    const d1 = Math.min(
      ...anchors.map((a) => Math.hypot(a.x - p1.x, a.y - p1.y)),
    );
    const d2 = Math.min(
      ...anchors.map((a) => Math.hypot(a.x - p2.x, a.y - p2.y)),
    );
    if (d1 > 0.2 || d2 > 0.2) {
      throw new Error(`Connector-anchor doğrulaması başarısız (>${0.2}mm).`);
    }
  }
}

function chooseDensity(
  firstRoundMatchCount: number,
): NonNullable<PrintInput["options"]>["density"] {
  if (firstRoundMatchCount >= 96) return "dense";
  if (firstRoundMatchCount >= 48) return "compact";
  return "comfortable";
}

export async function downloadBracketPdf(
  title: string,
  options?: PrintInput["options"],
): Promise<void> {
  await ensurePrintTypographyReady();

  const svg = document.querySelector<SVGSVGElement>(
    'svg[data-bracket-svg="1"]',
  );
  if (!svg) throw new Error("Braket SVG bulunamadı.");
  const rounds = parseFromLiveSvg(svg);
  const firstRoundMatches = rounds[0]?.length || 1;
  const density = options?.density || chooseDensity(firstRoundMatches);
  const layout = buildLayoutFromRounds({
    title,
    rounds,
    options: {
      pageSize: options?.pageSize || "A4",
      orientation: options?.orientation || "portrait",
      density,
      showMatchIds: options?.showMatchIds ?? true,
      showClub: options?.showClub ?? true,
      maxRoundsPerPage: firstRoundMatches > 32 ? 3 : undefined,
      bandMatchCap: firstRoundMatches > 32 ? 16 : undefined,
      groupLocalScale: firstRoundMatches > 32,
    },
  });

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: layout.pageW > layout.pageH ? "landscape" : "portrait",
    unit: "mm",
    format: [layout.pageW, layout.pageH],
    compress: true,
  });

  layout.pages.forEach((page, pi) => {
    if (pi > 0)
      pdf.addPage(
        [layout.pageW, layout.pageH],
        layout.pageW > layout.pageH ? "landscape" : "portrait",
      );

    validateAnchors(page);
    const pageImg = drawPageToPng(page);
    pdf.addImage(
      pageImg,
      "PNG",
      0,
      0,
      layout.pageW,
      layout.pageH,
      undefined,
      "FAST",
    );
  });

  pdf.save(`${safeName(title)}.pdf`);
}
