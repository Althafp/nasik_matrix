import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import type { Survey } from '../firebase/surveys';

// Helper function to format date
const formatDate = (timestamp: any) => {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
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

// Create HTML content for a survey
async function createSurveyHTML(survey: Survey): Promise<string> {
  // Load images as base64
  let imagesHTML = '';
  if (survey.imageUrls && survey.imageUrls.length > 0) {
    const imagePromises = survey.imageUrls.map(async (url, index) => {
      const base64 = await loadImageAsBase64(url);
      if (base64) {
        return `
          <div style="margin-bottom: 20px; text-align: center;">
            <h3 style="margin-bottom: 10px; color: #333;">Image ${index + 1}</h3>
            <img src="${base64}" alt="Survey image ${index + 1}" style="max-width: 100%; max-height: 400px; border: 1px solid #ddd; border-radius: 4px;" />
          </div>
        `;
      }
      return '';
    });
    const imageElements = await Promise.all(imagePromises);
    imagesHTML = imageElements.filter(img => img).join('');
  }

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: white; max-width: 800px; margin: 0 auto;">
      <h1 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-bottom: 20px;">Survey Details</h1>
      
      <h2 style="color: #333; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">General Information</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 8px; font-weight: bold; width: 40%;">RFP Number:</td><td style="padding: 8px;">${survey.rfpNumber || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Pole ID:</td><td style="padding: 8px;">${survey.poleId || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Location Name:</td><td style="padding: 8px;">${survey.locationName || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Police Station:</td><td style="padding: 8px;">${survey.policeStation || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Location Categories:</td><td style="padding: 8px;">${survey.locationCategories?.join(', ') || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Power Substation:</td><td style="padding: 8px;">${survey.powerSubstation || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Nearest Landmark:</td><td style="padding: 8px;">${survey.nearestLandmark || 'N/A'}</td></tr>
        ${survey.latitude && survey.longitude ? `<tr><td style="padding: 8px; font-weight: bold;">Coordinates:</td><td style="padding: 8px;">${survey.latitude}, ${survey.longitude}</td></tr>` : ''}
      </table>

      <h2 style="color: #333; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Infrastructure Details</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 8px; font-weight: bold; width: 40%;">Power Source Available:</td><td style="padding: 8px;">${formatBoolean(survey.powerSourceAvailability)}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Cable Trenching (m):</td><td style="padding: 8px;">${survey.cableTrenching || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Road Type:</td><td style="padding: 8px;">${survey.roadType || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">No. of Roads:</td><td style="padding: 8px;">${survey.noOfRoads !== undefined && survey.noOfRoads !== null ? survey.noOfRoads : 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Pole Size:</td><td style="padding: 8px;">${survey.poleSize || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Cantilever Type:</td><td style="padding: 8px;">${survey.cantileverType || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Existing CCTV Pole:</td><td style="padding: 8px;">${formatBoolean(survey.existingCctvPole)}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Distance from Existing Pole (m):</td><td style="padding: 8px;">${survey.distanceFromExistingPole || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">JB:</td><td style="padding: 8px;">${survey.jb || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">No. of Cameras:</td><td style="padding: 8px;">${survey.noOfCameras !== undefined && survey.noOfCameras !== null ? survey.noOfCameras : 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">No. of Poles:</td><td style="padding: 8px;">${survey.noOfPoles !== undefined && survey.noOfPoles !== null ? survey.noOfPoles : 'N/A'}</td></tr>
      </table>

      <h2 style="color: #333; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Measurement Sheet</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 8px; font-weight: bold; width: 40%;">Power Cable (2 Core) (m):</td><td style="padding: 8px;">${survey.powerCable || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">CAT6 Cable (m):</td><td style="padding: 8px;">${survey.cat6Cable || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">IR Cable (2.5sqmm 3core) (m):</td><td style="padding: 8px;">${survey.irCable || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">HDPE Power Trenching (m):</td><td style="padding: 8px;">${survey.hdpPowerTrenching || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Road Crossing Length (m):</td><td style="padding: 8px;">${survey.roadCrossingLength || 'N/A'}</td></tr>
      </table>

      <h2 style="color: #333; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Type of Cameras</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 8px; font-weight: bold; width: 40%;">Fixed Box Camera:</td><td style="padding: 8px;">${survey.fixedBoxCamera !== undefined && survey.fixedBoxCamera !== null ? survey.fixedBoxCamera : 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">PTZ:</td><td style="padding: 8px;">${survey.ptz !== undefined && survey.ptz !== null ? survey.ptz : 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">ANPR Camera:</td><td style="padding: 8px;">${survey.anprCamera !== undefined && survey.anprCamera !== null ? survey.anprCamera : 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Total Cameras:</td><td style="padding: 8px;">${survey.totalCameras !== undefined && survey.totalCameras !== null ? survey.totalCameras : 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">PA System:</td><td style="padding: 8px;">${survey.paSystem !== undefined && survey.paSystem !== null ? survey.paSystem : 'N/A'}</td></tr>
      </table>

      <h2 style="color: #333; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Type of Analytics</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 8px; font-weight: bold; width: 40%;">Crowd Safety Options:</td><td style="padding: 8px;">${survey.crowdSafetyOptions?.join(', ') || 'None'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Investigation Options:</td><td style="padding: 8px;">${survey.investigationOptions?.join(', ') || 'None'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Public Order Options:</td><td style="padding: 8px;">${survey.publicOrderOptions?.join(', ') || 'None'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Traffic Options:</td><td style="padding: 8px;">${survey.trafficOptions?.join(', ') || 'None'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Safety Options:</td><td style="padding: 8px;">${survey.safetyOptions?.join(', ') || 'None'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">ANPR:</td><td style="padding: 8px;">${formatBoolean(survey.anpr)}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">FRS:</td><td style="padding: 8px;">${formatBoolean(survey.frs)}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Remarks:</td><td style="padding: 8px;">${survey.remarks || 'N/A'}</td></tr>
      </table>

      <h2 style="color: #333; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">PARENT POLE FOR POWER SOURCE</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 8px; font-weight: bold; width: 40%;">Parent pole ID:</td><td style="padding: 8px;">${survey.parentPoleId || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Parent pole distance:</td><td style="padding: 8px;">${survey.parentPoleDistance || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Road crossing length from parent pole:</td><td style="padding: 8px;">${survey.parentPoleRoadCrossing || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Parent road type:</td><td style="padding: 8px;">${survey.parentPoleRoadType || 'N/A'}</td></tr>
      </table>

      <h2 style="color: #333; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Metadata</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 8px; font-weight: bold; width: 40%;">Submitted By:</td><td style="padding: 8px;">${survey.userName || survey.userPhone || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">User Phone:</td><td style="padding: 8px;">${survey.userPhone || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Created At:</td><td style="padding: 8px;">${formatDate(survey.createdAt)}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Updated At:</td><td style="padding: 8px;">${formatDate(survey.updatedAt)}</td></tr>
      </table>

      ${survey.imageUrls && survey.imageUrls.length > 0 ? `
      <h2 style="color: #333; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Images (${survey.imageUrls.length})</h2>
      <div style="margin-bottom: 20px;">
        ${imagesHTML}
      </div>
      ` : ''}
    </div>
  `;
}

// Generate PDF for a single survey and return as blob
async function generateSinglePDFBlob(survey: Survey): Promise<{ blob: Blob; filename: string }> {
  // Create a temporary container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.backgroundColor = 'white';
  
  // Generate HTML with images loaded as base64
  container.innerHTML = await createSurveyHTML(survey);
  document.body.appendChild(container);

  try {
    // Wait for all images to be fully loaded
    const images = container.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // Continue even if image fails
          setTimeout(resolve, 5000); // Timeout after 5 seconds
        });
      })
    );
    
    // Additional wait to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Capture the content
    const canvas = await html2canvas(container, {
      useCORS: true,
      allowTaint: false, // Changed to false since we're using base64
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality for better PDF
      logging: false,
      width: container.scrollWidth,
      height: container.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    
    // PDF dimensions (A4)
    const pdfWidth = 210; // A4 width in mm
    const pdfHeight = 297; // A4 height in mm
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Calculate scaling
    const ratio = pdfWidth / (imgWidth * 0.264583);
    const scaledHeight = (imgHeight * 0.264583) * ratio;
    
    // Create PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let heightLeft = scaledHeight;
    let position = 0;
    
    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight, undefined, 'FAST');
    
    while (heightLeft > pdfHeight) {
      position -= pdfHeight;
      heightLeft -= pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight, undefined, 'FAST');
    }
    
    // Generate filename
    const rfpNumber = survey.rfpNumber || 'unknown';
    const poleId = survey.poleId || 'unknown';
    const filename = `Survey_RFP${rfpNumber}_Pole${poleId}.pdf`;
    
    // Generate PDF as blob instead of downloading
    const pdfBlob = doc.output('blob');
    
    return { blob: pdfBlob, filename };
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}

// Generate PDFs for multiple surveys and download as ZIP
export async function generateBulkPDFs(
  surveys: Survey[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (surveys.length === 0) {
    throw new Error('No surveys to export');
  }

  const zip = new JSZip();
  const pdfsFolder = zip.folder('surveys');

  if (!pdfsFolder) {
    throw new Error('Failed to create zip folder');
  }

  for (let i = 0; i < surveys.length; i++) {
    try {
      if (onProgress) {
        onProgress(i + 1, surveys.length);
      }
      
      const { blob, filename } = await generateSinglePDFBlob(surveys[i]);
      pdfsFolder.file(filename, blob);
    } catch (error) {
      console.error(`Error generating PDF for survey ${i + 1}:`, error);
      // Continue with next survey even if one fails
    }
  }

  // Generate zip file
  if (onProgress) {
    onProgress(surveys.length, surveys.length);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  // Download the zip file
  const url = window.URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  link.download = `Surveys_Bulk_${dateStr}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

