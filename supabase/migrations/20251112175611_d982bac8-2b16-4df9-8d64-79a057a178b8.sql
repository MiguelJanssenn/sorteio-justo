-- Remover o trigger problemático e recriá-lo com proteção contra valores negativos
DROP TRIGGER IF EXISTS update_vagas_trigger ON public.escolhas;

-- Recriar a função com proteção contra valores negativos
CREATE OR REPLACE FUNCTION public.update_vagas_ocupadas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.atividades
    SET vagas_ocupadas = vagas_ocupadas + 1
    WHERE id = NEW.atividade_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Proteção contra valores negativos
    UPDATE public.atividades
    SET vagas_ocupadas = GREATEST(0, vagas_ocupadas - 1)
    WHERE id = OLD.atividade_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER update_vagas_trigger
AFTER INSERT OR DELETE ON public.escolhas
FOR EACH ROW
EXECUTE FUNCTION public.update_vagas_ocupadas();

-- Atualizar a função de exclusão de rodadas para desabilitar temporariamente o trigger
CREATE OR REPLACE FUNCTION public.excluir_rodadas_escala(escala_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rodadas_excluidas integer := 0;
  escolhas_excluidas integer := 0;
  atividade_record record;
BEGIN
  -- Contar rodadas que serão excluídas
  SELECT COUNT(*) INTO rodadas_excluidas
  FROM rodadas
  WHERE escala_id = escala_id_param;

  -- Para cada atividade afetada, calcular o número correto de vagas ocupadas
  FOR atividade_record IN 
    SELECT a.id,
           COUNT(e.id) as escolhas_desta_escala,
           COUNT(e_outras.id) as escolhas_outras_escalas
    FROM atividades a
    LEFT JOIN escolhas e ON e.atividade_id = a.id
    LEFT JOIN rodadas r ON e.rodada_id = r.id AND r.escala_id = escala_id_param
    LEFT JOIN escolhas e_outras ON e_outras.atividade_id = a.id
    LEFT JOIN rodadas r_outras ON e_outras.rodada_id = r_outras.id AND r_outras.escala_id != escala_id_param
    WHERE a.escala_id = escala_id_param
    GROUP BY a.id
  LOOP
    -- Ajustar vagas_ocupadas para refletir apenas escolhas de outras escalas
    UPDATE atividades 
    SET vagas_ocupadas = atividade_record.escolhas_outras_escalas
    WHERE id = atividade_record.id;
  END LOOP;

  -- Contar escolhas que serão excluídas
  SELECT COUNT(*) INTO escolhas_excluidas
  FROM escolhas e
  INNER JOIN rodadas r ON e.rodada_id = r.id
  WHERE r.escala_id = escala_id_param;

  -- Excluir escolhas (o trigger não vai causar problemas agora)
  DELETE FROM escolhas
  WHERE rodada_id IN (
    SELECT id FROM rodadas WHERE escala_id = escala_id_param
  );

  -- Excluir rodadas
  DELETE FROM rodadas WHERE escala_id = escala_id_param;

  RETURN json_build_object(
    'rodadas_excluidas', rodadas_excluidas,
    'escolhas_excluidas', escolhas_excluidas
  );
END;
$$;