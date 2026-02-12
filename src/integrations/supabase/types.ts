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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          assessor_id: string | null
          banker_id: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          last_contact_at: string | null
          next_action_at: string | null
          nome_razao: string
          observacoes: string | null
          patrimonio_ou_receita: number | null
          risco_ou_alertas: string | null
          segmento: string | null
          status: Database["public"]["Enums"]["client_status"]
          telefone: string | null
          tipo_pessoa: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at: string
        }
        Insert: {
          assessor_id?: string | null
          banker_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          next_action_at?: string | null
          nome_razao: string
          observacoes?: string | null
          patrimonio_ou_receita?: number | null
          risco_ou_alertas?: string | null
          segmento?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at?: string
        }
        Update: {
          assessor_id?: string | null
          banker_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          next_action_at?: string | null
          nome_razao?: string
          observacoes?: string | null
          patrimonio_ou_receita?: number | null
          risco_ou_alertas?: string | null
          segmento?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assessor_id: string | null
          banker_id: string | null
          canal_origem: string | null
          conversion_at: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          last_contact_at: string | null
          next_action_at: string | null
          nome_razao: string
          observacoes: string | null
          owner_id: string
          porte: string | null
          score: number | null
          segmento: string | null
          status: Database["public"]["Enums"]["lead_status"]
          telefone: string | null
          tipo_pessoa: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at: string
          valor_potencial: number | null
        }
        Insert: {
          assessor_id?: string | null
          banker_id?: string | null
          canal_origem?: string | null
          conversion_at?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          next_action_at?: string | null
          nome_razao: string
          observacoes?: string | null
          owner_id: string
          porte?: string | null
          score?: number | null
          segmento?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at?: string
          valor_potencial?: number | null
        }
        Update: {
          assessor_id?: string | null
          banker_id?: string | null
          canal_origem?: string | null
          conversion_at?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          next_action_at?: string | null
          nome_razao?: string
          observacoes?: string | null
          owner_id?: string
          porte?: string | null
          score?: number | null
          segmento?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at?: string
          valor_potencial?: number | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          related_id: string
          related_type: Database["public"]["Enums"]["related_type"]
          texto: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          related_id: string
          related_type: Database["public"]["Enums"]["related_type"]
          texto: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          related_id?: string
          related_type?: Database["public"]["Enums"]["related_type"]
          texto?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          client_id: string | null
          close_date: string | null
          created_at: string
          id: string
          last_update_at: string | null
          lead_id: string | null
          observacoes: string | null
          origem: string | null
          owner_id: string
          probabilidade: number | null
          stage: Database["public"]["Enums"]["opportunity_stage"]
          titulo: string
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          client_id?: string | null
          close_date?: string | null
          created_at?: string
          id?: string
          last_update_at?: string | null
          lead_id?: string | null
          observacoes?: string | null
          origem?: string | null
          owner_id: string
          probabilidade?: number | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          titulo: string
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          client_id?: string | null
          close_date?: string | null
          created_at?: string
          id?: string
          last_update_at?: string | null
          lead_id?: string | null
          observacoes?: string | null
          origem?: string | null
          owner_id?: string
          probabilidade?: number | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          titulo?: string
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          descricao: string | null
          done_at: string | null
          due_at: string | null
          id: string
          owner_id: string
          related_id: string | null
          related_type: Database["public"]["Enums"]["related_type"] | null
          status: Database["public"]["Enums"]["task_status"]
          tipo: Database["public"]["Enums"]["task_tipo"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          owner_id: string
          related_id?: string | null
          related_type?: Database["public"]["Enums"]["related_type"] | null
          status?: Database["public"]["Enums"]["task_status"]
          tipo?: Database["public"]["Enums"]["task_tipo"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          owner_id?: string
          related_id?: string | null
          related_type?: Database["public"]["Enums"]["related_type"] | null
          status?: Database["public"]["Enums"]["task_status"]
          tipo?: Database["public"]["Enums"]["task_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_lider: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "ASSESSOR" | "BANKER" | "LIDER" | "FINDER" | "ADMIN"
      client_status: "ATIVO_NET" | "INATIVO_PLD" | "CRITICO"
      lead_status:
        | "NOVO"
        | "CONTATO_INICIADO"
        | "QUALIFICADO"
        | "REUNIAO"
        | "PROPOSTA"
        | "CONVERTIDO"
        | "PERDIDO"
      opportunity_stage:
        | "INICIAL"
        | "EM_ANDAMENTO"
        | "NEGOCIACAO"
        | "GANHA"
        | "PERDIDA"
      related_type: "LEAD" | "CLIENT" | "OPPORTUNITY"
      task_status: "ABERTA" | "CONCLUIDA" | "ATRASADA"
      task_tipo:
        | "LIGACAO"
        | "WHATSAPP"
        | "EMAIL"
        | "REUNIAO"
        | "POS_VENDA"
        | "OUTRO"
      tipo_pessoa: "PF" | "PJ"
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
      app_role: ["ASSESSOR", "BANKER", "LIDER", "FINDER", "ADMIN"],
      client_status: ["ATIVO_NET", "INATIVO_PLD", "CRITICO"],
      lead_status: [
        "NOVO",
        "CONTATO_INICIADO",
        "QUALIFICADO",
        "REUNIAO",
        "PROPOSTA",
        "CONVERTIDO",
        "PERDIDO",
      ],
      opportunity_stage: [
        "INICIAL",
        "EM_ANDAMENTO",
        "NEGOCIACAO",
        "GANHA",
        "PERDIDA",
      ],
      related_type: ["LEAD", "CLIENT", "OPPORTUNITY"],
      task_status: ["ABERTA", "CONCLUIDA", "ATRASADA"],
      task_tipo: [
        "LIGACAO",
        "WHATSAPP",
        "EMAIL",
        "REUNIAO",
        "POS_VENDA",
        "OUTRO",
      ],
      tipo_pessoa: ["PF", "PJ"],
    },
  },
} as const
