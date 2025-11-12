-- Remover constraint antiga
ALTER TABLE public.regras DROP CONSTRAINT IF EXISTS regras_tipo_regra_check;

-- Adicionar constraint atualizado com todos os tipos de regras
ALTER TABLE public.regras ADD CONSTRAINT regras_tipo_regra_check 
CHECK (tipo_regra = ANY (ARRAY[
  'obrigatorio_fim_semana'::text,
  'cota_atividades'::text, 
  'preenchimento_sequencial'::text,
  'ordem_por_tipo'::text
]));