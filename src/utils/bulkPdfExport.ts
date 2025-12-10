import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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


// Helper function to load image as base64 (with size optimization for speed)
async function loadImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url, { 
      mode: 'cors',
      cache: 'default'
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch image: ${url}, status: ${response.status}`);
      return '';
    }
    
    const blob = await response.blob();
    
    // Create a canvas to resize/compress the image for better PDF quality
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          // Resize image to max 1000px width for good quality while keeping file size reasonable
          const maxWidth = 1000;
          const maxHeight = 800;
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Use JPEG with good quality (0.85) for better image quality in PDF
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            resolve(compressed);
          } else {
            resolve(reader.result as string);
          }
        };
        img.onerror = () => {
          console.warn(`Failed to load image: ${url}`);
          resolve(''); // Return empty string if image fails to load
        };
        img.src = reader.result as string;
      };
      reader.onerror = () => {
        console.warn(`Failed to read image blob: ${url}`);
        resolve('');
      };
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
          <div style="border-radius: 8px; overflow: hidden; border: 2px solid #e0e0e0; background: #f5f5f5; page-break-inside: avoid;">
            <img src="${base64}" alt="Survey image ${index + 1}" style="width: 100%; height: auto; display: block;" />
          </div>
        `;
      }
      return '';
    });
    const imageElements = await Promise.all(imagePromises);
    imagesHTML = imageElements.filter(img => img).join('');
  }

  const currentDate = new Date().toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 0; background: white; max-width: 800px; margin: 0 auto;">
      <!-- Professional Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 40px; margin-bottom: 30px;">
        <div style="text-align: center;">
          <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">SITE SURVEY REPORT</h1>
          <div style="height: 2px; background: rgba(255,255,255,0.3); margin: 15px 0;"></div>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.95;">CCTV Infrastructure Survey Documentation</p>
        </div>
      </div>

      <!-- Document Info Box -->
      <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 0 40px 30px 40px; border-radius: 4px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 12px; font-weight: 600; color: #2c3e50; width: 35%;">Report Date:</td>
            <td style="padding: 8px 12px; color: #34495e;">${currentDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 600; color: #2c3e50;">RFP Number:</td>
            <td style="padding: 8px 12px; color: #34495e; font-weight: 600;">${survey.rfpNumber || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 600; color: #2c3e50;">Pole ID:</td>
            <td style="padding: 8px 12px; color: #34495e; font-weight: 600;">${survey.poleId || 'N/A'}</td>
          </tr>
        </table>
      </div>
      
      <!-- Section 1: General Information -->
      <div style="margin: 0 40px 30px 40px; page-break-inside: avoid;">
        <h2 style="color: #333; font-size: 20px; font-weight: 600; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #667eea;">General Information</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">RFP Number:</span>
            <span style="color: #333; font-size: 14px; font-weight: 600;">${survey.rfpNumber || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Pole ID:</span>
            <span style="color: #333; font-size: 14px; font-weight: 600;">${survey.poleId || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Location Name:</span>
            <span style="color: #333; font-size: 14px;">${survey.locationName || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Police Station:</span>
            <span style="color: #333; font-size: 14px;">${survey.policeStation || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Location Categories:</span>
            <span style="color: #333; font-size: 14px;">${survey.locationCategories?.join(', ') || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Power Substation:</span>
            <span style="color: #333; font-size: 14px;">${survey.powerSubstation || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Nearest Landmark:</span>
            <span style="color: #333; font-size: 14px;">${survey.nearestLandmark || 'N/A'}</span>
          </div>
          ${survey.latitude && survey.longitude ? `
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Coordinates:</span>
            <span style="color: #333; font-size: 14px;">${survey.latitude}, ${survey.longitude}</span>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Section 2: Infrastructure Details -->
      <div style="margin: 0 40px 30px 40px; page-break-inside: avoid;">
        <h2 style="color: #333; font-size: 20px; font-weight: 600; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #667eea;">Infrastructure Details</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Power Source Available:</span>
            <span style="color: #333; font-size: 14px;">
              ${survey.powerSourceAvailability === true ? '<span style="padding: 4px 8px; background: #d4edda; color: #155724; border-radius: 4px; font-weight: 600;">Yes</span>' : 
                survey.powerSourceAvailability === false ? '<span style="padding: 4px 8px; background: #f8d7da; color: #721c24; border-radius: 4px; font-weight: 600;">No</span>' : 'N/A'}
            </span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Cable Trenching (m):</span>
            <span style="color: #333; font-size: 14px;">${survey.cableTrenching || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Road Type:</span>
            <span style="color: #333; font-size: 14px;">${survey.roadType || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">No. of Roads:</span>
            <span style="color: #333; font-size: 14px;">${survey.noOfRoads !== undefined && survey.noOfRoads !== null ? survey.noOfRoads : 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Pole Size:</span>
            <span style="color: #333; font-size: 14px;">${survey.poleSize || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Cantilever Type:</span>
            <span style="color: #333; font-size: 14px;">${survey.cantileverType || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Existing CCTV Pole:</span>
            <span style="color: #333; font-size: 14px;">
              ${survey.existingCctvPole === true ? '<span style="padding: 4px 8px; background: #d4edda; color: #155724; border-radius: 4px; font-weight: 600;">Yes</span>' : 
                survey.existingCctvPole === false ? '<span style="padding: 4px 8px; background: #f8d7da; color: #721c24; border-radius: 4px; font-weight: 600;">No</span>' : 'N/A'}
            </span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Distance from Existing Pole (m):</span>
            <span style="color: #333; font-size: 14px;">${survey.distanceFromExistingPole || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">JB:</span>
            <span style="color: #333; font-size: 14px;">${survey.jb || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">No. of Cameras:</span>
            <span style="color: #667eea; font-size: 16px; font-weight: 600;">${survey.noOfCameras !== undefined && survey.noOfCameras !== null ? survey.noOfCameras : 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">No. of Poles:</span>
            <span style="color: #667eea; font-size: 16px; font-weight: 600;">${survey.noOfPoles !== undefined && survey.noOfPoles !== null ? survey.noOfPoles : 'N/A'}</span>
          </div>
        </div>
      </div>


      <!-- Section 5: Type of Analytics -->
      <div style="margin: 0 40px 30px 40px; page-break-inside: avoid;">
        <h2 style="color: #333; font-size: 20px; font-weight: 600; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #667eea;">Type of Analytics</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Crowd Safety Options:</span>
            <span style="color: #333; font-size: 14px;">${survey.crowdSafetyOptions?.join(', ') || 'None'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Investigation Options:</span>
            <span style="color: #333; font-size: 14px;">${survey.investigationOptions?.join(', ') || 'None'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Public Order Options:</span>
            <span style="color: #333; font-size: 14px;">${survey.publicOrderOptions?.join(', ') || 'None'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Traffic Options:</span>
            <span style="color: #333; font-size: 14px;">${survey.trafficOptions?.join(', ') || 'None'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Safety Options:</span>
            <span style="color: #333; font-size: 14px;">${survey.safetyOptions?.join(', ') || 'None'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">ANPR:</span>
            <span style="color: #333; font-size: 14px;">
              ${survey.anpr === true ? '<span style="padding: 4px 8px; background: #d4edda; color: #155724; border-radius: 4px; font-weight: 600;">Yes</span>' : 
                survey.anpr === false ? '<span style="padding: 4px 8px; background: #f8d7da; color: #721c24; border-radius: 4px; font-weight: 600;">No</span>' : 'N/A'}
            </span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">FRS:</span>
            <span style="color: #333; font-size: 14px;">
              ${survey.frs === true ? '<span style="padding: 4px 8px; background: #d4edda; color: #155724; border-radius: 4px; font-weight: 600;">Yes</span>' : 
                survey.frs === false ? '<span style="padding: 4px 8px; background: #f8d7da; color: #721c24; border-radius: 4px; font-weight: 600;">No</span>' : 'N/A'}
            </span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px; grid-column: 1 / -1;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Remarks:</span>
            <span style="color: #333; font-size: 14px;">${survey.remarks || 'N/A'}</span>
          </div>
        </div>
      </div>

      <!-- Section 6: Parent Pole -->
      <div style="margin: 0 40px 30px 40px; page-break-inside: avoid;">
        <h2 style="color: #333; font-size: 20px; font-weight: 600; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #667eea;">PARENT POLE FOR POWER SOURCE</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Parent pole ID:</span>
            <span style="color: #333; font-size: 14px;">${survey.parentPoleId || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Parent pole distance:</span>
            <span style="color: #333; font-size: 14px;">${survey.parentPoleDistance || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Road crossing length from parent pole:</span>
            <span style="color: #333; font-size: 14px;">${survey.parentPoleRoadCrossing || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Parent road type:</span>
            <span style="color: #333; font-size: 14px;">${survey.parentPoleRoadType || 'N/A'}</span>
          </div>
        </div>
      </div>

      ${survey.imageUrls && survey.imageUrls.length > 0 ? `
      <!-- Section 7: Images -->
      <div style="margin: 0 40px 30px 40px; page-break-inside: avoid;">
        <h2 style="color: #333; font-size: 20px; font-weight: 600; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #667eea;">Images (${survey.imageUrls.length})</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
          ${imagesHTML}
        </div>
      </div>
      ` : ''}

      <!-- Section 8: Metadata -->
      <div style="margin: 0 40px 30px 40px; page-break-inside: avoid;">
        <h2 style="color: #333; font-size: 20px; font-weight: 600; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #667eea;">Metadata</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Submitted By:</span>
            <span style="color: #333; font-size: 14px;">${survey.userName || survey.userPhone || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">User Phone:</span>
            <span style="color: #333; font-size: 14px;">${survey.userPhone || 'N/A'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Created At:</span>
            <span style="color: #333; font-size: 14px;">${formatDate(survey.createdAt)}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <span style="color: #666; font-size: 13px; font-weight: 500;">Updated At:</span>
            <span style="color: #333; font-size: 14px;">${formatDate(survey.updatedAt)}</span>
          </div>
        </div>
      </div>
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
    // Wait for all images to be fully loaded (increased timeout for reliability)
    const images = container.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map((img) => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve(undefined);
        return new Promise<void>((resolve) => {
          let resolved = false;
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              console.warn(`Image load timeout for survey RFP: ${survey.rfpNumber}, Pole: ${survey.poleId}`);
              resolve(undefined); // Continue even if image fails
            }
          }, 5000); // Increased to 5 seconds for better reliability
          
          img.onload = () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              resolve(undefined);
            }
          };
          img.onerror = () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              console.warn(`Image load error for survey RFP: ${survey.rfpNumber}, Pole: ${survey.poleId}`);
              resolve(undefined); // Continue even if image fails
            }
          };
        });
      })
    );
    
    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Capture the content with good quality scale
    const canvas = await html2canvas(container, {
      useCORS: true,
      allowTaint: false, // Using base64, so no taint
      backgroundColor: '#ffffff',
      scale: 1.5, // Increased for better quality while still being reasonable
      logging: false,
      width: container.scrollWidth,
      height: container.scrollHeight,
      onclone: (clonedDoc) => {
        // Ensure images are visible in cloned document
        const clonedContainer = clonedDoc.querySelector('div');
        if (clonedContainer) {
          const clonedImages = clonedContainer.querySelectorAll('img');
          clonedImages.forEach((img) => {
            if (img.src && !img.complete) {
              // Force reload if not complete
              const newImg = new Image();
              newImg.src = img.src;
            }
          });
        }
      }
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
  } catch (error) {
    console.error(`Error generating PDF for survey RFP: ${survey.rfpNumber}, Pole: ${survey.poleId}:`, error);
    throw error; // Re-throw to be handled by caller
  } finally {
    // Clean up
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
}

// Helper function to download a single PDF file
function downloadPDF(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Generate PDFs for multiple surveys and download individually (WITH IMAGES)
// Downloads each PDF as it's generated, with small delays between downloads
// Returns number of successfully generated PDFs
export async function generateBulkPDFs(
  surveys: Survey[],
  onProgress?: (current: number, total: number, batchNumber?: number, totalBatches?: number) => void
): Promise<{ success: number; failed: number; failedSurveys: Array<{ rfpNumber: string; poleId: string }> }> {
  if (surveys.length === 0) {
    throw new Error('No surveys to export');
  }

  let totalCompleted = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  const allFailedSurveys: Array<{ rfpNumber: string; poleId: string }> = [];

  // Process PDFs in smaller sub-batches for parallel processing (3 at a time to avoid too many simultaneous downloads)
  const SUB_BATCH_SIZE = 3;
  const subBatches: Survey[][] = [];
  for (let i = 0; i < surveys.length; i += SUB_BATCH_SIZE) {
    subBatches.push(surveys.slice(i, i + SUB_BATCH_SIZE));
  }

  // Process sub-batches sequentially, but PDFs within each sub-batch in parallel
  for (let subBatchIndex = 0; subBatchIndex < subBatches.length; subBatchIndex++) {
    const subBatch = subBatches[subBatchIndex];
    const subBatchPromises = subBatch.map(async (survey, indexInBatch) => {
      try {
        // Always use html2canvas method to include images
        const result = await generateSinglePDFBlob(survey);
        
        // Download the PDF immediately
        downloadPDF(result.blob, result.filename);
        
        // Small delay between downloads in the same sub-batch to avoid browser blocking
        if (indexInBatch < subBatch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        totalCompleted++;
        totalSuccess++;
        if (onProgress) {
          onProgress(totalCompleted, surveys.length);
        }
      } catch (error) {
        console.error(`Error generating PDF for survey RFP: ${survey.rfpNumber}, Pole: ${survey.poleId}:`, error);
        allFailedSurveys.push({ 
          rfpNumber: String(survey.rfpNumber || 'unknown'), 
          poleId: String(survey.poleId || 'unknown') 
        });
        totalCompleted++;
        totalFailed++;
        if (onProgress) {
          onProgress(totalCompleted, surveys.length);
        }
      }
    });

    // Wait for current sub-batch to complete before starting next
    await Promise.all(subBatchPromises);
    
    // Small delay between sub-batches to ensure browser processes downloads
    if (subBatchIndex < subBatches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Final progress update
  if (onProgress) {
    onProgress(surveys.length, surveys.length);
  }

  return {
    success: totalSuccess,
    failed: totalFailed,
    failedSurveys: allFailedSurveys
  };
}

