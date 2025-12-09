import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Survey } from '../firebase/surveys';
import { getSurveyById, updateSurvey, deleteSurvey } from '../firebase/surveys';
import { generatePDF } from '../utils/pdfExport';
import EditSurveyModal from '../components/EditSurveyModal';
import './SurveyDetails.css';

export default function SurveyDetails() {
  const { userId, surveyId } = useParams<{ userId: string; surveyId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (userId && surveyId) {
      loadSurvey();
    }
  }, [userId, surveyId, user, authLoading, navigate]);

  const loadSurvey = async () => {
    if (!userId || !surveyId) return;

    setLoading(true);
    setError('');

    try {
      const surveyData = await getSurveyById(userId, surveyId);
      if (surveyData) {
        setSurvey(surveyData);
      } else {
        setError('Survey not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load survey');
    } finally {
      setLoading(false);
    }
  };

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

  const canEditOrDelete = () => {
    if (!user || !survey) return false;
    // Admins can edit/delete any survey, users can only edit/delete their own
    return isAdmin || user.id === survey.userId;
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleEditSave = async (updatedSurvey: Partial<Survey>) => {
    if (!userId || !surveyId) return;

    try {
      await updateSurvey(userId, surveyId, updatedSurvey);
      // Reload the survey to show updated data
      await loadSurvey();
      setIsEditModalOpen(false);
    } catch (err: any) {
      alert('Failed to update survey: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDelete = async () => {
    if (!userId || !surveyId || !survey) return;

    const confirmMessage = `Are you sure you want to delete this survey?\n\nRFP #${survey.rfpNumber}\nPole ID: ${survey.poleId}\nLocation: ${survey.locationName}\n\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteSurvey(userId, surveyId);
      // Navigate back to dashboard after successful deletion
      navigate('/dashboard');
    } catch (err: any) {
      alert('Failed to delete survey: ' + (err.message || 'Unknown error'));
      setIsDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="survey-details-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="survey-details-container">
        <div className="error-container">
          <p>{error || 'Survey not found'}</p>
          <button onClick={() => navigate('/dashboard')} className="back-button">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="survey-details-container">
      <header className="details-header">
        <div>
          <button onClick={() => navigate('/dashboard')} className="back-button">
            ← Back to Dashboard
          </button>
          <h1>Survey Details</h1>
          <div className="header-actions">
            {canEditOrDelete() && (
              <>
                <button 
                  onClick={handleEdit}
                  className="edit-button"
                  title="Edit Survey"
                >
                  ✏️ Edit
                </button>
                <button 
                  onClick={handleDelete}
                  className="delete-button"
                  disabled={isDeleting}
                  title="Delete Survey"
                >
                  {isDeleting ? '⏳ Deleting...' : '🗑️ Delete'}
                </button>
              </>
            )}
            <button 
              onClick={async (e) => {
                try {
                  // Show loading message
                  const button = e.currentTarget;
                  const originalText = button.textContent;
                  button.textContent = '⏳ Generating PDF...';
                  button.disabled = true;
                  
                  await generatePDF();
                  
                  // Restore button
                  button.textContent = originalText;
                  button.disabled = false;
                } catch (error) {
                  console.error('Error generating PDF:', error);
                  alert('Failed to generate PDF. Please try again.');
                  const button = e.currentTarget;
                  button.textContent = '📥 Download PDF';
                  button.disabled = false;
                }
              }} 
              className="download-pdf-button"
            >
              📥 Download PDF
            </button>
          </div>
        </div>
      </header>

      <main className="details-main">
        <div className="details-content">
          {/* General Information */}
          <section className="details-section">
            <h2>General Information</h2>
            <div className="details-grid">
              <DetailItem label="RFP Number" value={survey.rfpNumber} />
              <DetailItem label="Pole ID" value={survey.poleId} />
              <DetailItem label="Location Name" value={survey.locationName} />
              <DetailItem label="Police Station" value={survey.policeStation} />
              <DetailItem 
                label="Location Categories" 
                value={survey.locationCategories?.join(', ') || 'N/A'} 
              />
              <DetailItem label="Power Substation" value={survey.powerSubstation} />
              <DetailItem label="Nearest Landmark" value={survey.nearestLandmark} />
              {survey.latitude && survey.longitude && (
                <DetailItem 
                  label="Coordinates" 
                  value={`${survey.latitude}, ${survey.longitude}`} 
                />
              )}
            </div>
          </section>

          {/* Infrastructure Details */}
          <section className="details-section">
            <h2>Infrastructure Details</h2>
            <div className="details-grid">
              <DetailItem 
                label="Power Source Available" 
                value={survey.powerSourceAvailability === true ? 'Yes' : survey.powerSourceAvailability === false ? 'No' : 'N/A'} 
              />
              <DetailItem label="Cable Trenching (m)" value={survey.cableTrenching} />
              <DetailItem label="Road Type" value={survey.roadType} />
              <DetailItem label="No. of Roads" value={survey.noOfRoads} />
              <DetailItem label="Pole Size" value={survey.poleSize} />
              <DetailItem label="Cantilever Type" value={survey.cantileverType} />
              <DetailItem 
                label="Existing CCTV Pole" 
                value={survey.existingCctvPole === true ? 'Yes' : survey.existingCctvPole === false ? 'No' : 'N/A'} 
              />
              <DetailItem label="Distance from Existing Pole (m)" value={survey.distanceFromExistingPole} />
              <DetailItem label="JB" value={survey.jb} />
              <DetailItem label="No. of Cameras" value={survey.noOfCameras} />
              <DetailItem label="No. of Poles" value={survey.noOfPoles} />
            </div>
          </section>

          {/* Measurement Sheet */}
          <section className="details-section">
            <h2>Measurement Sheet</h2>
            <div className="details-grid">
              <DetailItem label="Power Cable (2 Core) (m)" value={survey.powerCable} />
              <DetailItem label="CAT6 Cable (m)" value={survey.cat6Cable} />
              <DetailItem label="IR Cable (2.5sqmm 3core) (m)" value={survey.irCable} />
              <DetailItem label="HDPE Power Trenching (m)" value={survey.hdpPowerTrenching} />
              <DetailItem label="Road Crossing Length (m)" value={survey.roadCrossingLength} />
            </div>
          </section>

          {/* Type of Cameras */}
          <section className="details-section">
            <h2>Type of Cameras</h2>
            <div className="details-grid">
              <DetailItem label="Fixed Box Camera" value={survey.fixedBoxCamera} />
              <DetailItem label="PTZ" value={survey.ptz} />
              <DetailItem label="ANPR Camera" value={survey.anprCamera} />
              <DetailItem label="Total Cameras" value={survey.totalCameras} />
              <DetailItem label="PA System" value={survey.paSystem} />
            </div>
          </section>

          {/* Type of Analytics */}
          <section className="details-section">
            <h2>Type of Analytics</h2>
            <div className="details-grid">
              <DetailItem 
                label="Crowd Safety Options" 
                value={survey.crowdSafetyOptions?.join(', ') || 'None'} 
              />
              <DetailItem 
                label="Investigation Options" 
                value={survey.investigationOptions?.join(', ') || 'None'} 
              />
              <DetailItem 
                label="Public Order Options" 
                value={survey.publicOrderOptions?.join(', ') || 'None'} 
              />
              <DetailItem 
                label="Traffic Options" 
                value={survey.trafficOptions?.join(', ') || 'None'} 
              />
              <DetailItem 
                label="Safety Options" 
                value={survey.safetyOptions?.join(', ') || 'None'} 
              />
              <DetailItem 
                label="ANPR" 
                value={survey.anpr === true ? 'Yes' : survey.anpr === false ? 'No' : 'N/A'} 
              />
              <DetailItem 
                label="FRS" 
                value={survey.frs === true ? 'Yes' : survey.frs === false ? 'No' : 'N/A'} 
              />
              <DetailItem label="Remarks" value={survey.remarks || 'N/A'} />
            </div>
          </section>

          {/* Parent Pole Section */}
          <section className="details-section">
            <h2>PARENT POLE FOR POWER SOURCE</h2>
            <div className="details-grid">
              <DetailItem label="Parent pole ID" value={survey.parentPoleId} />
              <DetailItem label="Parent pole distance" value={survey.parentPoleDistance} />
              <DetailItem label="Road crossing length from parent pole" value={survey.parentPoleRoadCrossing} />
              <DetailItem label="Parent road type" value={survey.parentPoleRoadType} />
            </div>
          </section>

          {/* Images */}
          {survey.imageUrls && survey.imageUrls.length > 0 && (
            <section className="details-section">
              <h2>Images ({survey.imageUrls.length})</h2>
              <div className="images-grid">
                {survey.imageUrls.map((url, index) => (
                  <div key={index} className="image-item">
                    <img src={url} alt={`Survey image ${index + 1}`} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Metadata */}
          <section className="details-section">
            <h2>Metadata</h2>
            <div className="details-grid">
              <DetailItem label="Submitted By" value={survey.userName || survey.userPhone} />
              <DetailItem label="User Phone" value={survey.userPhone} />
              <DetailItem label="Created At" value={formatDate(survey.createdAt)} />
              <DetailItem label="Updated At" value={formatDate(survey.updatedAt)} />
            </div>
          </section>
        </div>
      </main>

      {isEditModalOpen && survey && (
        <EditSurveyModal
          survey={survey}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: any }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}:</span>
      <span className="detail-value">{value !== undefined && value !== null && value !== '' ? String(value) : ''}</span>
    </div>
  );
}

