import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Survey } from '../firebase/surveys';
import { createSurvey } from '../firebase/surveys';
import './CreateSurvey.css';

export default function CreateSurvey() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Partial<Survey>>({
    rfpNumber: undefined,
    poleId: '',
    locationName: '',
    policeStation: '',
    locationCategories: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: keyof Survey, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: keyof Survey, value: string) => {
    const newArray = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const handleBooleanChange = (field: keyof Survey, value: string) => {
    let boolValue: boolean | null = null;
    if (value === 'true') boolValue = true;
    else if (value === 'false') boolValue = false;
    setFormData(prev => ({ ...prev, [field]: boolValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('You must be logged in to create a survey');
      return;
    }

    // Validate required fields
    if (!formData.rfpNumber || !formData.poleId || !formData.locationName || !formData.policeStation) {
      setError('Please fill in all required fields (RFP Number, Pole ID, Location Name, Police Station)');
      return;
    }

    setSaving(true);
    try {
      const surveyData: Omit<Survey, 'id' | 'createdAt' | 'updatedAt'> = {
        ...formData,
        rfpNumber: formData.rfpNumber ? Number(formData.rfpNumber) : 0,
        poleId: String(formData.poleId || ''),
        locationName: String(formData.locationName || ''),
        policeStation: String(formData.policeStation || ''),
        userId: user.id,
        userPhone: user.phoneNumber || undefined,
        userName: user.name || undefined,
      } as Omit<Survey, 'id' | 'createdAt' | 'updatedAt'>;

      const surveyId = await createSurvey(user.id, surveyData);
      navigate(`/survey/${user.id}/${surveyId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create survey');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="create-survey-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="create-survey-container">
      <header className="create-survey-header">
        <div>
          <button onClick={() => navigate('/dashboard')} className="back-button">
            ← Back to Dashboard
          </button>
          <h1>Create New Survey</h1>
        </div>
      </header>

      <main className="create-survey-main">
        <form onSubmit={handleSubmit} className="create-survey-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-section">
            <h3>General Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>RFP Number *</label>
                <input
                  type="number"
                  value={formData.rfpNumber || ''}
                  onChange={(e) => handleChange('rfpNumber', e.target.value ? Number(e.target.value) : undefined)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Pole ID *</label>
                <input
                  type="text"
                  value={formData.poleId || ''}
                  onChange={(e) => handleChange('poleId', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Location Name *</label>
                <input
                  type="text"
                  value={formData.locationName || ''}
                  onChange={(e) => handleChange('locationName', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Police Station *</label>
                <input
                  type="text"
                  value={formData.policeStation || ''}
                  onChange={(e) => handleChange('policeStation', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Location Categories (comma-separated)</label>
                <input
                  type="text"
                  value={formData.locationCategories?.join(', ') || ''}
                  onChange={(e) => handleArrayChange('locationCategories', e.target.value)}
                  placeholder="Commercial, Residential"
                />
              </div>
              <div className="form-group">
                <label>Power Substation</label>
                <input
                  type="text"
                  value={formData.powerSubstation || ''}
                  onChange={(e) => handleChange('powerSubstation', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Nearest Landmark</label>
                <input
                  type="text"
                  value={formData.nearestLandmark || ''}
                  onChange={(e) => handleChange('nearestLandmark', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude || ''}
                  onChange={(e) => handleChange('latitude', parseFloat(e.target.value) || undefined)}
                />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude || ''}
                  onChange={(e) => handleChange('longitude', parseFloat(e.target.value) || undefined)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Infrastructure Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Power Source Available</label>
                <select
                  value={formData.powerSourceAvailability === true ? 'true' : formData.powerSourceAvailability === false ? 'false' : ''}
                  onChange={(e) => handleBooleanChange('powerSourceAvailability', e.target.value)}
                >
                  <option value="">N/A</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="form-group">
                <label>Cable Trenching (m)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.cableTrenching || ''}
                  onChange={(e) => handleChange('cableTrenching', parseFloat(e.target.value) || undefined)}
                />
              </div>
              <div className="form-group">
                <label>Road Type</label>
                <input
                  type="text"
                  value={formData.roadType || ''}
                  onChange={(e) => handleChange('roadType', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>No. of Roads</label>
                <input
                  type="number"
                  value={formData.noOfRoads || ''}
                  onChange={(e) => handleChange('noOfRoads', parseInt(e.target.value) || undefined)}
                />
              </div>
              <div className="form-group">
                <label>Pole Size</label>
                <input
                  type="text"
                  value={formData.poleSize || ''}
                  onChange={(e) => handleChange('poleSize', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Cantilever Type</label>
                <input
                  type="text"
                  value={formData.cantileverType || ''}
                  onChange={(e) => handleChange('cantileverType', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Existing CCTV Pole</label>
                <select
                  value={formData.existingCctvPole === true ? 'true' : formData.existingCctvPole === false ? 'false' : ''}
                  onChange={(e) => handleBooleanChange('existingCctvPole', e.target.value)}
                >
                  <option value="">N/A</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="form-group">
                <label>Distance from Existing Pole (m)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.distanceFromExistingPole || ''}
                  onChange={(e) => handleChange('distanceFromExistingPole', parseFloat(e.target.value) || undefined)}
                />
              </div>
              <div className="form-group">
                <label>JB</label>
                <input
                  type="text"
                  value={formData.jb || ''}
                  onChange={(e) => handleChange('jb', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>No. of Cameras</label>
                <input
                  type="number"
                  value={formData.noOfCameras || ''}
                  onChange={(e) => handleChange('noOfCameras', parseInt(e.target.value) || undefined)}
                />
              </div>
              <div className="form-group">
                <label>No. of Poles</label>
                <input
                  type="number"
                  value={formData.noOfPoles || ''}
                  onChange={(e) => handleChange('noOfPoles', parseInt(e.target.value) || undefined)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Measurement Sheet</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Power Cable (2 Core) (m)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.powerCable || ''}
                  onChange={(e) => handleChange('powerCable', parseFloat(e.target.value) || undefined)}
                />
              </div>
              <div className="form-group">
                <label>CAT6 Cable (m)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.cat6Cable || ''}
                  onChange={(e) => handleChange('cat6Cable', parseFloat(e.target.value) || undefined)}
                />
              </div>
              <div className="form-group">
                <label>IR Cable (2.5sqmm 3core) (m)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.irCable || ''}
                  onChange={(e) => handleChange('irCable', parseFloat(e.target.value) || undefined)}
                />
              </div>
              <div className="form-group">
                <label>HDPE Power Trenching (m)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.hdpPowerTrenching || ''}
                  onChange={(e) => handleChange('hdpPowerTrenching', parseFloat(e.target.value) || undefined)}
                />
              </div>
              <div className="form-group">
                <label>Road Crossing Length (m)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.roadCrossingLength || ''}
                  onChange={(e) => handleChange('roadCrossingLength', parseFloat(e.target.value) || undefined)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Type of Cameras</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Fixed Box Camera</label>
                <input
                  type="number"
                  value={formData.fixedBoxCamera || ''}
                  onChange={(e) => handleChange('fixedBoxCamera', parseInt(e.target.value) || undefined)}
                />
              </div>
              <div className="form-group">
                <label>PTZ</label>
                <input
                  type="number"
                  value={formData.ptz || ''}
                  onChange={(e) => handleChange('ptz', parseInt(e.target.value) || undefined)}
                />
              </div>
              <div className="form-group">
                <label>ANPR Camera</label>
                <input
                  type="number"
                  value={formData.anprCamera || ''}
                  onChange={(e) => handleChange('anprCamera', parseInt(e.target.value) || undefined)}
                />
              </div>
              <div className="form-group">
                <label>Total Cameras</label>
                <input
                  type="number"
                  value={formData.totalCameras || ''}
                  onChange={(e) => handleChange('totalCameras', parseInt(e.target.value) || undefined)}
                />
              </div>
              <div className="form-group">
                <label>PA System</label>
                <input
                  type="number"
                  value={formData.paSystem || ''}
                  onChange={(e) => handleChange('paSystem', parseInt(e.target.value) || undefined)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Type of Analytics</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Crowd Safety Options (comma-separated)</label>
                <input
                  type="text"
                  value={formData.crowdSafetyOptions?.join(', ') || ''}
                  onChange={(e) => handleArrayChange('crowdSafetyOptions', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Investigation Options (comma-separated)</label>
                <input
                  type="text"
                  value={formData.investigationOptions?.join(', ') || ''}
                  onChange={(e) => handleArrayChange('investigationOptions', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Public Order Options (comma-separated)</label>
                <input
                  type="text"
                  value={formData.publicOrderOptions?.join(', ') || ''}
                  onChange={(e) => handleArrayChange('publicOrderOptions', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Traffic Options (comma-separated)</label>
                <input
                  type="text"
                  value={formData.trafficOptions?.join(', ') || ''}
                  onChange={(e) => handleArrayChange('trafficOptions', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Safety Options (comma-separated)</label>
                <input
                  type="text"
                  value={formData.safetyOptions?.join(', ') || ''}
                  onChange={(e) => handleArrayChange('safetyOptions', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>ANPR</label>
                <select
                  value={formData.anpr === true ? 'true' : formData.anpr === false ? 'false' : ''}
                  onChange={(e) => handleBooleanChange('anpr', e.target.value)}
                >
                  <option value="">N/A</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="form-group">
                <label>FRS</label>
                <select
                  value={formData.frs === true ? 'true' : formData.frs === false ? 'false' : ''}
                  onChange={(e) => handleBooleanChange('frs', e.target.value)}
                >
                  <option value="">N/A</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Remarks</label>
                <textarea
                  value={formData.remarks || ''}
                  onChange={(e) => handleChange('remarks', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Parent Pole Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Parent Pole ID</label>
                <input
                  type="text"
                  value={formData.parentPoleId || ''}
                  onChange={(e) => handleChange('parentPoleId', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Parent Pole Distance</label>
                <input
                  type="number"
                  step="any"
                  value={formData.parentPoleDistance || ''}
                  onChange={(e) => handleChange('parentPoleDistance', parseFloat(e.target.value) || undefined)}
                />
              </div>
              <div className="form-group">
                <label>Road Crossing Length from Parent Pole</label>
                <input
                  type="number"
                  step="any"
                  value={formData.parentPoleRoadCrossing || ''}
                  onChange={(e) => handleChange('parentPoleRoadCrossing', parseFloat(e.target.value) || undefined)}
                />
              </div>
              <div className="form-group">
                <label>Parent Road Type</label>
                <input
                  type="text"
                  value={formData.parentPoleRoadType || ''}
                  onChange={(e) => handleChange('parentPoleRoadType', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate('/dashboard')} className="cancel-button">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="save-button">
              {saving ? 'Creating...' : 'Create Survey'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

