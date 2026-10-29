import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://irqeufnnzdotncwmaotj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlycWV1Zm5uemRvdG5jd21hb3RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyOTI3MjksImV4cCI6MjEwODg2ODcyOX0.hpsdPmWx-aAQIWBjbWXRIIiqEIq1aS_BXeyS-V-aUdE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
