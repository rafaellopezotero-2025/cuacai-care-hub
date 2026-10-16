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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          detalle: Json | null
          entity: string
          entity_id: string | null
          id: number
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          paciente_id: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
          usuario: string | null
        }
        Insert: {
          action: string
          detalle?: Json | null
          entity: string
          entity_id?: string | null
          id?: never
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          paciente_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
          usuario?: string | null
        }
        Update: {
          action?: string
          detalle?: Json | null
          entity?: string
          entity_id?: string | null
          id?: never
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          paciente_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
          usuario?: string | null
        }
        Relationships: []
      }
      centros_tx: {
        Row: {
          activo: boolean
          created_at: string
          email: string | null
          id: string
          localidad: string | null
          nombre: string
          observaciones: string | null
          provincia: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          localidad?: string | null
          nombre: string
          observaciones?: string | null
          provincia?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          localidad?: string | null
          nombre?: string
          observaciones?: string | null
          provincia?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coberturas: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string
          id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion: string
          id?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      diagnosticos: {
        Row: {
          activo: boolean
          created_at: string
          diagnostico: string
          id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          diagnostico: string
          id?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          diagnostico?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      estados_tx: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          estado_tx: string
          id: string
          orden: number
          requiere_fecha_tx: boolean
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          estado_tx: string
          id?: string
          orden?: number
          requiere_fecha_tx?: boolean
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          estado_tx?: string
          id?: string
          orden?: number
          requiere_fecha_tx?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      login_intentos: {
        Row: {
          created_at: string
          exitoso: boolean
          id: number
          ip_address: string | null
          usuario: string
        }
        Insert: {
          created_at?: string
          exitoso: boolean
          id?: never
          ip_address?: string | null
          usuario: string
        }
        Update: {
          created_at?: string
          exitoso?: boolean
          id?: never
          ip_address?: string | null
          usuario?: string
        }
        Relationships: []
      }
      medicos_ref: {
        Row: {
          activo: boolean
          apellidos: string
          created_at: string
          email: string | null
          id: string
          matricula: string | null
          nombres: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          apellidos: string
          created_at?: string
          email?: string | null
          id?: string
          matricula?: string | null
          nombres: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          apellidos?: string
          created_at?: string
          email?: string | null
          id?: string
          matricula?: string | null
          nombres?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pacientes: {
        Row: {
          activo: boolean
          apellidos: string
          created_at: string
          created_by: string | null
          dni: string | null
          domicilio: string | null
          email: string | null
          fecha_nacimiento: string | null
          id: string
          localidad: string | null
          nombres: string
          observaciones: string | null
          sexo: string | null
          telefono: string | null
          telefono_alternativo: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          apellidos: string
          created_at?: string
          created_by?: string | null
          dni?: string | null
          domicilio?: string | null
          email?: string | null
          fecha_nacimiento?: string | null
          id?: string
          localidad?: string | null
          nombres: string
          observaciones?: string | null
          sexo?: string | null
          telefono?: string | null
          telefono_alternativo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          apellidos?: string
          created_at?: string
          created_by?: string | null
          dni?: string | null
          domicilio?: string | null
          email?: string | null
          fecha_nacimiento?: string | null
          id?: string
          localidad?: string | null
          nombres?: string
          observaciones?: string | null
          sexo?: string | null
          telefono?: string | null
          telefono_alternativo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      permisos: {
        Row: {
          descripcion: string
          grupo: string
          permiso: string
        }
        Insert: {
          descripcion: string
          grupo: string
          permiso: string
        }
        Update: {
          descripcion?: string
          grupo?: string
          permiso?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activo: boolean
          apellido: string
          created_at: string
          id: string
          nombre: string
          ultimo_acceso: string | null
          updated_at: string
          usuario: string
        }
        Insert: {
          activo?: boolean
          apellido: string
          created_at?: string
          id: string
          nombre: string
          ultimo_acceso?: string | null
          updated_at?: string
          usuario: string
        }
        Update: {
          activo?: boolean
          apellido?: string
          created_at?: string
          id?: string
          nombre?: string
          ultimo_acceso?: string | null
          updated_at?: string
          usuario?: string
        }
        Relationships: []
      }
      rol_permisos: {
        Row: {
          permiso: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          permiso: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          permiso?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      tipos_tx: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          tipo_tx: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          tipo_tx: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          tipo_tx?: string
          updated_at?: string
        }
        Relationships: []
      }
      trasplantes: {
        Row: {
          activo: boolean
          centro_tx_id: string | null
          cobertura_id: string | null
          created_at: string
          created_by: string | null
          diagnostico_id: string | null
          estado_tx_id: string
          fecha_tx: string | null
          id: string
          medico_ref_id: string | null
          observaciones: string | null
          paciente_id: string
          tipo_tx_id: string | null
          updated_at: string
          updated_by: string | null
          via_admin_id: string | null
        }
        Insert: {
          activo?: boolean
          centro_tx_id?: string | null
          cobertura_id?: string | null
          created_at?: string
          created_by?: string | null
          diagnostico_id?: string | null
          estado_tx_id: string
          fecha_tx?: string | null
          id?: string
          medico_ref_id?: string | null
          observaciones?: string | null
          paciente_id: string
          tipo_tx_id?: string | null
          updated_at?: string
          updated_by?: string | null
          via_admin_id?: string | null
        }
        Update: {
          activo?: boolean
          centro_tx_id?: string | null
          cobertura_id?: string | null
          created_at?: string
          created_by?: string | null
          diagnostico_id?: string | null
          estado_tx_id?: string
          fecha_tx?: string | null
          id?: string
          medico_ref_id?: string | null
          observaciones?: string | null
          paciente_id?: string
          tipo_tx_id?: string | null
          updated_at?: string
          updated_by?: string | null
          via_admin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trasplantes_centro_tx_id_fkey"
            columns: ["centro_tx_id"]
            isOneToOne: false
            referencedRelation: "centros_tx"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trasplantes_cobertura_id_fkey"
            columns: ["cobertura_id"]
            isOneToOne: false
            referencedRelation: "coberturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trasplantes_diagnostico_id_fkey"
            columns: ["diagnostico_id"]
            isOneToOne: false
            referencedRelation: "diagnosticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trasplantes_estado_tx_id_fkey"
            columns: ["estado_tx_id"]
            isOneToOne: false
            referencedRelation: "estados_tx"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trasplantes_medico_ref_id_fkey"
            columns: ["medico_ref_id"]
            isOneToOne: false
            referencedRelation: "medicos_ref"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trasplantes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trasplantes_tipo_tx_id_fkey"
            columns: ["tipo_tx_id"]
            isOneToOne: false
            referencedRelation: "tipos_tx"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trasplantes_via_admin_id_fkey"
            columns: ["via_admin_id"]
            isOneToOne: false
            referencedRelation: "vias_admin"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      vias_admin: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string
          id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion: string
          id?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_paciente_estado_actual: {
        Row: {
          centro_tx: string | null
          centro_tx_id: string | null
          cobertura: string | null
          cobertura_id: string | null
          estado_codigo: string | null
          estado_tx: string | null
          estado_tx_id: string | null
          fecha_tx: string | null
          paciente_id: string | null
          tipo_tx: string | null
          tipo_tx_id: string | null
          trasplante_id: string | null
          via_admin_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trasplantes_centro_tx_id_fkey"
            columns: ["centro_tx_id"]
            isOneToOne: false
            referencedRelation: "centros_tx"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trasplantes_cobertura_id_fkey"
            columns: ["cobertura_id"]
            isOneToOne: false
            referencedRelation: "coberturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trasplantes_estado_tx_id_fkey"
            columns: ["estado_tx_id"]
            isOneToOne: false
            referencedRelation: "estados_tx"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trasplantes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trasplantes_tipo_tx_id_fkey"
            columns: ["tipo_tx_id"]
            isOneToOne: false
            referencedRelation: "tipos_tx"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trasplantes_via_admin_id_fkey"
            columns: ["via_admin_id"]
            isOneToOne: false
            referencedRelation: "vias_admin"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      buscar_pacientes: {
        Args: {
          p_busqueda?: string
          p_centro_id?: string
          p_cobertura_id?: string
          p_desde?: string
          p_diagnostico_id?: string
          p_dir?: string
          p_estado_id?: string
          p_hasta?: string
          p_incluir_inactivos?: boolean
          p_limit?: number
          p_localidad?: string
          p_medico_id?: string
          p_offset?: number
          p_orden?: string
          p_tipo_tx_id?: string
          p_via_id?: string
        }
        Returns: {
          activo: boolean
          apellidos: string
          centro_tx: string
          dni: string
          estado_codigo: string
          estado_tx: string
          fecha_nacimiento: string
          fecha_tx: string
          id: string
          localidad: string
          nombres: string
          telefono: string
          tipo_tx: string
          total_count: number
        }[]
      }
      dashboard_resumen: {
        Args: {
          p_centro_id?: string
          p_cobertura_id?: string
          p_desde?: string
          p_estado_id?: string
          p_hasta?: string
          p_localidad?: string
          p_tipo_tx_id?: string
        }
        Returns: Json
      }
      fn_request_header: { Args: { p_name: string }; Returns: string }
      has_permission: {
        Args: { _permiso: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      importar_lote: {
        Args: { p_pacientes: Json; p_trasplantes: Json }
        Returns: Json
      }
      localidades_pacientes: { Args: never; Returns: string[] }
      mis_permisos: { Args: never; Returns: string[] }
      registrar_evento_auditoria: {
        Args: {
          p_action: string
          p_detalle?: Json
          p_entity: string
          p_entity_id?: string
          p_ip?: string
          p_paciente_id?: string
          p_user_agent?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "administrador" | "operador" | "consulta"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["administrador", "operador", "consulta"],
    },
  },
} as const
