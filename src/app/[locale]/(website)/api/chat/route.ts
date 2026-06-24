// Mock chat route for UI preview — replace with real AI logic for production
import { NextResponse } from 'next/server';

export async function POST() {
    const stream = new ReadableStream({
        start(controller) {
            const message = "Hello! I'm Aura (preview mode). Connect the real AI backend to enable full responses.";
            controller.enqueue(new TextEncoder().encode(`0:"${message}"\n`));
            controller.close();
        },
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
        },
    });
}
