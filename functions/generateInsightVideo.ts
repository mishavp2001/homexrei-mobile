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
    const { insightId } = await req.json();
    
    if (!insightId) {
      return Response.json({ error: 'insightId is required' }, { status: 400 });
    }

    // Fetch insight details
    const insights = await base44.entities.Insight.filter({ id: insightId });
    const insight = insights[0];
    
    if (!insight) {
      return Response.json({ error: 'Insight not found' }, { status: 404 });
    }

    // Verify user owns the insight
    if (insight.created_by !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - not insight owner' }, { status: 403 });
    }

    // Check if insight has photos
    if (!insight.photo_urls || insight.photo_urls.length === 0) {
      return Response.json({ 
        error: 'Insight must have at least one photo to generate video' 
      }, { status: 400 });
    }

    console.log('=== GENERATING INSIGHT VIDEO ===');
    console.log('Insight ID:', insightId);
    console.log('Photos:', insight.photo_urls.length);

    // Prepare payload for Lambda API
    const payload = {
      description: insight.content,
      photos: insight.photo_urls.slice(0, 10) // Limit to 10 photos
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

    // Parse the response
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

    // Update insight with video URL
    await base44.entities.Insight.update(insightId, {
      video_url: videoData.videoUrl,
      video_generated_date: new Date().toISOString()
    });

    console.log('✅ Insight updated with video URL');

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