import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export default function Settings() {
    const [webhookUrl, setWebhookUrl] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data } = await supabase.from('users').select('discordWebhookUrl').eq('id', session.user.id).single();
            setWebhookUrl(data.discordWebhookUrl || '');
        }
    };

    const handleSave = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.from('users').update({ discordWebhookUrl: webhookUrl }).eq('id', session.user.id);
        alert('Settings saved');
    };

    return (
        <div className="min-h-screen p-6">
            <h1 className="text-3xl mb-4">Settings</h1>
            <div className="mb-4">
                <label>Discord Webhook URL</label>
                <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="border p-2 w-full"
                />
            </div>
            <button
                onClick={handleSave}
                className="bg-blue-500 text-white px-4 py-2 rounded"
            >
                Save
            </button>
        </div>
    );
}