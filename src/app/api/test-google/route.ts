import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
        
        /** 
         * ✅ OMEGA LITE ALIGNMENT
         * Switching to the 'lite' model which has higher free-tier availability.
         */
        const model = genAI.getGenerativeModel(
            { model: "gemini-2.0-flash-lite" }, 
            { apiVersion: 'v1' }
        );
        
        const result = await model.generateContent("Pulse Check: Are you there Aura?");
        const text = result.response.text();

        return NextResponse.json({ 
            success: true, 
            google_status: "ONLINE", 
            brain_version: "2.0-FLASH-LITE",
            message: text 
        });
    } catch (e: any) {
        return NextResponse.json({ 
            success: false, 
            google_status: "OFFLINE", 
            error: e.message,
            suggestion: "If this also says Limit 0, wait 60 seconds and refresh."
        }, { status: 500 });
    }
}