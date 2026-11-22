// Foto do aparelho/exercício — usada quando não existe vídeo (ver
// InlineExerciseVideo). Ao contrário do vídeo, imprime normalmente no PDF
// do plano semanal, então não tem a classe "no-print".
export default function InlineExercisePhoto({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl bg-lightblue/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="Foto do aparelho/exercício" className="max-h-72 w-full object-contain" />
    </div>
  );
}
