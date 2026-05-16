import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
        // We use Flash because it is the fastest to test
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const result = await model.generateContent("Pulse Check: Are you online?");
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ 
            success: true, 
            google_status: "ONLINE", 
            message: text 
        });
    } catch (e: any) {
        return NextResponse.json({ 
            success: false, 
            google_status: "OFFLINE", 
            error: e.message 
        }, { status: 500 });
    }
}