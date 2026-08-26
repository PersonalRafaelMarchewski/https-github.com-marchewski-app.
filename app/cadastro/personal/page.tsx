import Image from "next/image";
import PublicSignupForm from "@/components/PublicSignupForm";

// Mesmo formulário público do /cadastro, mas o aluno entra como PERSONAL
// (presencial) em vez de assessoria — é o link pra mandar pra quem vai
// treinar junto. Compartilha ação, rate limit e Turnstile com o outro.
export default function CadastroPersonalPage() {
  return (
    <div className="min-h-screen bg-lightblue/10 px-4 py-8">
      <div className="mb-6 flex justify-center">
        <Image src="/logo-positivo.png" alt="Marchewski" width={140} height={78} unoptimized />
      </div>
      <PublicSignupForm serviceType="personal" />
    </div>
  );
}
