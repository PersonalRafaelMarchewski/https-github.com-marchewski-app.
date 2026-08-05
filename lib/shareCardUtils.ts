// Helpers de desenho compartilhados entre os cartões de compartilhamento
// (treino concluído, resumo mensal...). Tudo client-side, usado dentro de
// componentes "use client" que desenham num <canvas>.

// Cores da marca (ver tailwind.config.ts)
export const NAVY = "#1F2556";
export const NAVY_DEEP = "#141833";
export const BLUE = "#8499CC";
export const ORANGE = "#ED5B35";

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Desenha a imagem preenchendo todo o retângulo (equivalente a background-size:
// cover), cortando o excedente pra manter a proporção sem distorcer.
export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  imgW: number,
  imgH: number,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = imgW / imgH;
  const boxRatio = w / h;
  let sx = 0,
    sy = 0,
    sw = imgW,
    sh = imgH;

  if (imgRatio > boxRatio) {
    sw = imgH * boxRatio;
    sx = (imgW - sw) / 2;
  } else {
    sh = imgW / boxRatio;
    sy = (imgH - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export function wrapCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

// Fundo padrão em degradê + brilho, usado quando não há foto de fundo.
export function drawDefaultBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  glowY: number
) {
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, NAVY);
  bg.addColorStop(1, NAVY_DEEP);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width / 2, glowY, 40, width / 2, glowY, 420);
  glow.addColorStop(0, "rgba(237,91,53,0.35)");
  glow.addColorStop(1, "rgba(237,91,53,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

// Foto do aluno como fundo + camada escura por cima pra manter o texto legível.
export function drawPhotoBackground(
  ctx: CanvasRenderingContext2D,
  photo: CanvasImageSource,
  photoW: number,
  photoH: number,
  width: number,
  height: number
) {
  drawCover(ctx, photo, photoW, photoH, 0, 0, width, height);

  const scrim = ctx.createLinearGradient(0, 0, 0, height);
  scrim.addColorStop(0, "rgba(20,24,51,0.72)");
  scrim.addColorStop(0.28, "rgba(20,24,51,0.42)");
  scrim.addColorStop(0.62, "rgba(20,24,51,0.5)");
  scrim.addColorStop(1, "rgba(20,24,51,0.8)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height);
}
