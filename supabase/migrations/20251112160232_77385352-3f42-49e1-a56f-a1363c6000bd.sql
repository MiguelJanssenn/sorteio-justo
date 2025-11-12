-- Habilitar realtime para a tabela rodadas
ALTER PUBLICATION supabase_realtime ADD TABLE public.rodadas;

-- Habilitar realtime para a tabela escolhas
ALTER PUBLICATION supabase_realtime ADD TABLE public.escolhas;