import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

async function uploadImageToSupabase(file: File): Promise<string> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const filename = `campsite-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
    
    const { data, error } = await supabase.storage
        .from('campsite-images')
        .upload(filename, file, {
            contentType: file.type,
            cacheControl: '3600',
        });

    if (error) {
        throw new Error(`Upload error: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
        .from('campsite-images')
        .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const name = formData.get('name') as string;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        const url = await uploadImageToSupabase(file);

        return NextResponse.json(
            { url, name: file.name },
            { status: 200 }
        );
    } catch (error: unknown) {
        console.error('Image upload error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to upload image' },
            { status: 500 }
        );
    }
}
