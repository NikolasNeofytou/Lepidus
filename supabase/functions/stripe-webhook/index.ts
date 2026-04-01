// Supabase Edge Function: stripe-webhook
// Handles Stripe webhook events to update subscription status.
// Configure in Stripe Dashboard → Webhooks → Add endpoint:
//   URL: https://<project>.supabase.co/functions/v1/stripe-webhook
//   Events: checkout.session.completed, customer.subscription.updated,
//           customer.subscription.deleted

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@17?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
});

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, endpointSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.subscription
        ? (await stripe.subscriptions.retrieve(session.subscription as string))
            .metadata.supabase_user_id
        : null;

      if (userId) {
        await supabase
          .from('user_profiles')
          .update({
            subscription_tier: 'pro',
            stripe_customer_id: session.customer as string,
          })
          .eq('user_id', userId);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata.supabase_user_id;
      if (!userId) break;

      const isActive = sub.status === 'active' || sub.status === 'trialing';
      await supabase
        .from('user_profiles')
        .update({
          subscription_tier: isActive ? 'pro' : 'free',
          subscription_ends_at: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        })
        .eq('user_id', userId);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata.supabase_user_id;
      if (!userId) break;

      await supabase
        .from('user_profiles')
        .update({
          subscription_tier: 'free',
          subscription_ends_at: null,
        })
        .eq('user_id', userId);
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
