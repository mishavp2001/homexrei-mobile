import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const LAMBDA_VIDEO_API = 'https://lxoosxditdulqtbnqql3zox2o40hqvjv.lambda-url.us-east-1.on.aws/';
const VIDEO_COST = 1; // 1 credit per video

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user credits
    if (!user.credits || user.credits < VIDEO_COST) {
      return Response.json({ 
        error: 'Insufficient credits',
        required: VIDEO_COST,
        current: user.credits || 0
      }, { status: 402 }); // 402 Payment Required
    }

    // Parse request body
    const { dealId } = await req.json();
    
    if (!dealId) {
      return Response.json({ error: 'dealId is required' }, { status: 400 });
    }

    // Fetch deal details
    const deals = await base44.entities.Deal.filter({ id: dealId });
    const deal = deals[0];
    
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Verify user owns the deal
    if (deal.user_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - not deal owner' }, { status: 403 });
    }

    // Check if deal has photos
    if (!deal.photo_urls || deal.photo_urls.length === 0) {
      return Response.json({ 
        error: 'Deal must have at least one photo to generate video' 
      }, { status: 400 });
    }

    console.log('=== GENERATING PROPERTY VIDEO ===');
    console.log('Deal ID:', dealId);
    console.log('Photos:', deal.photo_urls.length);

    // Prepare payload for Lambda API with correct parameter names
    const payload = {
      description: deal.description || deal.title,
      price: deal.price.toString(),
      bedrooms: deal.bedrooms || 0,
      bathrooms: deal.bathrooms || 0,
      squareFootage: deal.sqft || 0, // Using camelCase as expected by Lambda
      photos: deal.photo_urls.slice(0, 10) // Limit to 10 photos
    };

    console.log('Calling Lambda API with payload:', payload);

    // Call Lambda video generation API
    const lambdaResponse = await fetch(LAMBDA_VIDEO_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!lambdaResponse.ok) {
      const errorText = await lambdaResponse.text();
      console.error('Lambda API error:', errorText);
      return Response.json({ 
        error: `Video generation failed: ${lambdaResponse.statusText}`,
        details: errorText
      }, { status: 500 });
    }

    const lambdaResult = await lambdaResponse.json();
    console.log('Lambda API response:', lambdaResult);

    // Parse the response (Lambda returns stringified body)
    let videoData;
    if (typeof lambdaResult.body === 'string') {
      videoData = JSON.parse(lambdaResult.body);
    } else {
      videoData = lambdaResult;
    }

    if (!videoData.success || !videoData.videoUrl) {
      return Response.json({ 
        error: 'Video generation failed',
        details: videoData
      }, { status: 500 });
    }

    console.log('✅ Video generated successfully:', videoData.videoUrl);

    // Deduct credits AFTER successful video generation
    const newCredits = user.credits - VIDEO_COST;
    await base44.auth.updateMe({
      credits: newCredits
    });

    console.log(`✅ Deducted ${VIDEO_COST} credit(s). New balance: ${newCredits}`);

    // Update deal with video URL
    await base44.entities.Deal.update(dealId, {
      video_url: videoData.videoUrl,
      video_generated_date: new Date().toISOString()
    });

    console.log('✅ Deal updated with video URL');

    return Response.json({
      success: true,
      videoUrl: videoData.videoUrl,
      videoKey: videoData.videoKey,
      creditsRemaining: newCredits,
      message: 'Video generated successfully!'
    });

  } catch (error) {
    console.error('❌ Error generating video:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate video',
      stack: error.stack
    }, { status: 500 });
  }
});