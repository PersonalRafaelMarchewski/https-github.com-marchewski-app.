# Deploy e verificação em produção

## Deploy
```bash
git add -A && git commit -m "mensagem" && git push
```
Sem pedir "posso subir?" — é regra já combinada com o Rafa. Uma exceção:
mudanças em schema do Supabase (migrations) merecem uma frase avisando o que
foi alterado, porque não dá pra reverter com um `git revert`.

## O domínio certo
O app está em **`https://app.marchewskiassessoria.com`** — no subdomínio
`app.`, sempre. O domínio raiz `marchewskiassessoria.com` é a landing de
marketing ("Back to Basics"), um site separado onde `/login` devolve 404.
Verificar no raiz por engano faz parecer que o deploy falhou.

## Por que verificar em produção (e não num dev server local)
Em várias sessões o Rafa está usando a porta 3000 localmente **para outro
projeto** ao mesmo tempo. Antes de rodar `preview_start({name: "dev"})`,
**pergunte ou confirme que a porta está livre** — se não tiver certeza, vá
direto pra produção:

```
preview_start({ url: "https://app.marchewskiassessoria.com" })
```

Isso também evita o problema de "o Browser pane não alcança o dev server de
outra sessão" quando outro chat já está com um servidor local rodando nesta
mesma pasta.

## Esperar a propagação da Vercel
Depois do `git push`, a Vercel leva de ~30s a ~2min pra propagar. Não
verifique imediatamente — ou vai ler a versão antiga e concluir (errado) que o
fix não funcionou.

Padrão que funciona bem:
1. Faça o `git push`.
2. `ScheduleWakeup` com uns 60-90s, `noop: true`, explicando o que está
   esperando.
3. Ao acordar (ou ao checar de novo), **sempre adicione um query param novo**
   na URL pra furar cache (`?_r=2`, `?_r=3`, ...) e use `force: true` no
   `navigate` se necessário.
4. Se ainda estiver com a versão antiga, espere mais um ciclo. Normalmente
   resolve em 2-3 tentativas.

## Como confirmar que o fix está no ar (sem depender de screenshot)
O `computer({action:"screenshot"})` falha com frequência neste ambiente
("Browser pane is not displayed"). Prefira inspeção direta do DOM via
`javascript_tool`:

```js
function info(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
}
function overlap(a, b) {
  if (!a || !b) return null;
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}
// pegue os elementos por aria-label/seletor, monte o JSON e leia os números
```

- Pra confirmar que uma classe/posição nova já propagou: leia
  `el.className` direto e compare com o que você escreveu no código.
- Pra confirmar ausência de sobreposição entre dois elementos fixos: use a
  função `overlap()` acima — não confie só em "parece que não bate" visual.
- Pra CSS computado (cor, z-index, overflow): `getComputedStyle(el)`.
- Sempre teste em **dois tamanhos**: desktop (padrão) e mobile
  (`resize_window({ preset: "mobile" })`, 375×812) — o cabeçalho deste app
  reorganiza elementos de forma diferente em cada largura, e um fix que
  parece bom em desktop já causou sobreposição em mobile antes.

## Contas de teste disponíveis
As **senhas** ficam em `senhas-contas-teste.local.md` (mesma pasta, fora do
git — o runbook é versionado, as senhas não).

| Conta | Papel | Login | Observação |
|---|---|---|---|
| QA aluno | aluno | `qa.teste.aluno@marchewskiassessoria.com` | 1 ficha só — não serve pra testar coisas que dependem de várias fichas (ex. selo "Hoje") |
| QA aluno 2 | aluno | `qa.teste.aluno2@marchewskiassessoria.com` | |
| QA personal | personal | `qa.teste.personal@marchewskiassessoria.com` | |
| Rafael-teste | aluno | `rafael.marchewski.teste@marchewskiassessoria.com` | 5 fichas (A/B/C/D/Cardio) + dieta completa — melhor conta pra testar qualquer coisa que dependa de várias fichas ativas |

Não temos a senha da conta real do Rafa (`criptodailycaps@gmail.com`,
`profiles.id = c04a6ec9-6b5d-42e4-aa5e-cf9d4f11ed67`) nem de alunos reais —
pra essas, ou o próprio Rafa testa, ou usamos as contas de teste acima /
inspeção direta via service-role.
