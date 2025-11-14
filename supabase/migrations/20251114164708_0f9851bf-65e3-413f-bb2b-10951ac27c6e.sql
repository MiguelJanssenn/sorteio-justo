-- Criar tabela de modelos de estágio (templates)
CREATE TABLE IF NOT EXISTS public.modelos_estagio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  meses_recomendados TEXT[], -- Ex: ['março', 'setembro']
  num_subgrupos INTEGER NOT NULL DEFAULT 1,
  tem_rotacao BOOLEAN NOT NULL DEFAULT false, -- Se os subgrupos rotacionam entre especialidades
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Criar tabela de tipos de atividade por modelo
CREATE TABLE IF NOT EXISTS public.tipos_atividade_modelo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo_id UUID NOT NULL REFERENCES public.modelos_estagio(id) ON DELETE CASCADE,
  nome TEXT NOT NULL, -- Ex: "Plantão PS-CM", "Alojamento", "Evolução FDS"
  codigo TEXT NOT NULL, -- Ex: "plantao_ps", "alojamento", "evolucao_fds"
  descricao TEXT,
  modo_participacao TEXT NOT NULL DEFAULT 'sozinho', -- 'sozinho', 'dupla', 'grupo'
  vagas_por_slot INTEGER NOT NULL DEFAULT 1, -- Quantas pessoas por vez
  quota_minima INTEGER, -- Quota mínima por participante
  quota_maxima INTEGER, -- Quota máxima por participante
  permite_fim_semana BOOLEAN NOT NULL DEFAULT true,
  permite_feriado BOOLEAN NOT NULL DEFAULT true,
  horario_inicio TIME,
  horario_fim TIME,
  cor_dashboard TEXT, -- Cor para exibição no dashboard
  ordem_exibicao INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de configuração de subgrupos e períodos
CREATE TABLE IF NOT EXISTS public.configuracao_subgrupos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo_id UUID NOT NULL REFERENCES public.modelos_estagio(id) ON DELETE CASCADE,
  nome_subgrupo TEXT NOT NULL, -- Ex: "G1", "G2", "G3"
  ordem INTEGER NOT NULL, -- Ordem do subgrupo (1, 2, 3)
  especialidade_periodo1 TEXT, -- Ex: "Gastro", "PS"
  especialidade_periodo2 TEXT, -- Ex: "Pneumo", "DIP"
  especialidade_periodo3 TEXT, -- Para modelos com 3 períodos
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de períodos de rotação
CREATE TABLE IF NOT EXISTS public.periodos_rotacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escala_id UUID NOT NULL REFERENCES public.escalas(id) ON DELETE CASCADE,
  numero_periodo INTEGER NOT NULL, -- 1, 2, 3
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  descricao TEXT, -- Ex: "G1 na Gastro, G2 na Pneumo"
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campo modelo_id na tabela escalas
ALTER TABLE public.escalas ADD COLUMN IF NOT EXISTS modelo_id UUID REFERENCES public.modelos_estagio(id);

-- Adicionar campos adicionais na tabela atividades para suportar modelos
ALTER TABLE public.atividades ADD COLUMN IF NOT EXISTS tipo_atividade_id UUID REFERENCES public.tipos_atividade_modelo(id);
ALTER TABLE public.atividades ADD COLUMN IF NOT EXISTS especialidade TEXT; -- Ex: "Gastro", "Pneumo", "PS", "DIP"
ALTER TABLE public.atividades ADD COLUMN IF NOT EXISTS periodo_numero INTEGER; -- Qual período da rotação
ALTER TABLE public.atividades ADD COLUMN IF NOT EXISTS subgrupo_permitido TEXT; -- Ex: "G1", "G2", "todos"

-- Adicionar campo subgrupo na tabela participacao_escalas
ALTER TABLE public.participacao_escalas ADD COLUMN IF NOT EXISTS subgrupo TEXT; -- Ex: "G1", "G2", "G3"

-- RLS Policies para modelos_estagio
ALTER TABLE public.modelos_estagio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage modelos_estagio"
ON public.modelos_estagio
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view modelos_estagio"
ON public.modelos_estagio
FOR SELECT
TO authenticated
USING (true);

-- RLS Policies para tipos_atividade_modelo
ALTER TABLE public.tipos_atividade_modelo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tipos_atividade_modelo"
ON public.tipos_atividade_modelo
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view tipos_atividade_modelo"
ON public.tipos_atividade_modelo
FOR SELECT
TO authenticated
USING (true);

-- RLS Policies para configuracao_subgrupos
ALTER TABLE public.configuracao_subgrupos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage configuracao_subgrupos"
ON public.configuracao_subgrupos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view configuracao_subgrupos"
ON public.configuracao_subgrupos
FOR SELECT
TO authenticated
USING (true);

-- RLS Policies para periodos_rotacao
ALTER TABLE public.periodos_rotacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage periodos_rotacao"
ON public.periodos_rotacao
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view periodos_rotacao"
ON public.periodos_rotacao
FOR SELECT
TO authenticated
USING (true);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_tipos_atividade_modelo_modelo_id ON public.tipos_atividade_modelo(modelo_id);
CREATE INDEX IF NOT EXISTS idx_configuracao_subgrupos_modelo_id ON public.configuracao_subgrupos(modelo_id);
CREATE INDEX IF NOT EXISTS idx_periodos_rotacao_escala_id ON public.periodos_rotacao(escala_id);
CREATE INDEX IF NOT EXISTS idx_escalas_modelo_id ON public.escalas(modelo_id);
CREATE INDEX IF NOT EXISTS idx_atividades_tipo_atividade_id ON public.atividades(tipo_atividade_id);
CREATE INDEX IF NOT EXISTS idx_atividades_especialidade ON public.atividades(especialidade);
CREATE INDEX IF NOT EXISTS idx_participacao_escalas_subgrupo ON public.participacao_escalas(subgrupo);