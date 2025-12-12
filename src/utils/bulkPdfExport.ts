import jsPDF from 'jspdf';
import type { Survey } from '../firebase/surveys';

// Helper function to resize image to standard size
async function resizeImageToStandard(img: HTMLImageElement, maxWidth: number, maxHeight: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Calculate new dimensions maintaining aspect ratio
    let width = img.width;
    let height = img.height;
    const aspectRatio = width / height;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    canvas.width = width;
    canvas.height = height;

    // Draw and resize image
    ctx.drawImage(img, 0, 0, width, height);
    
    try {
      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85); // Use JPEG with 85% quality for smaller size
      resolve(resizedDataUrl);
    } catch (error) {
      reject(error);
    }
  });
}

// Helper function to load image as base64 with resizing
async function loadImageAsBase64(url: string, maxWidth: number = 800, maxHeight: number = 600): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = async () => {
          try {
            const resizedBase64 = await resizeImageToStandard(img, maxWidth, maxHeight);
            resolve(resizedBase64);
          } catch (error) {
            console.error('Error resizing image:', error);
            resolve(reader.result as string); // Fallback to original
          }
        };
        img.onerror = () => {
          console.error('Error loading image');
          resolve(reader.result as string); // Fallback to original
        };
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    return '';
  }
}

// Format date helper
function formatDate(timestamp: any): string {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format value helper
function formatValue(value: any): string {
  if (value === undefined || value === null || value === '') {
    return 'N/A';
  }
  return String(value);
}

// Add footer to PDF page
function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.text(`Page ${pageNum}/${totalPages}`, 105, 290, { align: 'center' });
  doc.setTextColor(0, 0, 0);
}

// Add client footer (no page number, just text) - distributed layout
function addClientFooter(doc: jsPDF) {
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10); // Increased from 8
  doc.setFont('helvetica', 'normal');
  const pageWidth = 210;
  const margin = 8;
  const footerY = 294; // Moved down
  
  // Calculate even spacing for all 4 items
  const totalWidth = pageWidth - (margin * 2);
  const itemSpacing = totalWidth / 4; // Even spacing between items
  
  // Matrix - moved to right from left edge
  doc.text('Matrix', margin + itemSpacing * 0.3, footerY);
  
  // PMC - evenly spaced
  doc.text('PMC', margin + itemSpacing * 1.2, footerY);
  
  // Client - evenly spaced
  doc.text('NMSCDCL', margin + itemSpacing * 2.2, footerY);
  
  // Police - moved to left from right edge
  doc.text('Police', margin + itemSpacing * 3.2, footerY);
}

// Add a simple field to PDF (no borders, just text) - for client PDFs
function addSimpleField(doc: jsPDF, x: number, y: number, label: string, value: string, width: number = 95): number {
  const lineHeight = 10; // Increased by 1 point
  
  // Label (bold)
  doc.setFontSize(11); // Increased by 1 point
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(label + ':', x, y);
  
  // Value (normal) - with gap after colon
  doc.setFontSize(11); // Increased by 1 point
  doc.setFont('helvetica', 'normal');
  const labelWidth = doc.getTextWidth(label + ':');
  const gapAfterColon = 3; // Professional gap between label and value
  const valueX = x + labelWidth + gapAfterColon;
  const maxWidth = width - labelWidth - gapAfterColon;
  const lines = doc.splitTextToSize(value, maxWidth);
  doc.text(lines[0], valueX, y);
  
  return lineHeight;
}

// Add a field to PDF
function addField(doc: jsPDF, x: number, y: number, label: string, value: string, width: number = 95): number {
  const padding = 2;
  const fieldHeight = 10; // Reduced from 12
  
  // Field background
  doc.setFillColor(248, 249, 250); // #f8f9fa
  doc.roundedRect(x, y, width, fieldHeight, 2, 2, 'F');
  
  // Left border accent - light gray instead of blue
  doc.setFillColor(200, 200, 200); // Light gray
  doc.rect(x, y, 2, fieldHeight, 'F');
  
  // Label
  doc.setFontSize(6); // Reduced from 7
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(102, 102, 102); // #666
  doc.text(label.toUpperCase(), x + 4, y + 4);
  
  // Value
  doc.setFontSize(8); // Reduced from 9
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51); // #333
  const valueY = y + 8;
  const maxWidth = width - 8;
  const lines = doc.splitTextToSize(value, maxWidth);
  doc.text(lines[0], x + 4, valueY);
  
  return fieldHeight + padding; // Return height used
}

