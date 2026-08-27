import { Camera } from "lucide-react";
import WorkoutShareCard from "@/components/WorkoutShareCard";
import { todayInBrazil } from "@/lib/date";

// Aba "Foto": o aluno monta uma foto com a marca da assessoria pra postar
// quando quiser — sem precisar concluir treino nenhum e sem disparar
// notificação pro personal. Reusa o mesmo editor do fim do treino em modo
// livre (foto de fundo + marca arrastável + frase opcional).
export default function FotoPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Camera size={24} className="flex-none text-orange" />
          <h1 className="text-2xl font-bold text-navy">Foto pra postar</h1>
        </div>
        <p className="mt-1 text-sm text-blue">
          Tira uma foto (ou escolhe da galeria), posiciona a marca onde quiser, escreve uma frase se
          quiser — e compartilha direto no Instagram. Nada é registrado como treino.
        </p>
      </div>

      <WorkoutShareCard freeMode dateIso={todayInBrazil()} />
    </div>
  );
}
