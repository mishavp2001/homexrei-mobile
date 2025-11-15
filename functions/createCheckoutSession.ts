import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, invoiceIds } = await req.json();
    
    if (!amount || amount < 100) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Get the origin from request headers
    const origin = req.headers.get('origin') || 'https://your-app.base44.com';

    console.log('Creating checkout session for user:', user.email);
    console.log('Amount:', amount, 'Invoice IDs:', invoiceIds);
    console.log('Origin:', origin);

    let lineItems;
    let metadata = {
      user_id: user.id,
      user_email: user.email,
    };

    // Check if this is for invoices or credits
    if (invoiceIds && invoiceIds.length > 0) {
      // Invoice payment
      const totalDollars = amount / 100;
      lineItems = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Lead Invoices Payment (${invoiceIds.length} invoice${invoiceIds.length > 1 ? 's' : ''})`,
              description: 'Payment for qualified leads received',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ];
      metadata.invoice_ids = JSON.stringify(invoiceIds);
      metadata.payment_type = 'invoice';
    } else {
      // Credit purchase
      const credits = amount / 100;
      lineItems = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${credits} Video Generation Credits`,
              description: `Purchase ${credits} credits for AI video generation`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ];
      metadata.credits_to_add = credits.toString();
      metadata.payment_type = 'credits';
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: invoiceIds ? `${origin}/ProviderBilling` : `${origin}/Insights`,
      metadata: metadata,
      customer_email: user.email,
    });

    console.log('Checkout session created:', session.id);

    return Response.json({
      url: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('Checkout session error:', error);
    return Response.json({ 
      error: error.message || 'Failed to create checkout session' 
    }, { status: 500 });
  }
});