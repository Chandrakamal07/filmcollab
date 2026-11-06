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

    PostgrestVersion: "13.0.4"

  }

  public: {

    Tables: {

      industry_news: {

        Row: {

          id: string

          title: string

          description: string | null

          content: string | null

          category: string | null

          created_by: string | null

          user_id: string | null

          created_at: string | null

        }

        Insert: {

          id?: string

          title: string

          description?: string | null

          content?: string | null

          category?: string | null

          created_by?: string | null

          user_id?: string | null

          created_at?: string | null

        }

        Update: {

          id?: string

          title?: string

          description?: string | null

          content?: string | null

          category?: string | null

          created_by?: string | null

          user_id?: string | null

          created_at?: string | null

        }

        Relationships: []

      }

      industry_courses: {

        Row: {

          id: string

          title: string

          description: string | null

          duration: string | null

          instructor: string | null

          level: string | null

          category: string | null

          price: string | null

          enrolled: number | null

          website_link: string | null

          created_by: string | null

          user_id: string | null

          created_at: string | null

        }

        Insert: {

          id?: string

          title: string

          description?: string | null

          duration?: string | null

          instructor?: string | null

          level?: string | null

          category?: string | null

          price?: string | null

          enrolled?: number | null

          website_link?: string | null

          created_by?: string | null

          user_id?: string | null

          created_at?: string | null

        }

        Update: {

          id?: string

          title?: string

          description?: string | null

          duration?: string | null

          instructor?: string | null

          level?: string | null

          category?: string | null

          price?: string | null

          enrolled?: number | null

          website_link?: string | null

          created_by?: string | null

          user_id?: string | null

          created_at?: string | null

        }

        Relationships: []

      }

      reports: {

        Row: {

          id: string

          reporter_id: string | null

          reported_user_id: string | null

          reason: string | null

          details: string | null

          status: string | null

          created_at: string | null

        }

        Insert: {

          id?: string

          reporter_id?: string | null

          reported_user_id?: string | null

          reason?: string | null

          details?: string | null

          status?: string | null

          created_at?: string | null

        }

        Update: {

          id?: string

          reporter_id?: string | null

          reported_user_id?: string | null

          reason?: string | null

          details?: string | null

          status?: string | null

          created_at?: string | null

        }

        Relationships: []

      }

      connections: {

        Row: {

          connected_user_id: string

          created_at: string | null

          id: string

          status: string

          updated_at: string | null

          user_id: string

        }

        Insert: {

          connected_user_id: string

          created_at?: string | null

          id?: string

          status?: string

          updated_at?: string | null

          user_id: string

        }

        Update: {

          connected_user_id?: string

          created_at?: string | null

          id?: string

          status?: string

          updated_at?: string | null

          user_id?: string

        }

        Relationships: [

          {

            foreignKeyName: "connections_connected_user_id_fkey"

            columns: ["connected_user_id"]

            isOneToOne: false

            referencedRelation: "profiles"

            referencedColumns: ["id"]

          },

          {

            foreignKeyName: "connections_user_id_fkey"

            columns: ["user_id"]

            isOneToOne: false

            referencedRelation: "profiles"

            referencedColumns: ["id"]

          },

        ]

      }

      jobs: {

        Row: {

          benefits: string | null

          requirements: string | null

          company_name: string

          created_at: string | null

          experience_level: string

          id: string

          industry: string

          job_description: string

          job_title: string

          job_type: string

          location: string

          posted_date: string | null

          salary_max: number | null

          salary_min: number | null

          salary_range: string | null

          skills_required: string[] | null

          status: string | null

          updated_at: string | null

          user_id: string | null

        }

        Insert: {

          benefits?: string | null

          requirements?: string | null

          company_name: string

          created_at?: string | null

          experience_level: string

          id?: string

          industry: string

          job_description: string

          job_title: string

          job_type: string

          location: string

          posted_date?: string | null

          salary_max?: number | null

          salary_min?: number | null

          salary_range?: string | null

          skills_required?: string[] | null

          status?: string | null

          updated_at?: string | null

          user_id?: string | null

        }

        Update: {

          benefits?: string | null

          requirements?: string | null

          company_name?: string

          created_at?: string | null

          experience_level?: string

          id?: string

          industry?: string

          job_description?: string

          job_title?: string

          job_type?: string

          location?: string

          posted_date?: string | null

          salary_max?: number | null

          salary_min?: number | null

          salary_range?: string | null

          skills_required?: string[] | null

          status?: string | null

          updated_at?: string | null

          user_id?: string | null

        }

        Relationships: []

      }

      kv_store_8c069c6b: {

        Row: {

          key: string

          value: Json

        }

        Insert: {

          key: string

          value: Json

        }

        Update: {

          key?: string

          value?: Json

        }

        Relationships: []

      }

      post_comments: {

        Row: {

          content: string

          created_at: string

          id: string

          parent_id: string | null

          post_id: string

          updated_at: string

          user_id: string

        }

        Insert: {

          content: string

          created_at?: string

          id?: string

          parent_id?: string | null

          post_id: string

          updated_at?: string

          user_id: string

        }

        Update: {

          content?: string

          created_at?: string

          id?: string

          parent_id?: string | null

          post_id?: string

          updated_at?: string

          user_id?: string

        }

        Relationships: [

          {

            foreignKeyName: "post_comments_parent_id_fkey"

            columns: ["parent_id"]

            isOneToOne: false

            referencedRelation: "post_comments"

            referencedColumns: ["id"]

          },

          {

            foreignKeyName: "post_comments_post_id_fkey"

            columns: ["post_id"]

            isOneToOne: false

            referencedRelation: "posts"

            referencedColumns: ["id"]

          },

          {

            foreignKeyName: "post_comments_user_id_fkey"

            columns: ["user_id"]

            isOneToOne: false

            referencedRelation: "profiles"

            referencedColumns: ["id"]

          },

        ]

      }

      post_likes: {

        Row: {

          created_at: string

          id: string

          post_id: string

          user_id: string

        }

        Insert: {

          created_at?: string

          id?: string

          post_id: string

          user_id: string

        }

        Update: {

          created_at?: string

          id?: string

          post_id?: string

          user_id?: string

        }

        Relationships: [

          {

            foreignKeyName: "post_likes_post_id_fkey"

            columns: ["post_id"]

            isOneToOne: false

            referencedRelation: "posts"

            referencedColumns: ["id"]

          },

          {

            foreignKeyName: "post_likes_user_id_fkey"

            columns: ["user_id"]

            isOneToOne: false

            referencedRelation: "profiles"

            referencedColumns: ["id"]

          },

        ]

      }

      post_saves: {

        Row: {

          created_at: string

          id: string

          post_id: string

          user_id: string

        }

        Insert: {

          created_at?: string

          id?: string

          post_id: string

          user_id: string

        }

        Update: {

          created_at?: string

          id?: string

          post_id?: string

          user_id?: string

        }

        Relationships: [

          {

            foreignKeyName: "post_saves_post_id_fkey"

            columns: ["post_id"]

            isOneToOne: false

            referencedRelation: "posts"

            referencedColumns: ["id"]

          },

          {

            foreignKeyName: "post_saves_user_id_fkey"

            columns: ["user_id"]

            isOneToOne: false

            referencedRelation: "profiles"

            referencedColumns: ["id"]

          },

        ]

      }

      posts: {

        Row: {

          author_id: string

          comments_count: number

          content: string

          created_at: string

          hashtags: string[] | null

          id: string

          is_featured: boolean

          is_published: boolean

          likes_count: number

          media_types: string[] | null

          media_urls: string[] | null

          shares_count: number

          title: string | null

          updated_at: string

        }

        Insert: {

          author_id: string

          comments_count?: number

          content: string

          created_at?: string

          hashtags?: string[] | null

          id?: string

          is_featured?: boolean

          is_published?: boolean

          likes_count?: number

          media_types?: string[] | null

          media_urls?: string[] | null

          shares_count?: number

          title?: string | null

          updated_at?: string

        }

        Update: {

          author_id?: string

          comments_count?: number

          content?: string

          created_at?: string

          hashtags?: string[] | null

          id?: string

          is_featured?: boolean

          is_published?: boolean

          likes_count?: number

          media_types?: string[] | null

          media_urls?: string[] | null

          shares_count?: number

          title?: string | null

          updated_at?: string

        }

        Relationships: [

          {

            foreignKeyName: "posts_author_id_fkey"

            columns: ["author_id"]

            isOneToOne: false

            referencedRelation: "profiles"

            referencedColumns: ["id"]

          },

        ]

      }

      profiles: {

        Row: {

          achievements: Json

          avatar_url: string | null

          bio: string | null

          category: string | null

          company: string | null

          cover_image_url: string | null

          created_at: string | null

          education: Json

          email: string | null

          experience_level: string | null

          experiences: Json

          first_name: string | null

          followers_count: number | null

          full_name: string | null

          github_url: string | null

          id: string

          industry: string | null

          instagram_url: string | null

          is_verified: boolean | null

          last_name: string | null

          likes_count: number | null

          linkedin_url: string | null

          location: string | null

          phone: string | null

          portfolio: Json

          portfolio_url: string | null

          posts_count: number | null

          projects_count: number | null

          role: string | null

          skills: string[] | null

          twitter_url: string | null

          updated_at: string | null

          user_id: string | null

          username: string | null

          website: string | null

          youtube_url: string | null

          tags: string[] | null

          short_id: string | null

          public_key: string | null

        }

        Insert: {

          achievements?: Json

          avatar_url?: string | null

          bio?: string | null

          category?: string | null

          company?: string | null

          cover_image_url?: string | null

          created_at?: string | null

          education?: Json

          email?: string | null

          experience_level?: string | null

          experiences?: Json

          first_name?: string | null

          followers_count?: number | null

          full_name?: string | null

          github_url?: string | null

          id?: string

          industry?: string | null

          instagram_url?: string | null

          is_verified?: boolean | null

          last_name?: string | null

          likes_count?: number | null

          linkedin_url?: string | null

          location?: string | null

          phone?: string | null

          portfolio?: Json

          portfolio_url?: string | null

          posts_count?: number | null

          projects_count?: number | null

          role?: string | null

          skills?: string[] | null

          twitter_url?: string | null

          updated_at?: string | null

          user_id?: string | null

          username?: string | null

          website?: string | null

          youtube_url?: string | null

          tags?: string[] | null

          short_id?: string | null

          public_key?: string | null

        }

        Update: {

          achievements?: Json

          avatar_url?: string | null

          bio?: string | null

          category?: string | null

          company?: string | null

          cover_image_url?: string | null

          created_at?: string | null

          education?: Json

          email?: string | null

          experience_level?: string | null

          experiences?: Json

          first_name?: string | null

          followers_count?: number | null

          full_name?: string | null

          github_url?: string | null

          id?: string

          industry?: string | null

          instagram_url?: string | null

          is_verified?: boolean | null

          last_name?: string | null

          likes_count?: number | null

          linkedin_url?: string | null

          location?: string | null

          phone?: string | null

          portfolio?: Json

          portfolio_url?: string | null

          posts_count?: number | null

          projects_count?: number | null

          role?: string | null

          skills?: string[] | null

          twitter_url?: string | null

          updated_at?: string | null

          user_id?: string | null

          username?: string | null

          website?: string | null

          youtube_url?: string | null

          tags?: string[] | null

          short_id?: string | null

          public_key?: string | null

        }

        Relationships: []

      }

      project_likes: {

        Row: {

          created_at: string | null

          id: string

          project_id: string | null

          user_id: string | null

        }

        Insert: {

          created_at?: string | null

          id?: string

          project_id?: string | null

          user_id?: string | null

        }

        Update: {

          created_at?: string | null

          id?: string

          project_id?: string | null

          user_id?: string | null

        }

        Relationships: [

          {

            foreignKeyName: "project_likes_project_id_fkey"

            columns: ["project_id"]

            isOneToOne: false

            referencedRelation: "projects"

            referencedColumns: ["id"]

          },

        ]

      }

      project_members: {

        Row: {

          id: string

          joined_at: string | null

          project_id: string | null

          role: string | null

          user_id: string | null

        }

        Insert: {

          id?: string

          joined_at?: string | null

          project_id?: string | null

          role?: string | null

          user_id?: string | null

        }

        Update: {

          id?: string

          joined_at?: string | null

          project_id?: string | null

          role?: string | null

          user_id?: string | null

        }

        Relationships: [

          {

            foreignKeyName: "project_members_project_id_fkey"

            columns: ["project_id"]

            isOneToOne: false

            referencedRelation: "projects"

            referencedColumns: ["id"]

          },

        ]

      }

      projects: {

        Row: {

          budget_currency: string | null

          budget_max: number | null

          budget_min: number | null

          category: string

          created_at: string | null

          created_by: string | null

          description: string | null

          duration_minutes: number | null

          episodes: number | null

          featured: boolean | null

          id: string

          location: string | null

          popular: boolean | null

          project_status: string | null

          project_type: string

          skills_required: string[] | null

          status: string

          tags: string[] | null

          team_size: number | null

          title: string

          updated_at: string | null

          production_notes: string | null

          target_audience: string | null

          distribution_plan: string | null

          timeline: string | null

          benefits: string | null

          contact_info: string | null

          allow_applicants: boolean | null

          hiring_categories: string[] | null

          project_tags: string[] | null

        }

        Insert: {

          budget_currency?: string | null

          budget_max?: number | null

          budget_min?: number | null

          category: string

          created_at?: string | null

          created_by?: string | null

          description?: string | null

          duration_minutes?: number | null

          episodes?: number | null

          featured?: boolean | null

          id?: string

          location?: string | null

          popular?: boolean | null

          project_status?: string | null

          project_type: string

          skills_required?: string[] | null

          status?: string

          tags?: string[] | null

          team_size?: number | null

          title: string

          updated_at?: string | null

          production_notes?: string | null

          target_audience?: string | null

          distribution_plan?: string | null

          timeline?: string | null

          benefits?: string | null

          contact_info?: string | null

          allow_applicants?: boolean | null

          hiring_categories?: string[] | null

          project_tags?: string[] | null

        }

        Update: {

          budget_currency?: string | null

          budget_max?: number | null

          budget_min?: number | null

          category?: string

          created_at?: string | null

          created_by?: string | null

          description?: string | null

          duration_minutes?: number | null

          episodes?: number | null

          featured?: boolean | null

          id?: string

          location?: string | null

          popular?: boolean | null

          project_status?: string | null

          project_type?: string

          skills_required?: string[] | null

          status?: string

          tags?: string[] | null

          team_size?: number | null

          title?: string

          updated_at?: string | null

          production_notes?: string | null

          target_audience?: string | null

          distribution_plan?: string | null

          timeline?: string | null

          benefits?: string | null

          contact_info?: string | null

          allow_applicants?: boolean | null

          hiring_categories?: string[] | null

          project_tags?: string[] | null

        }

        Relationships: []

      }

      user_likes: {

        Row: {

          created_at: string | null

          id: string

          liked_user_id: string

          user_id: string

        }

        Insert: {

          created_at?: string | null

          id?: string

          liked_user_id: string

          user_id: string

        }

        Update: {

          created_at?: string | null

          id?: string

          liked_user_id?: string

          user_id?: string

        }

        Relationships: [

          {

            foreignKeyName: "user_likes_liked_user_id_fkey"

            columns: ["liked_user_id"]

            isOneToOne: false

            referencedRelation: "profiles"

            referencedColumns: ["id"]

          },

          {

            foreignKeyName: "user_likes_user_id_fkey"

            columns: ["user_id"]

            isOneToOne: false

            referencedRelation: "profiles"

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

      user_saves: {

        Row: {

          created_at: string | null

          id: string

          saved_user_id: string

          user_id: string

        }

        Insert: {

          created_at?: string | null

          id?: string

          saved_user_id: string

          user_id: string

        }

        Update: {

          created_at?: string | null

          id?: string

          saved_user_id?: string

          user_id?: string

        }

        Relationships: [

          {

            foreignKeyName: "user_saves_saved_user_id_fkey"

            columns: ["saved_user_id"]

            isOneToOne: false

            referencedRelation: "profiles"

            referencedColumns: ["id"]

          },

          {

            foreignKeyName: "user_saves_user_id_fkey"

            columns: ["user_id"]

            isOneToOne: false

            referencedRelation: "profiles"

            referencedColumns: ["id"]

          },

        ]

      }

      community_groups: {

        Row: {

          id: string

          name: string

          description: string | null

          category: string | null

          tags: string[] | null

          privacy: string

          created_by: string | null

          created_at: string | null

          updated_at: string | null

          settings: Json | null

        }

        Insert: {

          id?: string

          name: string

          description?: string | null

          category?: string | null

          tags?: string[] | null

          privacy?: string

          created_by?: string | null

          created_at?: string | null

          updated_at?: string | null

          settings?: Json | null

        }

        Update: {

          id?: string

          name?: string

          description?: string | null

          category?: string | null

          tags?: string[] | null

          privacy?: string

          created_by?: string | null

          created_at?: string | null

          updated_at?: string | null

          settings?: Json | null

        }

        Relationships: []

      }

      community_group_members: {

        Row: {

          id: string

          group_id: string

          user_id: string

          role: "Owner" | "Admin" | "Moderator" | "Member"

          joined_at: string | null

        }

        Insert: {

          id?: string

          group_id: string

          user_id: string

          role?: "Owner" | "Admin" | "Moderator" | "Member"

          joined_at?: string | null

        }

        Update: {

          id?: string

          group_id?: string

          user_id?: string

          role?: "Owner" | "Admin" | "Moderator" | "Member"

          joined_at?: string | null

        }

        Relationships: [

          {

            foreignKeyName: "community_group_members_group_id_fkey"

            columns: ["group_id"]

            isOneToOne: false

            referencedRelation: "community_groups"

            referencedColumns: ["id"]

          }

        ]

      }

      community_group_messages: {

        Row: {

          id: string

          group_id: string

          user_id: string

          message: string

          type: "text" | "image" | "file" | null

          created_at: string | null

        }

        Insert: {

          id?: string

          group_id: string

          user_id: string

          message: string

          type?: "text" | "image" | "file" | null

          created_at?: string | null

        }

        Update: {

          id?: string

          group_id?: string

          user_id?: string

          message?: string

          type?: "text" | "image" | "file" | null

          created_at?: string | null

        }

        Relationships: [

          {

            foreignKeyName: "community_group_messages_group_id_fkey"

            columns: ["group_id"]

            isOneToOne: false

            referencedRelation: "community_groups"

            referencedColumns: ["id"]

          }

        ]

      }

      directory_files: {

        Row: {

          id: string

          title: string

          description: string | null

          file_type: string

          file_url: string

          file_size: string | null

          additional_urls: string[] | null

          user_id: string

          project_id: string | null

          tags: string[] | null

          stats: Json | null

          status: string

          created_at: string | null

          updated_at: string | null

        }

        Insert: {

          id?: string

          title: string

          description?: string | null

          file_type: string

          file_url: string

          file_size?: string | null

          additional_urls?: string[] | null

          user_id: string

          project_id?: string | null

          tags?: string[] | null

          stats?: Json | null

          status?: string

          created_at?: string | null

          updated_at?: string | null

        }

        Update: {

          id?: string

          title?: string

          description?: string | null

          file_type?: string

          file_url?: string

          file_size?: string | null

          additional_urls?: string[] | null

          user_id?: string

          project_id?: string | null

          tags?: string[] | null

          stats?: Json | null

          status?: string

          created_at?: string | null

          updated_at?: string | null

        }

        Relationships: [

          {

            foreignKeyName: "directory_files_user_id_fkey"

            columns: ["user_id"]

            isOneToOne: false

            referencedRelation: "profiles"

            referencedColumns: ["id"]

          }

        ]

      }

      directory_categories: {

        Row: {

          id: string

          name: string

          file_type: string

          created_at: string | null

          department: string | null

          description: string | null

        }

        Insert: {

          id?: string

          name: string

          file_type: string

          created_at?: string | null

          department?: string | null

          description?: string | null

        }

        Update: {

          id?: string

          name?: string

          file_type?: string

          created_at?: string | null

          department?: string | null

          description?: string | null

        }

        Relationships: []

      }

      companies: {

        Row: {

          id: string

          name: string

          category: string | null

          description: string | null

          founder: string | null

          established_year: number | null

          email: string | null

          phone: string | null

          address: string | null

          city: string | null

          state: string | null

          country: string | null

          website: string | null

          maps_location: string | null

          working_hours: string | null

          gst_number: string | null

          services: string[] | null

          languages: string[] | null

          user_id: string | null

          verified: boolean | null

          logo: string | null

          banner: string | null

          cover_image: string | null

          jobs: Json | null

          auditions: Json | null

          internships: Json | null

          projects: Json | null

          team: Json | null

          gallery: string[] | null

          created_at: string | null

          updated_at: string | null

        }

        Insert: {

          id?: string

          name: string

          category?: string | null

          description?: string | null

          founder?: string | null

          established_year?: number | null

          email?: string | null

          phone?: string | null

          address?: string | null

          city?: string | null

          state?: string | null

          country?: string | null

          website?: string | null

          maps_location?: string | null

          working_hours?: string | null

          gst_number?: string | null

          services?: string[] | null

          languages?: string[] | null

          user_id?: string | null

          verified?: boolean | null

          logo?: string | null

          banner?: string | null

          cover_image?: string | null

          jobs?: Json | null

          auditions?: Json | null

          internships?: Json | null

          projects?: Json | null

          team?: Json | null

          gallery?: string[] | null

          created_at?: string | null

          updated_at?: string | null

        }

        Update: {

          id?: string

          name?: string

          category?: string | null

          description?: string | null

          founder?: string | null

          established_year?: number | null

          email?: string | null

          phone?: string | null

          address?: string | null

          city?: string | null

          state?: string | null

          country?: string | null

          website?: string | null

          maps_location?: string | null

          working_hours?: string | null

          gst_number?: string | null

          services?: string[] | null

          languages?: string[] | null

          user_id?: string | null

          verified?: boolean | null

          logo?: string | null

          banner?: string | null

          cover_image?: string | null

          jobs?: Json | null

          auditions?: Json | null

          internships?: Json | null

          projects?: Json | null

          team?: Json | null

          gallery?: string[] | null

          created_at?: string | null

          updated_at?: string | null

        }

        Relationships: []

      }

      company_applications: {

        Row: {

          id: string

          company_id: string

          user_id: string | null

          role: string

          name: string

          email: string

          portfolio: string | null

          notes: string | null

          status: string

          created_at: string | null

          updated_at: string | null

        }

        Insert: {

          id?: string

          company_id: string

          user_id?: string | null

          role: string

          name: string

          email: string

          portfolio?: string | null

          notes?: string | null

          status?: string

          created_at?: string | null

          updated_at?: string | null

        }

        Update: {

          id?: string

          company_id?: string

          user_id?: string | null

          role?: string

          name?: string

          email?: string

          portfolio?: string | null

          notes?: string | null

          status?: string

          created_at?: string | null

          updated_at?: string | null

        }

        Relationships: [

          {

            foreignKeyName: "company_applications_company_id_fkey"

            columns: ["company_id"]

            isOneToOne: false

            referencedRelation: "companies"

            referencedColumns: ["id"]

          }

        ]

      }

      job_applications: {

        Row: {

          id: string

          job_id: string

          user_id: string | null

          name: string | null

          email: string | null

          phone: string | null

          experience: string | null

          skills: string[] | null

          resume_url: string | null

          portfolio_url: string | null

          cover_letter: string | null

          status: string

          created_at: string | null

          updated_at: string | null

        }

        Insert: {

          id?: string

          job_id: string

          user_id?: string | null

          name?: string | null

          email?: string | null

          phone?: string | null

          experience?: string | null

          skills?: string[] | null

          resume_url?: string | null

          portfolio_url?: string | null

          cover_letter?: string | null

          status?: string

          created_at?: string | null

          updated_at?: string | null

        }

        Update: {

          id?: string

          job_id?: string

          user_id?: string | null

          name?: string | null

          email?: string | null

          phone?: string | null

          experience?: string | null

          skills?: string[] | null

          resume_url?: string | null

          portfolio_url?: string | null

          cover_letter?: string | null

          status?: string

          created_at?: string | null

          updated_at?: string | null

        }

        Relationships: [
          {
            foreignKeyName: "job_applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"

            columns: ["job_id"]

            isOneToOne: false

            referencedRelation: "jobs"

            referencedColumns: ["id"]

          }

        ]

      }

      shooting_locations: {

        Row: {

          id: string

          name: string

          description: string | null

          address: string | null

          city: string | null

          state: string | null

          property_type: string | null

          hourly_rate: number | null

          daily_rate: number | null

          image_url: string | null

          images: string[] | null

          features: string[] | null

          rules: string[] | null

          tags: string[] | null

          status: string

          featured: boolean | null

          created_by: string | null

          owner_name: string | null

          owner_phone: string | null

          owner_email: string | null

          created_at: string | null

          updated_at: string | null

          type: string | null

          country: string | null

          landmark: string | null

          map_url: string | null

          price: number | null

          price_hour: number | null

          security_deposit: number | null

          price_type: string | null

          instructions: string | null

          phone: string | null

          email: string | null

          media_urls: string[] | null

          timings: Json | null

        }

        Insert: {

          id?: string

          name: string

          description?: string | null

          address?: string | null

          city?: string | null

          state?: string | null

          property_type?: string | null

          hourly_rate?: number | null

          daily_rate?: number | null

          image_url?: string | null

          images?: string[] | null

          features?: string[] | null

          rules?: string[] | null

          tags?: string[] | null

          status?: string

          featured?: boolean | null

          created_by?: string | null

          owner_name?: string | null

          owner_phone?: string | null

          owner_email?: string | null

          created_at?: string | null

          updated_at?: string | null

          type?: string | null

          country?: string | null

          landmark?: string | null

          map_url?: string | null

          price?: number | null

          price_hour?: number | null

          security_deposit?: number | null

          price_type?: string | null

          instructions?: string | null

          phone?: string | null

          email?: string | null

          media_urls?: string[] | null

          timings?: Json | null

        }

        Update: {

          id?: string

          name?: string

          description?: string | null

          address?: string | null

          city?: string | null

          state?: string | null

          property_type?: string | null

          hourly_rate?: number | null

          daily_rate?: number | null

          image_url?: string | null

          images?: string[] | null

          features?: string[] | null

          rules?: string[] | null

          tags?: string[] | null

          status?: string

          featured?: boolean | null

          created_by?: string | null

          owner_name?: string | null

          owner_phone?: string | null

          owner_email?: string | null

          created_at?: string | null

          updated_at?: string | null

          type?: string | null

          country?: string | null

          landmark?: string | null

          map_url?: string | null

          price?: number | null

          price_hour?: number | null

          security_deposit?: number | null

          price_type?: string | null

          instructions?: string | null

          phone?: string | null

          email?: string | null

          media_urls?: string[] | null

          timings?: Json | null

        }

        Relationships: []

      }

      shooting_location_likes: {

        Row: {

          id: string

          location_id: string

          user_id: string

          created_at: string | null

        }

        Insert: {

          id?: string

          location_id: string

          user_id: string

          created_at?: string | null

        }

        Update: {

          id?: string

          location_id?: string

          user_id?: string

          created_at?: string | null

        }

        Relationships: [

          {

            foreignKeyName: "shooting_location_likes_location_id_fkey"

            columns: ["location_id"]

            isOneToOne: false

            referencedRelation: "shooting_locations"

            referencedColumns: ["id"]

          }

        ]

      }

      property_site_visits: {

        Row: {

          id: string

          location_id: string

          user_id: string

          preferred_days: string[] | null

          start_time: string | null

          end_time: string | null

          message: string | null

          status: string | null

          created_at: string | null

          owner_id: string | null

          selected_day: string | null

          selected_time: string | null

        }

        Insert: {

          id?: string

          location_id: string

          user_id: string

          preferred_days?: string[] | null

          start_time?: string | null

          end_time?: string | null

          message?: string | null

          status?: string | null

          created_at?: string | null

          owner_id?: string | null

          selected_day?: string | null

          selected_time?: string | null

        }

        Update: {

          id?: string

          location_id?: string

          user_id?: string

          preferred_days?: string[] | null

          start_time?: string | null

          end_time?: string | null

          message?: string | null

          status?: string | null

          created_at?: string | null

          owner_id?: string | null

          selected_day?: string | null

          selected_time?: string | null

        }

        Relationships: [

          {

            foreignKeyName: "property_site_visits_user_id_fkey"

            columns: ["user_id"]

            isOneToOne: false

            referencedRelation: "profiles"

            referencedColumns: ["id"]

          }

        ]

      }

      messages: {

        Row: {

          id: string

          sender_id: string

          receiver_id: string

          content: string

          type: string | null

          is_read: boolean | null

          created_at: string | null

        }

        Insert: {

          id?: string

          sender_id: string

          receiver_id: string

          content: string

          type?: string | null

          is_read?: boolean | null

          created_at?: string | null

        }

        Update: {

          id?: string

          sender_id?: string

          receiver_id?: string

          content?: string

          type?: string | null

          is_read?: boolean | null

          created_at?: string | null

        }

        Relationships: [

          {

            foreignKeyName: "messages_sender_id_fkey"

            columns: ["sender_id"]

            isOneToOne: false

            referencedRelation: "profiles"

            referencedColumns: ["id"]

          },

          {

            foreignKeyName: "messages_receiver_id_fkey"

            columns: ["receiver_id"]

            isOneToOne: false

            referencedRelation: "profiles"

            referencedColumns: ["id"]

          }

        ]

      }

      tickets: {

        Row: {

          id: string

          ticket_number: string

          user_id: string

          subject: string

          description: string

          category: string

          priority: string

          status: string

          assigned_to: string | null

          created_at: string | null

          updated_at: string | null

          chat_enabled: boolean | null

        }

        Insert: {

          id?: string

          ticket_number?: string

          user_id: string

          subject: string

          description: string

          category?: string

          priority?: string

          status?: string

          assigned_to?: string | null

          created_at?: string | null

          updated_at?: string | null

          chat_enabled?: boolean | null

        }

        Update: {

          id?: string

          ticket_number?: string

          user_id?: string

          subject?: string

          description?: string

          category?: string

          priority?: string

          status?: string

          assigned_to?: string | null

          created_at?: string | null

          updated_at?: string | null

          chat_enabled?: boolean | null

        }

        Relationships: []

      }

      ticket_messages: {

        Row: {

          id: string

          ticket_id: string

          author_id: string

          message: string

          created_at: string | null

        }

        Insert: {

          id?: string

          ticket_id: string

          author_id: string

          message: string

          created_at?: string | null

        }

        Update: {

          id?: string

          ticket_id?: string

          author_id?: string

          message?: string

          created_at?: string | null

        }

        Relationships: [

          {

            foreignKeyName: "ticket_messages_author_id_fkey"

            columns: ["author_id"]

            isOneToOne: false

            referencedRelation: "profiles"

            referencedColumns: ["id"]

          }

        ]

      }

      ticket_updates: {

        Row: {

          id: string

          ticket_id: string

          author_id: string

          content: string

          created_at: string | null

        }

        Insert: {

          id?: string

          ticket_id: string

          author_id: string

          content: string

          created_at?: string | null

        }

        Update: {

          id?: string

          ticket_id?: string

          author_id?: string

          content?: string

          created_at?: string | null

        }

        Relationships: [

          {

            foreignKeyName: "ticket_updates_author_id_fkey"

            columns: ["author_id"]

            isOneToOne: false

            referencedRelation: "profiles"

            referencedColumns: ["id"]

          }

        ]

      }

      subscription_plans: {

        Row: {

          id: string

          name: string

          description: string | null

          monthly_price: number

          yearly_price: number | null

          features: string[] | null

          limitations: string[] | null

          created_at: string | null

          popular: boolean | null

          final_monthly_price: number | null

          final_yearly_price: number | null

          is_custom_price: boolean | null

          restrictions: Json | null

        }

        Insert: {

          id?: string

          name: string

          description?: string | null

          monthly_price: number

          yearly_price?: number | null

          features?: string[] | null

          limitations?: string[] | null

          created_at?: string | null

          popular?: boolean | null

          final_monthly_price?: number | null

          final_yearly_price?: number | null

          is_custom_price?: boolean | null

          restrictions?: Json | null

        }

        Update: {

          id?: string

          name?: string

          description?: string | null

          monthly_price?: number

          yearly_price?: number | null

          features?: string[] | null

          limitations?: string[] | null

          created_at?: string | null

          popular?: boolean | null

          final_monthly_price?: number | null

          final_yearly_price?: number | null

          is_custom_price?: boolean | null

          restrictions?: Json | null

        }

        Relationships: []

      }

      contact_submissions: {

        Row: {

          id: string

          name: string

          email: string

          subject: string

          message: string

          created_at: string | null

        }

        Insert: {

          id?: string

          name: string

          email: string

          subject: string

          message: string

          created_at?: string | null

        }

        Update: {

          id?: string

          name?: string

          email?: string

          subject?: string

          message?: string

          created_at?: string | null

        }

        Relationships: []

      }

      notifications: {

        Row: {

          id: string

          user_id: string

          title: string

          description: string | null

          type: string | null

          priority: string | null

          status: string | null

          action_url: string | null

          created_at: string | null

          action: string | null

        }

        Insert: {

          id?: string

          user_id: string

          title: string

          description?: string | null

          type?: string | null

          priority?: string | null

          status?: string | null

          action_url?: string | null

          created_at?: string | null

          action?: string | null

        }

        Update: {

          id?: string

          user_id?: string

          title?: string

          description?: string | null

          type?: string | null

          priority?: string | null

          status?: string | null

          action_url?: string | null

          created_at?: string | null

          action?: string | null

        }

        Relationships: []

      }

      project_tasks: {

        Row: {

          id: string

          project_id: string

          title: string

          description: string | null

          status: string | null

          priority: string | null

          due_date: string | null

          assigned_to: string | null

          created_at: string | null

          assigned_by: string | null

          updated_at: string | null

        }

        Insert: {

          id?: string

          project_id: string

          title: string

          description?: string | null

          status?: string | null

          priority?: string | null

          due_date?: string | null

          assigned_to?: string | null

          created_at?: string | null

          assigned_by?: string | null

          updated_at?: string | null

        }

        Update: {

          id?: string

          project_id?: string

          title?: string

          description?: string | null

          status?: string | null

          priority?: string | null

          due_date?: string | null

          assigned_to?: string | null

          created_at?: string | null

          assigned_by?: string | null

          updated_at?: string | null

        }

        Relationships: []

      }

      project_messages: {

        Row: {

          id: string

          project_id: string

          sender_id: string

          content: string

          created_at: string | null

        }

        Insert: {

          id?: string

          project_id: string

          sender_id: string

          content: string

          created_at?: string | null

        }

        Update: {

          id?: string

          project_id?: string

          sender_id?: string

          content?: string

          created_at?: string | null

        }

        Relationships: []

      }

      casting_calls: {

        Row: {

          id: string

          title: string

          project_title: string | null

          production_company: string | null

          role_type: string | null

          gender: string | null

          age_range: string | null

          location: string | null

          description: string | null

          compensation: string | null

          audition_dates: string | null

          deadline: string | null

          status: string | null

          user_id: string | null

          created_at: string | null

          updated_at: string | null

          google_maps_link: string | null

          script_attachment_url: string | null

        }

        Insert: {

          id?: string

          title: string

          project_title?: string | null

          production_company?: string | null

          role_type?: string | null

          gender?: string | null

          age_range?: string | null

          location?: string | null

          description?: string | null

          compensation?: string | null

          audition_dates?: string | null

          deadline?: string | null

          status?: string | null

          user_id?: string | null

          created_at?: string | null

          updated_at?: string | null

          google_maps_link?: string | null

          script_attachment_url?: string | null

        }

        Update: {

          id?: string

          title?: string

          project_title?: string | null

          production_company?: string | null

          role_type?: string | null

          gender?: string | null

          age_range?: string | null

          location?: string | null

          description?: string | null

          compensation?: string | null

          audition_dates?: string | null

          deadline?: string | null

          status?: string | null

          user_id?: string | null

          created_at?: string | null

          updated_at?: string | null

          google_maps_link?: string | null

          script_attachment_url?: string | null

        }

        Relationships: []

      }

      casting_applicants: {

        Row: {

          id: string

          casting_call_id: string

          user_id: string | null

          name: string

          email: string

          phone: string | null

          experience: string | null

          headshot_url: string | null

          resume_url: string | null

          reel_url: string | null

          status: string | null

          created_at: string | null

        }

        Insert: {

          id?: string

          casting_call_id: string

          user_id?: string | null

          name: string

          email: string

          phone?: string | null

          experience?: string | null

          headshot_url?: string | null

          resume_url?: string | null

          reel_url?: string | null

          status?: string | null

          created_at?: string | null

        }

        Update: {

          id?: string

          casting_call_id?: string

          user_id?: string | null

          name?: string

          email?: string

          phone?: string | null

          experience?: string | null

          headshot_url?: string | null

          resume_url?: string | null

          reel_url?: string | null

          status?: string | null

          created_at?: string | null

        }

        Relationships: []

      }

      casting_call_saves: {

        Row: {

          id: string

          casting_call_id: string

          user_id: string

          created_at: string | null

        }

        Insert: {

          id?: string

          casting_call_id: string

          user_id: string

          created_at?: string | null

        }

        Update: {

          id?: string

          casting_call_id?: string

          user_id?: string

          created_at?: string | null

        }

        Relationships: []

      }

      categories: {

        Row: {

          id: string

          name: string

          type: string | null

          created_at: string | null

          department: string | null

          description: string | null

        }

        Insert: {

          id?: string

          name: string

          type?: string | null

          created_at?: string | null

          department?: string | null

          description?: string | null

        }

        Update: {

          id?: string

          name?: string

          type?: string | null

          created_at?: string | null

          department?: string | null

          description?: string | null

        }

        Relationships: []

      }

      global_tags: {

        Row: {

          id: string

          name: string

          category: string | null

          created_at: string | null

        }

        Insert: {

          id?: string

          name: string

          category?: string | null

          created_at?: string | null

        }

        Update: {

          id?: string

          name?: string

          category?: string | null

          created_at?: string | null

        }

        Relationships: []

      }

      property_types: {

        Row: {

          id: string

          name: string

          created_at: string | null

        }

        Insert: {

          id?: string

          name: string

          created_at?: string | null

        }

        Update: {

          id?: string

          name?: string

          created_at?: string | null

        }

        Relationships: []

      }

      settings: {

        Row: {

          id: string

          key: string | null

          value: Json | null

          profile_id: string | null

          privacy_settings: Json | null

          visible_to_categories: Json | null

          notification_settings: Json | null

          appearance_settings: Json | null

          security_settings: Json | null

          created_at: string | null

          updated_at: string | null

        }

        Insert: {

          id?: string

          key?: string | null

          value?: Json | null

          profile_id?: string | null

          privacy_settings?: Json | null

          visible_to_categories?: Json | null

          notification_settings?: Json | null

          appearance_settings?: Json | null

          security_settings?: Json | null

          created_at?: string | null

          updated_at?: string | null

        }

        Update: {

          id?: string

          key?: string | null

          value?: Json | null

          profile_id?: string | null

          privacy_settings?: Json | null

          visible_to_categories?: Json | null

          notification_settings?: Json | null

          appearance_settings?: Json | null

          security_settings?: Json | null

          created_at?: string | null

          updated_at?: string | null

        }

        Relationships: [

          {

            foreignKeyName: "settings_profile_id_fkey"

            columns: ["profile_id"]

            isOneToOne: false

            referencedRelation: "profiles"

            referencedColumns: ["id"]

          }

        ]

      }

      site_settings: {

        Row: {

          id: string

          key: string | null

          value: Json | null

          site_title: string | null

          site_description: string | null

          logo_url: string | null

          favicon_url: string | null

          contact_email: string | null

          contact_phone: string | null

          contact_address: string | null

          contact_map_link: string | null

          social_facebook: string | null

          social_twitter: string | null

          social_instagram: string | null

          social_linkedin: string | null

          social_youtube: string | null

          created_at: string | null

          updated_at: string | null

        }

        Insert: {

          id?: string

          key?: string | null

          value?: Json | null

          site_title?: string | null

          site_description?: string | null

          logo_url?: string | null

          favicon_url?: string | null

          contact_email?: string | null

          contact_phone?: string | null

          contact_address?: string | null

          contact_map_link?: string | null

          social_facebook?: string | null

          social_twitter?: string | null

          social_instagram?: string | null

          social_linkedin?: string | null

          social_youtube?: string | null

          created_at?: string | null

          updated_at?: string | null

        }

        Update: {

          id?: string

          key?: string | null

          value?: Json | null

          site_title?: string | null

          site_description?: string | null

          logo_url?: string | null

          favicon_url?: string | null

          contact_email?: string | null

          contact_phone?: string | null

          contact_address?: string | null

          contact_map_link?: string | null

          social_facebook?: string | null

          social_twitter?: string | null

          social_instagram?: string | null

          social_linkedin?: string | null

          social_youtube?: string | null

          created_at?: string | null

          updated_at?: string | null

        }

        Relationships: []

      }

      admin_team_members: {

        Row: {

          id: string

          user_id: string

          role: string

          status: string | null

          permissions: Json | null

          created_at: string | null

          profile_id: string | null

        }

        Insert: {

          id?: string

          user_id: string

          role: string

          status?: string | null

          permissions?: Json | null

          created_at?: string | null

          profile_id?: string | null

        }

        Update: {

          id?: string

          user_id?: string

          role?: string

          status?: string | null

          permissions?: Json | null

          created_at?: string | null

          profile_id?: string | null

        }

        Relationships: []

      }

      industry_events: {

        Row: {

          id: string

          title: string

          description: string | null

          date: string | null

          location: string | null

          is_online: boolean | null

          price: string | null

          organizer_id: string | null

          created_at: string | null

          attendees: number | null

          created_by: string | null

          user_id: string | null

          google_maps_link: string | null

          meeting_link: string | null

          registration_link: string | null

        }

        Insert: {

          id?: string

          title: string

          description?: string | null

          date?: string | null

          location?: string | null

          is_online?: boolean | null

          price?: string | null

          organizer_id?: string | null

          created_at?: string | null

          attendees?: number | null

          created_by?: string | null

          user_id?: string | null

          google_maps_link?: string | null

          meeting_link?: string | null

          registration_link?: string | null

        }

        Update: {

          id?: string

          title?: string

          description?: string | null

          date?: string | null

          location?: string | null

          is_online?: boolean | null

          price?: string | null

          organizer_id?: string | null

          created_at?: string | null

          attendees?: number | null

          created_by?: string | null

          user_id?: string | null

          google_maps_link?: string | null

          meeting_link?: string | null

          registration_link?: string | null

        }

        Relationships: []

      }

    }

    Views: {

      [_ in never]: never

    }

    Functions: {

      admin_update_job_tags: {

        Args: {

          job_id: string

          new_tags: string[]

        }

        Returns: undefined

      }

      has_role: {

        Args: {

          _role: Database["public"]["Enums"]["app_role"]

          _user_id: string

        }

        Returns: boolean

      }

      is_admin: { Args: { _user_id: string }; Returns: boolean }

    }

    Enums: {

      app_role: "user" | "admin"

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

      app_role: ["user", "admin"],

    },

  },

} as const