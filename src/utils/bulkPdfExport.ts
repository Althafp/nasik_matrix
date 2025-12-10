import jsPDF from 'jspdf';
import type { Survey } from '../firebase/surveys';

// Helper function to load image as base64
async function loadImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
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
  doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, 105, 295, { align: 'center' });
  doc.setTextColor(0, 0, 0);
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
    const imgWidth = 60;
    const imgHeight = 40; // Reduced from 45
    const imgGap = 8; // Reduced from 10
    let imgX = margin;
    
    for (let i = 0; i < images.length; i++) {
      if (imgX + imgWidth > pageWidth - margin) {
        checkNewPage(50);
        imgX = margin;
        y += 45;
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

// Generate Client PDF (with fewer fields) using jsPDF native API
async function generateClientPDFBlob(survey: Survey): Promise<{ blob: Blob; filename: string }> {
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
    if (y + requiredHeight > pageHeight - margin - 8) {
      addPageFooter(doc, doc.getNumberOfPages(), 0);
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

  // Section 1: General Information (REMOVED: Power Substation)
  checkNewPage(10);
  y += addSectionTitle(doc, y, '1. GENERAL INFORMATION');
  y += 2;
  
  const generalFields = [
    { label: 'RFP Number', value: formatValue(survey.rfpNumber), x: margin },
    { label: 'Pole ID', value: formatValue(survey.poleId), x: margin + fieldWidth + 10 },
    { label: 'Location Name', value: formatValue(survey.locationName), x: margin },
    { label: 'Police Station', value: formatValue(survey.policeStation), x: margin + fieldWidth + 10 },
    { label: 'Location Categories', value: survey.locationCategories?.join(', ') || 'N/A', x: margin },
    { label: 'Nearest Landmark', value: formatValue(survey.nearestLandmark), x: margin + fieldWidth + 10 },
  ];
  
  if (survey.latitude && survey.longitude) {
    generalFields.push({ label: 'Coordinates', value: `${survey.latitude}, ${survey.longitude}`, x: margin });
  }

  for (let i = 0; i < generalFields.length; i += 2) {
    checkNewPage(12);
    const field1 = generalFields[i];
    const field2 = generalFields[i + 1];
    
    const height1 = addField(doc, field1.x, y, field1.label, field1.value, fieldWidth);
    if (field2) {
      addField(doc, field2.x, y, field2.label, field2.value, fieldWidth);
    }
    y += Math.max(height1, 10) + 2;
  }

  y += sectionSpacing;

  // Section 2: Infrastructure Details (REMOVED: Cable Trenching, Existing CCTV Pole, Distance from Existing Pole, No. of Cameras, No. of Poles)
  checkNewPage(12);
  y += addSectionTitle(doc, y, '2. INFRASTRUCTURE DETAILS');
  y += 2;

  const infraFields = [
    { label: 'Power Source Available', value: survey.powerSourceAvailability === true ? 'Yes' : survey.powerSourceAvailability === false ? 'No' : 'N/A', x: margin },
    { label: 'Road Type', value: formatValue(survey.roadType), x: margin + fieldWidth + 10 },
    { label: 'No. of Roads', value: formatValue(survey.noOfRoads), x: margin },
    { label: 'Pole Size', value: formatValue(survey.poleSize), x: margin + fieldWidth + 10 },
    { label: 'Cantilever Type', value: formatValue(survey.cantileverType), x: margin },
    { label: 'JB', value: formatValue(survey.jb), x: margin + fieldWidth + 10 },
  ];

  for (let i = 0; i < infraFields.length; i += 2) {
    checkNewPage(12);
    const field1 = infraFields[i];
    const field2 = infraFields[i + 1];
    
    addField(doc, field1.x, y, field1.label, field1.value, fieldWidth);
    if (field2) {
      addField(doc, field2.x, y, field2.label, field2.value, fieldWidth);
    }
    y += 12;
  }

  y += sectionSpacing;

  // Section 3: Type of Cameras (REMOVED: Section 3 Measurement Sheet entirely)
  checkNewPage(12);
  y += addSectionTitle(doc, y, '3. TYPE OF CAMERAS');
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
    y += 12;
  }

  y += sectionSpacing;

  // Section 4: Parent Pole (REMOVED: Section 5 Type of Analytics entirely)
  checkNewPage(30);
  y += addSectionTitle(doc, y, '4. PARENT POLE FOR POWER SOURCE');
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
    y += 12;
  }

  y += sectionSpacing;

  // Section 5: Images
  checkNewPage(50);
  y += addSectionTitle(doc, y, `5. IMAGES (${images.length || 0})`);
  y += 3;

  if (images.length > 0) {
    const imgWidth = 60;
    const imgHeight = 40;
    const imgGap = 8;
    let imgX = margin;
    
    for (let i = 0; i < images.length; i++) {
      if (imgX + imgWidth > pageWidth - margin) {
        checkNewPage(50);
        imgX = margin;
        y += 45;
      }
      await addImageToPDF(doc, imgX, y, images[i], imgWidth, imgHeight);
      imgX += imgWidth + imgGap;
    }
    y += imgHeight + 5;
  } else {
    // White placeholder
    checkNewPage(40);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, contentWidth, 35, 2, 2, 'F');
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(1);
    doc.roundedRect(margin, y, contentWidth, 35, 2, 2);
    y += 40;
  }

  y += sectionSpacing;

  // Only "Matrix" text (REMOVED: Entire Metadata section)
  y += 15; // Increased padding from above
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
