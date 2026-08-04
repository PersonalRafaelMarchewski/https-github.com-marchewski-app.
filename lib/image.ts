// Redimensiona e comprime uma imagem no navegador antes do upload.
// Fotos de celular costumam vir com vários MB, o que estoura o limite
// de tamanho de requisição (a Vercel tem um teto fixo de ~4.5MB por
// requisição, que nenhuma configuração do Next.js consegue mudar).
// Reduzimos para no máximo `maxDimension` px no lado maior e
// recomprimimos como JPEG.

async function decodeToDrawable(
  file: File
): Promise<ImageBitmap | HTMLImageElement | null> {
  // Caminho principal: mais rápido e não trava a thread principal.
  try {
    return await createImageBitmap(file);
  } catch {
    // ignora e tenta o caminho alternativo abaixo
  }

  // Alguns navegadores de celular falham em createImageBitmap para certos
  // JPEGs (perfil de cor, EXIF, imagens muito grandes). Usar um <img> é
  // mais tolerante.
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
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

  const drawable = await decodeToDrawable(file);
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
