import { useRef, useState } from "react";

// Reordenar arrastando um "manipulador" (as três linhas) — só esse elemento
// captura o toque, então o resto do card continua rolando a página
// normalmente. Ao passar por cima de outro item, troca de lugar na hora
// (visual, otimista); `onDragEnd` roda só quando solta, pra quem precisa
// persistir (ex: salvar no banco) sem disparar uma chamada a cada pixel.
export function useSortableReorder(
  keys: string[],
  onReorder: (newKeys: string[]) => void,
  onDragEnd?: (newKeys: string[]) => void
) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const orderRef = useRef<string[]>(keys);

  function startDrag(key: string) {
    return (e: React.PointerEvent) => {
      orderRef.current = keys;
      setDraggingKey(key);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingKey) return;
    e.preventDefault();

    // Não usa document.elementFromPoint: no Safari/iOS, durante um toque
    // "capturado" (setPointerCapture) esse método fica preso na posição
    // onde o toque começou em vez de seguir o dedo, então o arrastar nunca
    // detecta o alvo certo. Em vez disso, mede a altura de cada linha e
    // compara direto com a coordenada Y atual do ponteiro.
    const items = Array.from(
      document.querySelectorAll<HTMLElement>("[data-sortable-key]")
    );
    const target = items.find((item) => {
      const rect = item.getBoundingClientRect();
      return e.clientY >= rect.top && e.clientY <= rect.bottom;
    });
    const targetKey = target?.getAttribute("data-sortable-key");
    if (!targetKey || targetKey === draggingKey) return;

    const current = orderRef.current;
    const fromIndex = current.indexOf(draggingKey);
    const toIndex = current.indexOf(targetKey);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const next = [...current];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, draggingKey);
    orderRef.current = next;
    onReorder(next);
  }

  function handlePointerUp() {
    if (draggingKey) onDragEnd?.(orderRef.current);
    setDraggingKey(null);
  }

  return {
    draggingKey,
    startDrag,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel: () => setDraggingKey(null),
  };
}
