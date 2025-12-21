
import { NextResponse } from "next/server";
import { searchCampsites } from "@/lib/availability/engine";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const results = await searchCampsites(body);
        return NextResponse.json(results);
    } catch (error) {
        console.error("Campsite Search Error:", error);
        return NextResponse.json({ error: "Failed to search campsites" }, { status: 500 });
    }
}
