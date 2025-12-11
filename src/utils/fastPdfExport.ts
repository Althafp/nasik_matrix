import jsPDF from 'jspdf';
import type { Survey } from '../firebase/surveys';

// Helper function to format date
const formatDate = (timestamp: any) => {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper function to format boolean
const formatBoolean = (value: boolean | null | undefined) => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return 'N/A';
};

// Helper to format value
const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return 'N/A';
  return String(value);
};

// Generate PDF directly using jsPDF (much faster than html2canvas)
export function generatePDFDirectly(survey: Survey, includeImages: boolean = false): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let yPos = 15;
  const pageHeight = 297;
  const margin = 15;
  const lineHeight = 7;
  const sectionSpacing = 5;

  // Helper to add new page if needed
  const checkNewPage = (requiredSpace: number = lineHeight) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Helper to add text with wrapping
  const addText = (text: string, x: number, y: number, maxWidth: number = 180) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return lines.length * lineHeight;
  };

  // Title
  doc.setFontSize(18);
  doc.setTextColor(102, 126, 234); // #667eea
  doc.setFont('helvetica', 'bold');
  doc.text('Survey Details', margin, yPos);
  yPos += 10;

  // General Information
  doc.setFontSize(14);
  doc.setTextColor(51, 51, 51);
  doc.setFont('helvetica', 'bold');
  doc.text('General Information', margin, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const generalInfo = [
    ['RFP Number:', formatValue(survey.rfpNumber)],
    ['Pole ID:', formatValue(survey.poleId)],
    ['Location Name:', formatValue(survey.locationName)],
    ['Police Station:', formatValue(survey.policeStation)],
    ['Location Categories:', survey.locationCategories?.join(', ') || 'N/A'],
    ['Power Substation:', formatValue(survey.powerSubstation)],
    ['Nearest Landmark:', formatValue(survey.nearestLandmark)],
  ];

  if (survey.latitude && survey.longitude) {
    generalInfo.push(['Coordinates:', `${survey.latitude}, ${survey.longitude}`]);
  }

  generalInfo.forEach(([label, value]) => {
    checkNewPage();
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    const height = addText(value, margin + 50, yPos, 130);
    yPos += Math.max(height, lineHeight);
  });

  yPos += sectionSpacing;

  // Infrastructure Details
  checkNewPage(10);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Infrastructure Details', margin, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const infraInfo = [
    ['Power Source Available:', formatBoolean(survey.powerSourceAvailability)],
    ['Cable Trenching (m):', formatValue(survey.cableTrenching)],
    ['Road Type:', formatValue(survey.roadType)],
    ['No. of Roads:', formatValue(survey.noOfRoads)],
    ['Pole Size:', formatValue(survey.poleSize)],
    ['Cantilever Type:', formatValue(survey.cantileverType)],
    ['Existing CCTV Pole:', formatBoolean(survey.existingCctvPole)],
    ['Distance from Existing Pole (m):', formatValue(survey.distanceFromExistingPole)],
    ['JB:', formatValue(survey.jb)],
    ['No. of Cameras:', formatValue(survey.noOfCameras)],
    ['No. of Poles:', formatValue(survey.noOfPoles)],
  ];

  infraInfo.forEach(([label, value]) => {
    checkNewPage();
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    const height = addText(value, margin + 60, yPos, 120);
    yPos += Math.max(height, lineHeight);
  });

  yPos += sectionSpacing;

  // Measurement Sheet
  checkNewPage(10);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Measurement Sheet', margin, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const measurementInfo = [
    ['Power Cable (2 Core) (m):', formatValue(survey.powerCable)],
    ['CAT6 Cable (m):', formatValue(survey.cat6Cable)],
    ['IR Cable (2.5sqmm 3core) (m):', formatValue(survey.irCable)],
    ['HDPE Power Trenching (m):', formatValue(survey.hdpPowerTrenching)],
    ['Road Crossing Length (m):', formatValue(survey.roadCrossingLength)],
  ];

  measurementInfo.forEach(([label, value]) => {
    checkNewPage();
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 70, yPos);
    yPos += lineHeight;
  });

  yPos += sectionSpacing;

  // Type of Cameras
  checkNewPage(10);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Type of Cameras', margin, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const cameraInfo = [
    ['Fixed Box Camera:', formatValue(survey.fixedBoxCamera)],
    ['PTZ:', formatValue(survey.ptz)],
    ['ANPR Camera:', formatValue(survey.anprCamera)],
    ['Total Cameras:', formatValue(survey.totalCameras)],
    ['PA System:', formatValue(survey.paSystem)],
  ];

  cameraInfo.forEach(([label, value]) => {
    checkNewPage();
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 50, yPos);
    yPos += lineHeight;
  });

  yPos += sectionSpacing;

  // Type of Analytics
  checkNewPage(10);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Type of Analytics', margin, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const analyticsInfo = [
    ['Crowd Safety Options:', survey.crowdSafetyOptions?.join(', ') || 'None'],
    ['Investigation Options:', survey.investigationOptions?.join(', ') || 'None'],
    ['Public Order Options:', survey.publicOrderOptions?.join(', ') || 'None'],
    ['Traffic Options:', survey.trafficOptions?.join(', ') || 'None'],
    ['Safety Options:', survey.safetyOptions?.join(', ') || 'None'],
    ['ANPR:', formatBoolean(survey.anpr)],
    ['FRS:', formatBoolean(survey.frs)],
    ['Remarks:', formatValue(survey.remarks)],
  ];

  analyticsInfo.forEach(([label, value]) => {
    checkNewPage();
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    const height = addText(value, margin + 50, yPos, 130);
    yPos += Math.max(height, lineHeight);
  });

  yPos += sectionSpacing;

  // Parent Pole
  checkNewPage(10);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PARENT POLE FOR POWER SOURCE', margin, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const parentPoleInfo = [
    ['Parent pole ID:', formatValue(survey.parentPoleId)],
    ['Parent pole distance:', formatValue(survey.parentPoleDistance)],
    ['Road crossing length from parent pole:', formatValue(survey.parentPoleRoadCrossing)],
    ['Parent road type:', formatValue(survey.parentPoleRoadType)],
  ];

  parentPoleInfo.forEach(([label, value]) => {
    checkNewPage();
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    const height = addText(value, margin + 60, yPos, 120);
    yPos += Math.max(height, lineHeight);
  });

  yPos += sectionSpacing;

  // Metadata
  checkNewPage(10);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Metadata', margin, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const metadataInfo = [
    ['Submitted By:', formatValue(survey.userName || survey.userPhone)],
    ['User Phone:', formatValue(survey.userPhone)],
    ['Created At:', formatDate(survey.createdAt)],
    ['Updated At:', formatDate(survey.updatedAt)],
  ];

  metadataInfo.forEach(([label, value]) => {
    checkNewPage();
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 40, yPos);
    yPos += lineHeight;
  });

  // Images section (if included)
  if (includeImages && survey.imageUrls && survey.imageUrls.length > 0) {
    yPos += sectionSpacing;
    checkNewPage(15);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Images (${survey.imageUrls.length})`, margin, yPos);
    yPos += 8;

    // Note: Adding images directly to PDF would require async operations
    // For now, we'll just note that images exist
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    survey.imageUrls.forEach((url, index) => {
      checkNewPage();
      doc.text(`Image ${index + 1}: ${url}`, margin, yPos);
      yPos += lineHeight;
    });
  }

  return doc.output('blob');
}



