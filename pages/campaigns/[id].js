import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

export default function CampaignDetails() {
    const router = useRouter();
    const { id } = router.query;
    const [campaign, setCampaign] = useState(null);
    const [recipients, setRecipients] = useState([]);

    useEffect(() => {
        if (id) {
            fetchCampaign();
            fetchRecipients();
        }
    }, [id]);

    const fetchCampaign = async () => {
        const { data } = await supabase.from('campaigns').select('*').eq('id', id).single();
        setCampaign(data);
    };

    const fetchRecipients = async () => {
        const { data } = await supabase.from('recipients').select('*').eq('campaignId', id);
        setRecipients(data);
    };

    return (
        <div className="min-h-screen p-6">
            {campaign && (
                <>
                    <h1 className="text-3xl mb-4">{campaign.name}</h1>
                    <p>Status: {campaign.status}</p>
                    <h2 className="text-xl mt-4 mb-2">Recipients</h2>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="border p-2">Name</th>
                                <th className="border p-2">Email</th>
                                <th className="border p-2">Status</th>
                                <th className="border p-2">Send Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recipients.map((recipient) => (
                                <tr key={recipient.id}>
                                    <td className="border p-2">{recipient.data.Name}</td>
                                    <td className="border p-2">{recipient.data.Email}</td>
                                    <td className="border p-2">{recipient.status}</td>
                                    <td className="border p-2">{recipient.sendTime}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </div>
    );
}