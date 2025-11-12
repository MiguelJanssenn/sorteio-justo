-- Primeiro, sincronizar vagas_ocupadas com escolhas reais
UPDATE atividades a
SET vagas_ocupadas = (
  SELECT COUNT(*)
  FROM escolhas e
  INNER JOIN rodadas r ON e.rodada_id = r.id
  WHERE e.atividade_id = a.id
    AND r.escala_id = a.escala_id
);

-- Dropar triggers existentes primeiro
DROP TRIGGER IF EXISTS trigger_update_vagas ON escolhas;
DROP TRIGGER IF EXISTS update_vagas_trigger ON escolhas;
DROP TRIGGER IF EXISTS update_vagas_ocupadas_trigger ON escolhas;

-- Dropar função antiga
DROP FUNCTION IF EXISTS update_vagas_ocupadas() CASCADE;

-- Criar nova função de atualização de vagas ocupadas
CREATE OR REPLACE FUNCTION update_vagas_ocupadas()
RETURNS trigger
LANGUAGE plpgsql
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

-- Criar trigger de atualização
CREATE TRIGGER update_vagas_ocupadas_trigger
AFTER INSERT OR DELETE ON escolhas
FOR EACH ROW
EXECUTE FUNCTION update_vagas_ocupadas();

-- Criar função para prevenir inserções em atividades lotadas
CREATE OR REPLACE FUNCTION prevenir_escolha_atividade_lotada()
RETURNS trigger
LANGUAGE plpgsql
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

-- Criar trigger de prevenção
CREATE TRIGGER prevenir_escolha_lotada_trigger
BEFORE INSERT ON escolhas
FOR EACH ROW
EXECUTE FUNCTION prevenir_escolha_atividade_lotada();