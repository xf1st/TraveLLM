import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    
    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: "Supabase config missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { data, error } = await supabase
            .from("image_cache")
            .select("*")
            .order("updated_at", { ascending: false });

        if (error) throw error;
        return NextResponse.json({ cache: data });
    } catch (error: any) {
        console.error("[Admin Image Cache API] GET Error:", error);
        return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    
    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: "Supabase config missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { query } = body;

    if (!query || (Array.isArray(query) && query.length === 0)) {
        return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    try {
        if (Array.isArray(query)) {
            // Delete one by one to avoid any Supabase/PostgREST 'in' clause limitations or RLS errors
            const deletePromises = query.map(q => 
                supabase.from("image_cache").delete().eq("query", q)
            );
            const results = await Promise.all(deletePromises);
            
            // Check if any of them failed
            const failed = results.find(r => r.error);
            if (failed) throw failed.error;
        } else {
            const { error } = await supabase
                .from("image_cache")
                .delete()
                .eq("query", query);
            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[Admin Image Cache API] DELETE Error:", error);
        return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
    }
}
