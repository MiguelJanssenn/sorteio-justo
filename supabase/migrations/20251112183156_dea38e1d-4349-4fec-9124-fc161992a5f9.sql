-- Corrigir search_path das funções criadas
CREATE OR REPLACE FUNCTION update_vagas_ocupadas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE atividades
    SET vagas_ocupadas = vagas_ocupadas + 1
    WHERE id = NEW.atividade_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE atividades
    SET vagas_ocupadas = GREATEST(0, vagas_ocupadas - 1)
    WHERE id = OLD.atividade_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION prevenir_escolha_atividade_lotada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  vagas_atuais integer;
  vagas_max integer;
BEGIN
  -- Buscar vagas atuais e máximas
  SELECT vagas_ocupadas, vagas_total 
  INTO vagas_atuais, vagas_max
  FROM atividades
  WHERE id = NEW.atividade_id;
  
  -- Verificar se já está lotada
  IF vagas_atuais >= vagas_max THEN
    RAISE EXCEPTION 'Atividade já está lotada. Vagas: %/%', vagas_atuais, vagas_max;
  END IF;
  
  RETURN NEW;
END;
$$;