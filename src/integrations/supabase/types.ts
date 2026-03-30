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
      access_logs: {
        Row: {
          duration_minutes: number | null
          email: string | null
          id: string
          ip_address: string | null
          logged_in_at: string | null
          logged_out_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          duration_minutes?: number | null
          email?: string | null
          id?: string
          ip_address?: string | null
          logged_in_at?: string | null
          logged_out_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          duration_minutes?: number | null
          email?: string | null
          id?: string
          ip_address?: string | null
          logged_in_at?: string | null
          logged_out_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          advisor_name: string | null
          assessor_id: string | null
          banker_id: string | null
          banker_name: string | null
          canal: string | null
          casa: string | null
          cidade: string | null
          codigo_xp: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          estado_civil: string | null
          finder_id: string | null
          finder_name: string | null
          id: string
          last_contact_at: string | null
          nascimento: string | null
          next_action_at: string | null
          nome_razao: string
          observacoes: string | null
          patrimonio_ou_receita: number | null
          perfil: string | null
          pl_declarado: number | null
          risco_ou_alertas: string | null
          segmento: string | null
          sow: string | null
          status: Database["public"]["Enums"]["client_status"]
          tag: string | null
          telefone: string | null
          tipo_pessoa: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at: string
        }
        Insert: {
          advisor_name?: string | null
          assessor_id?: string | null
          banker_id?: string | null
          banker_name?: string | null
          canal?: string | null
          casa?: string | null
          cidade?: string | null
          codigo_xp?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          estado_civil?: string | null
          finder_id?: string | null
          finder_name?: string | null
          id?: string
          last_contact_at?: string | null
          nascimento?: string | null
          next_action_at?: string | null
          nome_razao: string
          observacoes?: string | null
          patrimonio_ou_receita?: number | null
          perfil?: string | null
          pl_declarado?: number | null
          risco_ou_alertas?: string | null
          segmento?: string | null
          sow?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tag?: string | null
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at?: string
        }
        Update: {
          advisor_name?: string | null
          assessor_id?: string | null
          banker_id?: string | null
          banker_name?: string | null
          canal?: string | null
          casa?: string | null
          cidade?: string | null
          codigo_xp?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          estado_civil?: string | null
          finder_id?: string | null
          finder_name?: string | null
          id?: string
          last_contact_at?: string | null
          nascimento?: string | null
          next_action_at?: string | null
          nome_razao?: string
          observacoes?: string | null
          patrimonio_ou_receita?: number | null
          perfil?: string | null
          pl_declarado?: number | null
          risco_ou_alertas?: string | null
          segmento?: string | null
          sow?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tag?: string | null
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_refresh: {
        Row: {
          id: number
          updated_at: string
          version: number
        }
        Insert: {
          id?: number
          updated_at?: string
          version?: number
        }
        Update: {
          id?: number
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      dominio_empresa: {
        Row: {
          dominio: string
          empresa: string
        }
        Insert: {
          dominio: string
          empresa: string
        }
        Update: {
          dominio?: string
          empresa?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          assessor_id: string | null
          bairro: string | null
          banker_id: string | null
          canal_origem: string | null
          canal_relacionamento: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          conversion_at: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          estado: string | null
          finder_id: string | null
          id: string
          last_contact_at: string | null
          logradouro: string | null
          next_action_at: string | null
          nome_razao: string
          numero: string | null
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
          bairro?: string | null
          banker_id?: string | null
          canal_origem?: string | null
          canal_relacionamento?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          conversion_at?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          finder_id?: string | null
          id?: string
          last_contact_at?: string | null
          logradouro?: string | null
          next_action_at?: string | null
          nome_razao: string
          numero?: string | null
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
          bairro?: string | null
          banker_id?: string | null
          canal_origem?: string | null
          canal_relacionamento?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          conversion_at?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          finder_id?: string | null
          id?: string
          last_contact_at?: string | null
          logradouro?: string | null
          next_action_at?: string | null
          nome_razao?: string
          numero?: string | null
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
      notificacoes_admin: {
        Row: {
          created_at: string | null
          dados: Json | null
          id: string
          lida: boolean | null
          mensagem: string
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string | null
          dados?: Json | null
          id?: string
          lida?: boolean | null
          mensagem: string
          tipo: string
          titulo: string
        }
        Update: {
          created_at?: string | null
          dados?: Json | null
          id?: string
          lida?: boolean | null
          mensagem?: string
          tipo?: string
          titulo?: string
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
      perfis_acesso: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          permissoes: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          permissoes?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          permissoes?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          advisor_name: string | null
          area: string | null
          avatar_url: string | null
          banker_name: string | null
          blocked: boolean | null
          cpf: string | null
          created_at: string
          email: string
          empresa: string | null
          finder_name: string | null
          full_name: string
          gestor: string | null
          id: string
          nome: string | null
          nome_completo: string | null
          operacao_tipo: string | null
          perfil_id: string | null
          phone: string | null
          primeiro_acesso: boolean | null
          ultimo_acesso: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          advisor_name?: string | null
          area?: string | null
          avatar_url?: string | null
          banker_name?: string | null
          blocked?: boolean | null
          cpf?: string | null
          created_at?: string
          email?: string
          empresa?: string | null
          finder_name?: string | null
          full_name?: string
          gestor?: string | null
          id?: string
          nome?: string | null
          nome_completo?: string | null
          operacao_tipo?: string | null
          perfil_id?: string | null
          phone?: string | null
          primeiro_acesso?: boolean | null
          ultimo_acesso?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          advisor_name?: string | null
          area?: string | null
          avatar_url?: string | null
          banker_name?: string | null
          blocked?: boolean | null
          cpf?: string | null
          created_at?: string
          email?: string
          empresa?: string | null
          finder_name?: string | null
          full_name?: string
          gestor?: string | null
          id?: string
          nome?: string | null
          nome_completo?: string | null
          operacao_tipo?: string | null
          perfil_id?: string | null
          phone?: string | null
          primeiro_acesso?: boolean | null
          ultimo_acesso?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      raw_base_avenue: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_base_cambio: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_base_consolidada: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_base_corp_seguros: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_base_crm: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_base_fo: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_base_gestora: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_base_lavoro: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_captacao_historico: {
        Row: {
          created_at: string | null
          data: Json
          id: number
        }
        Insert: {
          created_at?: string | null
          data: Json
          id?: number
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: number
        }
        Relationships: []
      }
      raw_captacao_total: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_comissoes_historico: {
        Row: {
          data: Json
          id: number
          ingested_at: string
          mes_ano: string | null
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
          mes_ano?: string | null
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
          mes_ano?: string | null
        }
        Relationships: []
      }
      raw_comissoes_m0: {
        Row: {
          data: Json
          id: number
          ingested_at: string
          mes_ano: string | null
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
          mes_ano?: string | null
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
          mes_ano?: string | null
        }
        Relationships: []
      }
      raw_consolidado_receita: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_contas_total: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_depara: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_desligados: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_diversificador_consolidado: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_envios_nps: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_nps_advisor: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_ordem_pl: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_podio: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_posicao_renda_fixa: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_positivador_m0_agrupado: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_positivador_m0_desagrupado: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_positivador_total_agrupado: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_positivador_total_desagrupado: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_produzido_historico: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      raw_saldo_consolidado: {
        Row: {
          data: Json
          id: number
          ingested_at: string
        }
        Insert: {
          data: Json
          id?: never
          ingested_at?: string
        }
        Update: {
          data?: Json
          id?: never
          ingested_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          detalhes: Json | null
          duracao: string | null
          erros: Json | null
          executado_em: string | null
          id: number
          sucesso: boolean | null
          tipo: string | null
        }
        Insert: {
          detalhes?: Json | null
          duracao?: string | null
          erros?: Json | null
          executado_em?: string | null
          id?: number
          sucesso?: boolean | null
          tipo?: string | null
        }
        Update: {
          detalhes?: Json | null
          duracao?: string | null
          erros?: Json | null
          executado_em?: string | null
          id?: number
          sucesso?: boolean | null
          tipo?: string | null
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          error: string | null
          file_name: string | null
          id: string
          mes_ano_list: string[] | null
          received_at: string
          rows_written: number | null
          source_key: string
          source_path: string | null
          status: string
        }
        Insert: {
          error?: string | null
          file_name?: string | null
          id?: string
          mes_ano_list?: string[] | null
          received_at?: string
          rows_written?: number | null
          source_key: string
          source_path?: string | null
          status?: string
        }
        Update: {
          error?: string | null
          file_name?: string | null
          id?: string
          mes_ano_list?: string[] | null
          received_at?: string
          rows_written?: number | null
          source_key?: string
          source_path?: string | null
          status?: string
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
      team_reference: {
        Row: {
          advisor_name: string | null
          area: string | null
          banker_name: string | null
          blocked: boolean | null
          codigo_xp: string | null
          convite_aceito_em: string | null
          convite_cancelado_em: string | null
          convite_enviado_em: string | null
          convite_expira_em: string | null
          convite_reenvios: number | null
          convite_status: string | null
          cpf: string | null
          created_at: string
          email: string | null
          empresa: string | null
          finder_name: string | null
          full_name: string
          gestor: string | null
          id: string
          nome: string | null
          operacao_tipo: string | null
          perfil_nome: string | null
          role: string | null
          short_name: string
          unit: string
        }
        Insert: {
          advisor_name?: string | null
          area?: string | null
          banker_name?: string | null
          blocked?: boolean | null
          codigo_xp?: string | null
          convite_aceito_em?: string | null
          convite_cancelado_em?: string | null
          convite_enviado_em?: string | null
          convite_expira_em?: string | null
          convite_reenvios?: number | null
          convite_status?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          empresa?: string | null
          finder_name?: string | null
          full_name: string
          gestor?: string | null
          id?: string
          nome?: string | null
          operacao_tipo?: string | null
          perfil_nome?: string | null
          role?: string | null
          short_name: string
          unit: string
        }
        Update: {
          advisor_name?: string | null
          area?: string | null
          banker_name?: string | null
          blocked?: boolean | null
          codigo_xp?: string | null
          convite_aceito_em?: string | null
          convite_cancelado_em?: string | null
          convite_enviado_em?: string | null
          convite_expira_em?: string | null
          convite_reenvios?: number | null
          convite_status?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          empresa?: string | null
          finder_name?: string | null
          full_name?: string
          gestor?: string | null
          id?: string
          nome?: string | null
          operacao_tipo?: string | null
          perfil_nome?: string | null
          role?: string | null
          short_name?: string
          unit?: string
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
      bc_contas_total: {
        Row: {
          advisor: string | null
          anomes: number | null
          banker: string | null
          canal: string | null
          captacao: number | null
          casa: string | null
          conta: number | null
          data_ref: string | null
          documento: string | null
          finder: string | null
          id: number | null
          ingested_at: string | null
          tipo: string | null
          tipo_cliente: string | null
        }
        Insert: {
          advisor?: never
          anomes?: never
          banker?: never
          canal?: never
          captacao?: never
          casa?: never
          conta?: never
          data_ref?: never
          documento?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          tipo?: never
          tipo_cliente?: never
        }
        Update: {
          advisor?: never
          anomes?: never
          banker?: never
          canal?: never
          captacao?: never
          casa?: never
          conta?: never
          data_ref?: never
          documento?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          tipo?: never
          tipo_cliente?: never
        }
        Relationships: []
      }
      bc_contas_total_all: {
        Row: {
          advisor: string | null
          anomes: number | null
          banker: string | null
          canal: string | null
          captacao: number | null
          casa: string | null
          conta: number | null
          data_ref: string | null
          documento: string | null
          finder: string | null
          id: number | null
          ingested_at: string | null
          tipo: string | null
          tipo_cliente: string | null
        }
        Insert: {
          advisor?: never
          anomes?: never
          banker?: never
          canal?: never
          captacao?: never
          casa?: never
          conta?: never
          data_ref?: never
          documento?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          tipo?: never
          tipo_cliente?: never
        }
        Update: {
          advisor?: never
          anomes?: never
          banker?: never
          canal?: never
          captacao?: never
          casa?: never
          conta?: never
          data_ref?: never
          documento?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          tipo?: never
          tipo_cliente?: never
        }
        Relationships: []
      }
      bc_contas_total_kpis: {
        Row: {
          ativacao: number | null
          habilitacao: number | null
          migracao: number | null
        }
        Relationships: []
      }
      bc_contas_total_total_por_tipo: {
        Row: {
          casa: string | null
          qtd: number | null
          tipo: string | null
        }
        Relationships: []
      }
      br_comissoes_all: {
        Row: {
          advisor: string | null
          banker: string | null
          categoria: string | null
          cliente: string | null
          comissao_bruta: number | null
          data_ref: string | null
          documento: string | null
          id: number | null
          ingested_at: string | null
          produto: string | null
          subcategoria: string | null
          subproduto: string | null
          tipo_cliente: string | null
        }
        Relationships: []
      }
      br_comissoes_historico_all: {
        Row: {
          advisor: string | null
          banker: string | null
          categoria: string | null
          cliente: string | null
          comissao_bruta: number | null
          data_ref: string | null
          documento: string | null
          id: number | null
          ingested_at: string | null
          produto: string | null
          subcategoria: string | null
          subproduto: string | null
          tipo_cliente: string | null
        }
        Insert: {
          advisor?: never
          banker?: never
          categoria?: never
          cliente?: never
          comissao_bruta?: never
          data_ref?: never
          documento?: never
          id?: number | null
          ingested_at?: string | null
          produto?: never
          subcategoria?: never
          subproduto?: never
          tipo_cliente?: never
        }
        Update: {
          advisor?: never
          banker?: never
          categoria?: never
          cliente?: never
          comissao_bruta?: never
          data_ref?: never
          documento?: never
          id?: number | null
          ingested_at?: string | null
          produto?: never
          subcategoria?: never
          subproduto?: never
          tipo_cliente?: never
        }
        Relationships: []
      }
      br_comissoes_m0_all: {
        Row: {
          advisor: string | null
          banker: string | null
          categoria: string | null
          cliente: string | null
          comissao_bruta: number | null
          data_ref: string | null
          documento: string | null
          id: number | null
          ingested_at: string | null
          produto: string | null
          subcategoria: string | null
          subproduto: string | null
          tipo_cliente: string | null
        }
        Insert: {
          advisor?: never
          banker?: never
          categoria?: never
          cliente?: never
          comissao_bruta?: never
          data_ref?: never
          documento?: never
          id?: number | null
          ingested_at?: string | null
          produto?: never
          subcategoria?: never
          subproduto?: never
          tipo_cliente?: never
        }
        Update: {
          advisor?: never
          banker?: never
          categoria?: never
          cliente?: never
          comissao_bruta?: never
          data_ref?: never
          documento?: never
          id?: number | null
          ingested_at?: string | null
          produto?: never
          subcategoria?: never
          subproduto?: never
          tipo_cliente?: never
        }
        Relationships: []
      }
      br_receita_categoria_mes: {
        Row: {
          categoria: string | null
          mes_ano: number | null
          valor: number | null
        }
        Relationships: []
      }
      br_receita_mensal: {
        Row: {
          documento: string | null
          mes_ano: number | null
          receita_total: number | null
        }
        Relationships: []
      }
      br_receita_treemap_categoria: {
        Row: {
          categoria: string | null
          valor: number | null
        }
        Relationships: []
      }
      cap_captacao_total: {
        Row: {
          advisor: string | null
          anomes: number | null
          aporte: number | null
          banker: string | null
          canal: string | null
          captacao: number | null
          casa: string | null
          data_ref: string | null
          documento: string | null
          finder: string | null
          id: number | null
          ingested_at: string | null
          resgate: number | null
          tipo_captacao: string | null
          tipo_cliente: string | null
        }
        Relationships: []
      }
      cap_captacao_total_all: {
        Row: {
          advisor: string | null
          anomes: number | null
          aporte: number | null
          banker: string | null
          canal: string | null
          captacao: number | null
          casa: string | null
          data_ref: string | null
          documento: string | null
          finder: string | null
          id: number | null
          ingested_at: string | null
          resgate: number | null
          tipo_captacao: string | null
          tipo_cliente: string | null
        }
        Relationships: []
      }
      cap_captacao_treemap: {
        Row: {
          tipo_captacao: string | null
          valor: number | null
        }
        Relationships: []
      }
      captacao_consolidado_filtrado: {
        Row: {
          advisor: string | null
          anomes: number | null
          aporte: number | null
          banker: string | null
          canal: string | null
          captacao: number | null
          casa: string | null
          conta: string | null
          data: string | null
          documento: string | null
          finder: string | null
          resgate: number | null
          tipo_captacao: string | null
          tipo_cliente: string | null
        }
        Relationships: []
      }
      comissoes_consolidado: {
        Row: {
          anomes: number | null
          banker: string | null
          categoria: string | null
          cliente: string | null
          comissao_bruta_tailor: number | null
          data_ref: string | null
          id: number | null
          ingested_at: string | null
          produto: string | null
          subcategoria: string | null
          subproduto: string | null
        }
        Relationships: []
      }
      comissoes_consolidado_filtrado: {
        Row: {
          advisor: string | null
          anomes: number | null
          banker: string | null
          canal: string | null
          categoria: string | null
          comissao_bruta_tailor: number | null
          documento: string | null
          finder: string | null
          produto: string | null
          subcategoria: string | null
          subproduto: string | null
          tipo_cliente: string | null
        }
        Relationships: []
      }
      comissoes_historico_all: {
        Row: {
          anomes: number | null
          banker: string | null
          categoria: string | null
          cliente: string | null
          comissao_bruta_tailor: number | null
          data_ref: string | null
          id: number | null
          ingested_at: string | null
          produto: string | null
          subcategoria: string | null
          subproduto: string | null
        }
        Insert: {
          anomes?: never
          banker?: never
          categoria?: never
          cliente?: never
          comissao_bruta_tailor?: never
          data_ref?: never
          id?: number | null
          ingested_at?: string | null
          produto?: never
          subcategoria?: never
          subproduto?: never
        }
        Update: {
          anomes?: never
          banker?: never
          categoria?: never
          cliente?: never
          comissao_bruta_tailor?: never
          data_ref?: never
          id?: number | null
          ingested_at?: string | null
          produto?: never
          subcategoria?: never
          subproduto?: never
        }
        Relationships: []
      }
      comissoes_historico_cut: {
        Row: {
          anomes: number | null
          banker: string | null
          categoria: string | null
          cliente: string | null
          comissao_bruta_tailor: number | null
          data_ref: string | null
          id: number | null
          ingested_at: string | null
          produto: string | null
          subcategoria: string | null
          subproduto: string | null
        }
        Relationships: []
      }
      comissoes_m0_all: {
        Row: {
          anomes: number | null
          banker: string | null
          categoria: string | null
          cliente: string | null
          comissao_bruta_tailor: number | null
          data_ref: string | null
          id: number | null
          ingested_at: string | null
          produto: string | null
          subcategoria: string | null
          subproduto: string | null
        }
        Insert: {
          anomes?: never
          banker?: never
          categoria?: never
          cliente?: never
          comissao_bruta_tailor?: never
          data_ref?: never
          id?: number | null
          ingested_at?: string | null
          produto?: never
          subcategoria?: never
          subproduto?: never
        }
        Update: {
          anomes?: never
          banker?: never
          categoria?: never
          cliente?: never
          comissao_bruta_tailor?: never
          data_ref?: never
          id?: number | null
          ingested_at?: string | null
          produto?: never
          subcategoria?: never
          subproduto?: never
        }
        Relationships: []
      }
      mv_comissoes_consolidado: {
        Row: {
          advisor: string | null
          anomes: number | null
          banker: string | null
          canal: string | null
          categoria: string | null
          comissao_bruta_tailor: number | null
          documento: string | null
          finder: string | null
          id: number | null
          produto: string | null
          subcategoria: string | null
          subproduto: string | null
          tipo_cliente: string | null
        }
        Relationships: []
      }
      pos_m0_desagrupado: {
        Row: {
          advisor: string | null
          anomes: number | null
          banker: string | null
          casa: string | null
          documento: string | null
          finder: string | null
          id: number | null
          ingested_at: string | null
          net_em_m: number | null
          tipo_cliente: string | null
        }
        Insert: {
          advisor?: never
          anomes?: never
          banker?: never
          casa?: never
          documento?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          net_em_m?: never
          tipo_cliente?: never
        }
        Update: {
          advisor?: never
          anomes?: never
          banker?: never
          casa?: never
          documento?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          net_em_m?: never
          tipo_cliente?: never
        }
        Relationships: []
      }
      pos_m0_desagrupado_all: {
        Row: {
          advisor: string | null
          anomes: number | null
          banker: string | null
          casa: string | null
          documento: string | null
          finder: string | null
          id: number | null
          ingested_at: string | null
          net_em_m: number | null
          tipo_cliente: string | null
        }
        Insert: {
          advisor?: never
          anomes?: never
          banker?: never
          casa?: never
          documento?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          net_em_m?: never
          tipo_cliente?: never
        }
        Update: {
          advisor?: never
          anomes?: never
          banker?: never
          casa?: never
          documento?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          net_em_m?: never
          tipo_cliente?: never
        }
        Relationships: []
      }
      pos_total_agrupado: {
        Row: {
          advisor: string | null
          anomes: number | null
          banker: string | null
          documento: string | null
          faixa_pl: string | null
          finder: string | null
          id: number | null
          ingested_at: string | null
          net_em_m: number | null
          ordem_pl: number | null
          tipo_cliente: string | null
        }
        Insert: {
          advisor?: never
          anomes?: never
          banker?: never
          documento?: never
          faixa_pl?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          net_em_m?: never
          ordem_pl?: never
          tipo_cliente?: never
        }
        Update: {
          advisor?: never
          anomes?: never
          banker?: never
          documento?: never
          faixa_pl?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          net_em_m?: never
          ordem_pl?: never
          tipo_cliente?: never
        }
        Relationships: []
      }
      pos_total_agrupado_all: {
        Row: {
          advisor: string | null
          anomes: number | null
          banker: string | null
          documento: string | null
          faixa_pl: string | null
          finder: string | null
          id: number | null
          ingested_at: string | null
          net_em_m: number | null
          ordem_pl: number | null
          tipo_cliente: string | null
        }
        Insert: {
          advisor?: never
          anomes?: never
          banker?: never
          documento?: never
          faixa_pl?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          net_em_m?: never
          ordem_pl?: never
          tipo_cliente?: never
        }
        Update: {
          advisor?: never
          anomes?: never
          banker?: never
          documento?: never
          faixa_pl?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          net_em_m?: never
          ordem_pl?: never
          tipo_cliente?: never
        }
        Relationships: []
      }
      pos_total_desagrupado: {
        Row: {
          advisor: string | null
          anomes: number | null
          banker: string | null
          casa: string | null
          documento: string | null
          finder: string | null
          id: number | null
          ingested_at: string | null
          net_em_m: number | null
          tipo_cliente: string | null
        }
        Insert: {
          advisor?: never
          anomes?: never
          banker?: never
          casa?: never
          documento?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          net_em_m?: never
          tipo_cliente?: never
        }
        Update: {
          advisor?: never
          anomes?: never
          banker?: never
          casa?: never
          documento?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          net_em_m?: never
          tipo_cliente?: never
        }
        Relationships: []
      }
      pos_total_desagrupado_all: {
        Row: {
          advisor: string | null
          anomes: number | null
          banker: string | null
          casa: string | null
          documento: string | null
          finder: string | null
          id: number | null
          ingested_at: string | null
          net_em_m: number | null
          tipo_cliente: string | null
        }
        Insert: {
          advisor?: never
          anomes?: never
          banker?: never
          casa?: never
          documento?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          net_em_m?: never
          tipo_cliente?: never
        }
        Update: {
          advisor?: never
          anomes?: never
          banker?: never
          casa?: never
          documento?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          net_em_m?: never
          tipo_cliente?: never
        }
        Relationships: []
      }
      view_base_crm: {
        Row: {
          advisor: string | null
          banker: string | null
          casa: string | null
          cidade: string | null
          cod_cliente: string | null
          documento: string | null
          endereco_ajustado: string | null
          finder: string | null
          perfil: string | null
          pl_declarado_ajustado: number | null
          pl_tailor: number | null
          primeiro_nome: string | null
          sow_ajustado: number | null
          tipo_cliente: string | null
        }
        Relationships: []
      }
      view_depara: {
        Row: {
          codigo_assessor: string | null
          email: string | null
          log_hub: string | null
          nome_completo: string | null
          nome_encurtado: string | null
          unidade_negocio: string | null
        }
        Relationships: []
      }
      view_desligados: {
        Row: {
          nome_completo: string | null
          nome_encurtado: string | null
          nome_normalizado: string | null
        }
        Relationships: []
      }
      view_diversificador: {
        Row: {
          advisor: string | null
          ativo_ajustado: string | null
          banker: string | null
          casa: string | null
          conta: string | null
          data_posicao: string | null
          documento: string | null
          finder: string | null
          indexador: string | null
          net: number | null
          produto_ajustado: string | null
          tipo_cliente: string | null
          vencimento: string | null
        }
        Relationships: []
      }
      view_positivador_agrupado: {
        Row: {
          advisor: string | null
          anomes: number | null
          banker: string | null
          canal: string | null
          data_posicao: string | null
          documento: string | null
          faixa_pl: string | null
          finder: string | null
          net_em_m: number | null
          pl_declarado_ajustado: number | null
          tipo_cliente: string | null
        }
        Relationships: []
      }
      view_receita_mensal: {
        Row: {
          anomes: number | null
          documento: string | null
          faixa_pl: string | null
          net_em_m: number | null
          receita_total: number | null
          tipo_cliente: string | null
        }
        Relationships: []
      }
      vw_base_crm: {
        Row: {
          assessor: string | null
          banker: string | null
          canal: string | null
          cidade: string | null
          codigo_cliente: string | null
          data_crm: Json | null
          data_saldo: Json | null
          endereco_ajustado: string | null
          estado: string | null
          finder: string | null
          id: number | null
          ingested_at: string | null
          nome_cliente: string | null
          perfil: string | null
          pl_declarado_ajustado: number | null
          pl_declarado_raw: number | null
          pl_tailor: number | null
          primeiro_nome: string | null
          saldo_consolidado: number | null
          setor: string | null
          sow: number | null
          sow_ajustado: number | null
          tag: string | null
        }
        Relationships: []
      }
      vw_captacao_total: {
        Row: {
          advisor: string | null
          ano_mes: string | null
          aporte: number | null
          banker: string | null
          canal: string | null
          captacao: number | null
          casa: string | null
          data_mov: string | null
          documento: string | null
          finder: string | null
          id: number | null
          ingested_at: string | null
          resgate: number | null
          tipo_captacao: string | null
          tipo_cliente: string | null
        }
        Insert: {
          advisor?: never
          ano_mes?: never
          aporte?: never
          banker?: never
          canal?: never
          captacao?: never
          casa?: never
          data_mov?: never
          documento?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          resgate?: never
          tipo_captacao?: never
          tipo_cliente?: never
        }
        Update: {
          advisor?: never
          ano_mes?: never
          aporte?: never
          banker?: never
          canal?: never
          captacao?: never
          casa?: never
          data_mov?: never
          documento?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          resgate?: never
          tipo_captacao?: never
          tipo_cliente?: never
        }
        Relationships: []
      }
      vw_contas_total: {
        Row: {
          advisor: string | null
          ano_mes: string | null
          banker: string | null
          canal: string | null
          casa: string | null
          conta: string | null
          data_mov: string | null
          documento: string | null
          finder: string | null
          id: number | null
          ingested_at: string | null
          tipo: string | null
          tipo_cliente: string | null
        }
        Insert: {
          advisor?: never
          ano_mes?: never
          banker?: never
          canal?: never
          casa?: never
          conta?: never
          data_mov?: never
          documento?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          tipo?: never
          tipo_cliente?: never
        }
        Update: {
          advisor?: never
          ano_mes?: never
          banker?: never
          canal?: never
          casa?: never
          conta?: never
          data_mov?: never
          documento?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          tipo?: never
          tipo_cliente?: never
        }
        Relationships: []
      }
      vw_dim_advisor: {
        Row: {
          advisor: string | null
        }
        Relationships: []
      }
      vw_dim_anomes: {
        Row: {
          anomes: number | null
          anomes_nome: string | null
        }
        Relationships: []
      }
      vw_dim_anomes_all: {
        Row: {
          anomes: number | null
          anomes_nome: string | null
        }
        Relationships: []
      }
      vw_dim_banker: {
        Row: {
          banker: string | null
        }
        Relationships: []
      }
      vw_dim_banker_dash: {
        Row: {
          banker: string | null
        }
        Relationships: []
      }
      vw_dim_banker_pbi: {
        Row: {
          banker: string | null
          banker_norm: string | null
        }
        Relationships: []
      }
      vw_dim_documento: {
        Row: {
          documento: string | null
        }
        Relationships: []
      }
      vw_dim_finder: {
        Row: {
          finder: string | null
        }
        Relationships: []
      }
      vw_dim_tipo_captacao: {
        Row: {
          tipo_captacao: string | null
        }
        Relationships: []
      }
      vw_dim_tipo_cliente: {
        Row: {
          tipo_cliente: string | null
        }
        Relationships: []
      }
      vw_diversificador_consolidado: {
        Row: {
          advisor: string | null
          ativo_ajustado: string | null
          banker: string | null
          casa: string | null
          conta: string | null
          data: Json | null
          data_posicao: string | null
          documento: string | null
          finder: string | null
          id: number | null
          indexador: string | null
          ingested_at: string | null
          net: number | null
          produto_ajustado: string | null
          tipo_cliente: string | null
          vencimento: string | null
        }
        Insert: {
          advisor?: never
          ativo_ajustado?: never
          banker?: never
          casa?: never
          conta?: never
          data?: Json | null
          data_posicao?: never
          documento?: never
          finder?: never
          id?: number | null
          indexador?: never
          ingested_at?: string | null
          net?: never
          produto_ajustado?: never
          tipo_cliente?: never
          vencimento?: never
        }
        Update: {
          advisor?: never
          ativo_ajustado?: never
          banker?: never
          casa?: never
          conta?: never
          data?: Json | null
          data_posicao?: never
          documento?: never
          finder?: never
          id?: number | null
          indexador?: never
          ingested_at?: string | null
          net?: never
          produto_ajustado?: never
          tipo_cliente?: never
          vencimento?: never
        }
        Relationships: []
      }
      vw_positivador_total_agrupado: {
        Row: {
          advisor: string | null
          ano_mes: string | null
          banker: string | null
          canal: string | null
          casa: string | null
          conta: string | null
          data: Json | null
          data_posicao: string | null
          documento: string | null
          faixa_pl: string | null
          finder: string | null
          id: number | null
          ingested_at: string | null
          net_em_m: number | null
          ordem_pl: number | null
          pl_declarado: number | null
          tipo_cliente: string | null
        }
        Insert: {
          advisor?: never
          ano_mes?: never
          banker?: never
          canal?: never
          casa?: never
          conta?: never
          data?: Json | null
          data_posicao?: never
          documento?: never
          faixa_pl?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          net_em_m?: never
          ordem_pl?: never
          pl_declarado?: never
          tipo_cliente?: never
        }
        Update: {
          advisor?: never
          ano_mes?: never
          banker?: never
          canal?: never
          casa?: never
          conta?: never
          data?: Json | null
          data_posicao?: never
          documento?: never
          faixa_pl?: never
          finder?: never
          id?: number | null
          ingested_at?: string | null
          net_em_m?: never
          ordem_pl?: never
          pl_declarado?: never
          tipo_cliente?: never
        }
        Relationships: []
      }
      vw_receita_detalhada: {
        Row: {
          advisor: string | null
          banker: string | null
          canal: string | null
          categoria: string | null
          cliente: string | null
          comissao_bruta: number | null
          data_mov: string | null
          documento: string | null
          finder: string | null
          fonte: string | null
          id: number | null
          ingested_at: string | null
          mes_ano: string | null
          produto: string | null
          subcategoria: string | null
          subproduto: string | null
          tipo_cliente: string | null
        }
        Relationships: []
      }
      vw_receita_mensal: {
        Row: {
          advisor: string | null
          banker: string | null
          canal: string | null
          comissao_total: number | null
          documento: string | null
          finder: string | null
          mes_ano: string | null
          qtd_registros: number | null
          tipo_cliente: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      fix_encoding: { Args: { v: string }; Returns: string }
      get_user_advisor_filter: { Args: never; Returns: string[] }
      get_user_banker_filter: { Args: never; Returns: string[] }
      get_user_finder_filter: { Args: never; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_dashboard_refresh: { Args: never; Returns: undefined }
      is_admin_or_lider: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      norm_txt: { Args: { v: string }; Returns: string }
      normalize_advisor: { Args: { p_advisor: string }; Returns: string }
      normalize_banker: { Args: { v: string }; Returns: string }
      normalize_tipo_cliente: { Args: { p_tipo: string }; Returns: string }
      parse_num: { Args: { v: string }; Returns: number }
      parse_num_any: { Args: { v: string }; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      rpc_admin_aprovar_usuario: {
        Args: { p_notif_id?: string; p_role: string; p_user_id: string }
        Returns: Json
      }
      rpc_admin_bloquear_usuario: {
        Args: { p_blocked: boolean; p_email: string }
        Returns: Json
      }
      rpc_admin_criar_perfil: {
        Args: { p_descricao?: string; p_nome: string }
        Returns: Json
      }
      rpc_admin_deletar_perfil: { Args: { p_id: string }; Returns: Json }
      rpc_admin_excluir_usuario: {
        Args: { p_email: string; p_user_id?: string }
        Returns: Json
      }
      rpc_admin_lista_perfis: {
        Args: never
        Returns: {
          created_at: string
          descricao: string
          id: string
          nome: string
          permissoes: Json
        }[]
      }
      rpc_admin_lista_usuarios: {
        Args: never
        Returns: {
          active: boolean
          advisor_name: string
          area: string
          banker_name: string
          blocked: boolean
          convite_aceito_em: string
          convite_cancelado_em: string
          convite_enviado_em: string
          convite_expira_em: string
          convite_reenvios: number
          convite_status: string
          cpf: string
          created_at: string
          email: string
          empresa: string
          finder_name: string
          full_name: string
          gestor: string
          operacao_tipo: string
          pre_cadastrado: boolean
          role: string
          tem_conta: boolean
          ultimo_acesso: string
          user_id: string
        }[]
      }
      rpc_admin_marcar_notif_lida: { Args: { p_id: string }; Returns: Json }
      rpc_admin_notificacoes: {
        Args: never
        Returns: {
          created_at: string
          dados: Json
          id: string
          lida: boolean
          mensagem: string
          tipo: string
          titulo: string
        }[]
      }
      rpc_admin_remover_precadastro: {
        Args: { p_email: string }
        Returns: Json
      }
      rpc_admin_salvar_perfil: {
        Args: {
          p_descricao: string
          p_id: string
          p_nome: string
          p_permissoes: Json
        }
        Returns: Json
      }
      rpc_admin_salvar_usuario:
        | {
            Args: {
              p_advisor_name?: string
              p_banker_name?: string
              p_email: string
              p_empresa?: string
              p_finder_name?: string
              p_nome: string
              p_perfil_nome?: string
              p_role: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_advisor_name?: string
              p_banker_name?: string
              p_cpf?: string
              p_email: string
              p_empresa?: string
              p_finder_name?: string
              p_nome: string
              p_perfil_nome?: string
              p_role: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_advisor_name?: string
              p_area?: string
              p_banker_name?: string
              p_cpf?: string
              p_email: string
              p_empresa?: string
              p_finder_name?: string
              p_gestor?: string
              p_nome: string
              p_perfil_nome?: string
              p_role: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_advisor_name?: string
              p_area?: string
              p_banker_name?: string
              p_cpf?: string
              p_email: string
              p_empresa?: string
              p_finder_name?: string
              p_gestor?: string
              p_nome: string
              p_operacao_tipo?: string
              p_perfil_nome?: string
              p_role: string
            }
            Returns: Json
          }
      rpc_admin_sync_log: {
        Args: never
        Returns: {
          duracao: string
          erros: Json
          executado_em: string
          id: number
          sucesso: boolean
          tipo: string
        }[]
      }
      rpc_auc_casa: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          auc: number
          casa: string
        }[]
      }
      rpc_auc_casa_m0: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          auc: number
          casa: string
        }[]
      }
      rpc_auc_faixa_pl_qualitativo: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          auc: number
          clientes: number
          faixa_pl: string
          ordem_pl: number
          pl_declarado: number
        }[]
      }
      rpc_auc_mes: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          anomes: number
          anomes_nome: string
          auc: number
        }[]
      }
      rpc_auc_mes_stack_casa: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          anomes: number
          anomes_nome: string
          auc: number
          casa: string
        }[]
      }
      rpc_captacao_agg_mes: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          anomes: number
          anomes_nome: string
          captacao: number
          tipo_captacao: string
        }[]
      }
      rpc_captacao_kpis: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          captacao_mtd: number
          captacao_ytd: number
        }[]
      }
      rpc_captacao_treemap: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          captacao: number
          tipo_captacao: string
        }[]
      }
      rpc_contas_agg_mes: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          anomes: number
          anomes_nome: string
          casa: string
          qtd: number
          tipo: string
        }[]
      }
      rpc_contas_kpis: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          ativacao: number
          habilitacao: number
          migracao: number
        }[]
      }
      rpc_contas_total_por_tipo: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          casa: string
          qtd: number
          tipo: string
        }[]
      }
      rpc_custodia_indexador: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          indexador: string
          net: number
        }[]
      }
      rpc_custodia_veiculo: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          net: number
          produto_ajustado: string
        }[]
      }
      rpc_dashboard_timestamps: {
        Args: never
        Returns: {
          atualizado_em: string
          dados_ate: string
        }[]
      }
      rpc_empresa_por_dominio: { Args: { p_email: string }; Returns: string }
      rpc_faixa_pl_auc: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          auc: number
          faixa_pl: string
          ordem_pl: number
        }[]
      }
      rpc_faixa_pl_auc_mes: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          anomes: number
          anomes_nome: string
          auc: number
          faixa_pl: string
        }[]
      }
      rpc_faixa_pl_clientes: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          clientes: number
          faixa_pl: string
          ordem_pl: number
        }[]
      }
      rpc_faixa_pl_clientes_mes: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          anomes: number
          anomes_nome: string
          clientes: number
          faixa_pl: string
        }[]
      }
      rpc_filtro_advisor_slicer: {
        Args: never
        Returns: {
          advisor: string
        }[]
      }
      rpc_filtro_advisors: {
        Args: never
        Returns: {
          advisor: string
          display_name: string
        }[]
      }
      rpc_filtro_anomes: {
        Args: never
        Returns: {
          anomes: number
          anomes_nome: string
        }[]
      }
      rpc_filtro_financial_advisors: {
        Args: { p_role?: string }
        Returns: {
          banker: string
        }[]
      }
      rpc_filtro_finders: {
        Args: never
        Returns: {
          finder: string
        }[]
      }
      rpc_filtro_tipo_cliente: {
        Args: never
        Returns: {
          tipo_cliente: string
        }[]
      }
      rpc_lista_finders: {
        Args: never
        Returns: {
          finder: string
        }[]
      }
      rpc_marcar_primeiro_acesso: { Args: never; Returns: undefined }
      rpc_meu_perfil: {
        Args: never
        Returns: {
          advisor_name: string
          area: string
          banker_name: string
          blocked: boolean
          finder_name: string
          gestor: string
          operacao_tipo: string
          permissoes: Json
          primeiro_acesso: boolean
          role: string
        }[]
      }
      rpc_receita_drilldown: {
        Args: {
          p_anomes?: number[]
          p_banker?: string[]
          p_categoria?: string
          p_produto?: string
          p_subcategoria?: string
        }
        Returns: {
          anomes: number
          anomes_nome: string
          categoria: string
          documento: string
          produto: string
          subcategoria: string
          subproduto: string
          valor: number
        }[]
      }
      rpc_receita_matriz_rows:
        | {
            Args: { p_anomes?: number[]; p_banker?: string[] }
            Returns: {
              anomes: number
              anomes_nome: string
              categoria: string
              produto: string
              subcategoria: string
              subproduto: string
              valor: number
            }[]
          }
        | {
            Args: {
              p_anomes?: number[]
              p_banker?: string[]
              p_finder?: string[]
            }
            Returns: {
              anomes: number
              anomes_nome: string
              categoria: string
              produto: string
              subcategoria: string
              subproduto: string
              valor: number
            }[]
          }
      rpc_receita_matriz_rows_cat:
        | {
            Args: { p_anomes?: number[]; p_banker?: string[] }
            Returns: {
              anomes: number
              anomes_nome: string
              categoria: string
              valor: number
            }[]
          }
        | {
            Args: {
              p_anomes?: number[]
              p_banker?: string[]
              p_finder?: string[]
            }
            Returns: {
              anomes: number
              anomes_nome: string
              categoria: string
              valor: number
            }[]
          }
      rpc_receita_mes_categoria:
        | {
            Args: { p_anomes?: number[]; p_banker?: string[] }
            Returns: {
              anomes: number
              anomes_nome: string
              categoria: string
              valor: number
            }[]
          }
        | {
            Args: {
              p_anomes?: number[]
              p_banker?: string[]
              p_finder?: string[]
            }
            Returns: {
              anomes: number
              anomes_nome: string
              categoria: string
              valor: number
            }[]
          }
      rpc_receita_total:
        | {
            Args: { p_anomes?: number[]; p_banker?: string[] }
            Returns: {
              receita: number
            }[]
          }
        | {
            Args: {
              p_anomes?: number[]
              p_banker?: string[]
              p_finder?: string[]
            }
            Returns: {
              receita: number
            }[]
          }
      rpc_receita_treemap_categoria:
        | {
            Args: { p_anomes?: number[]; p_banker?: string[] }
            Returns: {
              categoria: string
              valor: number
            }[]
          }
        | {
            Args: {
              p_anomes?: number[]
              p_banker?: string[]
              p_finder?: string[]
            }
            Returns: {
              categoria: string
              valor: number
            }[]
          }
      rpc_refresh_mv_comissoes: { Args: never; Returns: undefined }
      rpc_registrar_acesso: { Args: never; Returns: undefined }
      rpc_registrar_convite: {
        Args: { p_acao: string; p_email: string }
        Returns: Json
      }
      rpc_roa_faixa_pl: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          anomes: number
          anomes_nome: string
          faixa_pl: string
          roa: number
        }[]
      }
      rpc_roa_geral: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          anomes: number
          anomes_nome: string
          roa: number
        }[]
      }
      rpc_roa_m0_tabela: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          documento: string
          faixa_pl: string
          roa: number
        }[]
      }
      rpc_roa_tipo_cliente: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          anomes: number
          anomes_nome: string
          roa: number
          tipo_cliente: string
        }[]
      }
      rpc_salvar_sync_log: {
        Args: {
          p_detalhes?: Json
          p_duracao: string
          p_erros?: Json
          p_sucesso: boolean
          p_tipo: string
        }
        Returns: undefined
      }
      rpc_tabela_clientes: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          advisor: string
          banker: string
          cod_cliente: string
          documento: string
          endereco_ajustado: string
          pl_declarado_ajustado: number
          pl_tailor: number
          primeiro_nome: string
          sow_ajustado: number
          tipo_cliente: string
        }[]
      }
      rpc_tabela_vencimentos: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          advisor: string
          ativo_ajustado: string
          banker: string
          casa: string
          documento: string
          finder: string
          indexador: string
          net: number
          produto_ajustado: string
          vencimento: string
        }[]
      }
      rpc_todos_ativos: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          advisor: string
          ativo_ajustado: string
          banker: string
          casa: string
          conta: string
          documento: string
          finder: string
          indexador: string
          net: number
          produto_ajustado: string
          tipo_cliente: string
          vencimento: string
        }[]
      }
      rpc_validar_dominio: { Args: { p_email: string }; Returns: Json }
      rpc_vencimentos_grafico: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          ano: number
          mes: number
          net: number
          produto_ajustado: string
        }[]
      }
      rpc_vencimentos_por_ano: {
        Args: {
          p_advisor?: string[]
          p_anomes?: number[]
          p_banker?: string[]
          p_documento?: string[]
          p_finder?: string[]
          p_tipo_cliente?: string[]
        }
        Returns: {
          ano: number
          net: number
        }[]
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role:
        | "ASSESSOR"
        | "BANKER"
        | "LIDER"
        | "FINDER"
        | "ADMIN"
        | "OPERACOES"
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
      app_role: ["ASSESSOR", "BANKER", "LIDER", "FINDER", "ADMIN", "OPERACOES"],
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
