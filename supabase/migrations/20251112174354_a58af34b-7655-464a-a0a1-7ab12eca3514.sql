-- Criar função para resetar vagas ocupadas de todas as atividades
CREATE OR REPLACE FUNCTION public.resetar_vagas_ocupadas(escala_id_param uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  atividades_resetadas integer := 0;
BEGIN
  -- Se escala_id for fornecido, resetar apenas atividades dessa escala
  -- Caso contrário, resetar todas as atividades
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
    'atividades_resetadas', atividades_resetadas
  );
END;
$$;

-- Adicionar policy para impedir que participantes desativem sua participação se houver rodadas ativas
-- Primeiro, criar função para verificar se há rodadas ativas
CREATE OR REPLACE FUNCTION public.has_active_rounds(user_id_param uuid, escala_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rodadas r
    INNER JOIN escolhas e ON e.rodada_id = r.id
    WHERE r.escala_id = escala_id_param
      AND r.finalizada = false
      AND e.user_id = user_id_param
  );
$$;