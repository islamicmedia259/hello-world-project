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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_password_otps: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      banner_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          slide_direction: string | null
          slide_speed_seconds: number | null
          slug: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          slide_direction?: string | null
          slide_speed_seconds?: number | null
          slug?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          slide_direction?: string | null
          slide_speed_seconds?: number | null
          slug?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          banner_category_id: string | null
          category_id: string | null
          created_at: string
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          sort_order: number | null
          starts_at: string | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          banner_category_id?: string | null
          category_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          banner_category_id?: string | null
          category_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_banner_category_id_fkey"
            columns: ["banner_category_id"]
            isOneToOne: false
            referencedRelation: "banner_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_top: boolean | null
          name: string
          show_on_home: boolean | null
          slug: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_top?: boolean | null
          name: string
          show_on_home?: boolean | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_top?: boolean | null
          name?: string
          show_on_home?: boolean | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      childcategories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          slug: string | null
          sort_order: number | null
          subcategory_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          slug?: string | null
          sort_order?: number | null
          subcategory_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          slug?: string | null
          sort_order?: number | null
          subcategory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "childcategories_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      colors: {
        Row: {
          created_at: string
          id: string
          name: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          value?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_read: boolean | null
          message: string
          name: string
          phone: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          name: string
          phone?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          name?: string
          phone?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      coupon_products: {
        Row: {
          coupon_id: string
          product_id: string
        }
        Insert: {
          coupon_id: string
          product_id: string
        }
        Update: {
          coupon_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_products_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_discount: number | null
          min_order_amount: number | null
          starts_at: string | null
          type: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          type?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number | null
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          type?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number | null
          value?: number
        }
        Relationships: []
      }
      courier_shipments: {
        Row: {
          courier: string
          created_at: string
          id: string
          order_id: string | null
          payload: Json | null
          response: Json | null
          status: string | null
          tracking_id: string | null
          updated_at: string
        }
        Insert: {
          courier: string
          created_at?: string
          id?: string
          order_id?: string | null
          payload?: Json | null
          response?: Json | null
          status?: string | null
          tracking_id?: string | null
          updated_at?: string
        }
        Update: {
          courier?: string
          created_at?: string
          id?: string
          order_id?: string | null
          payload?: Json | null
          response?: Json | null
          status?: string | null
          tracking_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_messages: {
        Row: {
          body: string
          created_at: string
          customer_id: string | null
          id: string
          is_read: boolean | null
          sender: string
        }
        Insert: {
          body: string
          created_at?: string
          customer_id?: string | null
          id?: string
          is_read?: boolean | null
          sender: string
        }
        Update: {
          body?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          is_read?: boolean | null
          sender?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          district: string | null
          email: string | null
          id: string
          is_blocked: boolean | null
          name: string
          phone: string | null
          thana: string | null
          total_spent: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          id?: string
          is_blocked?: boolean | null
          name: string
          phone?: string | null
          thana?: string | null
          total_spent?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          id?: string
          is_blocked?: boolean | null
          name?: string
          phone?: string | null
          thana?: string | null
          total_spent?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      districts: {
        Row: {
          created_at: string
          division: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          division?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          division?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          recipient: string
          status: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          recipient: string
          status?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          recipient?: string
          status?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      home_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          rating: number | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          rating?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          rating?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      incomplete_orders: {
        Row: {
          cart_items: Json | null
          created_at: string
          customer_info: Json | null
          id: string
          total: number | null
        }
        Insert: {
          cart_items?: Json | null
          created_at?: string
          customer_info?: Json | null
          id?: string
          total?: number | null
        }
        Update: {
          cart_items?: Json | null
          created_at?: string
          customer_info?: Json | null
          id?: string
          total?: number | null
        }
        Relationships: []
      }
      landing_pages: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          is_published: boolean | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      manual_payment_methods: {
        Row: {
          account_number: string | null
          created_at: string
          id: string
          instructions: string | null
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      models: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          audience: string
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          meta: Json | null
          read_at: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          audience?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          meta?: Json | null
          read_at?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          audience?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          meta?: Json | null
          read_at?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          total?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_statuses: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string | null
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          discount: number | null
          district: string | null
          email: string | null
          id: string
          invoice_no: string | null
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          phone: string | null
          shipping_charge: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          thana: string | null
          total: number
          transaction_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          discount?: number | null
          district?: string | null
          email?: string | null
          id?: string
          invoice_no?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          phone?: string | null
          shipping_charge?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          thana?: string | null
          total?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          discount?: number | null
          district?: string | null
          email?: string | null
          id?: string
          invoice_no?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          phone?: string | null
          shipping_charge?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          thana?: string | null
          total?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          column_group: string | null
          content: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_published: boolean | null
          meta_description: string | null
          slug: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          column_group?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          slug: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          column_group?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          slug?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_number: string | null
          account_type: string | null
          created_at: string
          id: string
          instructions: string | null
          is_active: boolean | null
          is_default: boolean | null
          name: string
          number: string | null
          sort_order: number | null
          type: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          number?: string | null
          sort_order?: number | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          number?: string | null
          sort_order?: number | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pending_payments: {
        Row: {
          address: string | null
          cart_items: Json | null
          created_at: string
          customer_name: string | null
          id: string
          notes: string | null
          payment_method: string | null
          phone: string | null
          status: string | null
          total: number | null
          transaction_id: string | null
        }
        Insert: {
          address?: string | null
          cart_items?: Json | null
          created_at?: string
          customer_name?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          phone?: string | null
          status?: string | null
          total?: number | null
          transaction_id?: string | null
        }
        Update: {
          address?: string | null
          cart_items?: Json | null
          created_at?: string
          customer_name?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          phone?: string | null
          status?: string | null
          total?: number | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          menu_key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          menu_key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          menu_key?: string
        }
        Relationships: []
      }
      pixels: {
        Row: {
          created_at: string
          custom_url: string | null
          device_target: string | null
          id: string
          is_active: boolean | null
          name: string
          page_target: string | null
          pixel_id: string | null
          placement: string | null
          platform: string | null
          provider: string
          script: string | null
          script_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_url?: string | null
          device_target?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          page_target?: string | null
          pixel_id?: string | null
          placement?: string | null
          platform?: string | null
          provider: string
          script?: string | null
          script_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_url?: string | null
          device_target?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          page_target?: string | null
          pixel_id?: string | null
          placement?: string | null
          platform?: string | null
          provider?: string
          script?: string | null
          script_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      popups: {
        Row: {
          bg_color: string | null
          content: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          delay_seconds: number | null
          description: string | null
          end_at: string | null
          frequency_hours: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          name: string | null
          promo_code: string | null
          sort_order: number | null
          start_at: string | null
          style: string | null
          subtitle: string | null
          text_color: string | null
          title: string | null
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          bg_color?: string | null
          content?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          delay_seconds?: number | null
          description?: string | null
          end_at?: string | null
          frequency_hours?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          name?: string | null
          promo_code?: string | null
          sort_order?: number | null
          start_at?: string | null
          style?: string | null
          subtitle?: string | null
          text_color?: string | null
          title?: string | null
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          bg_color?: string | null
          content?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          delay_seconds?: number | null
          description?: string | null
          end_at?: string | null
          frequency_hours?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          name?: string | null
          promo_code?: string | null
          sort_order?: number | null
          start_at?: string | null
          style?: string | null
          subtitle?: string | null
          text_color?: string | null
          title?: string | null
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_price: number | null
          old_price: number | null
          product_id: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_price?: number | null
          old_price?: number | null
          product_id?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_price?: number | null
          old_price?: number | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_colors: {
        Row: {
          color_id: string
          product_id: string
        }
        Insert: {
          color_id: string
          product_id: string
        }
        Update: {
          color_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_colors_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_models: {
        Row: {
          model_id: string
          product_id: string
        }
        Insert: {
          model_id: string
          product_id: string
        }
        Update: {
          model_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_models_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_models_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_shipping_charges: {
        Row: {
          product_id: string
          shipping_charge_id: string
        }
        Insert: {
          product_id: string
          shipping_charge_id: string
        }
        Update: {
          product_id?: string
          shipping_charge_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_shipping_charges_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_shipping_charges_shipping_charge_id_fkey"
            columns: ["shipping_charge_id"]
            isOneToOne: false
            referencedRelation: "shipping_charges"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          product_id: string
          size_id: string
        }
        Insert: {
          product_id: string
          size_id: string
        }
        Update: {
          product_id?: string
          size_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sizes_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color_id: string | null
          created_at: string
          id: string
          image_url: string | null
          model_id: string | null
          price: number | null
          product_id: string
          size_id: string | null
          sku: string | null
          stock_quantity: number | null
        }
        Insert: {
          color_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          model_id?: string | null
          price?: number | null
          product_id: string
          size_id?: string | null
          sku?: string | null
          stock_quantity?: number | null
        }
        Update: {
          color_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          model_id?: string | null
          price?: number | null
          product_id?: string
          size_id?: string | null
          sku?: string | null
          stock_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          category_id: string | null
          childcategory_id: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          description: string | null
          discount_price: number | null
          gallery_urls: string[] | null
          id: string
          image_url: string | null
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          is_hot_deal: boolean | null
          is_top_feature: boolean | null
          is_top_selling: boolean | null
          name: string
          price: number
          sale_price: number | null
          short_description: string | null
          sku: string | null
          slug: string | null
          stock_quantity: number | null
          subcategory_id: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          childcategory_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          discount_price?: number | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_hot_deal?: boolean | null
          is_top_feature?: boolean | null
          is_top_selling?: boolean | null
          name: string
          price?: number
          sale_price?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          stock_quantity?: number | null
          subcategory_id?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          childcategory_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          discount_price?: number | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_hot_deal?: boolean | null
          is_top_feature?: boolean | null
          is_top_selling?: boolean | null
          name?: string
          price?: number
          sale_price?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          stock_quantity?: number | null
          subcategory_id?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_childcategory_id_fkey"
            columns: ["childcategory_id"]
            isOneToOne: false
            referencedRelation: "childcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          postal_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_charges: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      shipping_zone_districts: {
        Row: {
          district_id: string
          shipping_zone_id: string
        }
        Insert: {
          district_id: string
          shipping_zone_id: string
        }
        Update: {
          district_id?: string
          shipping_zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_zone_districts_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_zone_districts_shipping_zone_id_fkey"
            columns: ["shipping_zone_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          charge: number
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          charge?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          charge?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          address: string | null
          api_keys: Json | null
          app_store_url: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          currency: string | null
          dark_logo_url: string | null
          favicon_url: string | null
          footer_text: string | null
          hero_subtitle: string | null
          hero_title: string | null
          home_reviews_enabled: boolean | null
          id: string
          logo_url: string | null
          play_store_url: string | null
          site_name: string | null
          updated_at: string
          whatsapp_number: string | null
          white_logo_url: string | null
        }
        Insert: {
          address?: string | null
          api_keys?: Json | null
          app_store_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string | null
          dark_logo_url?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          home_reviews_enabled?: boolean | null
          id?: string
          logo_url?: string | null
          play_store_url?: string | null
          site_name?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          white_logo_url?: string | null
        }
        Update: {
          address?: string | null
          api_keys?: Json | null
          app_store_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string | null
          dark_logo_url?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          home_reviews_enabled?: boolean | null
          id?: string
          logo_url?: string | null
          play_store_url?: string | null
          site_name?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          white_logo_url?: string | null
        }
        Relationships: []
      }
      sizes: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          platform: string
          sort_order: number | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          platform: string
          sort_order?: number | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          platform?: string
          sort_order?: number | null
          url?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          slug: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      thanas: {
        Row: {
          created_at: string
          district_id: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          district_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          district_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "thanas_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_password_otps: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variant_shipping_charges: {
        Row: {
          shipping_charge_id: string
          variant_id: string
        }
        Insert: {
          shipping_charge_id: string
          variant_id: string
        }
        Update: {
          shipping_charge_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_shipping_charges_shipping_charge_id_fkey"
            columns: ["shipping_charge_id"]
            isOneToOne: false
            referencedRelation: "shipping_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_shipping_charges_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      current_user_is_admin: { Args: never; Returns: boolean }
      get_user_menu_keys: {
        Args: { _user_id: string }
        Returns: {
          menu_key: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      promote_first_admin: { Args: never; Returns: boolean }
      track_order: {
        Args: { _invoice: string; _phone?: string }
        Returns: {
          created_at: string
          customer_name: string
          id: string
          invoice_no: string
          phone: string
          status: Database["public"]["Enums"]["order_status"]
          total: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "staff"
      order_status:
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "incomplete"
        | "processing"
        | "on_the_way"
        | "on_hold"
        | "in_courier"
        | "completed"
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
      app_role: ["admin", "user", "staff"],
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
        "incomplete",
        "processing",
        "on_the_way",
        "on_hold",
        "in_courier",
        "completed",
      ],
    },
  },
} as const
