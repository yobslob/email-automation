import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getSheetColumns, getSheetData } from '../lib/sheets';
import { PrismaClient } from '@prisma/client';
import Queue from 'bull';

const prisma = new PrismaClient();
const emailQueue = new Queue('email sends', process.env.REDIS_URL);

export default function NewCampaign() {
    const [sheetId, setSheetId] = useState('');
    const [columns, setColumns] = useState([]);
    const [mapping, setMapping] = useState({});
    const [name, setName] = useState('');
    const [startTime, setStartTime] = useState('');

    const handleFetchColumns = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert('Please log in');
            return;
        }
        try {
            const cols = await getSheetColumns(session.provider_token, sheetId);
            setColumns(cols);
        } catch (error) {
            alert('Failed to fetch columns');
        }
    };

    const handleMappingChange = (field, column) => {
        setMapping({ ...mapping, [field]: column });
    };

    const handleCreateCampaign = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert('Please log in');
            return;
        }
        const userId = session.user.id;
        const campaign = await prisma.campaign.create({
            data: {
                userId,
                name,
                sheetType: 'google',
                sheetId,
                columnMapping: mapping,
                status: 'pending',
                startTime: new Date(startTime),
            },
        });

        // Fetch sheet data and create recipients
        const rows = await getSheetData(session.provider_token, sheetId);
        const startTimeDate = new Date(startTime);
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const data = {
                Name: row[columnToIndex(mapping.Name)],
                Email: row[columnToIndex(mapping.Email)],
                PrimaryPlatform: row[columnToIndex(mapping.PrimaryPlatform)],
                SecondaryPlatform: row[columnToIndex(mapping.SecondaryPlatform)],
                LessSubs: row[columnToIndex(mapping.LessSubs)],
                VideoName: row[columnToIndex(mapping.VideoName)],
            };
            const sendTime = new Date(startTimeDate);
            sendTime.setHours(startTimeDate.getHours() + i);
            sendTime.setMinutes(Math.floor(Math.random() * 60));
            const recipient = await prisma.recipient.create({
                data: {
                    campaignId: campaign.id,
                    rowIndex: i + 2,
                    data,
                    status: 'pending',
                    sendTime,
                },
            });
            const delay = sendTime.getTime() - Date.now();
            if (delay > 0) {
                await emailQueue.add(
                    { recipientId: recipient.id, userId },
                    { attempts: 3, backoff: { type: 'exponential', delay: 3600000 } }
                );
            }
        }
        alert('Campaign created and scheduled');
    };

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
                        className="bg-green-500 text-white px-4 py-2 rounded"
                    >
                        Create Campaign
                    </button>
                </div>
            )}
        </div>
    );
}