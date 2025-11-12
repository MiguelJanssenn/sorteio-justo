-- Função para avançar para o próximo participante na rodada
CREATE OR REPLACE FUNCTION public.avancar_rodada(rodada_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rodada_atual record;
  proximo_indice integer;
  resultado json;
BEGIN
  -- Buscar rodada atual
  SELECT * INTO rodada_atual
  FROM rodadas
  WHERE id = rodada_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rodada não encontrada';
  END IF;
  
  -- Calcular próximo índice
  proximo_indice := rodada_atual.indice_atual + 1;
  
  -- Verificar se a rodada está finalizada
  IF proximo_indice >= array_length(rodada_atual.ordem_sorteada, 1) THEN
    -- Finalizar rodada atual
    UPDATE rodadas
    SET indice_atual = proximo_indice,
        finalizada = true
    WHERE id = rodada_id_param;
    
    resultado := json_build_object(
      'sucesso', true,
      'rodada_finalizada', true,
      'proximo_indice', proximo_indice
    );
  ELSE
    -- Avançar para próximo participante
    UPDATE rodadas
    SET indice_atual = proximo_indice
    WHERE id = rodada_id_param;
    
    resultado := json_build_object(
      'sucesso', true,
      'rodada_finalizada', false,
      'proximo_indice', proximo_indice
    );
  END IF;
  
  RETURN resultado;
END;
$$;