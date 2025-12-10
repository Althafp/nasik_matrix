import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Survey } from '../firebase/surveys';
import { getUserSurveys, getAllSurveys } from '../firebase/surveys';
import { exportSurveysToExcel } from '../utils/excelExport';
import { generateBulkPDFs } from '../utils/bulkPdfExport';
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
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const [searchRfp, setSearchRfp] = useState('');
  const [searchPoliceStation, setSearchPoliceStation] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      loadSurveys();
    }
  }, [user, authLoading, navigate]);

  const loadSurveys = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      // Always load all surveys for admins, and user surveys for regular users
      if (isAdmin) {
        const all = await getAllSurveys();
        setAllSurveys(all);
        // Also load user's own surveys
        const my = await getUserSurveys(user.id);
        setMySurveys(my);
      } else {
        const my = await getUserSurveys(user.id);
        setMySurveys(my);
        // Regular users can also see all surveys
        const all = await getAllSurveys();
        setAllSurveys(all);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load surveys');
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

  const handleBulkDownloadPDFs = async () => {
    if (currentSurveys.length === 0) {
      alert('No surveys to export');
      return;
    }

    const confirmMessage = `This will generate ${currentSurveys.length} PDF file(s) and download them as a ZIP file. Continue?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setExportingPDFs(true);
    setPdfProgress({ current: 0, total: currentSurveys.length });
    
    try {
      await generateBulkPDFs(currentSurveys, (current, total) => {
        setPdfProgress({ current, total });
      });
      // Success message is not needed as the zip file will download automatically
    } catch (error: any) {
      console.error('Bulk PDF export error:', error);
      alert('Failed to generate PDFs: ' + (error.message || 'Unknown error'));
    } finally {
      setExportingPDFs(false);
      setPdfProgress({ current: 0, total: 0 });
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
            <button onClick={() => navigate('/create-survey')} className="create-survey-button">
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
                disabled={exporting || exportingPDFs || currentSurveys.length === 0}
                title="Download All as PDFs"
              >
                {exportingPDFs 
                  ? `⏳ Generating ZIP (${pdfProgress.current}/${pdfProgress.total})...` 
                  : '📦 Download All as ZIP'}
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
                      onClick={() => navigate(`/survey/${survey.userId}/${survey.id}`)}
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
                          onClick={() => navigate(`/survey/${survey.userId}/${survey.id}`)}
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
    </div>
  );
}

