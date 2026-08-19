import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('shop_suppliers')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,supplier_code.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerClient();
    const body = await request.json();

    const {
      supplier_code,
      name,
      contact_name,
      email,
      currency,
      lead_time_days,
      moq,
      dropship_enabled,
      payment_terms,
      feed_url,
      feed_format,
      feed_frequency,
    } = body;

    if (!supplier_code || !name) {
      return NextResponse.json(
        { error: 'supplier_code and name are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('shop_suppliers')
      .insert({
        supplier_code,
        name,
        contact_name,
        email,
        currency: currency || 'EUR',
        lead_time_days,
        moq,
        dropship_enabled: dropship_enabled ?? false,
        payment_terms,
        feed_url,
        feed_format,
        feed_frequency,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getServerClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const allowed = [
      'name', 'contact_name', 'email', 'phone', 'address',
      'currency', 'lead_time_days', 'moq', 'dropship_enabled',
      'payment_terms', 'feed_url', 'feed_format', 'feed_frequency',
      'scorecard', 'notes', 'status',
    ];

    const filtered: Record<string, any> = {};
    for (const key of allowed) {
      if (key in updates) {
        filtered[key] = updates[key];
      }
    }

    if (Object.keys(filtered).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    filtered.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('shop_suppliers')
      .update(filtered)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
