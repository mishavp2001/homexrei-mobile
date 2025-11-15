import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentIntentId } = await req.json();
    
    if (!paymentIntentId) {
      return Response.json({ error: 'Payment intent ID required' }, { status: 400 });
    }

    // Retrieve payment intent to verify
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return Response.json({ 
        error: 'Payment not completed',
        status: paymentIntent.status 
      }, { status: 400 });
    }

    // Calculate credits to add (amount in cents / 100 = credits)
    const creditsToAdd = paymentIntent.amount / 100;
    
    // Get current user credits
    const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const currentCredits = users[0]?.credits || 0;
    
    // Update user credits
    await base44.asServiceRole.auth.updateUser(user.id, {
      credits: currentCredits + creditsToAdd
    });

    return Response.json({
      success: true,
      creditsAdded: creditsToAdd,
      newBalance: currentCredits + creditsToAdd
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to confirm payment' 
    }, { status: 500 });
  }
});