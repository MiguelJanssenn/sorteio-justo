export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      atividades: {
        Row: {
          created_at: string | null
          data: string
          eh_fim_semana: boolean | null
          escala_id: string
          horario_fim: string
          horario_inicio: string
          id: string
          local: string | null
          observacao: string | null
          tipo: string
          vagas_ocupadas: number | null
          vagas_total: number
        }
        Insert: {
          created_at?: string | null
          data: string
          eh_fim_semana?: boolean | null
          escala_id: string
          horario_fim: string
          horario_inicio: string
          id?: string
          local?: string | null
          observacao?: string | null
          tipo: string
          vagas_ocupadas?: number | null
          vagas_total: number
        }
        Update: {
          created_at?: string | null
          data?: string
          eh_fim_semana?: boolean | null
          escala_id?: string
          horario_fim?: string
          horario_inicio?: string
          id?: string
          local?: string | null
          observacao?: string | null
          tipo?: string
          vagas_ocupadas?: number | null
          vagas_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "atividades_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "escalas"
            referencedColumns: ["id"]
          },
        ]
      }
      emails_autorizados: {
        Row: {
          adicionado_por: string | null
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          adicionado_por?: string | null
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          adicionado_por?: string | null
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      escalas: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          nome: string
          periodo_fim: string
          periodo_inicio: string
          status: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          nome: string
          periodo_fim: string
          periodo_inicio: string
          status?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          nome?: string
          periodo_fim?: string
          periodo_inicio?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      escolhas: {
        Row: {
          atividade_id: string
          created_at: string | null
          id: string
          rodada_id: string
          user_id: string
        }
        Insert: {
          atividade_id: string
          created_at?: string | null
          id?: string
          rodada_id: string
          user_id: string
        }
        Update: {
          atividade_id?: string
          created_at?: string | null
          id?: string
          rodada_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escolhas_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escolhas_rodada_id_fkey"
            columns: ["rodada_id"]
            isOneToOne: false
            referencedRelation: "rodadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escolhas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participacao_escalas: {
        Row: {
          ativo: boolean
          created_at: string
          escala_id: string
          id: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          escala_id: string
          id?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          escala_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participacao_escalas_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "escalas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          nome_completo: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          nome_completo: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          nome_completo?: string
        }
        Relationships: []
      }
      regras: {
        Row: {
          ativa: boolean | null
          configuracao: Json | null
          created_at: string | null
          escala_id: string
          id: string
          tipo_regra: string
        }
        Insert: {
          ativa?: boolean | null
          configuracao?: Json | null
          created_at?: string | null
          escala_id: string
          id?: string
          tipo_regra: string
        }
        Update: {
          ativa?: boolean | null
          configuracao?: Json | null
          created_at?: string | null
          escala_id?: string
          id?: string
          tipo_regra?: string
        }
        Relationships: [
          {
            foreignKeyName: "regras_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "escalas"
            referencedColumns: ["id"]
          },
        ]
      }
      rodadas: {
        Row: {
          created_at: string | null
          escala_id: string
          finalizada: boolean | null
          id: string
          indice_atual: number | null
          numero: number
          ordem_sorteada: string[]
        }
        Insert: {
          created_at?: string | null
          escala_id: string
          finalizada?: boolean | null
          id?: string
          indice_atual?: number | null
          numero: number
          ordem_sorteada: string[]
        }
        Update: {
          created_at?: string | null
          escala_id?: string
          finalizada?: boolean | null
          id?: string
          indice_atual?: number | null
          numero?: number
          ordem_sorteada?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "rodadas_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "escalas"
            referencedColumns: ["id"]
          },
        ]
      }
      trocas: {
        Row: {
          atividade_destino_id: string
          atividade_origem_id: string
          created_at: string | null
          id: string
          receptor_id: string
          solicitante_id: string
          status: string
        }
        Insert: {
          atividade_destino_id: string
          atividade_origem_id: string
          created_at?: string | null
          id?: string
          receptor_id: string
          solicitante_id: string
          status?: string
        }
        Update: {
          atividade_destino_id?: string
          atividade_origem_id?: string
          created_at?: string | null
          id?: string
          receptor_id?: string
          solicitante_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "trocas_atividade_destino_id_fkey"
            columns: ["atividade_destino_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trocas_atividade_origem_id_fkey"
            columns: ["atividade_origem_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trocas_receptor_id_fkey"
            columns: ["receptor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trocas_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      avancar_rodada: { Args: { rodada_id_param: string }; Returns: Json }
      email_autorizado: { Args: { email_check: string }; Returns: boolean }
      excluir_rodadas_escala: {
        Args: { escala_id_param: string }
        Returns: Json
      }
      has_active_rounds: {
        Args: { escala_id_param: string; user_id_param: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      resetar_vagas_ocupadas:
        | { Args: { escala_id_param?: string }; Returns: Json }
        | {
            Args: { escala_id_param?: string; excluir_escolhas?: boolean }
            Returns: Json
          }
    }
    Enums: {
      app_role: "admin" | "participante"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "participante"],
    },
  },
} as const
