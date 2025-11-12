-- Atualizar função para resetar vagas e opcionalmente excluir escolhas
CREATE OR REPLACE FUNCTION public.resetar_vagas_ocupadas(
  escala_id_param uuid DEFAULT NULL,
  excluir_escolhas boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  atividades_resetadas integer := 0;
  escolhas_excluidas integer := 0;
BEGIN
  -- Se deve excluir escolhas primeiro
  IF excluir_escolhas THEN
    IF escala_id_param IS NOT NULL THEN
      -- Excluir escolhas de atividades desta escala
      DELETE FROM escolhas
      WHERE atividade_id IN (
        SELECT id FROM atividades WHERE escala_id = escala_id_param
      );
      
      GET DIAGNOSTICS escolhas_excluidas = ROW_COUNT;
    ELSE
      -- Excluir todas as escolhas
      DELETE FROM escolhas;
      
      GET DIAGNOSTICS escolhas_excluidas = ROW_COUNT;
    END IF;
  END IF;

  -- Resetar vagas ocupadas
  IF escala_id_param IS NOT NULL THEN
    UPDATE atividades 
    SET vagas_ocupadas = 0
    WHERE escala_id = escala_id_param;
    
    GET DIAGNOSTICS atividades_resetadas = ROW_COUNT;
  ELSE
    UPDATE atividades 
    SET vagas_ocupadas = 0;
    
    GET DIAGNOSTICS atividades_resetadas = ROW_COUNT;
  END IF;

  RETURN json_build_object(
    'atividades_resetadas', atividades_resetadas,
    'escolhas_excluidas', escolhas_excluidas
  );
END;
$$;