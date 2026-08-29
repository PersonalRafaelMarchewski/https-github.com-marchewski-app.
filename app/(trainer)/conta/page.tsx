import ChangePasswordForm from "@/components/ChangePasswordForm";
import TestimonialLinkCard from "@/components/TestimonialLinkCard";

export default function ContaPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Minha conta</h1>
      <ChangePasswordForm />

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-navy">Links para compartilhar</h2>
        <TestimonialLinkCard />
      </section>
    </div>
  );
}
