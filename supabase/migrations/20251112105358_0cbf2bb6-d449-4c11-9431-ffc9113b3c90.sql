-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'participante');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create escalas table
CREATE TABLE public.escalas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'finalizada', 'cancelada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) NOT NULL
);

ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view escalas"
  ON public.escalas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage escalas"
  ON public.escalas FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create atividades table
CREATE TABLE public.atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id UUID REFERENCES public.escalas(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Plantão', 'Ambulatório', 'Enfermaria')),
  data DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  vagas_total INTEGER NOT NULL CHECK (vagas_total > 0),
  vagas_ocupadas INTEGER DEFAULT 0 CHECK (vagas_ocupadas >= 0),
  eh_fim_semana BOOLEAN GENERATED ALWAYS AS (EXTRACT(DOW FROM data) IN (0, 6)) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view atividades"
  ON public.atividades FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage atividades"
  ON public.atividades FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create rodadas table
CREATE TABLE public.rodadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id UUID REFERENCES public.escalas(id) ON DELETE CASCADE NOT NULL,
  numero INTEGER NOT NULL,
  ordem_sorteada UUID[] NOT NULL,
  indice_atual INTEGER DEFAULT 0,
  finalizada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(escala_id, numero)
);

ALTER TABLE public.rodadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view rodadas"
  ON public.rodadas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage rodadas"
  ON public.rodadas FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create escolhas table
CREATE TABLE public.escolhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  atividade_id UUID REFERENCES public.atividades(id) ON DELETE CASCADE NOT NULL,
  rodada_id UUID REFERENCES public.rodadas(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, atividade_id)
);

ALTER TABLE public.escolhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view escolhas"
  ON public.escolhas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own escolhas"
  ON public.escolhas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage escolhas"
  ON public.escolhas FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create regras table
CREATE TABLE public.regras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id UUID REFERENCES public.escalas(id) ON DELETE CASCADE NOT NULL,
  tipo_regra TEXT NOT NULL CHECK (tipo_regra IN ('obrigatorio_fim_semana', 'cota_atividades', 'preenchimento_sequencial')),
  ativa BOOLEAN DEFAULT true,
  configuracao JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.regras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view regras"
  ON public.regras FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage regras"
  ON public.regras FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trocas table
CREATE TABLE public.trocas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receptor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  atividade_origem_id UUID REFERENCES public.atividades(id) ON DELETE CASCADE NOT NULL,
  atividade_destino_id UUID REFERENCES public.atividades(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceita', 'recusada', 'cancelada')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trocas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trocas"
  ON public.trocas FOR SELECT
  USING (auth.uid() = solicitante_id OR auth.uid() = receptor_id);

CREATE POLICY "Users can create trocas"
  ON public.trocas FOR INSERT
  WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Users can update trocas they are involved in"
  ON public.trocas FOR UPDATE
  USING (auth.uid() = solicitante_id OR auth.uid() = receptor_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'participante');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger to update vagas_ocupadas
CREATE OR REPLACE FUNCTION public.update_vagas_ocupadas()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.atividades
    SET vagas_ocupadas = vagas_ocupadas + 1
    WHERE id = NEW.atividade_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.atividades
    SET vagas_ocupadas = vagas_ocupadas - 1
    WHERE id = OLD.atividade_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_update_vagas
  AFTER INSERT OR DELETE ON public.escolhas
  FOR EACH ROW EXECUTE FUNCTION public.update_vagas_ocupadas();