// Add section title
function addSectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFontSize(9); // Reduced from 11
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 51, 51); // Dark gray instead of blue
  doc.text(title, 10, y);
  
  // Underline
  doc.setDrawColor(200, 200, 200); // Light gray instead of blue
  doc.setLineWidth(0.5);
  doc.line(10, y + 0.5, 200, y + 0.5);
  
  return 6; // Reduced from 8
}

// Add image to PDF
async function addImageToPDF(doc: jsPDF, x: number, y: number, imageData: string, width: number, height: number): Promise<void> {
  try {
    doc.addImage(imageData, 'PNG', x, y, width, height);
  } catch (error) {
    console.error('Error adding image to PDF:', error);
    // Draw white rectangle as placeholder
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(1);
    doc.roundedRect(x, y, width, height, 2, 2);
  }
}

// Generate PDF using jsPDF native API with full control
async function generateSinglePDFBlob(survey: Survey): Promise<{ blob: Blob; filename: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Constants
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);
  const fieldWidth = (contentWidth - 10) / 2; // 2 columns with gap
  let y = margin; // Start from top
  const sectionSpacing = 4; // Reduced spacing
  
  // Load images
  const images: string[] = [];
  if (survey.imageUrls && survey.imageUrls.length > 0) {
    for (const url of survey.imageUrls) {
      const base64 = await loadImageAsBase64(url);
      if (base64) images.push(base64);
    }
  }

  // Helper to check if we need new page
  const checkNewPage = (requiredHeight: number): boolean => {
    // More aggressive page break - use more of the page before breaking
    if (y + requiredHeight > pageHeight - margin - 8) { // Reduced footer space
      addPageFooter(doc, doc.getNumberOfPages(), 0); // Will update total later
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Add "Site Survey" heading at the top
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 51, 51);
  doc.text('SITE SURVEY', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Section 1: General Information
  checkNewPage(10);
  y += addSectionTitle(doc, y, '1. GENERAL INFORMATION');
  y += 2;
  
  const generalFields = [
    { label: 'RFP Number', value: formatValue(survey.rfpNumber), x: margin },
    { label: 'Pole ID', value: formatValue(survey.poleId), x: margin + fieldWidth + 10 },
    { label: 'Location Name', value: formatValue(survey.locationName), x: margin },
    { label: 'Police Station', value: formatValue(survey.policeStation), x: margin + fieldWidth + 10 },
    { label: 'Location Categories', value: survey.locationCategories?.join(', ') || 'N/A', x: margin },
    { label: 'Power Substation', value: formatValue(survey.powerSubstation), x: margin + fieldWidth + 10 },
    { label: 'Nearest Landmark', value: formatValue(survey.nearestLandmark), x: margin },
  ];
  
  if (survey.latitude && survey.longitude) {
    generalFields.push({ label: 'Coordinates', value: `${survey.latitude}, ${survey.longitude}`, x: margin + fieldWidth + 10 });
  }

  for (let i = 0; i < generalFields.length; i += 2) {
    checkNewPage(12);
    const field1 = generalFields[i];
    const field2 = generalFields[i + 1];
    
    const height1 = addField(doc, field1.x, y, field1.label, field1.value, fieldWidth);
    if (field2) {
      addField(doc, field2.x, y, field2.label, field2.value, fieldWidth);
    }
    y += Math.max(height1, 10) + 2; // Reduced spacing
  }

  y += sectionSpacing;

  // Section 2: Infrastructure Details
  checkNewPage(12);
  y += addSectionTitle(doc, y, '2. INFRASTRUCTURE DETAILS');
  y += 2;

  const infraFields = [
    { label: 'Power Source Available', value: survey.powerSourceAvailability === true ? 'Yes' : survey.powerSourceAvailability === false ? 'No' : 'N/A', x: margin },
    { label: 'Cable Trenching (m)', value: formatValue(survey.cableTrenching), x: margin + fieldWidth + 10 },
    { label: 'Road Type', value: formatValue(survey.roadType), x: margin },
    { label: 'No. of Roads', value: formatValue(survey.noOfRoads), x: margin + fieldWidth + 10 },
    { label: 'Pole Size', value: formatValue(survey.poleSize), x: margin },
    { label: 'Cantilever Type', value: formatValue(survey.cantileverType), x: margin + fieldWidth + 10 },
    { label: 'Existing CCTV Pole', value: survey.existingCctvPole === true ? 'Yes' : survey.existingCctvPole === false ? 'No' : 'N/A', x: margin },
    { label: 'Distance from Existing Pole (m)', value: formatValue(survey.distanceFromExistingPole), x: margin + fieldWidth + 10 },
    { label: 'JB', value: formatValue(survey.jb), x: margin },
    { label: 'No. of Cameras', value: formatValue(survey.noOfCameras), x: margin + fieldWidth + 10 },
    { label: 'No. of Poles', value: formatValue(survey.noOfPoles), x: margin },
  ];

  for (let i = 0; i < infraFields.length; i += 2) {
    checkNewPage(12);
    const field1 = infraFields[i];
    const field2 = infraFields[i + 1];
    
    addField(doc, field1.x, y, field1.label, field1.value, fieldWidth);
    if (field2) {
      addField(doc, field2.x, y, field2.label, field2.value, fieldWidth);
    }
    y += 12; // Reduced from 15
  }

  y += sectionSpacing;

  // Section 3: Measurement Sheet
  checkNewPage(12);
  y += addSectionTitle(doc, y, '3. MEASUREMENT SHEET');
  y += 2;

  const measurementFields = [
    { label: 'Power Cable (2 Core) (m)', value: formatValue(survey.powerCable), x: margin },
    { label: 'CAT6 Cable (m)', value: formatValue(survey.cat6Cable), x: margin + fieldWidth + 10 },
    { label: 'IR Cable (2.5sqmm 3core) (m)', value: formatValue(survey.irCable), x: margin },
    { label: 'HDPE Power Trenching (m)', value: formatValue(survey.hdpPowerTrenching), x: margin + fieldWidth + 10 },
    { label: 'Road Crossing Length (m)', value: formatValue(survey.roadCrossingLength), x: margin },
  ];

  for (let i = 0; i < measurementFields.length; i += 2) {
    checkNewPage(12);
    const field1 = measurementFields[i];
    const field2 = measurementFields[i + 1];
    
    addField(doc, field1.x, y, field1.label, field1.value, fieldWidth);
    if (field2) {
      addField(doc, field2.x, y, field2.label, field2.value, fieldWidth);
    }
    y += 12; // Reduced from 15
  }

  y += sectionSpacing;

  // Section 4: Type of Cameras
  checkNewPage(12);
  y += addSectionTitle(doc, y, '4. TYPE OF CAMERAS');
  y += 2;

  const cameraFields = [
    { label: 'Fixed Box Camera', value: formatValue(survey.fixedBoxCamera), x: margin },
    { label: 'PTZ', value: formatValue(survey.ptz), x: margin + fieldWidth + 10 },
    { label: 'ANPR Camera', value: formatValue(survey.anprCamera), x: margin },
    { label: 'Total Cameras', value: formatValue(survey.totalCameras), x: margin + fieldWidth + 10 },
    { label: 'PA System', value: formatValue(survey.paSystem), x: margin },
  ];

  for (let i = 0; i < cameraFields.length; i += 2) {
    checkNewPage(12);
    const field1 = cameraFields[i];
    const field2 = cameraFields[i + 1];
    
    addField(doc, field1.x, y, field1.label, field1.value, fieldWidth);
    if (field2) {
      addField(doc, field2.x, y, field2.label, field2.value, fieldWidth);
    }
    y += 12; // Reduced from 15
  }

  y += sectionSpacing;

  // Section 5: Type of Analytics - Force new page
  addPageFooter(doc, doc.getNumberOfPages(), 0);
  doc.addPage();
  y = margin;
  
  y += addSectionTitle(doc, y, '5. TYPE OF ANALYTICS');
  y += 2;

  const analyticsFields = [
    { label: 'Crowd Safety Options', value: survey.crowdSafetyOptions?.join(', ') || 'None', x: margin },
    { label: 'Investigation Options', value: survey.investigationOptions?.join(', ') || 'None', x: margin + fieldWidth + 10 },
    { label: 'Public Order Options', value: survey.publicOrderOptions?.join(', ') || 'None', x: margin },
    { label: 'Traffic Options', value: survey.trafficOptions?.join(', ') || 'None', x: margin + fieldWidth + 10 },
    { label: 'Safety Options', value: survey.safetyOptions?.join(', ') || 'None', x: margin },
    { label: 'ANPR', value: survey.anpr === true ? 'Yes' : survey.anpr === false ? 'No' : 'N/A', x: margin + fieldWidth + 10 },
    { label: 'FRS', value: survey.frs === true ? 'Yes' : survey.frs === false ? 'No' : 'N/A', x: margin },
    { label: 'Remarks', value: formatValue(survey.remarks), x: margin + fieldWidth + 10 },
  ];

  for (let i = 0; i < analyticsFields.length; i += 2) {
    checkNewPage(12);
    const field1 = analyticsFields[i];
    const field2 = analyticsFields[i + 1];
    
    addField(doc, field1.x, y, field1.label, field1.value, fieldWidth);
    if (field2) {
      addField(doc, field2.x, y, field2.label, field2.value, fieldWidth);
    }
    y += 12; // Reduced from 15
  }

  y += sectionSpacing;

  // Section 6: Parent Pole - Check if we need new page, but don't force it
  checkNewPage(30);
  y += addSectionTitle(doc, y, '6. PARENT POLE FOR POWER SOURCE');
  y += 2;

  const parentPoleFields = [
    { label: 'Parent pole ID', value: formatValue(survey.parentPoleId), x: margin },
    { label: 'Parent pole distance', value: formatValue(survey.parentPoleDistance), x: margin + fieldWidth + 10 },
    { label: 'Road crossing length from parent pole', value: formatValue(survey.parentPoleRoadCrossing), x: margin },
    { label: 'Parent road type', value: formatValue(survey.parentPoleRoadType), x: margin + fieldWidth + 10 },
  ];

  for (let i = 0; i < parentPoleFields.length; i += 2) {
    checkNewPage(12);
    const field1 = parentPoleFields[i];
    const field2 = parentPoleFields[i + 1];
    
    addField(doc, field1.x, y, field1.label, field1.value, fieldWidth);
    if (field2) {
      addField(doc, field2.x, y, field2.label, field2.value, fieldWidth);
    }
    y += 12; // Reduced from 15
  }

  y += sectionSpacing;

  // Section 7: Images
  checkNewPage(50);
  y += addSectionTitle(doc, y, `7. IMAGES (${images.length || 0})`);
  y += 3;

  if (images.length > 0) {
    const availableWidth = pageWidth - (margin * 2); // 190mm
    const imgGap = 5; // Reduced gap for better fit
    // Calculate available height (leave space for Matrix text and footer)
    const availableHeight = pageHeight - y - margin - 20; // Reserve space for Matrix and footer
    let imgWidth: number;
    let imgHeight: number;
    
    // Calculate dimensions to fit 3 images in one row, respecting both X and Y constraints
    if (images.length <= 3) {
      // For 3 or fewer images: fit all in one row
      // Calculate width: n * width + (n-1) * gap = availableWidth
      const calculatedWidth = (availableWidth - (images.length - 1) * imgGap) / images.length;
      // Calculate height based on available space
      const calculatedHeight = availableHeight;
      // Use the smaller dimension to ensure both fit, maintaining aspect ratio
      // Standard aspect ratio is 4:3, so height = width * 0.75
      // We need to fit: width fits in availableWidth/n, height fits in availableHeight
      const maxWidthFromHeight = calculatedHeight / 0.75; // If height is limiting
      const maxHeightFromWidth = calculatedWidth * 0.75; // If width is limiting
      
      // Use whichever is smaller to ensure both dimensions fit
      if (maxHeightFromWidth <= calculatedHeight) {
        imgWidth = calculatedWidth;
        imgHeight = maxHeightFromWidth;
      } else {
        imgWidth = maxWidthFromHeight;
        imgHeight = calculatedHeight;
      }
    } else {
      // For more than 3 images, use 2 per row
      imgWidth = (availableWidth - imgGap) / 2;
      imgHeight = Math.min(availableHeight, imgWidth * 0.75);
    }
    
    let imgX = margin;
    
    for (let i = 0; i < images.length; i++) {
      // Check if we need a new row (for more than 3 images)
      if (images.length > 3 && i > 0 && i % 2 === 0) {
        checkNewPage(50);
        imgX = margin;
        y += imgHeight + imgGap;
      } else if (imgX + imgWidth > pageWidth - margin) {
        checkNewPage(50);
        imgX = margin;
        y += imgHeight + imgGap;
      }
      await addImageToPDF(doc, imgX, y, images[i], imgWidth, imgHeight);
      imgX += imgWidth + imgGap;
    }
    y += imgHeight + 5; // Reduced from 10
  } else {
    // White placeholder
    checkNewPage(40);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, contentWidth, 35, 2, 2, 'F'); // Reduced height
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(1);
    doc.roundedRect(margin, y, contentWidth, 35, 2, 2);
    y += 40; // Reduced from 45
  }

  y += sectionSpacing;

  // Section 8: Metadata
  checkNewPage(40);
  y += addSectionTitle(doc, y, '8. METADATA');
  y += 2;

  // User Phone
  checkNewPage(12);
  addField(doc, margin, y, 'User Phone', formatValue(survey.userPhone), fieldWidth);
  y += 12;

  // Created At
  checkNewPage(12);
  addField(doc, margin, y, 'Created At', formatDate(survey.createdAt), fieldWidth);
  y += 12;

  // Updated At
  checkNewPage(12);
  addField(doc, margin, y, 'Updated At', formatDate(survey.updatedAt), fieldWidth);
  y += 12;

  // Add "Matrix" text left aligned below metadata
  y += 10; // Increased padding from above
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51);
  doc.text('Matrix', margin + 5, y);

  // Update total pages in all footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageFooter(doc, i, totalPages);
  }

  // Generate filename
  const rfpNumber = survey.rfpNumber || 'unknown';
  const poleId = survey.poleId || 'unknown';
  const filename = `Survey_RFP${rfpNumber}_Pole${poleId}.pdf`;
  
  // Generate PDF as blob
  const pdfBlob = doc.output('blob');
  
  return { blob: pdfBlob, filename };
}

