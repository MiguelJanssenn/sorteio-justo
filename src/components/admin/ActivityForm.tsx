import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList } from "lucide-react";

export const ActivityForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [escalas, setEscalas] = useState<any[]>([]);
  const [escalaId, setEscalaId] = useState("");
  const [tipo, setTipo] = useState("");
  const [data, setData] = useState("");
  const [horarioInicio, setHorarioInicio] = useState("");
  const [horarioFim, setHorarioFim] = useState("");
  const [vagasTotal, setVagasTotal] = useState("1");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEscalas();
  }, []);

  const fetchEscalas = async () => {
    const { data } = await supabase
      .from("escalas")
      .select("*")
      .eq("status", "ativa")
      .order("created_at", { ascending: false });
    
    if (data) setEscalas(data);
  };

  const isWeekend = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("atividades").insert({
        escala_id: escalaId,
        tipo,
        data,
        horario_inicio: horarioInicio,
        horario_fim: horarioFim,
        vagas_total: parseInt(vagasTotal),
        eh_fim_semana: isWeekend(data)
      });

      if (error) throw error;

      toast({
        title: "Atividade cadastrada!",
        description: "A atividade foi adicionada à escala.",
      });

      setTipo("");
      setData("");
      setHorarioInicio("");
      setHorarioFim("");
      setVagasTotal("1");
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar atividade",
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
          <ClipboardList className="w-5 h-5" />
          Cadastrar Atividade
        </CardTitle>
        <CardDescription>
          Adicione plantões, ambulatórios ou enfermarias à escala
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="escala">Escala</Label>
            <Select value={escalaId} onValueChange={setEscalaId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a escala" />
              </SelectTrigger>
              <SelectContent>
                {escalas.map((escala) => (
                  <SelectItem key={escala.id} value={escala.id}>
                    {escala.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tipo">Tipo de Atividade</Label>
            <Select value={tipo} onValueChange={setTipo} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Plantão">Plantão</SelectItem>
                <SelectItem value="Ambulatório">Ambulatório</SelectItem>
                <SelectItem value="Enfermaria">Enfermaria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="data">Data</Label>
            <Input
              id="data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inicio">Horário Início</Label>
              <Input
                id="inicio"
                type="time"
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="fim">Horário Fim</Label>
              <Input
                id="fim"
                type="time"
                value={horarioFim}
                onChange={(e) => setHorarioFim(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="vagas">Número de Vagas</Label>
            <Input
              id="vagas"
              type="number"
              min="1"
              value={vagasTotal}
              onChange={(e) => setVagasTotal(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={loading || !escalaId} className="w-full">
            {loading ? "Cadastrando..." : "Cadastrar Atividade"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
