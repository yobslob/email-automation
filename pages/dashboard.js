import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function Dashboard() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState([]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                router.push('/login');
            } else {
                // Save googleRefreshToken if not present
                const saveGoogleRefreshToken = async () => {
                    const { data: userData } = await supabase.from('users').select('googleRefreshToken').eq('id', session.user.id).single();
                    if (!userData.googleRefreshToken && session.provider_refresh_token) {
                        await supabase.from('users').update({ googleRefreshToken: session.provider_refresh_token }).eq('id', session.user.id);
                    }
                };
                saveGoogleRefreshToken();
                fetchCampaigns();
            }
        });
    }, [router]);

    const fetchCampaigns = async () => {
        const { data } = await supabase.from('campaigns').select('*');
        setCampaigns(data);
    };

    return (
        <div className="min-h-screen p-6">
            <h1 className="text-3xl mb-4">Dashboard</h1>
            <Link href="/new-campaign">
                <a className="bg-green-500 text-white px-4 py-2 rounded mb-4 inline-block">
                    Create New Campaign
                </a>
            </Link>
            <div>
                {campaigns.map((campaign) => (
                    <div key={campaign.id} className="border p-4 mb-2 rounded">
                        <Link href={`/campaigns/${campaign.id}`}>
                            <a className="text-blue-500">{campaign.name}</a>
                        </Link>
                        <p>Status: {campaign.status}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}