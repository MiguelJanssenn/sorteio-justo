import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const ScaleForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [nome, setNome] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [escalas, setEscalas] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchEscalas();
  }, []);

  const fetchEscalas = async () => {
    const { data } = await supabase
      .from("escalas")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setEscalas(data);
  };

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
      await fetchEscalas();
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

  const handleDelete = async (escalaId: string) => {
    setDeletingId(escalaId);
    try {
      // First check if there are activities associated with this escala
      const { data: atividades } = await supabase
        .from("atividades")
        .select("id")
        .eq("escala_id", escalaId)
        .limit(1);

      if (atividades && atividades.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Esta escala possui atividades cadastradas. Exclua as atividades primeiro.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("escalas")
        .delete()
        .eq("id", escalaId);

      if (error) throw error;

      toast({
        title: "Escala excluída!",
        description: "A escala foi removida com sucesso.",
      });

      await fetchEscalas();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir escala",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
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

    {escalas.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>Escalas Cadastradas</CardTitle>
          <CardDescription>
            Gerencie as escalas existentes no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalas.map((escala) => (
                  <TableRow key={escala.id}>
                    <TableCell className="font-medium">{escala.nome}</TableCell>
                    <TableCell>
                      {format(new Date(escala.periodo_inicio + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(escala.periodo_fim + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        escala.status === 'ativa' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {escala.status === 'ativa' ? 'Ativa' : 'Inativa'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === escala.id}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Escala</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir a escala "{escala.nome}"? Esta ação não pode ser desfeita.
                              {"\n\n"}
                              Nota: Só é possível excluir escalas sem atividades cadastradas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(escala.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )}
    </div>
  );
};
