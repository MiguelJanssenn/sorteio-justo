-- Criar função para excluir rodadas com segurança
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

  -- Para cada atividade afetada, resetar vagas_ocupadas baseado nas escolhas
  FOR atividade_record IN 
    SELECT DISTINCT a.id, a.vagas_ocupadas,
           COUNT(e.id) as total_escolhas
    FROM atividades a
    LEFT JOIN escolhas e ON e.atividade_id = a.id
    LEFT JOIN rodadas r ON e.rodada_id = r.id
    WHERE r.escala_id = escala_id_param
    GROUP BY a.id, a.vagas_ocupadas
  LOOP
    -- Calcular o novo valor de vagas_ocupadas (atual - escolhas desta escala)
    UPDATE atividades 
    SET vagas_ocupadas = GREATEST(0, vagas_ocupadas - atividade_record.total_escolhas)
    WHERE id = atividade_record.id;
  END LOOP;

  -- Contar e excluir escolhas
  SELECT COUNT(*) INTO escolhas_excluidas
  FROM escolhas e
  INNER JOIN rodadas r ON e.rodada_id = r.id
  WHERE r.escala_id = escala_id_param;

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