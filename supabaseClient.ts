import { createClient } from '@supabase/supabase-js';

// User-provided Supabase credentials
const supabaseUrl = 'https://ixmgtnedxpzpxxwolveu.supabase.co';
const supabaseAnonKey = 'sb_publishable_g5NjQIIcPgg-gH2jMj4cNA_HavY7cMR';

/**
 * Creates and exports the Supabase client.
 *
 * ===================================================================================
 * ============================= AÇÃO NECESSÁRIA PARA CORRIGIR O ERRO ================================
 * ===================================================================================
 *
 * O erro que você está vendo significa que a estrutura do banco de dados está
 * desatualizada ou incompleta. O script abaixo corrige isso de forma segura.
 *
 * --- PASSO A PASSO PARA A SOLUÇÃO ---
 *
 * 1. CLIQUE NESTE LINK DIRETO PARA O SEU EDITOR SQL NO SUPABASE:
 *    https://app.supabase.com/project/ixmgtnedxpzpxxwolveu/sql
 *
 * 2. COPIE TODO O CÓDIGO DENTRO DO BLOCO ABAIXO:
 *
 * ---------------------------- COPIE E EXECUTE ESTE SCRIPT -----------------------------
 *
 * -- STEP 0: Clean up previous incomplete setup to ensure a fresh start.
 * DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
 * DROP FUNCTION IF EXISTS public.handle_new_user();
 * DROP FUNCTION IF EXISTS public.is_admin();
 * -- Use CASCADE to remove dependent policies automatically before dropping the table.
 * DROP TABLE IF EXISTS public.profiles CASCADE;
 * 
 * -- STEP 1: Create the table for user profiles.
 * CREATE TABLE public.profiles (
 *   id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 *   full_name TEXT,
 *   email TEXT,
 *   is_approved BOOLEAN DEFAULT FALSE,
 *   role TEXT DEFAULT 'user' NOT NULL
 * );
 * 
 * -- STEP 2: Enable Row Level Security (RLS).
 * ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 * 
 * -- STEP 3: Create a helper function to check for admin role without recursion.
 * CREATE OR REPLACE FUNCTION public.is_admin()
 * RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
 * BEGIN
 *   RETURN EXISTS (
 *     SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
 *   );
 * END;
 * $$;
 * 
 * -- STEP 4: Create RLS policies for the 'profiles' table using the helper function.
 * CREATE POLICY "Allow individual read access" ON public.profiles FOR SELECT USING (auth.uid() = id);
 * CREATE POLICY "Allow admin read access" ON public.profiles FOR SELECT USING (public.is_admin());
 * CREATE POLICY "Allow admin update access" ON public.profiles FOR UPDATE USING (public.is_admin());
 * 
 * -- STEP 5: Create a function to automatically create a profile for new users.
 * CREATE OR REPLACE FUNCTION public.handle_new_user()
 * RETURNS TRIGGER AS $$
 * BEGIN
 *   INSERT INTO public.profiles (id, full_name, email)
 *   VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
 *   RETURN new;
 * END;
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 * 
 * -- STEP 6: Create a trigger to call the function when a new user signs up.
 * CREATE TRIGGER on_auth_user_created
 *   AFTER INSERT ON auth.users
 *   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
 * 
 * -- STEP 7: Configure the 'app_data' table and its RLS policy.
 * CREATE TABLE IF NOT EXISTS public.app_data (
 *   id BIGINT PRIMARY KEY,
 *   data JSONB,
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE public.app_data ENABLE ROW LEVEL SECURITY;
 * DROP POLICY IF EXISTS "Allow access to approved users only" ON public.app_data;
 * CREATE POLICY "Allow access to approved users only"
 * ON public.app_data FOR ALL
 * USING (EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.is_approved = TRUE))
 * WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.is_approved = TRUE));
 * 
 * -- STEP 8: Populate profiles for any existing users who might be missing one.
 * INSERT INTO public.profiles (id, full_name, email)
 * SELECT u.id, u.raw_user_meta_data->>'full_name', u.email
 * FROM auth.users u
 * WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);
 *
 * -----------------------------------------------------------------------------------
 *
 * 3. COLE O SCRIPT no editor SQL do Supabase e clique no botão "RUN".
 *
 * 4. PARA SE TORNAR ADMIN: Após executar o script, vá para a tabela `profiles`
 *    no "Table Editor" do Supabase, encontre seu usuário e mude o valor da
 *    coluna `role` de 'user' para 'admin'.
 *
 * 5. Recarregue a aplicação.
 *
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);