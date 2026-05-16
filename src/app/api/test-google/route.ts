import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
        
        /** 
         * ✅ FORENSIC FIX: Using the model we SAW in your Discovery List.
         * We use the 'v1' stable endpoint.
         */
        const model = genAI.getGenerativeModel(
            { model: "gemini-2.0-flash" }, // Using the 2.0 version from your logs
            { apiVersion: 'v1' }
        );
        
        const result = await model.generateContent("Aura Pulse Check: Confirming 2.0 Link.");
        const text = result.response.text();

        return NextResponse.json({ 
            success: true, 
            google_status: "ONLINE", 
            brain_version: "2.0-FLASH",
            message: text 
        });
    } catch (e: any) {
        return NextResponse.json({ 
            success: false, 
            google_status: "OFFLINE", 
            error: e.message,
            tip: "Try changing the model to 'gemini-2.5-flash' if 2.0 is restricted."
        }, { status: 500 });
    }
}