export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'customer' | 'admin';
  created_at: string;
  updated_at: string;
}