// Generate Client PDF (with fewer fields) using jsPDF native API - Print-friendly version
async function generateClientPDFBlob(survey: Survey): Promise<{ blob: Blob; filename: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Constants - professional spacing (increased by ~37.5% + additional 10-15% + 1 more point)
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10; // Standard margin
  const contentWidth = pageWidth - (margin * 2);
  const fieldWidth = (contentWidth - 17) / 2; // 2 columns with increased gap (+1)
  let y = margin; // Start from top
  const sectionSpacing = 10; // Increased by 1 point
  const lineSpacing = 9; // Increased by 1 point
  
  // Load images
  const images: string[] = [];
  if (survey.imageUrls && survey.imageUrls.length > 0) {
    for (const url of survey.imageUrls) {
      const base64 = await loadImageAsBase64(url);
      if (base64) images.push(base64);
    }
  }

  // Add "Site Survey" heading at the top
  doc.setFontSize(19); // Increased by 1 point
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('SITE SURVEY', pageWidth / 2, y, { align: 'center' });
  y += 14; // Increased by 1 point

  // Section 1: General Information
  const section1StartY = y - 6; // Start box higher above title
  doc.setFontSize(14); // Increased by 1 point
  doc.setFont('helvetica', 'bold');
  doc.text('1. GENERAL INFORMATION', margin + 2, y); // Add padding from left
  y += 10; // Increased by 1 point
  
  const generalFields = [
    { label: 'RFP Number', value: formatValue(survey.rfpNumber), x: margin },
    { label: 'Pole ID', value: formatValue(survey.poleId), x: margin + fieldWidth + 14 },
    { label: 'Location Name', value: formatValue(survey.locationName), x: margin },
    { label: 'Police Station', value: formatValue(survey.policeStation), x: margin + fieldWidth + 14 },
    { label: 'Location Categories', value: survey.locationCategories?.join(', ') || 'N/A', x: margin },
    { label: 'Nearest Landmark', value: formatValue(survey.nearestLandmark), x: margin + fieldWidth + 14 },
  ];
  
  if (survey.latitude && survey.longitude) {
    generalFields.push({ label: 'Coordinates', value: `${survey.latitude}, ${survey.longitude}`, x: margin });
  }

  for (let i = 0; i < generalFields.length; i += 2) {
    const field1 = generalFields[i];
    const field2 = generalFields[i + 1];
    
    addSimpleField(doc, field1.x + 2, y, field1.label, field1.value, fieldWidth); // Add padding from left
    if (field2) {
      addSimpleField(doc, field2.x + 2, y, field2.label, field2.value, fieldWidth); // Add padding from left
    }
    y += lineSpacing;
  }
  
  // Draw box around Section 1 with proper padding
  const section1Height = y - section1StartY + 2; // Reduced padding at bottom
  doc.setDrawColor(200, 200, 200); // Light gray border
  doc.setLineWidth(0.5);
  doc.rect(margin, section1StartY, contentWidth, section1Height);

  y += sectionSpacing;

  // Section 2: Infrastructure Details
  const section2StartY = y - 6; // Start box higher above title
  doc.setFontSize(14); // Increased by 1 point
  doc.setFont('helvetica', 'bold');
  doc.text('2. INFRASTRUCTURE DETAILS', margin + 2, y); // Add padding from left
  y += 10; // Increased by 1 point

  const infraFields = [
    { label: 'Power Source Available', value: survey.powerSourceAvailability === true ? 'Yes' : survey.powerSourceAvailability === false ? 'No' : 'N/A', x: margin },
    { label: 'Road Type', value: formatValue(survey.roadType), x: margin + fieldWidth + 14 },
    { label: 'No. of Roads', value: formatValue(survey.noOfRoads), x: margin },
    { label: 'Pole Size', value: formatValue(survey.poleSize), x: margin + fieldWidth + 14 },
    { label: 'Cantilever Type', value: formatValue(survey.cantileverType), x: margin },
    { label: 'JB', value: formatValue(survey.jb), x: margin + fieldWidth + 14 },
  ];

  for (let i = 0; i < infraFields.length; i += 2) {
    const field1 = infraFields[i];
    const field2 = infraFields[i + 1];
    
    addSimpleField(doc, field1.x + 2, y, field1.label, field1.value, fieldWidth); // Add padding from left
    if (field2) {
      addSimpleField(doc, field2.x + 2, y, field2.label, field2.value, fieldWidth); // Add padding from left
    }
    y += lineSpacing;
  }
  
  // Draw box around Section 2 with proper padding
  const section2Height = y - section2StartY + 2; // Reduced padding at bottom
  doc.setDrawColor(200, 200, 200); // Light gray border
  doc.setLineWidth(0.5);
  doc.rect(margin, section2StartY, contentWidth, section2Height);

  y += sectionSpacing;

  // Section 3: Type of Cameras
  const section3StartY = y - 6; // Start box higher above title
  doc.setFontSize(14); // Increased by 1 point
  doc.setFont('helvetica', 'bold');
  doc.text('3. TYPE OF CAMERAS', margin + 2, y); // Add padding from left
  y += 10; // Increased by 1 point

  const cameraFields = [
    { label: 'Fixed Box Camera', value: formatValue(survey.fixedBoxCamera), x: margin },
    { label: 'PTZ', value: formatValue(survey.ptz), x: margin + fieldWidth + 14 },
    { label: 'ANPR Camera', value: formatValue(survey.anprCamera), x: margin },
    { label: 'Total Cameras', value: formatValue(survey.totalCameras), x: margin + fieldWidth + 14 },
    { label: 'PA System', value: formatValue(survey.paSystem), x: margin },
  ];

  for (let i = 0; i < cameraFields.length; i += 2) {
    const field1 = cameraFields[i];
    const field2 = cameraFields[i + 1];
    
    addSimpleField(doc, field1.x + 2, y, field1.label, field1.value, fieldWidth); // Add padding from left
    if (field2) {
      addSimpleField(doc, field2.x + 2, y, field2.label, field2.value, fieldWidth); // Add padding from left
    }
    y += lineSpacing;
  }
  
  // Draw box around Section 3 with proper padding
  const section3Height = y - section3StartY + 2; // Reduced padding at bottom
  doc.setDrawColor(200, 200, 200); // Light gray border
  doc.setLineWidth(0.5);
  doc.rect(margin, section3StartY, contentWidth, section3Height);

  y += sectionSpacing;

  // Section 4: Images
  const section4StartY = y - 6; // Start box higher above title
  doc.setFontSize(14); // Increased by 1 point
  doc.setFont('helvetica', 'bold');
  doc.text(`4. IMAGES (${images.length || 0})`, margin + 2, y); // Add padding from left
  y += 10; // Increased by 1 point

  if (images.length > 0) {
    const availableWidth = pageWidth - (margin * 2); // 194mm
    const imgGap = 12; // Professional gap between images (increased from 8mm)
    // Calculate available height - extend to near page end, leave only small space for footer
    const footerSpace = 8; // Small space for footer
    const availableHeight = pageHeight - y - footerSpace; // Use most of remaining space
    let imgWidth: number;
    let imgHeight: number;
    
    // Standard size for 3 images in a row with proper gaps - maximize height
    if (images.length <= 3) {
      // For 3 images: 3 * width + 2 * gap = availableWidth
      // So: width = (availableWidth - 2 * gap) / 3
      imgWidth = (availableWidth - 2 * imgGap) / 3;
      // Use maximum available height, maintaining aspect ratio
      const calculatedHeight = imgWidth * 0.75;
      // Use the larger of calculated height or available height (but maintain aspect ratio)
      if (calculatedHeight <= availableHeight) {
        imgHeight = calculatedHeight;
      } else {
        // If available height is more, we can make images taller
        imgHeight = availableHeight;
        imgWidth = imgHeight / 0.75;
        // Recalculate to ensure 3 still fit with gaps
        const totalWidthNeeded = 3 * imgWidth + 2 * imgGap;
        if (totalWidthNeeded > availableWidth) {
          // Adjust to fit width constraint
          imgWidth = (availableWidth - 2 * imgGap) / 3;
          imgHeight = imgWidth * 0.75;
        }
      }
    } else {
      // For more than 3 images, use 2 per row
      imgWidth = (availableWidth - imgGap) / 2;
      imgHeight = Math.min(availableHeight, imgWidth * 0.75);
    }
    
    let imgX = margin + 2; // Add padding from left
    const startY = y;
    
    for (let i = 0; i < images.length; i++) {
      // Check if we need a new row (for more than 3 images)
      if (images.length > 3 && i > 0 && i % 2 === 0) {
        imgX = margin + 2; // Add padding from left
        y = startY;
        y += imgHeight + imgGap;
      } else if (imgX + imgWidth > pageWidth - margin - 2) {
        imgX = margin + 2; // Add padding from left
        y += imgHeight + imgGap;
      }
      await addImageToPDF(doc, imgX, y, images[i], imgWidth, imgHeight);
      imgX += imgWidth + imgGap;
    }
    y += imgHeight + 2;
  }
  
  // Draw box around Section 4 (Images) with proper padding
  const section4Height = y - section4StartY + 2; // Reduced padding at bottom
  doc.setDrawColor(200, 200, 200); // Light gray border
  doc.setLineWidth(0.5);
  doc.rect(margin, section4StartY, contentWidth, section4Height);

  // Add footer (no page number, just text)
  addClientFooter(doc);

  // Generate filename
  const rfpNumber = survey.rfpNumber || 'unknown';
  const poleId = survey.poleId || 'unknown';
  const filename = `Survey_Client_RFP${rfpNumber}_Pole${poleId}.pdf`;
  
  // Generate PDF as blob
  const pdfBlob = doc.output('blob');
  
  return { blob: pdfBlob, filename };
}

