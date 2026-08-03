-- Biblioteca inicial de exercícios — rode no SQL Editor do Supabase.
-- Idempotente: não duplica se você rodar de novo (usa nome como chave de checagem).

insert into exercises (name, muscle_group, instructions)
select v.name, v.muscle_group, v.instructions
from (values
  -- Peito
  ('Supino reto', 'Peito', 'Deite no banco, barra na altura do peito, desça controlado e empurre até estender os braços.'),
  ('Supino inclinado', 'Peito', 'Banco inclinado a 30-45°, mesmo movimento do supino reto, foco na parte superior do peito.'),
  ('Crucifixo', 'Peito', 'Com halteres, braços levemente flexionados, abra e feche como um abraço.'),
  ('Flexão de braço', 'Peito', 'Corpo alinhado, desça até quase tocar o chão e empurre de volta.'),
  ('Crossover', 'Peito', 'No cabo, puxe as duas alças à frente do corpo em movimento de arco.'),

  -- Costas
  ('Puxada frente', 'Costas', 'Puxe a barra do pulley até a altura do queixo/peito, controle a subida.'),
  ('Remada baixa', 'Costas', 'Sentado no cabo, puxe o triângulo até o abdômen mantendo a coluna reta.'),
  ('Barra fixa', 'Costas', 'Suspenso na barra, puxe o corpo até o queixo passar da barra.'),
  ('Remada curvada', 'Costas', 'Tronco inclinado à frente, puxe a barra em direção ao abdômen.'),
  ('Puxada alta unilateral', 'Costas', 'No cabo, puxe com um braço de cada vez até a altura do quadril.'),

  -- Pernas
  ('Agachamento livre', 'Pernas', 'Pés na largura dos ombros, desça flexionando joelhos e quadril, suba controlado.'),
  ('Leg press', 'Pernas', 'Sentado no aparelho, empurre a plataforma estendendo as pernas sem travar os joelhos.'),
  ('Cadeira extensora', 'Pernas', 'Sentado, estenda os joelhos até quase travar, controle a descida.'),
  ('Cadeira flexora', 'Pernas', 'Deitado ou sentado, flexione os joelhos trazendo o calcanhar até o glúteo.'),
  ('Afundo', 'Pernas', 'Um passo à frente, desça o joelho de trás quase até o chão, volte à posição inicial.'),
  ('Stiff', 'Posterior de coxa', 'Pernas semi-flexionadas, desça o tronco mantendo a barra próxima ao corpo.'),
  ('Panturrilha em pé', 'Panturrilha', 'Suba na ponta dos pés o máximo possível, desça controlado.'),

  -- Ombros
  ('Desenvolvimento militar', 'Ombros', 'Empurre a barra ou halteres acima da cabeça a partir dos ombros.'),
  ('Elevação lateral', 'Ombros', 'Halteres ao lado do corpo, eleve os braços até a altura dos ombros.'),
  ('Elevação frontal', 'Ombros', 'Halteres à frente das coxas, eleve até a altura dos ombros.'),
  ('Remada alta', 'Ombros', 'Puxe a barra verticalmente até a altura do peito, cotovelos para cima.'),

  -- Bíceps
  ('Rosca direta', 'Bíceps', 'Barra ou halteres, flexione os cotovelos sem mover os braços.'),
  ('Rosca alternada', 'Bíceps', 'Halteres, flexione um braço de cada vez.'),
  ('Rosca martelo', 'Bíceps', 'Halteres com pegada neutra, flexione os cotovelos.'),
  ('Rosca scott', 'Bíceps', 'Apoiado no banco scott, flexione os cotovelos controlando a descida.'),

  -- Tríceps
  ('Tríceps pulley', 'Tríceps', 'No cabo, estenda os cotovelos empurrando a barra para baixo.'),
  ('Tríceps testa', 'Tríceps', 'Deitado, desça a barra em direção à testa e estenda os cotovelos.'),
  ('Tríceps corda', 'Tríceps', 'No cabo com corda, estenda os cotovelos abrindo as mãos no final.'),
  ('Mergulho no banco', 'Tríceps', 'Mãos apoiadas no banco atrás do corpo, flexione e estenda os cotovelos.'),

  -- Abdômen
  ('Abdominal supra', 'Abdômen', 'Deitado, flexione o tronco em direção aos joelhos.'),
  ('Prancha', 'Abdômen', 'Apoiado nos antebraços e pés, mantenha o corpo reto e core contraído.'),
  ('Abdominal infra', 'Abdômen', 'Deitado, eleve as pernas em direção ao teto controlando o movimento.'),
  ('Elevação de pernas', 'Abdômen', 'Suspenso ou deitado, eleve as pernas estendidas até 90°.'),

  -- Cardio
  ('Esteira', 'Cardio', 'Caminhada ou corrida em ritmo constante ou intervalado.'),
  ('Bicicleta ergométrica', 'Cardio', 'Pedalada em ritmo constante ou intervalado.'),
  ('Corda naval', 'Cardio', 'Movimente as cordas alternando os braços em alta intensidade.'),
  ('Escada (step)', 'Cardio', 'Subida e descida em ritmo constante ou intervalado.')
) as v(name, muscle_group, instructions)
where not exists (
  select 1 from exercises e where e.name = v.name
);
