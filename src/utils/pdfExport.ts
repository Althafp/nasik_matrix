import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generatePDF() {
  // Find the main content element to capture
  const contentElement = document.querySelector('.details-content') as HTMLElement;
  
  if (!contentElement) {
    throw new Error('Could not find content element to capture');
  }

  // Wait a bit to ensure all images are loaded
  await new Promise(resolve => setTimeout(resolve, 500));

  // Capture the entire content area as canvas
  const canvas = await html2canvas(contentElement, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    scale: 1.5, // Higher quality
    logging: false,
    width: contentElement.scrollWidth,
    height: contentElement.scrollHeight,
    windowWidth: contentElement.scrollWidth,
    windowHeight: contentElement.scrollHeight
  });

  const imgData = canvas.toDataURL('image/png');
  
  // PDF dimensions (A4)
  const pdfWidth = 210; // A4 width in mm
  const pdfHeight = 297; // A4 height in mm
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  
  // Calculate scaling to fit width
  const ratio = pdfWidth / (imgWidth * 0.264583); // Convert px to mm (1px = 0.264583mm at 96dpi)
  const scaledHeight = (imgHeight * 0.264583) * ratio;
  
  // Create PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Add image - jsPDF will handle page breaks automatically
  let heightLeft = scaledHeight;
  let position = 0;
  
  // Add first page
  doc.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight, undefined, 'FAST');
  
  // Add additional pages if needed
  while (heightLeft > pdfHeight) {
    position -= pdfHeight;
    heightLeft -= pdfHeight;
    doc.addPage();
    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight, undefined, 'FAST');
  }
  
  // Save the PDF
  doc.save(`survey-report-${Date.now()}.pdf`);
}