// Generate Client PDFs for multiple surveys and download individually
export async function generateClientBulkPDFs(
  surveys: Survey[],
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number; failedSurveys: Array<{ rfpNumber: string; poleId: string }> }> {
  if (surveys.length === 0) {
    throw new Error('No surveys to export');
  }

  let totalSuccess = 0;
  let totalFailed = 0;
  const allFailedSurveys: Array<{ rfpNumber: string; poleId: string }> = [];

  const BATCH_SIZE = 5;
  const batches: Survey[][] = [];
  for (let i = 0; i < surveys.length; i += BATCH_SIZE) {
    batches.push(surveys.slice(i, i + BATCH_SIZE));
  }

  let completed = 0;

  for (const batch of batches) {
    const batchPromises = batch.map(async (survey) => {
      try {
        const { blob, filename } = await generateClientPDFBlob(survey);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        totalSuccess++;
      } catch (error) {
        console.error(`Error generating client PDF for survey RFP: ${survey.rfpNumber}, Pole: ${survey.poleId}:`, error);
        totalFailed++;
        allFailedSurveys.push({ rfpNumber: survey.rfpNumber || 'N/A', poleId: survey.poleId || 'N/A' });
      } finally {
        completed++;
        if (onProgress) {
          onProgress(completed, surveys.length);
        }
      }
    });

    await Promise.all(batchPromises);
  }

  return {
    success: totalSuccess,
    failed: totalFailed,
    failedSurveys: allFailedSurveys
  };
}

