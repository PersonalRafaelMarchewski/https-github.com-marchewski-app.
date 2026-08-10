import Image from "next/image";
import PublicSignupForm from "@/components/PublicSignupForm";

export default function CadastroPublicoPage() {
  return (
    <div className="min-h-screen bg-lightblue/10 px-4 py-8">
      <div className="mb-6 flex justify-center">
        <Image src="/logo-positivo.png" alt="Marchewski" width={140} height={78} unoptimized />
      </div>
      <PublicSignupForm />
    </div>
  );
}
