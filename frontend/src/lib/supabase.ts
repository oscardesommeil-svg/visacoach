import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Avertissement clair en dev si les variables ne sont pas renseignées.
  console.warn(
    "[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant — " +
      "l'authentification ne fonctionnera pas tant que ces clés ne sont pas définies.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
