import { NextResponse } from 'next/server';
import { deepseekInference } from '@/lib/deepseek';
import { getMyszfSystemPrompt } from '@/lib/personality';

const BOT_TOKEN = '8671224422:AAGQOhMDdvc7AuiMj-2hWbC7aMDMrWrvDWs';

export async function POST(req: Request) {
    try {
        const update = await req.json();

        if (!update.message || !update.message.text) {
            return NextResponse.json({ ok: true });
        }

        const chatId = update.message.chat.id;
        const userText = update.message.text;

        console.log(`[Telegram myszf] Msg from ${chatId}: ${userText}`);

        // Prepare conversation for DeepSeek
        const messages = [
            { role: 'system', content: getMyszfSystemPrompt() },
            { role: 'user', content: userText }
        ];

        // Get response from DeepSeek
        const botResponse = await deepseekInference(messages as any, {
            temperature: 0.9, // Higher temperature for more "personality"
            maxTokens: 500
        });

        // Send response back to Telegram
        const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: botResponse,
                parse_mode: 'HTML'
            })
        });

        const tgData = await tgRes.json();
        if (!tgData.ok) {
            console.error('[Telegram myszf] API Error:', tgData);
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('[Telegram myszf] Webhook Error:', error);
        return NextResponse.json({ ok: true }); // Always return 200 to Telegram
    }
}
