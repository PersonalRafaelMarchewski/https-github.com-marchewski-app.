"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { isSessionMarkedAsNotRemembered, makeSessionCookiesTabOnly } from "@/lib/rememberMe";

// Fica escutando os eventos de auth do Supabase a vida inteira da aba.
// O SDK regrava o cookie de sessão (com validade longa) sozinho toda
// vez que reage a um login, refresh de token etc — então, se o
// aluno/personal desmarcou "Manter conectado", reaplicamos o
// rebaixamento pra cookie-de-aba nesses momentos também, não só uma
// vez no login.
export default function RememberMeGuard() {
  useEffect(() => {
    if (!isSessionMarkedAsNotRemembered()) return;

    const supabase = createClient();
    makeSessionCookiesTabOnly();

    const { data } = supabase.auth.onAuthStateChange(() => {
      if (isSessionMarkedAsNotRemembered()) makeSessionCookiesTabOnly();
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return null;
}
