export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      shops: {
        Row: {
          id: string
          org_id: string
          name: string
          location: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['shops']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['shops']['Row'], 'id' | 'created_at'>>
      }
      profiles: {
        Row: {
          id: string
          org_id: string
          role: 'owner' | 'employee'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at'>>
      }
      jobs: {
        Row: {
          id: string
          org_id: string
          customer_name: string
          customer_phone: string | null
          device_model: string
          issue: string
          status: 'pending' | 'in_progress' | 'completed' | 'collected'
          technician_id: string | null
          before_photo_url: string | null
          after_photo_url: string | null
          price_charged: number | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['jobs']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['jobs']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      parts: {
        Row: {
          id: string
          org_id: string
          name: string
          category: string | null
          purchase_price: number | null
          selling_price: number | null
          min_stock_level: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['parts']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['parts']['Row'], 'id' | 'created_at'>>
      }
      inventory_items: {
        Row: {
          id: string
          org_id: string
          part_id: string
          qr_code: string | null
          status: 'in_stock' | 'taken' | 'used' | 'damaged' | 'lost' | 'rma'
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['inventory_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['inventory_items']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      job_parts: {
        Row: {
          id: string
          org_id: string
          job_id: string
          inventory_item_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['job_parts']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['job_parts']['Row'], 'id' | 'created_at'>>
      }
      activity_logs: {
        Row: {
          id: string
          org_id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string
          details: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['activity_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['activity_logs']['Row'], 'id' | 'created_at'>>
      }
      sales: {
        Row: {
          id: string
          org_id: string
          shop_id: string | null
          created_by: string | null
          sale_type: 'repair' | 'retail'
          item_name: string
          default_price: number | null
          final_price: number | null
          discount_amount: number | null
          payment_method: 'cash' | 'card' | 'transfer'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sales']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['sales']['Row'], 'id' | 'created_at'>>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}