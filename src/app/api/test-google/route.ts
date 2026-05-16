import { NextResponse } from "next/server";

export async function GET() {
    try {
        const API_KEY = process.env.SAMBANOVA_API_KEY;

        /**
         * ✅ SAMBANOVA HANDSHAKE
         * Using the Llama 3.3 70B model seen in your dashboard screenshot.
         */
        const response = await fetch("https://api.sambanova.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "Meta-Llama-3.3-70B-Instruct",
                messages: [{ role: "user", content: "Aura Pulse Check: Are you online?" }],
                temperature: 0.1
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ 
                success: false, 
                status: "OFFLINE", 
                error: data.error?.message || "Connection Refused" 
            }, { status: response.status });
        }

        return NextResponse.json({ 
            success: true, 
            status: "ONLINE", 
            brain: "SambaNova Llama 3.3 70B",
            message: data.choices[0].message.content 
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}