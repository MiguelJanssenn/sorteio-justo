import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon } from "lucide-react";

export const ScaleForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [nome, setNome] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("escalas").insert({
        nome,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        created_by: user.id,
        status: "ativa"
      });

      if (error) throw error;

      toast({
        title: "Escala criada!",
        description: "A escala foi criada com sucesso.",
      });

      setNome("");
      setPeriodoInicio("");
      setPeriodoFim("");
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao criar escala",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Criar Nova Escala
        </CardTitle>
        <CardDescription>
          Defina o período e nome da escala de internato
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome da Escala</Label>
            <Input
              id="nome"
              placeholder="Ex: Janeiro 2025"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inicio">Data Início</Label>
              <Input
                id="inicio"
                type="date"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="fim">Data Fim</Label>
              <Input
                id="fim"
                type="date"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Criando..." : "Criar Escala"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
