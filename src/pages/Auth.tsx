import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Shield, Users } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta.",
        });
        navigate("/");
      } else {
        // Verificar se o email está autorizado
        const { data: autorizado, error: checkError } = await supabase
          .rpc('email_autorizado', { email_check: email.toLowerCase().trim() });

        if (checkError) throw checkError;

        if (!autorizado) {
          toast({
            title: "Email não autorizado",
            description: "Este email não está autorizado para criar uma conta. Entre em contato com o administrador.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              nome_completo: nomeCompleto,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Conta criada!",
          description: "Você já pode fazer login.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--gradient-hero)" }}>
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:block space-y-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold text-foreground">
              Gestão de Escalas de Internato
            </h1>
            <p className="text-xl text-muted-foreground">
              Sistema inteligente para gerenciar escolhas de plantões, ambulatórios e enfermarias
            </p>
          </div>
          
          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-card shadow-sm">
              <Calendar className="w-6 h-6 text-primary shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-card-foreground">Sistema de Rodadas</h3>
                <p className="text-sm text-muted-foreground">Sorteio justo da ordem de escolha a cada rodada</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 rounded-lg bg-card shadow-sm">
              <Shield className="w-6 h-6 text-secondary shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-card-foreground">Regras Configuráveis</h3>
                <p className="text-sm text-muted-foreground">Administrador define regras personalizadas para cada escala</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 rounded-lg bg-card shadow-sm">
              <Users className="w-6 h-6 text-accent shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-card-foreground">Sistema de Trocas</h3>
                <p className="text-sm text-muted-foreground">Participantes podem trocar atividades entre si</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="w-full shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">{isLogin ? "Login" : "Criar Conta"}</CardTitle>
            <CardDescription>
              {isLogin 
                ? "Entre com suas credenciais para acessar o sistema" 
                : "Crie sua conta para começar a usar o sistema"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    type="text"
                    placeholder="João Silva"
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? "Processando..." : (isLogin ? "Entrar" : "Criar Conta")}
              </Button>

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:underline"
                >
                  {isLogin 
                    ? "Não tem conta? Cadastre-se" 
                    : "Já tem conta? Faça login"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;