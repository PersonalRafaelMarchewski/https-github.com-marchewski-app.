-- Biblioteca de exercícios expandida — rode no SQL Editor do Supabase.
-- Idempotente: usa o nome como chave, não duplica quem já existe
-- (nem os 41 que você já tem cadastrados, incluindo os que você mesmo criou).

insert into exercises (name, muscle_group, instructions)
select v.name, v.muscle_group, v.instructions
from (values
  -- Peito
  ('Supino reto com halteres', 'Peito', 'Deitado no banco, halteres na altura do peito, empurre até estender os braços sem travar os cotovelos.'),
  ('Supino declinado', 'Peito', 'Banco declinado, mesmo movimento do supino reto, foco na parte inferior do peito.'),
  ('Peck deck (voador)', 'Peito', 'Sentado no aparelho, aproxime os braços à frente do peito controlando a volta.'),
  ('Pullover', 'Peito', 'Deitado, halter atrás da cabeça, leve o braço até acima do peito em arco.'),
  ('Flexão com pés elevados', 'Peito', 'Pés apoiados numa superfície elevada, desça o tronco controlado e empurre de volta.'),
  ('Flexão diamante', 'Peito', 'Mãos próximas formando um losango sob o peito, foco em peito e tríceps.'),
  ('Crucifixo inclinado', 'Peito', 'Banco inclinado, halteres com braços levemente flexionados, abra e feche em arco.'),

  -- Costas
  ('Levantamento terra', 'Costas', 'Pés na largura do quadril, flexione o quadril mantendo a coluna neutra, suba estendendo quadril e joelhos.'),
  ('Remada cavalinho (T-bar)', 'Costas', 'Tronco inclinado, puxe a barra em direção ao abdômen mantendo a coluna reta.'),
  ('Remada unilateral com halter (serrote)', 'Costas', 'Um joelho apoiado no banco, puxe o halter em direção ao quadril de um lado por vez.'),
  ('Puxada supinada', 'Costas', 'Pegada invertida no pulley, puxe a barra até a altura do peito.'),
  ('Pull-over na polia', 'Costas', 'Em pé, corda ou barra alta, puxe em arco até a altura das coxas.'),
  ('Hiperextensão', 'Costas', 'No banco romano, desça o tronco controlado e suba até alinhar com as pernas.'),
  ('Remada máquina', 'Costas', 'Sentado no aparelho, puxe os apoios em direção ao tronco.'),

  -- Pernas
  ('Agachamento búlgaro', 'Pernas', 'Um pé apoiado atrás numa superfície elevada, desça flexionando o joelho da frente.'),
  ('Agachamento sumô', 'Pernas', 'Pés bem afastados apontando para fora, desça mantendo o tronco ereto.'),
  ('Agachamento hack', 'Pernas', 'No aparelho, desça controlado flexionando os joelhos e suba sem travar.'),
  ('Passada (walking lunge)', 'Pernas', 'Passos alternados à frente, descendo o joelho de trás quase até o chão a cada passo.'),
  ('Cadeira adutora', 'Pernas', 'Sentado no aparelho, aproxime as pernas contra a resistência.'),
  ('Cadeira abdutora', 'Pernas', 'Sentado no aparelho, afaste as pernas contra a resistência.'),
  ('Panturrilha sentado', 'Panturrilha', 'Sentado no aparelho, suba na ponta dos pés e desça controlado.'),
  ('Panturrilha no leg press', 'Panturrilha', 'Na plataforma do leg press, empurre com a ponta dos pés estendendo o tornozelo.'),
  ('Stiff com halteres', 'Posterior de coxa', 'Halteres à frente do corpo, desça mantendo pernas semi-flexionadas e coluna neutra.'),
  ('Mesa flexora', 'Posterior de coxa', 'Deitado de bruços, flexione os joelhos trazendo o calcanhar até o glúteo.'),
  ('Good morning', 'Posterior de coxa', 'Barra nas costas, incline o tronco à frente mantendo a coluna reta, volte à posição inicial.'),

  -- Glúteos
  ('Hip thrust', 'Glúteos', 'Costas apoiadas no banco, barra sobre o quadril, empurre o quadril para cima contraindo o glúteo.'),
  ('Elevação pélvica no chão', 'Glúteos', 'Deitado, pés apoiados no chão, eleve o quadril contraindo o glúteo no topo.'),
  ('Coice no cabo', 'Glúteos', 'No cabo com tornozeleira, empurre a perna para trás contraindo o glúteo.'),
  ('Abdução de quadril em pé', 'Glúteos', 'No cabo ou com elástico, afaste a perna lateralmente contra a resistência.'),

  -- Ombros
  ('Desenvolvimento Arnold', 'Ombros', 'Halteres, gire os punhos de dentro pra fora enquanto empurra acima da cabeça.'),
  ('Elevação lateral no cabo', 'Ombros', 'No cabo, eleve o braço lateralmente até a altura do ombro.'),
  ('Face pull', 'Ombros', 'No cabo com corda na altura do rosto, puxe abrindo os cotovelos pra trás.'),
  ('Manguito rotador', 'Ombros', 'Com elástico ou halter leve, rotacione o braço mantendo o cotovelo fixo ao lado do corpo.'),
  ('Desenvolvimento máquina', 'Ombros', 'Sentado no aparelho, empurre os apoios acima da cabeça.'),

  -- Trapézio
  ('Encolhimento com halteres', 'Trapézio', 'Halteres ao lado do corpo, eleve os ombros em direção às orelhas e desça controlado.'),
  ('Encolhimento com barra', 'Trapézio', 'Barra à frente do corpo, eleve os ombros em direção às orelhas.'),

  -- Bíceps
  ('Rosca 21', 'Bíceps', 'Barra, 7 reps na metade inferior + 7 na metade superior + 7 completas, sem descanso entre os blocos.'),
  ('Rosca concentrada', 'Bíceps', 'Sentado, cotovelo apoiado na coxa, flexione o braço isoladamente.'),
  ('Rosca no cabo', 'Bíceps', 'No cabo baixo, flexione os cotovelos sem mover os braços.'),
  ('Rosca inversa', 'Bíceps', 'Pegada pronada na barra, flexione os cotovelos — trabalha antebraço também.'),

  -- Tríceps
  ('Tríceps francês', 'Tríceps', 'Deitado ou sentado, halter atrás da cabeça, estenda os cotovelos.'),
  ('Tríceps coice (kickback)', 'Tríceps', 'Tronco inclinado, cotovelo fixo, estenda o braço para trás.'),
  ('Supino fechado', 'Tríceps', 'Pegada estreita na barra, foco no tríceps ao empurrar.'),
  ('Tríceps banco (mergulho entre bancos)', 'Tríceps', 'Mãos num banco e pés noutro, desça e suba flexionando os cotovelos.'),

  -- Antebraço
  ('Rosca de punho', 'Antebraço', 'Antebraço apoiado, flexione o punho para cima segurando a barra.'),
  ('Rosca de punho invertida', 'Antebraço', 'Antebraço apoiado, pegada pronada, flexione o punho para cima.'),

  -- Abdômen
  ('Prancha lateral', 'Abdômen', 'Apoiado no antebraço e lateral do pé, mantenha o corpo alinhado e o core contraído.'),
  ('Abdominal bicicleta', 'Abdômen', 'Deitado, pedale alternando cotovelo e joelho opostos.'),
  ('Abdominal remador', 'Abdômen', 'Deitado, suba tronco e pernas simultaneamente formando um V.'),
  ('Abdominal na polia (crunch cabo)', 'Abdômen', 'Ajoelhado de frente pro cabo alto, flexione o tronco contraindo o abdômen.'),
  ('Rotação de tronco no cabo', 'Abdômen', 'Em pé, gire o tronco puxando o cabo na diagonal, controlando a volta.'),

  -- Cardio
  ('Elíptico', 'Cardio', 'Movimento contínuo em ritmo constante ou intervalado.'),
  ('Pular corda', 'Cardio', 'Saltos contínuos girando a corda, ritmo constante ou intervalado.'),
  ('Remo (ergômetro)', 'Cardio', 'Puxada completa com pernas, tronco e braços em sequência coordenada.'),
  ('Burpee', 'Cardio', 'Agache, apoie as mãos, jogue os pés para trás, flexione os braços, volte e salte.'),
  ('Circuito HIIT', 'Cardio', 'Blocos de alta intensidade intercalados com descanso curto, conforme prescrição.')
) as v(name, muscle_group, instructions)
where not exists (
  select 1 from exercises e where e.name = v.name
);
