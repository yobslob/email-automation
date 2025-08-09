import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase.js';

export default function Login() {
    const router = useRouter();

    useEffect(() => {
        supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                router.push('/dashboard');
            }
        });
    }, [router]);

    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'https://www.googleapis.com/auth/spreadsheets',
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-6 rounded shadow-md">
                <h1 className="text-2xl mb-4">Login</h1>
                <button
                    onClick={signInWithGoogle}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}