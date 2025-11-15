import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { offerId } = await req.json();
    
    if (!offerId) {
      return Response.json({ error: 'offerId is required' }, { status: 400 });
    }

    console.log('=== GENERATING OFFER PDF ===');
    console.log('Offer ID:', offerId);

    // Fetch offer details
    const offers = await base44.entities.Offer.filter({ id: offerId });
    const offer = offers[0];
    
    if (!offer) {
      return Response.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Verify user owns the offer or is the seller
    if (offer.buyer_email !== user.email && offer.seller_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - not offer participant' }, { status: 403 });
    }

    // Create PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Helper function to add text with wrapping
    const addText = (text, fontSize = 10, isBold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
      doc.text(lines, margin, y);
      y += lines.length * fontSize * 0.4 + 5;
      
      // Check if we need a new page
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }
    };

    const addSection = (title) => {
      y += 5;
      addText(title, 12, true);
      y += 2;
    };

    // Header
    doc.setFillColor(30, 58, 95); // #1e3a5f
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('REAL ESTATE PURCHASE OFFER', pageWidth / 2, 25, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y = 50;

    // Document Info
    addText(`Date: ${new Date().toLocaleDateString()}`, 10);
    addText(`Offer ID: ${offer.id.substring(0, 8).toUpperCase()}`, 10);
    y += 5;

    // Property Information
    addSection('PROPERTY INFORMATION');
    addText(`Address: ${offer.property_address}`, 10);
    y += 3;

    // Buyer Information
    addSection('BUYER INFORMATION');
    addText(`Name: ${offer.buyer_name}`, 10);
    addText(`Email: ${offer.buyer_email}`, 10);
    if (offer.buyer_phone) addText(`Phone: ${offer.buyer_phone}`, 10);
    if (offer.buyer_address) addText(`Address: ${offer.buyer_address}`, 10);
    y += 3;

    // Offer Details
    addSection('OFFER TERMS');
    addText(`Purchase Price: $${offer.offer_amount.toLocaleString()}`, 11, true);
    
    if (offer.earnest_money_deposit) {
      addText(`Earnest Money Deposit: $${offer.earnest_money_deposit.toLocaleString()}`, 10);
    }
    
    if (offer.down_payment_percent) {
      const downPayment = (offer.offer_amount * offer.down_payment_percent) / 100;
      addText(`Down Payment: ${offer.down_payment_percent}% ($${downPayment.toLocaleString()})`, 10);
    }
    
    addText(`Financing Type: ${offer.financing_type.replace(/_/g, ' ').toUpperCase()}`, 10);
    
    if (offer.financing_details) {
      addText(`Financing Details: ${offer.financing_details}`, 10);
    }
    
    if (offer.closing_date) {
      addText(`Proposed Closing Date: ${new Date(offer.closing_date).toLocaleDateString()}`, 10);
    }
    
    addText(`Closing Cost Responsibility: ${offer.closing_cost_responsibility.replace(/_/g, ' ')}`, 10);
    y += 3;

    // Contingencies
    addSection('CONTINGENCIES');
    
    if (offer.inspection_contingency) {
      addText(`✓ Inspection Contingency: Buyer has ${offer.inspection_period_days || 10} days to complete inspection`, 10);
    }
    
    if (offer.appraisal_contingency) {
      addText(`✓ Appraisal Contingency: Purchase subject to property appraising at or above offer amount`, 10);
    }
    
    if (offer.financing_contingency) {
      addText(`✓ Financing Contingency: Purchase subject to buyer obtaining financing`, 10);
    }
    
    if (offer.contingencies && offer.contingencies.length > 0) {
      offer.contingencies.forEach(contingency => {
        addText(`✓ ${contingency}`, 10);
      });
    }
    y += 3;

    // Additional Terms
    if (offer.additional_terms) {
      addSection('ADDITIONAL TERMS & CONDITIONS');
      addText(offer.additional_terms, 10);
      y += 3;
    }

    // Expiration
    if (offer.expiration_date) {
      addSection('OFFER EXPIRATION');
      addText(`This offer expires on ${new Date(offer.expiration_date).toLocaleDateString()} at 11:59 PM`, 10);
      y += 3;
    }

    // Signatures
    y += 10;
    addSection('SIGNATURES');
    y += 10;
    
    doc.line(margin, y, margin + 70, y);
    addText('Buyer Signature', 9);
    y += 3;
    addText(`${offer.buyer_name}`, 10);
    addText(`Date: ${new Date().toLocaleDateString()}`, 9);
    
    y += 20;
    doc.line(margin, y, margin + 70, y);
    addText('Seller Signature', 9);
    y += 3;
    addText('Date: __________________', 9);

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${pageCount} | Generated via HomeXREI | Document ID: ${offer.id.substring(0, 8).toUpperCase()}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Generate PDF as buffer
    const pdfBuffer = doc.output('arraybuffer');
    const pdfFile = new File([pdfBuffer], `offer-${offer.id}.pdf`, { type: 'application/pdf' });

    // Upload to storage
    console.log('Uploading PDF to storage...');
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
    console.log('✅ PDF uploaded:', file_url);

    // Update offer with PDF URL
    await base44.entities.Offer.update(offerId, {
      offer_pdf_url: file_url
    });

    console.log('✅ Offer updated with PDF URL');

    return Response.json({
      success: true,
      pdfUrl: file_url,
      message: 'Offer PDF generated successfully'
    });

  } catch (error) {
    console.error('❌ Error generating offer PDF:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate offer PDF',
      stack: error.stack
    }, { status: 500 });
  }
});