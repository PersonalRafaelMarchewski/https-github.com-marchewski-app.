// Redimensiona e comprime uma imagem no navegador antes do upload.
// Fotos de celular costumam vir com vários MB, o que estoura o limite
// de tamanho de requisição (a Vercel tem um teto fixo de ~4.5MB por
// requisição, que nenhuma configuração do Next.js consegue mudar).
// Reduzimos para no máximo `maxDimension` px no lado maior e
// recomprimimos como JPEG.

// iPhone salva as fotos da galeria em HEIC/HEIF por padrão (a câmera do
// navegador, via <input capture>, já entrega JPEG — por isso "tirar
// foto" sempre funcionou mas "da galeria" não). Nenhum navegador decodifica
// HEIC num <canvas>/<img>, então convertemos pra JPEG antes de mais nada.
function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  if (!type) return /\.hei[cf]$/i.test(file.name);
  return false;
}

async function convertHeicToJpeg(file: File): Promise<File> {
  try {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const blob = Array.isArray(result) ? result[0] : result;
    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    // se a conversão falhar, segue com o arquivo original — o decode
    // abaixo vai falhar de novo, mas de forma já esperada/tratada
    return file;
  }
}

async function decodeToDrawable(
  file: File,
  decodeMaxDimension: number
): Promise<ImageBitmap | HTMLImageElement | null> {
  const usable = isHeic(file) ? await convertHeicToJpeg(file) : file;

  // Caminho principal: mais rápido e não trava a thread principal. Pede
  // pro navegador já decodificar num tamanho limitado — câmeras de
  // celular (comum em Samsung, 50-200MP) geram fotos gigantes que podem
  // estourar a memória do WebView se decodificadas no tamanho original.
  // Só um dos dois (resizeWidth) é passado de propósito: preserva a
  // proporção automaticamente, então funciona igual pra foto na
  // horizontal ou vertical.
  try {
    return await createImageBitmap(usable, {
      resizeWidth: decodeMaxDimension,
      resizeQuality: "medium",
    });
  } catch {
    // ignora e tenta o caminho alternativo abaixo
  }

  // Alguns navegadores de celular falham em createImageBitmap para certos
  // JPEGs (perfil de cor, EXIF, imagens muito grandes). Usar um <img> é
  // mais tolerante.
  return new Promise((resolve) => {
    const url = URL.createObjectURL(usable);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function drawableSize(drawable: ImageBitmap | HTMLImageElement) {
  return "width" in drawable && "height" in drawable && drawable instanceof ImageBitmap
    ? { width: drawable.width, height: drawable.height }
    : { width: (drawable as HTMLImageElement).naturalWidth, height: (drawable as HTMLImageElement).naturalHeight };
}

export async function compressImage(
  file: File,
  { maxDimension = 1440, quality = 0.75 }: { maxDimension?: number; quality?: number } = {}
): Promise<File> {
  // Só faz sentido para imagens; qualquer outra coisa passa direto.
  if (!file.type.startsWith("image/")) return file;

  // decodifica com uma folga acima do tamanho final desejado (pra manter
  // qualidade no reamostro abaixo), mas sempre limitado — nunca decodifica
  // no tamanho bruto de uma foto de 50-200MP
  const decodeMaxDimension = Math.max(maxDimension, 2000);
  const drawable = await decodeToDrawable(file, decodeMaxDimension);
  if (!drawable) return file;

  const { width: originalWidth, height: originalHeight } = drawableSize(drawable);
  if (!originalWidth || !originalHeight) return file;

  const scale = Math.min(1, maxDimension / Math.max(originalWidth, originalHeight));
  const width = Math.max(1, Math.round(originalWidth * scale));
  const height = Math.max(1, Math.round(originalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(drawable as CanvasImageSource, 0, 0, width, height);

  let blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) return file;

  // Rede de segurança extra: se mesmo assim ficou grande (foto muito
  // detalhada), reduz ainda mais antes de desistir.
  if (blob.size > 1.5 * 1024 * 1024) {
    const smaller = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.5)
    );
    if (smaller && smaller.size < blob.size) blob = smaller;
  }

  // Se por algum motivo a versão comprimida ficou maior, mantém a original.
  if (blob.size >= file.size) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
