-- Criar tabela para controlar participação dos usuários nas escalas
CREATE TABLE public.participacao_escalas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  escala_id UUID NOT NULL REFERENCES public.escalas(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, escala_id)
);

-- Enable RLS
ALTER TABLE public.participacao_escalas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver sua própria participação"
  ON public.participacao_escalas
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar sua própria participação"
  ON public.participacao_escalas
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar sua própria participação"
  ON public.participacao_escalas
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todas as participações"
  ON public.participacao_escalas
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Atualizar a função criar_proxima_rodada para considerar participação ativa
DROP TRIGGER IF EXISTS trigger_criar_proxima_rodada ON public.rodadas;
DROP FUNCTION IF EXISTS public.criar_proxima_rodada();

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
    
    -- Buscar apenas participantes ativos nesta escala (excluir admins)
    SELECT ARRAY_AGG(pe.user_id)
    INTO participantes_ids
    FROM public.participacao_escalas pe
    INNER JOIN public.user_roles ur ON pe.user_id = ur.user_id
    WHERE pe.escala_id = NEW.escala_id
      AND pe.ativo = true
      AND ur.role = 'participante';
    
    -- Se não houver participantes ativos, retornar sem criar nova rodada
    IF participantes_ids IS NULL OR array_length(participantes_ids, 1) IS NULL THEN
      RETURN NEW;
    END IF;
    
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