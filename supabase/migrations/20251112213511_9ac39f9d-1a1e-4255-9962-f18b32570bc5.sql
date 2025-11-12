-- Adicionar campo para pausar rodadas em escalas
ALTER TABLE public.escalas
ADD COLUMN rodadas_pausadas boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.escalas.rodadas_pausadas IS 'Indica se as rodadas estão pausadas para permitir ajustes e trocas';