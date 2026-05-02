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
          description: string | null
          id: string
          is_active: boolean
          name: string
          slide_direction: string
          slide_speed_seconds: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slide_direction?: string
          slide_speed_seconds?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slide_direction?: string
          slide_speed_seconds?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          position: string
          sort_order: number
          subtitle: string | null
          title: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          position?: string
          sort_order?: number
          subtitle?: string | null
          title: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          position?: string
          sort_order?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_top: boolean
          name: string
          show_on_home: boolean
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_top?: boolean
          name: string
          show_on_home?: boolean
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_top?: boolean
          name?: string
          show_on_home?: boolean
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      childcategories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          subcategory_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          subcategory_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          subcategory_id?: string
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
          hex_code: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          hex_code?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          hex_code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_read: boolean
          message: string
          name: string
          phone: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_read?: boolean
          message: string
          name: string
          phone?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_read?: boolean
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
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
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
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order_amount: number
          scope: string
          starts_at: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number
          scope?: string
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number
          scope?: string
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      courier_shipments: {
        Row: {
          consignment_id: string | null
          created_at: string
          id: string
          order_id: string
          provider: string
          raw_response: Json | null
          status: string
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          consignment_id?: string | null
          created_at?: string
          id?: string
          order_id: string
          provider: string
          raw_response?: Json | null
          status?: string
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          consignment_id?: string | null
          created_at?: string
          id?: string
          order_id?: string
          provider?: string
          raw_response?: Json | null
          status?: string
          tracking_code?: string | null
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
          customer_id: string
          id: string
          is_read: boolean
          sender: string
        }
        Insert: {
          body: string
          created_at?: string
          customer_id: string
          id?: string
          is_read?: boolean
          sender: string
        }
        Update: {
          body?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_read?: boolean
          sender?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_blocked: boolean
          name: string | null
          notes: string | null
          phone: string
          total_orders: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_blocked?: boolean
          name?: string | null
          notes?: string | null
          phone: string
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_blocked?: boolean
          name?: string | null
          notes?: string | null
          phone?: string
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      districts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          recipient: string
          status: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          recipient: string
          status?: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          recipient?: string
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      incomplete_orders: {
        Row: {
          address: string | null
          cart_items: Json
          completed_order_id: string | null
          created_at: string
          customer_name: string | null
          district: string | null
          email: string | null
          id: string
          is_completed: boolean
          notes: string | null
          phone: string
          shipping_cost: number
          subtotal: number
          thana: string | null
          total: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          cart_items?: Json
          completed_order_id?: string | null
          created_at?: string
          customer_name?: string | null
          district?: string | null
          email?: string | null
          id?: string
          is_completed?: boolean
          notes?: string | null
          phone: string
          shipping_cost?: number
          subtotal?: number
          thana?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          cart_items?: Json
          completed_order_id?: string | null
          created_at?: string
          customer_name?: string | null
          district?: string | null
          email?: string | null
          id?: string
          is_completed?: boolean
          notes?: string | null
          phone?: string
          shipping_cost?: number
          subtotal?: number
          thana?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      landing_pages: {
        Row: {
          banners: Json
          banners_title: string | null
          countdown_end_at: string | null
          countdown_title: string | null
          created_at: string
          custom_discount_price: number | null
          custom_price: number | null
          description: string | null
          faq_title: string | null
          faqs: Json
          features: Json
          features_title: string | null
          final_cta_subtitle: string | null
          final_cta_title: string | null
          gallery: Json
          gallery_title: string | null
          hero_bg_color: string | null
          hero_cta_label: string | null
          hero_headline: string | null
          hero_image_url: string | null
          hero_subheadline: string | null
          hero_text_color: string | null
          hero_video_url: string | null
          id: string
          is_active: boolean
          meta_description: string | null
          order_count: number
          order_mode: string
          primary_color: string | null
          product_id: string | null
          product_section_title: string | null
          reviews: Json
          reviews_title: string | null
          show_banners: boolean
          show_countdown: boolean
          show_faq: boolean
          show_features: boolean
          show_gallery: boolean
          show_product_section: boolean
          show_reviews: boolean
          slug: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          banners?: Json
          banners_title?: string | null
          countdown_end_at?: string | null
          countdown_title?: string | null
          created_at?: string
          custom_discount_price?: number | null
          custom_price?: number | null
          description?: string | null
          faq_title?: string | null
          faqs?: Json
          features?: Json
          features_title?: string | null
          final_cta_subtitle?: string | null
          final_cta_title?: string | null
          gallery?: Json
          gallery_title?: string | null
          hero_bg_color?: string | null
          hero_cta_label?: string | null
          hero_headline?: string | null
          hero_image_url?: string | null
          hero_subheadline?: string | null
          hero_text_color?: string | null
          hero_video_url?: string | null
          id?: string
          is_active?: boolean
          meta_description?: string | null
          order_count?: number
          order_mode?: string
          primary_color?: string | null
          product_id?: string | null
          product_section_title?: string | null
          reviews?: Json
          reviews_title?: string | null
          show_banners?: boolean
          show_countdown?: boolean
          show_faq?: boolean
          show_features?: boolean
          show_gallery?: boolean
          show_product_section?: boolean
          show_reviews?: boolean
          slug: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          banners?: Json
          banners_title?: string | null
          countdown_end_at?: string | null
          countdown_title?: string | null
          created_at?: string
          custom_discount_price?: number | null
          custom_price?: number | null
          description?: string | null
          faq_title?: string | null
          faqs?: Json
          features?: Json
          features_title?: string | null
          final_cta_subtitle?: string | null
          final_cta_title?: string | null
          gallery?: Json
          gallery_title?: string | null
          hero_bg_color?: string | null
          hero_cta_label?: string | null
          hero_headline?: string | null
          hero_image_url?: string | null
          hero_subheadline?: string | null
          hero_text_color?: string | null
          hero_video_url?: string | null
          id?: string
          is_active?: boolean
          meta_description?: string | null
          order_count?: number
          order_mode?: string
          primary_color?: string | null
          product_id?: string | null
          product_section_title?: string | null
          reviews?: Json
          reviews_title?: string | null
          show_banners?: boolean
          show_countdown?: boolean
          show_faq?: boolean
          show_features?: boolean
          show_gallery?: boolean
          show_product_section?: boolean
          show_reviews?: boolean
          slug?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      models: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
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
          is_read: boolean
          link: string | null
          message: string | null
          meta: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          audience?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          meta?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          audience?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          meta?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
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
          color: string
          created_at: string
          id: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string
          assigned_to: string | null
          coupon_code: string | null
          created_at: string
          customer_name: string
          discount: number
          discount_amount: number
          id: string
          invoice_no: string
          notes: string | null
          payment_method: string | null
          payment_status: string
          phone: string
          shipping_cost: number
          status: Database["public"]["Enums"]["order_status"]
          total: number
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          address: string
          assigned_to?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_name: string
          discount?: number
          discount_amount?: number
          id?: string
          invoice_no?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          phone: string
          shipping_cost?: number
          status?: Database["public"]["Enums"]["order_status"]
          total: number
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string
          assigned_to?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_name?: string
          discount?: number
          discount_amount?: number
          id?: string
          invoice_no?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          phone?: string
          shipping_cost?: number
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pages: {
        Row: {
          column_group: string
          content: string | null
          created_at: string
          id: string
          is_active: boolean
          meta_description: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          column_group?: string
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          meta_description?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          column_group?: string
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          meta_description?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_type: string
          created_at: string
          id: string
          instructions: string | null
          is_active: boolean
          is_default: boolean
          name: string
          number: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_type?: string
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          is_default?: boolean
          name: string
          number: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_type?: string
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          is_default?: boolean
          name?: string
          number?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      pending_payments: {
        Row: {
          address: string
          cart_items: Json
          created_at: string
          created_order_id: string | null
          customer_name: string
          id: string
          notes: string | null
          payment_method: string
          phone: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          total: number
          transaction_id: string
          updated_at: string
        }
        Insert: {
          address: string
          cart_items?: Json
          created_at?: string
          created_order_id?: string | null
          customer_name: string
          id?: string
          notes?: string | null
          payment_method: string
          phone: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          total: number
          transaction_id: string
          updated_at?: string
        }
        Update: {
          address?: string
          cart_items?: Json
          created_at?: string
          created_order_id?: string | null
          customer_name?: string
          id?: string
          notes?: string | null
          payment_method?: string
          phone?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          total?: number
          transaction_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          label: string
          menu_key: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          label: string
          menu_key?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          label?: string
          menu_key?: string | null
        }
        Relationships: []
      }
      pixels: {
        Row: {
          created_at: string
          custom_url: string | null
          device_target: string
          fire_count: number
          id: string
          is_active: boolean
          last_fired_at: string | null
          name: string
          page_target: string
          pixel_id: string | null
          placement: string
          platform: string
          script_code: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_url?: string | null
          device_target?: string
          fire_count?: number
          id?: string
          is_active?: boolean
          last_fired_at?: string | null
          name: string
          page_target?: string
          pixel_id?: string | null
          placement?: string
          platform?: string
          script_code: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_url?: string | null
          device_target?: string
          fire_count?: number
          id?: string
          is_active?: boolean
          last_fired_at?: string | null
          name?: string
          page_target?: string
          pixel_id?: string | null
          placement?: string
          platform?: string
          script_code?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      popups: {
        Row: {
          bg_color: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          delay_seconds: number
          description: string | null
          end_at: string | null
          frequency_hours: number
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          name: string
          promo_code: string | null
          sort_order: number
          start_at: string | null
          style: string
          subtitle: string | null
          text_color: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          bg_color?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          delay_seconds?: number
          description?: string | null
          end_at?: string | null
          frequency_hours?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          name: string
          promo_code?: string | null
          sort_order?: number
          start_at?: string | null
          style?: string
          subtitle?: string | null
          text_color?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          bg_color?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          delay_seconds?: number
          description?: string | null
          end_at?: string | null
          frequency_hours?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          name?: string
          promo_code?: string | null
          sort_order?: number
          start_at?: string | null
          style?: string
          subtitle?: string | null
          text_color?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_discount: number | null
          new_price: number
          old_discount: number | null
          old_price: number
          product_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_discount?: number | null
          new_price: number
          old_discount?: number | null
          old_price: number
          product_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_discount?: number | null
          new_price?: number
          old_discount?: number | null
          old_price?: number
          product_id?: string
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
          discount_price: number | null
          id: string
          image_url: string | null
          is_active: boolean
          model_id: string | null
          price: number | null
          product_id: string
          size_id: string | null
          sku: string | null
          sort_order: number
          stock: number
          updated_at: string
        }
        Insert: {
          color_id?: string | null
          created_at?: string
          discount_price?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          model_id?: string | null
          price?: number | null
          product_id: string
          size_id?: string | null
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          color_id?: string | null
          created_at?: string
          discount_price?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          model_id?: string | null
          price?: number | null
          product_id?: string
          size_id?: string | null
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
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
          created_at: string
          demo_type: string | null
          demo_url: string | null
          description: string | null
          discount_price: number | null
          gallery: Json
          gallery_video_url: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_deal: boolean
          is_hot_deal: boolean
          is_top_feature: boolean
          name: string
          price: number
          review_images: string[]
          review_slide_speed: number
          short_description: string | null
          sku: string | null
          stock: number
          subcategory_id: string | null
          tags: string[]
          updated_at: string
          video_type: string | null
          video_url: string | null
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          childcategory_id?: string | null
          created_at?: string
          demo_type?: string | null
          demo_url?: string | null
          description?: string | null
          discount_price?: number | null
          gallery?: Json
          gallery_video_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_deal?: boolean
          is_hot_deal?: boolean
          is_top_feature?: boolean
          name: string
          price: number
          review_images?: string[]
          review_slide_speed?: number
          short_description?: string | null
          sku?: string | null
          stock?: number
          subcategory_id?: string | null
          tags?: string[]
          updated_at?: string
          video_type?: string | null
          video_url?: string | null
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          childcategory_id?: string | null
          created_at?: string
          demo_type?: string | null
          demo_url?: string | null
          description?: string | null
          discount_price?: number | null
          gallery?: Json
          gallery_video_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_deal?: boolean
          is_hot_deal?: boolean
          is_top_feature?: boolean
          name?: string
          price?: number
          review_images?: string[]
          review_slide_speed?: number
          short_description?: string | null
          sku?: string | null
          stock?: number
          subcategory_id?: string | null
          tags?: string[]
          updated_at?: string
          video_type?: string | null
          video_url?: string | null
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
          created_at: string
          display_name: string | null
          district: string | null
          email: string | null
          id: string
          is_active: boolean
          phone: string | null
          thana: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          district?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          thana?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          district?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          thana?: string | null
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
          charge: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          zone: string
          zone_id: string | null
        }
        Insert: {
          charge?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          zone?: string
          zone_id?: string | null
        }
        Update: {
          charge?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          zone?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_charges_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zone_districts: {
        Row: {
          created_at: string
          district_id: string
          id: string
          zone_id: string
        }
        Insert: {
          created_at?: string
          district_id: string
          id?: string
          zone_id: string
        }
        Update: {
          created_at?: string
          district_id?: string
          id?: string
          zone_id?: string
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
            foreignKeyName: "shipping_zone_districts_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
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
          dark_logo_url: string | null
          facebook_url: string | null
          favicon_url: string | null
          fb_pixel_id: string | null
          footer_text: string | null
          google_analytics_id: string | null
          gtm_id: string | null
          home_reviews: Json
          home_reviews_enabled: boolean
          home_reviews_speed_ms: number
          home_reviews_subtitle: string | null
          home_reviews_title: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          messenger_url: string | null
          meta_description: string | null
          play_store_url: string | null
          site_name: string
          updated_at: string
          whatsapp_number: string | null
          white_logo_url: string | null
          youtube_url: string | null
        }
        Insert: {
          address?: string | null
          api_keys?: Json | null
          app_store_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          dark_logo_url?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          fb_pixel_id?: string | null
          footer_text?: string | null
          google_analytics_id?: string | null
          gtm_id?: string | null
          home_reviews?: Json
          home_reviews_enabled?: boolean
          home_reviews_speed_ms?: number
          home_reviews_subtitle?: string | null
          home_reviews_title?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          messenger_url?: string | null
          meta_description?: string | null
          play_store_url?: string | null
          site_name?: string
          updated_at?: string
          whatsapp_number?: string | null
          white_logo_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          address?: string | null
          api_keys?: Json | null
          app_store_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          dark_logo_url?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          fb_pixel_id?: string | null
          footer_text?: string | null
          google_analytics_id?: string | null
          gtm_id?: string | null
          home_reviews?: Json
          home_reviews_enabled?: boolean
          home_reviews_speed_ms?: number
          home_reviews_subtitle?: string | null
          home_reviews_title?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          messenger_url?: string | null
          meta_description?: string | null
          play_store_url?: string | null
          site_name?: string
          updated_at?: string
          whatsapp_number?: string | null
          white_logo_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      sizes: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      social_links: {
        Row: {
          color: string | null
          created_at: string
          icon_key: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon_key?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon_key?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
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
          district_id: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          district_id: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          district_id?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
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
      track_order: { Args: { _invoice: string; _phone: string }; Returns: Json }
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