// Generate PDFs for multiple surveys and download individually
export async function generateBulkPDFs(
  surveys: Survey[],
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number; failedSurveys: Array<{ rfpNumber: string; poleId: string }> }> {
  if (surveys.length === 0) {
    throw new Error('No surveys to export');
  }

  let totalSuccess = 0;
  let totalFailed = 0;
  const allFailedSurveys: Array<{ rfpNumber: string; poleId: string }> = [];

  const BATCH_SIZE = 5;
  const batches: Survey[][] = [];
  for (let i = 0; i < surveys.length; i += BATCH_SIZE) {
    batches.push(surveys.slice(i, i + BATCH_SIZE));
  }

  let completed = 0;

  for (const batch of batches) {
    const batchPromises = batch.map(async (survey) => {
      try {
        const { blob, filename } = await generateSinglePDFBlob(survey);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        totalSuccess++;
      } catch (error) {
        console.error(`Error generating PDF for survey RFP: ${survey.rfpNumber}, Pole: ${survey.poleId}:`, error);
        totalFailed++;
        allFailedSurveys.push({ rfpNumber: survey.rfpNumber || 'N/A', poleId: survey.poleId || 'N/A' });
      } finally {
        completed++;
        if (onProgress) {
          onProgress(completed, surveys.length);
        }
      }
    });
    await Promise.all(batchPromises);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { success: totalSuccess, failed: totalFailed, failedSurveys: allFailedSurveys };
}
