import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase.js';
import Link from 'next/link';

export default function Dashboard() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState([]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                router.push('/login');
            } else {
                const saveGoogleRefreshToken = async () => {
                    const { data: userData, error } = await supabase
                        .from('users')
                        .select('googleRefreshToken')
                        .eq('id', session.user.id)
                        .single();

                    if (error) {
                        console.error('Error fetching user data:', error.message);
                        return;
                    }

                    // Check userData exists before accessing properties
                    if (userData && !userData.googleRefreshToken && session.provider_refresh_token) {
                        await supabase
                            .from('users')
                            .update({ googleRefreshToken: session.provider_refresh_token })
                            .eq('id', session.user.id);
                    }
                };

                saveGoogleRefreshToken();
                fetchCampaigns();
            }
        });
    }, [router]);


    const fetchCampaigns = async () => {
        const { data, error } = await supabase.from('campaigns').select('*');

        if (error) {
            console.error('Error fetching campaigns:', error.message);
            setCampaigns([]); // prevent null
            return;
        }

        setCampaigns(data || []); // fallback to empty array
    };


    return (
        <div className="min-h-screen p-6">
            <h1 className="text-3xl mb-4">Dashboard</h1>
            <Link href="/new-campaign" className="bg-green-500 text-white px-4 py-2 rounded mb-4 inline-block">
                Create New Campaign
            </Link>
            <div>
                {Array.isArray(campaigns) && campaigns.map((campaign) => (
                    <div key={campaign.id} className="border p-4 mb-2 rounded">
                        <Link className="text-blue-500" href={`/campaigns/${campaign.id}`}>
                            {campaign.name}
                        </Link>
                        <p>Status: {campaign.status}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}