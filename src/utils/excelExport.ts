import ExcelJS from 'exceljs';
import type { Survey } from '../firebase/surveys';

export async function exportSurveysToExcel(surveys: Survey[], filename: string = 'surveys.xlsx') {
  const workbook = new ExcelJS.Workbook();
  
  // Create main data sheet
  const dataSheet = workbook.addWorksheet('Survey Data');
  
  // Define columns
  dataSheet.columns = [
    { header: 'S.No', key: 'sno', width: 8 },
    { header: 'RFP #', key: 'rfpNumber', width: 12 },
    { header: 'Pole ID', key: 'poleId', width: 12 },
    { header: 'Location', key: 'locationName', width: 20 },
    { header: 'Police Station', key: 'policeStation', width: 18 },
    { header: 'User', key: 'userName', width: 15 },
    { header: 'Phone', key: 'userPhone', width: 15 },
    { header: 'Location Category', key: 'locationCategories', width: 25 },
    { header: 'Power Substation', key: 'powerSubstation', width: 18 },
    { header: 'Landmark', key: 'nearestLandmark', width: 20 },
    { header: 'Lat', key: 'latitude', width: 12 },
    { header: 'Long', key: 'longitude', width: 12 },
    { header: 'Power Availability', key: 'powerSourceAvailability', width: 18 },
    { header: 'Cable Trenching (m)', key: 'cableTrenching', width: 20 },
    { header: 'Road Type', key: 'roadType', width: 15 },
    { header: 'No. of Roads', key: 'noOfRoads', width: 15 },
    { header: 'Pole Size', key: 'poleSize', width: 12 },
    { header: 'Cantilever', key: 'cantileverType', width: 12 },
    { header: 'Exist CCTV', key: 'existingCctvPole', width: 15 },
    { header: 'Distance from pole to existing pole', key: 'distanceFromExistingPole', width: 35 },
    { header: 'JB', key: 'jb', width: 15 },
    { header: 'No. of cameras', key: 'noOfCameras', width: 15 },
    { header: 'Fixed Box Camera', key: 'fixedBoxCamera', width: 18 },
    { header: 'No. of poles', key: 'noOfPoles', width: 15 },
    { header: '2 core power cable from pole to power DB', key: 'powerCable', width: 40 },
    { header: 'CAT6 cable camera to JB', key: 'cat6Cable', width: 25 },
    { header: '2.5sqmm 3core Cable for IR JB to IR', key: 'irCable', width: 35 },
    { header: 'Power trenching & HDPE', key: 'hdpPowerTrenching', width: 25 },
    { header: 'Length of road crossing', key: 'roadCrossingLength', width: 25 },
    { header: 'PTZ', key: 'ptz', width: 10 },
    { header: 'ANPR', key: 'anprCamera', width: 10 },
    { header: 'Total Cams', key: 'totalCameras', width: 12 },
    { header: 'PA System', key: 'paSystem', width: 12 },
    { header: 'Crowd Safety and movement', key: 'crowdSafetyOptions', width: 30 },
    { header: 'Investigation & search', key: 'investigationOptions', width: 25 },
    { header: 'Public order and perimeter protection', key: 'publicOrderOptions', width: 35 },
    { header: 'Traffic and road safety', key: 'trafficOptions', width: 25 },
    { header: 'Safety environment', key: 'safetyOptions', width: 20 },
    { header: 'ANPR Analytics', key: 'anpr', width: 15 },
    { header: 'FRS', key: 'frs', width: 10 },
    { header: 'Remarks', key: 'remarks', width: 30 },
    { header: 'Parent pole ID', key: 'parentPoleId', width: 18 },
    { header: 'Parent pole distance', key: 'parentPoleDistance', width: 22 },
    { header: 'Road crossing length from parent pole', key: 'parentPoleRoadCrossing', width: 35 },
    { header: 'Parent road type', key: 'parentPoleRoadType', width: 18 },
    { header: 'Image 1 URL', key: 'image1', width: 50 },
    { header: 'Image 2 URL', key: 'image2', width: 50 },
    { header: 'Image 3 URL', key: 'image3', width: 50 },
    { header: 'Submitted', key: 'createdAt', width: 20 },
  ];

  // Style header row
  dataSheet.getRow(1).font = { bold: true, size: 11 };
  dataSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF667EEA' }
  };
  dataSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  dataSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Helper functions
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatBoolean = (value: boolean | null | undefined) => {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return ''; // Blank instead of N/A
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '';
    return String(value);
  };

  // Add data rows
  surveys.forEach((survey, index) => {

    dataSheet.addRow({
      sno: index + 1,
      rfpNumber: formatValue(survey.rfpNumber),
      poleId: formatValue(survey.poleId),
      locationName: formatValue(survey.locationName),
      policeStation: formatValue(survey.policeStation),
      userName: formatValue(survey.userName),
      userPhone: formatValue(survey.userPhone),
      locationCategories: survey.locationCategories?.join(', ') || '',
      powerSubstation: formatValue(survey.powerSubstation),
      nearestLandmark: formatValue(survey.nearestLandmark),
      latitude: formatValue(survey.latitude),
      longitude: formatValue(survey.longitude),
      powerSourceAvailability: formatBoolean(survey.powerSourceAvailability),
      cableTrenching: formatValue(survey.cableTrenching),
      roadType: formatValue(survey.roadType),
      noOfRoads: formatValue(survey.noOfRoads),
      poleSize: formatValue(survey.poleSize),
      cantileverType: formatValue(survey.cantileverType),
      existingCctvPole: formatBoolean(survey.existingCctvPole),
      distanceFromExistingPole: formatValue(survey.distanceFromExistingPole),
      jb: formatValue(survey.jb),
      noOfCameras: survey.noOfCameras || 0,
      fixedBoxCamera: survey.fixedBoxCamera || 0,
      noOfPoles: formatValue(survey.noOfPoles),
      powerCable: formatValue(survey.powerCable),
      cat6Cable: formatValue(survey.cat6Cable),
      irCable: formatValue(survey.irCable),
      hdpPowerTrenching: formatValue(survey.hdpPowerTrenching),
      roadCrossingLength: formatValue(survey.roadCrossingLength),
      ptz: survey.ptz || 0,
      anprCamera: survey.anprCamera || 0,
      totalCameras: survey.totalCameras || survey.noOfCameras || 0,
      paSystem: survey.paSystem || 0,
      crowdSafetyOptions: survey.crowdSafetyOptions?.join(', ') || '',
      investigationOptions: survey.investigationOptions?.join(', ') || '',
      publicOrderOptions: survey.publicOrderOptions?.join(', ') || '',
      trafficOptions: survey.trafficOptions?.join(', ') || '',
      safetyOptions: survey.safetyOptions?.join(', ') || '',
      anpr: formatBoolean(survey.anpr),
      frs: formatBoolean(survey.frs),
      remarks: formatValue(survey.remarks),
      parentPoleId: formatValue(survey.parentPoleId),
      parentPoleDistance: formatValue(survey.parentPoleDistance),
      parentPoleRoadCrossing: formatValue(survey.parentPoleRoadCrossing),
      parentPoleRoadType: formatValue(survey.parentPoleRoadType),
      image1: survey.imageUrls?.[0] || '',
      image2: survey.imageUrls?.[1] || '',
      image3: survey.imageUrls?.[2] || '',
      createdAt: formatDate(survey.createdAt),
    });
  });

  // Make image URLs clickable hyperlinks
  surveys.forEach((survey, index) => {
    const row = dataSheet.getRow(index + 2); // +2 because row 1 is header
    
    // Image 1 - find column by key
    if (survey.imageUrls?.[0]) {
      const image1Cell = row.getCell('image1');
      image1Cell.value = {
        text: survey.imageUrls[0],
        hyperlink: survey.imageUrls[0],
      };
      image1Cell.font = { color: { argb: 'FF0000FF' }, underline: true };
    }
    
    // Image 2
    if (survey.imageUrls?.[1]) {
      const image2Cell = row.getCell('image2');
      image2Cell.value = {
        text: survey.imageUrls[1],
        hyperlink: survey.imageUrls[1],
      };
      image2Cell.font = { color: { argb: 'FF0000FF' }, underline: true };
    }
    
    // Image 3
    if (survey.imageUrls?.[2]) {
      const image3Cell = row.getCell('image3');
      image3Cell.value = {
        text: survey.imageUrls[2],
        hyperlink: survey.imageUrls[2],
      };
      image3Cell.font = { color: { argb: 'FF0000FF' }, underline: true };
    }
  });

  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  
  // Download file
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

