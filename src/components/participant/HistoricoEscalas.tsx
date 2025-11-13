import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Escala {
  id: string;
  nome: string;
  periodo_inicio: string;
  periodo_fim: string;
}

interface MinhaEscolha {
  atividade: {
    tipo: string;
    data: string;
    horario_inicio: string;
    horario_fim: string;
    local: string | null;
  };
}

export const HistoricoEscalas = () => {
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [escolhasPorEscala, setEscolhasPorEscala] = useState<Record<string, MinhaEscolha[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistorico();
  }, []);

  const fetchHistorico = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch escalas finalizadas where user participated
    const { data: participacoes } = await supabase
      .from("participacao_escalas")
      .select("escala_id")
      .eq("user_id", user.id);

    if (!participacoes) {
      setLoading(false);
      return;
    }

    const escalaIds = participacoes.map(p => p.escala_id);

    const { data: escalasData } = await supabase
      .from("escalas")
      .select("*")
      .in("id", escalaIds)
      .eq("status", "finalizada")
      .order("created_at", { ascending: false });

    if (escalasData) {
      setEscalas(escalasData);
      
      // Fetch my escolhas for each escala
      for (const escala of escalasData) {
        const { data: escolhasData } = await supabase
          .from("escolhas")
          .select(`
            atividade:atividades(tipo, data, horario_inicio, horario_fim, local, escala_id)
          `)
          .eq("user_id", user.id)
          .eq("atividade.escala_id", escala.id);

        if (escolhasData) {
          setEscolhasPorEscala(prev => ({
            ...prev,
            [escala.id]: escolhasData as unknown as MinhaEscolha[]
          }));
        }
      }
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (escalas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Escalas</CardTitle>
          <CardDescription>Suas escalas finalizadas</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Você ainda não possui escalas finalizadas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Escalas</CardTitle>
        <CardDescription>Consulte suas escalas finalizadas</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="space-y-3">
          {escalas.map((escala) => {
            const escolhas = escolhasPorEscala[escala.id] || [];
            const sortedEscolhas = [...escolhas].sort((a, b) => {
              const dateA = new Date(`${a.atividade.data}T${a.atividade.horario_inicio}`);
              const dateB = new Date(`${b.atividade.data}T${b.atividade.horario_inicio}`);
              return dateA.getTime() - dateB.getTime();
            });

            return (
              <AccordionItem key={escala.id} value={escala.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-left w-full">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base">{escala.nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(escala.periodo_inicio), "dd/MM/yyyy")} - {format(new Date(escala.periodo_fim), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <Badge variant="secondary" className="w-fit">
                      {escolhas.length} atividades
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    {escolhas.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Você não escolheu atividades nesta escala
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {sortedEscolhas.map((escolha, idx) => (
                          <div key={idx} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">{escolha.atividade.tipo}</Badge>
                              <span className="text-sm font-medium">
                                {format(new Date(escolha.atividade.data), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center gap-2">
                                <span>⏰</span>
                                <span>{escolha.atividade.horario_inicio} - {escolha.atividade.horario_fim}</span>
                              </div>
                              {escolha.atividade.local && (
                                <div className="flex items-center gap-2">
                                  <span>📍</span>
                                  <span className="font-semibold text-primary">{escolha.atividade.local}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
};
