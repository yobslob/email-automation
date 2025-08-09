import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    });
  }, [router]);

  return <div>Loading...</div>;
}