import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Survey, CollectionType } from '../firebase/surveys';
import { getUserSurveys, getAllSurveys } from '../firebase/surveys';
import { exportSurveysToExcel } from '../utils/excelExport';
import { generateBulkPDFs, generateClientBulkPDFs } from '../utils/bulkPdfExport';
import './Dashboard.css';

type Section = 'all' | 'my';
type ViewMode = 'normal' | 'tabular';

export default function Dashboard() {
  const { user, signOut, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [allSurveys, setAllSurveys] = useState<Survey[]>([]);
  const [mySurveys, setMySurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<Section>(isAdmin ? 'all' : 'my');
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [exporting, setExporting] = useState(false);
  const [exportingPDFs, setExportingPDFs] = useState(false);
  const [exportingClientPDFs, setExportingClientPDFs] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const [clientPdfProgress, setClientPdfProgress] = useState({ current: 0, total: 0 });
  const [searchRfp, setSearchRfp] = useState('');
  const [searchPoliceStation, setSearchPoliceStation] = useState('');
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(40);
  const [rangeStartInput, setRangeStartInput] = useState<string>('1');
  const [rangeEndInput, setRangeEndInput] = useState<string>('40');
  const [collectionType, setCollectionType] = useState<CollectionType>('surveys');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      loadSurveys();
    }
  }, [user, authLoading, navigate, collectionType]);

  const loadSurveys = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      // Always load all surveys for admins, and user surveys for regular users
      if (isAdmin) {
        const all = await getAllSurveys(collectionType);
        console.log(`[Dashboard] Loaded ${all.length} surveys from ${collectionType} (all)`);
        setAllSurveys(all);
        // Also load user's own surveys
        const my = await getUserSurveys(user.id, collectionType);
        console.log(`[Dashboard] Loaded ${my.length} surveys from ${collectionType} (my)`);
        setMySurveys(my);
      } else {
        const my = await getUserSurveys(user.id, collectionType);
        console.log(`[Dashboard] Loaded ${my.length} surveys from ${collectionType} (my)`);
        setMySurveys(my);
        // Regular users can also see all surveys
        const all = await getAllSurveys(collectionType);
        console.log(`[Dashboard] Loaded ${all.length} surveys from ${collectionType} (all)`);
        setAllSurveys(all);
        
        // If "My Surveys" has data but "All Surveys" is empty, it might be an index issue
        if (my.length > 0 && all.length === 0 && collectionType === 'surveys2') {
          setError('Collection group query may require a Firestore index. Please check the browser console for details.');
        }
      }
    } catch (err: any) {
      console.error('[Dashboard] Error loading surveys:', err);
      if (err?.code === 'failed-precondition' || err?.message?.includes('index')) {
        setError(`Firestore index required for '${collectionType}' collection group query. Please create an index in Firebase Console > Firestore > Indexes.`);
      } else {
        setError(err.message || 'Failed to load surveys');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter surveys based on search
  const filteredSurveys = (activeSection === 'all' ? allSurveys : mySurveys).filter(survey => {
    const matchesRfp = !searchRfp || 
      (survey.rfpNumber && String(survey.rfpNumber).toLowerCase().includes(searchRfp.toLowerCase()));
    const matchesPoliceStation = !searchPoliceStation || 
      (survey.policeStation && survey.policeStation.toLowerCase().includes(searchPoliceStation.toLowerCase()));
    return matchesRfp && matchesPoliceStation;
  });

  const currentSurveys = filteredSurveys;

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  const handleExportExcel = async () => {
    if (currentSurveys.length === 0) {
      alert('No surveys to export');
      return;
    }

    setExporting(true);
    try {
      const sectionName = activeSection === 'all' ? 'All Surveys' : 'My Surveys';
      const filename = `${sectionName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      await exportSurveysToExcel(currentSurveys, filename);
    } catch (error: any) {
      console.error('Export error:', error);
      alert('Failed to export Excel file: ' + (error.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const handleBulkDownloadPDFs = () => {
    if (currentSurveys.length === 0) {
      alert('No surveys to export');
      return;
    }
    // Set empty defaults so user can type custom range
    setRangeStart(1);
    setRangeEnd(1);
    setRangeStartInput('');
    setRangeEndInput('');
    setShowRangeModal(true);
  };

  const handleClientBulkDownloadPDFs = () => {
    if (currentSurveys.length === 0) {
      alert('No surveys to export');
      return;
    }
    // Set empty defaults so user can type custom range
    setRangeStart(1);
    setRangeEnd(1);
    setRangeStartInput('');
    setRangeEndInput('');
    setShowRangeModal(true);
    // Set a flag to indicate this is for client PDFs
    (window as any).__isClientPDF = true;
  };

  const handleRangeDownload = async () => {
    // Parse and validate the input values
    const startVal = parseInt(rangeStartInput) || 0;
    const endVal = parseInt(rangeEndInput) || 0;
    
    // Validate range
    if (!rangeStartInput || !rangeEndInput || startVal < 1 || endVal < startVal || startVal > currentSurveys.length || endVal > currentSurveys.length) {
      alert(`Invalid range! Please enter a valid range between 1 and ${currentSurveys.length}`);
      return;
    }
    
    // Update the actual range values
    setRangeStart(startVal);
    setRangeEnd(endVal);

    // Get surveys in the selected range (1-based index, so subtract 1 for array index)
    // slice(start, end) is exclusive of end, so slice(0, 10) gives indices 0-9 (10 items)
    // slice(10, 20) gives indices 10-19 (10 items) - no overlap!
    const selectedSurveys = currentSurveys.slice(startVal - 1, endVal);
    
    if (selectedSurveys.length === 0) {
      alert('No surveys in the selected range');
      return;
    }

    // Show first and last survey details for confirmation
    const firstSurvey = selectedSurveys[0];
    const lastSurvey = selectedSurveys[selectedSurveys.length - 1];
    const confirmMessage = 
      `This will generate and download ${selectedSurveys.length} PDF file(s) WITH IMAGES.\n\n` +
      `Range: Surveys ${startVal}-${endVal} (from table S.No)\n` +
      `First: RFP ${firstSurvey.rfpNumber || 'N/A'}, Pole ${firstSurvey.poleId || 'N/A'}\n` +
      `Last: RFP ${lastSurvey.rfpNumber || 'N/A'}, Pole ${lastSurvey.poleId || 'N/A'}\n\n` +
      `Each PDF will be downloaded individually.\n\n` +
      `Note: Make sure search filters are cleared if you want to download sequential ranges.\n\n` +
      `Continue?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setShowRangeModal(false);
    
    const isClientPDF = (window as any).__isClientPDF === true;
    (window as any).__isClientPDF = false; // Reset flag
    
    if (isClientPDF) {
      setExportingClientPDFs(true);
      setClientPdfProgress({ current: 0, total: selectedSurveys.length });
    } else {
      setExportingPDFs(true);
      setPdfProgress({ current: 0, total: selectedSurveys.length });
    }
    
    try {
      // Download PDFs individually (no ZIP)
      const result = isClientPDF 
        ? await generateClientBulkPDFs(selectedSurveys, (current, total) => {
            setClientPdfProgress({ current, total });
          })
        : await generateBulkPDFs(selectedSurveys, (current, total) => {
            setPdfProgress({ current, total });
          });
      
      if (result.failed > 0) {
        alert(
          `⚠️ Generated ${result.success} PDF(s) successfully, but ${result.failed} failed.\n\n` +
          `Failed surveys: ${result.failedSurveys.map(f => `RFP ${f.rfpNumber}, Pole ${f.poleId}`).join(', ')}\n\n` +
          `Check console for details.`
        );
      } else {
        const pdfType = isClientPDF ? 'Client PDF(s)' : 'PDF(s)';
        alert(`✅ Successfully generated and downloaded ${result.success} ${pdfType} for range ${startVal}-${endVal}!`);
      }
    } catch (error: any) {
      console.error('Bulk PDF export error:', error);
      alert('Failed to generate PDFs: ' + (error.message || 'Unknown error'));
    } finally {
      setExportingPDFs(false);
      setExportingClientPDFs(false);
      setPdfProgress({ current: 0, total: 0 });
      setClientPdfProgress({ current: 0, total: 0 });
    }
  };

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

  if (authLoading || loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>Nasik Survey App</h1>
            <p className="user-info">
              {isAdmin ? 'Admin Dashboard' : 'My Surveys'} | {user?.name || user?.phoneNumber}
            </p>
          </div>
          <div className="header-buttons">
            <button onClick={() => navigate('/create-survey', { state: { collectionType } })} className="create-survey-button">
              ➕ Create Survey
            </button>
            <button onClick={handleSignOut} className="sign-out-button">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          {/* Collection Type Navigation */}
          <div className="collection-tabs" style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Collection:</label>
            <button
              className={`section-tab ${collectionType === 'surveys' ? 'active' : ''}`}
              onClick={() => setCollectionType('surveys')}
              style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer', background: collectionType === 'surveys' ? '#667eea' : '#fff', color: collectionType === 'surveys' ? '#fff' : '#333' }}
            >
              Surveys
            </button>
            <button
              className={`section-tab ${collectionType === 'surveys2' ? 'active' : ''}`}
              onClick={() => setCollectionType('surveys2')}
              style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer', background: collectionType === 'surveys2' ? '#667eea' : '#fff', color: collectionType === 'surveys2' ? '#fff' : '#333' }}
            >
              Surveys2
            </button>
          </div>

          {/* Section Navigation */}
          <div className="section-tabs">
            <button
              className={`section-tab ${activeSection === 'all' ? 'active' : ''}`}
              onClick={() => setActiveSection('all')}
            >
              All Surveys ({allSurveys.length})
            </button>
            <button
              className={`section-tab ${activeSection === 'my' ? 'active' : ''}`}
              onClick={() => setActiveSection('my')}
            >
              My Surveys ({mySurveys.length})
            </button>
          </div>

          {/* Search Section */}
          <div className="search-section">
            <div className="search-fields">
              <div className="search-field">
                <label htmlFor="search-rfp">Search RFP Number:</label>
                <input
                  type="text"
                  id="search-rfp"
                  value={searchRfp}
                  onChange={(e) => setSearchRfp(e.target.value)}
                  placeholder="Enter RFP number..."
                />
              </div>
              <div className="search-field">
                <label htmlFor="search-police-station">Search Police Station:</label>
                <input
                  type="text"
                  id="search-police-station"
                  value={searchPoliceStation}
                  onChange={(e) => setSearchPoliceStation(e.target.value)}
                  placeholder="Enter police station..."
                />
              </div>
              {(searchRfp || searchPoliceStation) && (
                <button
                  onClick={() => {
                    setSearchRfp('');
                    setSearchPoliceStation('');
                  }}
                  className="clear-search-button"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>

          {/* View Mode Toggle and Header */}
          <div className="surveys-header">
            <h2>
              {activeSection === 'all' ? 'All Surveys' : 'My Surveys'} 
              {(searchRfp || searchPoliceStation) && ` (${currentSurveys.length} found)`}
            </h2>
            <div className="header-actions">
              <div className="view-toggle">
                <button
                  className={`view-toggle-btn ${viewMode === 'normal' ? 'active' : ''}`}
                  onClick={() => setViewMode('normal')}
                  title="Card View"
                >
                  📋 Cards
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === 'tabular' ? 'active' : ''}`}
                  onClick={() => setViewMode('tabular')}
                  title="Table View"
                >
                  📊 Table
                </button>
              </div>
              <button
                onClick={handleExportExcel}
                className="export-button"
                disabled={exporting || exportingPDFs || currentSurveys.length === 0}
                title="Export to Excel"
              >
                {exporting ? '⏳ Exporting...' : '📥 Export Excel'}
              </button>
              <button
                onClick={handleBulkDownloadPDFs}
                className="export-button"
                disabled={exporting || exportingPDFs || exportingClientPDFs || currentSurveys.length === 0}
                title="Download PDFs by Range"
              >
                {exportingPDFs 
                  ? `⏳ Downloading PDFs (${pdfProgress.current}/${pdfProgress.total})...` 
                  : '📥 Download PDFs (Range)'}
              </button>
              <button
                onClick={handleClientBulkDownloadPDFs}
                className="export-button"
                disabled={exporting || exportingPDFs || exportingClientPDFs || currentSurveys.length === 0}
                title="Download Client PDFs by Range (Fewer Fields)"
              >
                {exportingClientPDFs 
                  ? `⏳ Downloading Client PDFs (${clientPdfProgress.current}/${clientPdfProgress.total})...` 
                  : '📄 Client Download PDFs (Range)'}
              </button>
              <button onClick={loadSurveys} className="refresh-button">
                Refresh
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          {currentSurveys.length === 0 ? (
            <div className="empty-state">
              <p>No surveys found.</p>
            </div>
          ) : viewMode === 'normal' ? (
            <div className="surveys-grid">
              {currentSurveys.map((survey) => (
                <div key={survey.id} className="survey-card">
                  <div className="survey-card-header">
                    <h3>{survey.locationName || 'Unnamed Location'}</h3>
                    <span className="survey-id">#{survey.rfpNumber}</span>
                  </div>

                  <div className="survey-card-body">
                    <div className="survey-info-row">
                      <span className="info-label">Pole ID:</span>
                      <span className="info-value">{survey.poleId}</span>
                    </div>
                    <div className="survey-info-row">
                      <span className="info-label">Police Station:</span>
                      <span className="info-value">{survey.policeStation}</span>
                    </div>
                    <div className="survey-info-row">
                      <span className="info-label">Location Categories:</span>
                      <span className="info-value">
                        {survey.locationCategories?.join(', ') || 'N/A'}
                      </span>
                    </div>
                    {isAdmin && (
                      <>
                        <div className="survey-info-row">
                          <span className="info-label">User:</span>
                          <span className="info-value">{survey.userName || survey.userPhone}</span>
                        </div>
                      </>
                    )}
                    <div className="survey-info-row">
                      <span className="info-label">Cameras:</span>
                      <span className="info-value">{survey.noOfCameras || 0}</span>
                    </div>
                    <div className="survey-info-row">
                      <span className="info-label">Submitted:</span>
                      <span className="info-value">{formatDate(survey.createdAt)}</span>
                    </div>
                  </div>

                  <div className="survey-card-footer">
                    {survey.imageUrls && survey.imageUrls.length > 0 && (
                      <span className="image-count">
                        📷 {survey.imageUrls.length} image(s)
                      </span>
                    )}
                    <button
                      onClick={() => navigate(`/survey/${survey.userId}/${survey.id}`, { state: { collectionType } })}
                      className="view-details-button"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-container">
              <table className="surveys-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>RFP #</th>
                    <th>Pole ID</th>
                    <th>Location</th>
                    <th>Police Station</th>
                    <th>User</th>
                    <th>Phone</th>
                    <th>Location Category</th>
                    <th>Power Substation</th>
                    <th>Landmark</th>
                    <th>Lat</th>
                    <th>Long</th>
                    <th>Power Availability</th>
                    <th>Cable Trenching (m)</th>
                    <th>Road Type</th>
                    <th>No. of Roads</th>
                    <th>Pole Size</th>
                    <th>Cantilever</th>
                    <th>Exist CCTV</th>
                    <th>Distance from pole to existing pole</th>
                    <th>JB</th>
                    <th>No. of cameras</th>
                    <th>Fixed Box Camera</th>
                    <th>No. of poles</th>
                    <th>2 core power cable from pole to power DB</th>
                    <th>CAT6 cable camera to JB</th>
                    <th>2.5sqmm 3core Cable for IR JB to IR</th>
                    <th>Power trenching & HDPE</th>
                    <th>Length of road crossing</th>
                    <th>PTZ</th>
                    <th>ANPR</th>
                    <th>Total Cams</th>
                    <th>PA System</th>
                    <th>Crowd Safety and movement</th>
                    <th>Investigation & search</th>
                    <th>Public order and perimeter protection</th>
                    <th>Traffic and road safety</th>
                    <th>Safety environment</th>
                    <th>ANPR Analytics</th>
                    <th>FRS</th>
                    <th>Remarks</th>
                    <th>Parent pole ID</th>
                    <th>Parent pole distance</th>
                    <th>Road crossing length from parent pole</th>
                    <th>Parent road type</th>
                    <th>Images</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSurveys.map((survey, index) => (
                    <tr key={survey.id}>
                      <td>{index + 1}</td>
                      <td>{survey.rfpNumber}</td>
                      <td>{survey.poleId}</td>
                      <td>{survey.locationName || 'N/A'}</td>
                      <td>{survey.policeStation}</td>
                      <td>{survey.userName || 'N/A'}</td>
                      <td>{survey.userPhone || 'N/A'}</td>
                      <td className="table-cell-wrap">
                        {survey.locationCategories?.join(', ') || 'N/A'}
                      </td>
                      <td>{survey.powerSubstation || 'N/A'}</td>
                      <td className="table-cell-wrap">{survey.nearestLandmark || 'N/A'}</td>
                      <td>{survey.latitude || 'N/A'}</td>
                      <td>{survey.longitude || 'N/A'}</td>
                      <td>
                        {survey.powerSourceAvailability === true
                          ? 'Yes'
                          : survey.powerSourceAvailability === false
                          ? 'No'
                          : 'N/A'}
                      </td>
                      <td>{survey.cableTrenching || 'N/A'}</td>
                      <td>{survey.roadType || 'N/A'}</td>
                      <td>{survey.noOfRoads || 'N/A'}</td>
                      <td>{survey.poleSize || 'N/A'}</td>
                      <td>{survey.cantileverType || 'N/A'}</td>
                      <td>
                        {survey.existingCctvPole === true
                          ? 'Yes'
                          : survey.existingCctvPole === false
                          ? 'No'
                          : 'N/A'}
                      </td>
                      <td>{survey.distanceFromExistingPole || 'N/A'}</td>
                      <td>{survey.jb || 'N/A'}</td>
                      <td>{survey.noOfCameras || 0}</td>
                      <td>{survey.fixedBoxCamera || 0}</td>
                      <td>{survey.noOfPoles || 'N/A'}</td>
                      <td>{survey.powerCable || 'N/A'}</td>
                      <td>{survey.cat6Cable || 'N/A'}</td>
                      <td>{survey.irCable || 'N/A'}</td>
                      <td>{survey.hdpPowerTrenching || 'N/A'}</td>
                      <td>{survey.roadCrossingLength || 'N/A'}</td>
                      <td>{survey.ptz || 0}</td>
                      <td>{survey.anprCamera || 0}</td>
                      <td>{survey.totalCameras || survey.noOfCameras || 0}</td>
                      <td>{survey.paSystem || 0}</td>
                      <td className="table-cell-wrap">
                        {survey.crowdSafetyOptions?.join(', ') || 'N/A'}
                      </td>
                      <td className="table-cell-wrap">
                        {survey.investigationOptions?.join(', ') || 'N/A'}
                      </td>
                      <td className="table-cell-wrap">
                        {survey.publicOrderOptions?.join(', ') || 'N/A'}
                      </td>
                      <td className="table-cell-wrap">
                        {survey.trafficOptions?.join(', ') || 'N/A'}
                      </td>
                      <td className="table-cell-wrap">
                        {survey.safetyOptions?.join(', ') || 'N/A'}
                      </td>
                      <td>
                        {survey.anpr === true
                          ? 'Yes'
                          : survey.anpr === false
                          ? 'No'
                          : 'N/A'}
                      </td>
                      <td>
                        {survey.frs === true
                          ? 'Yes'
                          : survey.frs === false
                          ? 'No'
                          : 'N/A'}
                      </td>
                      <td className="table-cell-wrap">
                        {survey.remarks ? (
                          <span title={survey.remarks}>
                            {survey.remarks.length > 30
                              ? survey.remarks.substring(0, 30) + '...'
                              : survey.remarks}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td>{survey.parentPoleId || 'N/A'}</td>
                      <td>{survey.parentPoleDistance || 'N/A'}</td>
                      <td>{survey.parentPoleRoadCrossing || 'N/A'}</td>
                      <td>{survey.parentPoleRoadType || 'N/A'}</td>
                      <td>
                        {survey.imageUrls && survey.imageUrls.length > 0 ? (
                          <div className="table-images">
                            {survey.imageUrls.slice(0, 3).map((url, imgIndex) => (
                              <img
                                key={imgIndex}
                                src={url}
                                alt={`Image ${imgIndex + 1}`}
                                className="table-image"
                                onClick={() => window.open(url, '_blank')}
                              />
                            ))}
                            {survey.imageUrls.length > 3 && (
                              <span className="more-images">+{survey.imageUrls.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          'No images'
                        )}
                      </td>
                      <td>{formatDate(survey.createdAt)}</td>
                      <td>
                        <button
                          onClick={() => navigate(`/survey/${survey.userId}/${survey.id}`, { state: { collectionType } })}
                          className="table-view-button"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Range Selection Modal */}
      {showRangeModal && (
        <div className="modal-overlay" onClick={() => setShowRangeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{(window as any).__isClientPDF ? 'Select Range for Client PDF Download' : 'Select Range for PDF Download'}</h2>
              <button className="modal-close" onClick={() => {
                setShowRangeModal(false);
                (window as any).__isClientPDF = false; // Reset flag on close
              }}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '20px', color: '#666' }}>
                Total surveys available: <strong>{currentSurveys.length}</strong>
              </p>
              <div className="range-inputs">
                <div className="range-input-group">
                  <label htmlFor="range-start">Start (1-{currentSurveys.length}):</label>
                  <input
                    type="text"
                    id="range-start"
                    inputMode="numeric"
                    value={rangeStartInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string or numbers only
                      if (value === '' || /^\d+$/.test(value)) {
                        setRangeStartInput(value);
                      }
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      const constrained = Math.max(1, Math.min(val, currentSurveys.length));
                      setRangeStart(constrained);
                      setRangeStartInput(String(constrained));
                      if (constrained > rangeEnd) {
                        const newEnd = Math.min(constrained, currentSurveys.length);
                        setRangeEnd(newEnd);
                        setRangeEndInput(String(newEnd));
                      }
                    }}
                  />
                </div>
                <div className="range-input-group">
                  <label htmlFor="range-end">End (1-{currentSurveys.length}):</label>
                  <input
                    type="text"
                    id="range-end"
                    inputMode="numeric"
                    value={rangeEndInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string or numbers only
                      if (value === '' || /^\d+$/.test(value)) {
                        setRangeEndInput(value);
                      }
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value) || rangeStart;
                      const constrained = Math.max(rangeStart, Math.min(val, currentSurveys.length));
                      setRangeEnd(constrained);
                      setRangeEndInput(String(constrained));
                    }}
                  />
                </div>
              </div>
              <div className="range-preview" style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
                {rangeStartInput && rangeEndInput ? (
                  <>
                    <strong>Selected Range:</strong> Surveys {rangeStartInput} to {rangeEndInput}
                    {(() => {
                      const start = parseInt(rangeStartInput) || 0;
                      const end = parseInt(rangeEndInput) || 0;
                      const valid = start >= 1 && end >= start && end <= currentSurveys.length;
                      const count = valid ? (end - start + 1) : 0;
                      return count > 0 ? ` (${count} PDFs will be generated)` : ' (Invalid range)';
                    })()}
                  </>
                ) : (
                  <span style={{ color: '#666' }}>Enter start and end numbers to see preview</span>
                )}
              </div>
              <div className="quick-ranges" style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  className="quick-range-btn"
                  onClick={() => {
                    const end = Math.min(40, currentSurveys.length);
                    setRangeStart(1);
                    setRangeEnd(end);
                    setRangeStartInput('1');
                    setRangeEndInput(String(end));
                  }}
                >
                  1-40
                </button>
                <button
                  className="quick-range-btn"
                  onClick={() => {
                    const start = 41;
                    const end = Math.min(80, currentSurveys.length);
                    setRangeStart(start);
                    setRangeEnd(end);
                    setRangeStartInput(String(start));
                    setRangeEndInput(String(end));
                  }}
                  disabled={currentSurveys.length < 41}
                >
                  41-80
                </button>
                <button
                  className="quick-range-btn"
                  onClick={() => {
                    const start = 81;
                    const end = Math.min(120, currentSurveys.length);
                    setRangeStart(start);
                    setRangeEnd(end);
                    setRangeStartInput(String(start));
                    setRangeEndInput(String(end));
                  }}
                  disabled={currentSurveys.length < 81}
                >
                  81-120
                </button>
                <button
                  className="quick-range-btn"
                  onClick={() => {
                    setRangeStart(1);
                    setRangeEnd(currentSurveys.length);
                    setRangeStartInput('1');
                    setRangeEndInput(String(currentSurveys.length));
                  }}
                >
                  All ({currentSurveys.length})
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-button cancel" onClick={() => setShowRangeModal(false)}>
                Cancel
              </button>
            <button className="modal-button primary" onClick={handleRangeDownload}>
              {(window as any).__isClientPDF ? 'Download Client PDFs' : 'Download PDFs'}
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

