
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pngeugrvuriwovqjnwat.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuZ2V1Z3J2dXJpd292cWpud2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTQyNDIsImV4cCI6MjA3ODk5MDI0Mn0.i5PmE8OY03aVARX6Hs7B4dCPRlfJPMVm9nqf0R2ZTww';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
