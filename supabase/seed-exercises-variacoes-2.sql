-- Mais variações na biblioteca de exercícios (rodada 3) — rode no SQL
-- Editor do Supabase. Idempotente: não duplica quem já existe.
-- Foco extra em Cardio, que ainda estava curto.

insert into exercises (name, muscle_group, instructions)
select v.name, v.muscle_group, v.instructions
from (values
  -- Cardio (foco extra)
  ('Mountain climber', 'Cardio', 'Posição de prancha, alterne os joelhos em direção ao peito em ritmo acelerado.'),
  ('Polichinelo (jumping jack)', 'Cardio', 'Salte abrindo pernas e braços simultaneamente, volte à posição inicial.'),
  ('Agachamento com salto', 'Cardio', 'Desça no agachamento e exploda para cima saltando, aterrisse suave.'),
  ('Escalador em caixa (box jump)', 'Cardio', 'Salte com os dois pés sobre uma caixa ou plataforma estável, desça controlado.'),
  ('Kettlebell swing', 'Cardio', 'Balance o kettlebell entre as pernas até a altura dos ombros usando o quadril.'),
  ('Corrida intervalada na esteira', 'Cardio', 'Alterne blocos de corrida forte com blocos de caminhada/trote, conforme prescrição.'),
  ('Caminhada inclinada na esteira', 'Cardio', 'Caminhada em ritmo moderado com a esteira inclinada, sem correr.'),
  ('Bicicleta spinning', 'Cardio', 'Pedalada intensa em ritmo constante ou intervalado, com resistência ajustável.'),
  ('Assault bike', 'Cardio', 'Pedalada com os braços e pernas simultaneamente, ritmo constante ou intervalado.'),
  ('Battle rope', 'Cardio', 'Segure as cordas e alterne ondulações rápidas com os braços em alta intensidade.'),
  ('Slam ball', 'Cardio', 'Eleve a bola acima da cabeça e arremesse com força contra o chão, repita.'),
  ('Step up no banco', 'Cardio', 'Suba e desça de um banco ou caixa alternando as pernas em ritmo acelerado.'),
  ('Shadow boxing', 'Cardio', 'Socos no ar em sequência, mantendo o corpo em movimento constante.'),
  ('Escada de agilidade', 'Cardio', 'Passadas rápidas e coordenadas dentro dos quadrados da escada de agilidade.'),
  ('Subida de escada real', 'Cardio', 'Suba lances de escada em ritmo acelerado, desça caminhando pra recuperar.'),
  ('Natação', 'Cardio', 'Nado contínuo em ritmo constante ou intervalado, conforme condicionamento.'),
  ('Corrida de rua', 'Cardio', 'Corrida ao ar livre em ritmo constante ou intervalado.'),
  ('Circuito funcional', 'Cardio', 'Sequência de exercícios variados em estações, com pouco ou nenhum descanso entre eles.'),
  ('Sprint', 'Cardio', 'Corrida em velocidade máxima por distância curta, com recuperação completa entre tiros.'),
  ('Remada indoor intervalada', 'Cardio', 'No ergômetro de remo, alterne blocos intensos com blocos leves.'),

  -- Peito
  ('Supino máquina', 'Peito', 'Sentado no aparelho, empurre os apoios à frente até estender os braços.'),
  ('Cross-over baixo', 'Peito', 'No cabo baixo, puxe as alças em diagonal até se cruzarem à frente do peito.'),
  ('Cross-over alto', 'Peito', 'No cabo alto, puxe as alças em diagonal para baixo até se cruzarem.'),
  ('Flexão nos anéis/TRX', 'Peito', 'Mãos nas alças suspensas, desça o tronco controlado e empurre de volta.'),
  ('Flexão explosiva', 'Peito', 'Desça controlado e empurre com força suficiente pra tirar as mãos do chão.'),

  -- Costas
  ('Remada invertida (barra fixa baixa)', 'Costas', 'Deitado sob a barra baixa, puxe o corpo até o peito encostar, mantendo o corpo reto.'),
  ('Remada no TRX', 'Costas', 'Segure as alças suspensas, incline o corpo pra trás e puxe até o peito.'),
  ('Puxada neutra', 'Costas', 'Pegada neutra (palmas viradas uma pra outra) no pulley, puxe até o peito.'),
  ('Superman', 'Costas', 'Deitado de bruços, eleve braços e pernas simultaneamente contraindo a lombar.'),

  -- Pernas
  ('Agachamento frontal', 'Pernas', 'Barra apoiada à frente dos ombros, desça mantendo o tronco ereto.'),
  ('Passada lateral', 'Pernas', 'Passo largo para o lado, flexione o joelho de apoio mantendo a outra perna estendida.'),
  ('Step up no banco (força)', 'Pernas', 'Suba num banco alto com uma perna de cada vez, controlando a descida.'),
  ('Leg press unilateral', 'Pernas', 'No leg press, empurre a plataforma com uma perna de cada vez.'),
  ('Cadeira extensora unilateral', 'Pernas', 'Estenda um joelho de cada vez no aparelho, controlando a descida.'),

  -- Posterior de coxa
  ('Levantamento terra romeno', 'Posterior de coxa', 'Barra à frente das coxas, desça mantendo as pernas quase estendidas e a coluna neutra.'),
  ('Mesa flexora unilateral', 'Posterior de coxa', 'Flexione o joelho de uma perna por vez no aparelho.'),

  -- Glúteos
  ('Elevação pélvica unilateral', 'Glúteos', 'Uma perna apoiada, eleve o quadril contraindo o glúteo do lado de apoio.'),
  ('Agachamento sumô com halter', 'Glúteos', 'Pés afastados, segure um halter com as duas mãos e desça entre as pernas.'),
  ('Cadeira extensora de glúteo', 'Glúteos', 'No aparelho específico, empurre a perna para trás contraindo o glúteo.'),

  -- Ombros
  ('Crucifixo invertido (peck deck)', 'Ombros', 'Sentado de frente pro aparelho, abra os braços para trás trabalhando o deltoide posterior.'),
  ('Elevação lateral deitado', 'Ombros', 'Deitado de lado no banco, eleve o braço lateralmente até a altura do ombro.'),
  ('Remada alta com halteres', 'Ombros', 'Halteres à frente do corpo, puxe verticalmente até a altura do peito.'),

  -- Trapézio
  ('Encolhimento no cabo', 'Trapézio', 'De frente pro cabo baixo, eleve os ombros em direção às orelhas.'),

  -- Bíceps
  ('Rosca Zottman', 'Bíceps', 'Suba com pegada supinada e desça com pegada pronada, trabalhando bíceps e antebraço.'),
  ('Rosca spider', 'Bíceps', 'Deitado de bruços num banco inclinado, flexione os cotovelos com os braços pendurados.'),

  -- Tríceps
  ('Tríceps testa unilateral', 'Tríceps', 'Com um halter, estenda o cotovelo de um braço por vez atrás da cabeça.'),
  ('Extensão de tríceps acima da cabeça', 'Tríceps', 'Halter ou corda acima da cabeça, estenda os cotovelos mantendo os braços fixos.'),

  -- Antebraço
  ('Caminhada do fazendeiro (farmer''s walk)', 'Antebraço', 'Segure um peso pesado em cada mão e caminhe mantendo a postura ereta.'),
  ('Prancha com preensão (dead hang)', 'Antebraço', 'Suspenso na barra sem se mover, sustente o peso do corpo o máximo possível.'),

  -- Abdômen
  ('Abdominal canivete', 'Abdômen', 'Deitado, suba tronco e pernas ao mesmo tempo tentando tocar os pés.'),
  ('Ab wheel (rolete abdominal)', 'Abdômen', 'Ajoelhado, role a roda à frente estendendo o corpo e volte contraindo o abdômen.'),
  ('Dead bug', 'Abdômen', 'Deitado, estenda braço e perna opostos mantendo a lombar apoiada no chão.'),
  ('Prancha com toque no ombro', 'Abdômen', 'Em prancha, toque o ombro oposto com a mão alternando os lados sem balançar o quadril.')
) as v(name, muscle_group, instructions)
where not exists (
  select 1 from exercises e where e.name = v.name
);
