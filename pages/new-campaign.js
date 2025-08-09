// pages/new-campaign.js
import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import Link from 'next/link';

export default function NewCampaign() {
    const [sheetId, setSheetId] = useState('');
    const [columns, setColumns] = useState([]);
    const [mapping, setMapping] = useState({});
    const [name, setName] = useState('');
    const [startTime, setStartTime] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleFetchColumns() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            console.log('session:', session);
            if (session.provider_refresh_token) {
                await fetch('/api/auth/save-refresh-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: session.user.id,
                        refreshToken: session.provider_refresh_token
                    })
                });
            }

            if (!session) {
                alert('Please sign in first');
                return;
            }

            // provider_token may be missing; send userId so server can fall back to refresh token.
            const token = session.provider_token || null;
            const userId = session.user?.id || null;

            // Use a clear variable name to avoid collisions with "res" used elsewhere.
            const response = await fetch('/api/sheets/columns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: token, sheetId, userId }),
            });

            let payload = null;
            // Safely parse JSON (guard against non-json responses)
            try {
                payload = await response.json();
            } catch (parseErr) {
                console.error('Failed to parse JSON from /api/sheets/columns:', parseErr);
            }

            if (!response.ok) {
                const errMsg = (payload && (payload.error || payload.message)) || `HTTP ${response.status}`;
                throw new Error(errMsg);
            }

            setColumns(Array.isArray(payload.columns) ? payload.columns : []);
        } catch (err) {
            console.error('Failed to fetch columns', err);
            alert('Failed to fetch columns. See console for details.');
        }
    }


    function handleMappingChange(field, column) {
        setMapping((m) => ({ ...m, [field]: column }));
    }

    async function handleCreateCampaign() {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert('Please login first');
                setLoading(false);
                return;
            }
            const token = session.provider_token || null;
            const userId = session.user?.id || null;

            const payload = {
                name,
                sheetId,
                mapping,
                startTime,
                provider_token: token,
                userId, // pass userId so server can use stored refresh token if needed
            };

            const response = await fetch('/api/campaigns/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            let body = null;
            try {
                body = await response.json();
            } catch (parseErr) {
                console.error('Failed to parse JSON from /api/campaigns/create:', parseErr);
            }

            if (!response.ok) {
                console.error('Create campaign error', body);
                alert('Failed to create campaign: ' + (body?.error || 'server error'));
            } else {
                alert('Campaign created and scheduled');
            }
        } catch (err) {
            console.error('handleCreateCampaign error', err);
            alert('Error creating campaign - check console');
        } finally {
            setLoading(false);
        }
    }


    function columnToIndex(col) {
        return col.charCodeAt(0) - 65;
    }

    return (
        <div className="min-h-screen p-6">
            <h1 className="text-3xl mb-4">Create New Campaign</h1>
            <div className="mb-4">
                <label>Campaign Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border p-2 w-full"
                />
            </div>
            <div className="mb-4">
                <label>Google Sheet ID</label>
                <input
                    type="text"
                    value={sheetId}
                    onChange={(e) => setSheetId(e.target.value)}
                    className="border p-2 w-full"
                />
                <button
                    onClick={handleFetchColumns}
                    className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                >
                    Fetch Columns
                </button>
            </div>

            {columns.length > 0 && (
                <div>
                    <h2 className="text-xl mb-2">Map Columns</h2>
                    {['Name', 'Email', 'PrimaryPlatform', 'SecondaryPlatform', 'LessSubs', 'VideoName', 'Status'].map((field) => (
                        <div key={field} className="mb-2">
                            <label>{field}</label>
                            <select
                                onChange={(e) => handleMappingChange(field, e.target.value)}
                                className="border p-2 w-full"
                            >
                                <option value="">Select column</option>
                                {columns.map((col, index) => (
                                    <option key={index} value={String.fromCharCode(65 + index)}>
                                        {col} ({String.fromCharCode(65 + index)})
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}

                    <div className="mb-4">
                        <label>Start Time</label>
                        <input
                            type="datetime-local"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="border p-2 w-full"
                        />
                    </div>

                    <button
                        onClick={handleCreateCampaign}
                        disabled={loading}
                        className="bg-green-500 text-white px-4 py-2 rounded"
                    >
                        {loading ? 'Creating...' : 'Create Campaign'}
                    </button>
                </div>
            )}

            <div className="mt-6">
                <Link href="/dashboard" className="text-blue-600">Back to Dashboard</Link>
            </div>
        </div>
    );
}
