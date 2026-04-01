// Supabase Edge Function: check-price-alerts
// Compares current fuel prices against user-set price alerts,
// sends push notifications via Expo for any triggered alerts.
//
// Invoke after each price sync:
//   curl -X POST https://<project>.supabase.co/functions/v1/check-price-alerts \
//     -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface AlertMatch {
  user_id: string;
  station_id: string;
  station_name: string;
  fuel_type: string;
  target_price: number;
  current_price: number;
  expo_push_token: string;
}

const FUEL_LABELS: Record<string, string> = {
  unleaded95: 'Unleaded 95',
  unleaded98: 'Unleaded 98',
  diesel: 'Diesel',
  kerosene: 'Kerosene',
};

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find alerts where current price ≤ target price
    const { data: matches, error } = await supabase.rpc('get_triggered_alerts');

    if (error) {
      // If the RPC doesn't exist yet, fall back to a manual query
      console.log('RPC not found, using manual query');
      return await manualCheck(supabase);
    }

    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({ triggered: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Send push notifications in batches of 100 (Expo limit)
    const messages = matches.map((m: AlertMatch) => ({
      to: m.expo_push_token,
      sound: 'default',
      title: `Price Alert: ${FUEL_LABELS[m.fuel_type] ?? m.fuel_type}`,
      body: `${m.station_name} dropped to €${m.current_price.toFixed(3)} (your target: €${m.target_price.toFixed(3)})`,
      data: { stationId: m.station_id, fuelType: m.fuel_type },
    }));

    const BATCH = 100;
    let sent = 0;
    for (let i = 0; i < messages.length; i += BATCH) {
      const batch = messages.slice(i, i + BATCH);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(batch),
      });
      if (res.ok) sent += batch.length;
    }

    return new Response(JSON.stringify({ triggered: matches.length, sent }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function manualCheck(supabase: any) {
  // Join price_alerts with latest_prices and push_tokens
  const { data: alerts } = await supabase
    .from('price_alerts')
    .select('user_id, station_id, fuel_type, target_price');

  if (!alerts || alerts.length === 0) {
    return new Response(JSON.stringify({ triggered: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const messages: any[] = [];

  for (const alert of alerts) {
    // Get current price
    const { data: priceRow } = await supabase
      .from('latest_prices')
      .select('price')
      .eq('station_id', alert.station_id)
      .eq('fuel_type', alert.fuel_type)
      .single();

    if (!priceRow || priceRow.price > alert.target_price) continue;

    // Get station name
    const { data: station } = await supabase
      .from('stations')
      .select('name')
      .eq('id', alert.station_id)
      .single();

    // Get push tokens for this user
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .eq('user_id', alert.user_id);

    if (!tokens || tokens.length === 0) continue;

    for (const t of tokens) {
      messages.push({
        to: t.expo_push_token,
        sound: 'default',
        title: `Price Alert: ${FUEL_LABELS[alert.fuel_type] ?? alert.fuel_type}`,
        body: `${station?.name ?? 'Station'} dropped to €${priceRow.price.toFixed(3)} (your target: €${alert.target_price.toFixed(3)})`,
        data: { stationId: alert.station_id, fuelType: alert.fuel_type },
      });
    }
  }

  if (messages.length === 0) {
    return new Response(JSON.stringify({ triggered: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Send via Expo
  const BATCH = 100;
  let sent = 0;
  for (let i = 0; i < messages.length; i += BATCH) {
    const batch = messages.slice(i, i + BATCH);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
    if (res.ok) sent += batch.length;
  }

  return new Response(JSON.stringify({ triggered: messages.length, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
