import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScaleForm } from "./ScaleForm";
import { BulkActivityImport } from "./BulkActivityImport";
import { ActivityList } from "./ActivityList";
import { RoundManager } from "./RoundManager";
import { RulesConfig } from "./RulesConfig";
import { ScaleView } from "./ScaleView";
import { HistoricoEscalas } from "./HistoricoEscalas";

export const EscalaManual = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestão Manual de Escalas</CardTitle>
        <CardDescription>
          Sistema tradicional de criação e gestão de escalas sem modelos pré-definidos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="escalas" className="space-y-4">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-6">
              <TabsTrigger value="escalas" className="text-xs sm:text-sm whitespace-nowrap">Escalas</TabsTrigger>
              <TabsTrigger value="atividades" className="text-xs sm:text-sm whitespace-nowrap">Atividades</TabsTrigger>
              <TabsTrigger value="rodadas" className="text-xs sm:text-sm whitespace-nowrap">Rodadas</TabsTrigger>
              <TabsTrigger value="regras" className="text-xs sm:text-sm whitespace-nowrap">Regras</TabsTrigger>
              <TabsTrigger value="visualizar" className="text-xs sm:text-sm whitespace-nowrap">Visualizar</TabsTrigger>
              <TabsTrigger value="historico" className="text-xs sm:text-sm whitespace-nowrap">Histórico</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="escalas" key={`escalas-${refreshKey}`}>
            <ScaleForm onSuccess={handleRefresh} />
          </TabsContent>

          <TabsContent value="atividades" key={`atividades-${refreshKey}`}>
            <div className="space-y-6">
              <BulkActivityImport onSuccess={handleRefresh} />
              <ActivityList refreshKey={refreshKey} />
            </div>
          </TabsContent>

          <TabsContent value="rodadas" key={`rodadas-${refreshKey}`}>
            <RoundManager />
          </TabsContent>

          <TabsContent value="regras" key={`regras-${refreshKey}`}>
            <RulesConfig />
          </TabsContent>

          <TabsContent value="visualizar" key={`visualizar-${refreshKey}`}>
            <ScaleView />
          </TabsContent>

          <TabsContent value="historico" key={`historico-${refreshKey}`}>
            <HistoricoEscalas />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
