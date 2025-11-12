-- Corrigir política de acesso à tabela profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Criar tabela para emails autorizados
CREATE TABLE IF NOT EXISTS public.emails_autorizados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  adicionado_por uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS na tabela de emails autorizados
ALTER TABLE public.emails_autorizados ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem gerenciar emails autorizados
CREATE POLICY "Admins can manage emails_autorizados"
ON public.emails_autorizados
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Criar função para verificar se email está autorizado
CREATE OR REPLACE FUNCTION public.email_autorizado(email_check text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.emails_autorizados
    WHERE email = email_check
  )
$$;