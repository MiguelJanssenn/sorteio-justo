import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Mail, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EmailAutorizado {
  id: string;
  email: string;
  created_at: string;
}

export const EmailsAutorizados = () => {
  const [emails, setEmails] = useState<EmailAutorizado[]>([]);
  const [novoEmail, setNovoEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    const { data, error } = await supabase
      .from("emails_autorizados")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar emails",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setEmails(data || []);
  };

  const adicionarEmail = async () => {
    if (!novoEmail.trim()) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(novoEmail)) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("emails_autorizados")
      .insert([
        {
          email: novoEmail.toLowerCase().trim(),
          adicionado_por: user?.id,
        },
      ]);

    if (error) {
      toast({
        title: "Erro ao adicionar email",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email adicionado!",
        description: `${novoEmail} foi autorizado para cadastro.`,
      });
      setNovoEmail("");
      fetchEmails();
    }

    setLoading(false);
  };

  const removerEmail = async (id: string) => {
    setLoading(true);

    const { error } = await supabase
      .from("emails_autorizados")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao remover email",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email removido!",
        description: "O email foi removido da lista de autorizados.",
      });
      fetchEmails();
    }

    setLoading(false);
    setEmailToDelete(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Emails Autorizados
          </CardTitle>
          <CardDescription>
            Gerencie quais emails podem se cadastrar na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  adicionarEmail();
                }
              }}
            />
            <Button onClick={adicionarEmail} disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>

          {emails.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Adicionado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="font-medium">{email.email}</TableCell>
                      <TableCell>
                        {new Date(email.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEmailToDelete(email.id)}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum email autorizado. Adicione emails para permitir cadastros.
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={emailToDelete !== null} onOpenChange={() => setEmailToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover email autorizado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O email será removido da lista de
              autorizados e não poderá mais se cadastrar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => emailToDelete && removerEmail(emailToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
