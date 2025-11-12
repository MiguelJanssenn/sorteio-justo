-- Dropar trigger e função existentes
DROP TRIGGER IF EXISTS trigger_criar_proxima_rodada ON public.rodadas;
DROP FUNCTION IF EXISTS public.criar_proxima_rodada();

-- Recriar a função atualizada para excluir admins
CREATE OR REPLACE FUNCTION public.criar_proxima_rodada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  participantes_ids uuid[];
  novo_numero integer;
BEGIN
  -- Apenas executar quando a rodada for marcada como finalizada
  IF NEW.finalizada = true AND OLD.finalizada = false THEN
    
    -- Buscar apenas participantes (excluir admins)
    SELECT ARRAY_AGG(user_id)
    INTO participantes_ids
    FROM public.user_roles
    WHERE role = 'participante';
    
    -- Calcular o número da próxima rodada
    novo_numero := NEW.numero + 1;
    
    -- Criar nova rodada com ordem sorteada aleatoriamente
    INSERT INTO public.rodadas (
      escala_id,
      numero,
      ordem_sorteada,
      indice_atual,
      finalizada
    ) VALUES (
      NEW.escala_id,
      novo_numero,
      (SELECT ARRAY_AGG(id ORDER BY random()) FROM unnest(participantes_ids) AS id),
      0,
      false
    );
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recriar o trigger
CREATE TRIGGER trigger_criar_proxima_rodada
  AFTER UPDATE ON public.rodadas
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_proxima_rodada();