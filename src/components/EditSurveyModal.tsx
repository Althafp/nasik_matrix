import { useState, useEffect } from 'react';
import type { Survey } from '../firebase/surveys';
import './EditSurveyModal.css';

interface EditSurveyModalProps {
  survey: Survey;
  onClose: () => void;
  onSave: (updatedSurvey: Partial<Survey>) => Promise<void>;
}

export default function EditSurveyModal({ survey, onClose, onSave }: EditSurveyModalProps) {
  const [formData, setFormData] = useState<Partial<Survey>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize form data with current survey values
    setFormData({
      rfpNumber: survey.rfpNumber,
      poleId: survey.poleId,
      locationName: survey.locationName,
      policeStation: survey.policeStation,
      locationCategories: survey.locationCategories || [],
      powerSubstation: survey.powerSubstation,
      nearestLandmark: survey.nearestLandmark,
      latitude: survey.latitude,
      longitude: survey.longitude,
      powerSourceAvailability: survey.powerSourceAvailability,
      cableTrenching: survey.cableTrenching,
      roadType: survey.roadType,
      noOfRoads: survey.noOfRoads,
      poleSize: survey.poleSize,
      cantileverType: survey.cantileverType,
      existingCctvPole: survey.existingCctvPole,
      distanceFromExistingPole: survey.distanceFromExistingPole,
      noOfCameras: survey.noOfCameras,
      noOfPoles: survey.noOfPoles,
      powerCable: survey.powerCable,
      cat6Cable: survey.cat6Cable,
      irCable: survey.irCable,
      hdpPowerTrenching: survey.hdpPowerTrenching,
      roadCrossingLength: survey.roadCrossingLength,
      fixedBoxCamera: survey.fixedBoxCamera,
      ptz: survey.ptz,
      anprCamera: survey.anprCamera,
      totalCameras: survey.totalCameras,
      paSystem: survey.paSystem,
      crowdSafetyOptions: survey.crowdSafetyOptions || [],
      investigationOptions: survey.investigationOptions || [],
      publicOrderOptions: survey.publicOrderOptions || [],
      trafficOptions: survey.trafficOptions || [],
      safetyOptions: survey.safetyOptions || [],
      anpr: survey.anpr,
      frs: survey.frs,
      remarks: survey.remarks,
      parentPoleId: survey.parentPoleId,
      parentPoleDistance: survey.parentPoleDistance,
      parentPoleRoadCrossing: survey.parentPoleRoadCrossing,
      parentPoleRoadType: survey.parentPoleRoadType,
      jb: survey.jb,
    });
  }, [survey]);

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
    setSaving(true);

    try {
      await onSave(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to save survey');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Survey</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="edit-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-section">
            <h3>General Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>RFP Number *</label>
                <input
                  type="text"
                  value={formData.rfpNumber || ''}
                  onChange={(e) => handleChange('rfpNumber', e.target.value)}
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
                  onChange={(e) => handleChange('latitude', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude || ''}
                  onChange={(e) => handleChange('longitude', e.target.value === '' ? undefined : parseFloat(e.target.value))}
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
                  onChange={(e) => handleChange('cableTrenching', e.target.value === '' ? undefined : parseFloat(e.target.value))}
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
                  value={formData.noOfRoads !== undefined && formData.noOfRoads !== null ? formData.noOfRoads : ''}
                  onChange={(e) => handleChange('noOfRoads', e.target.value === '' ? undefined : parseInt(e.target.value))}
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
                  onChange={(e) => handleChange('distanceFromExistingPole', e.target.value === '' ? undefined : parseFloat(e.target.value))}
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
                  value={formData.noOfCameras !== undefined && formData.noOfCameras !== null ? formData.noOfCameras : ''}
                  onChange={(e) => handleChange('noOfCameras', e.target.value === '' ? undefined : parseInt(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>No. of Poles</label>
                <input
                  type="number"
                  value={formData.noOfPoles !== undefined && formData.noOfPoles !== null ? formData.noOfPoles : ''}
                  onChange={(e) => handleChange('noOfPoles', e.target.value === '' ? undefined : parseInt(e.target.value))}
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
                  onChange={(e) => handleChange('powerCable', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>CAT6 Cable (m)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.cat6Cable || ''}
                  onChange={(e) => handleChange('cat6Cable', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>IR Cable (2.5sqmm 3core) (m)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.irCable || ''}
                  onChange={(e) => handleChange('irCable', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>HDPE Power Trenching (m)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.hdpPowerTrenching || ''}
                  onChange={(e) => handleChange('hdpPowerTrenching', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>Road Crossing Length (m)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.roadCrossingLength || ''}
                  onChange={(e) => handleChange('roadCrossingLength', e.target.value === '' ? undefined : parseFloat(e.target.value))}
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
                  value={formData.fixedBoxCamera !== undefined && formData.fixedBoxCamera !== null ? formData.fixedBoxCamera : ''}
                  onChange={(e) => handleChange('fixedBoxCamera', e.target.value === '' ? undefined : parseInt(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>PTZ</label>
                <input
                  type="number"
                  value={formData.ptz !== undefined && formData.ptz !== null ? formData.ptz : ''}
                  onChange={(e) => handleChange('ptz', e.target.value === '' ? undefined : parseInt(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>ANPR Camera</label>
                <input
                  type="number"
                  value={formData.anprCamera !== undefined && formData.anprCamera !== null ? formData.anprCamera : ''}
                  onChange={(e) => handleChange('anprCamera', e.target.value === '' ? undefined : parseInt(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>Total Cameras</label>
                <input
                  type="number"
                  value={formData.totalCameras !== undefined && formData.totalCameras !== null ? formData.totalCameras : ''}
                  onChange={(e) => handleChange('totalCameras', e.target.value === '' ? undefined : parseInt(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>PA System</label>
                <input
                  type="number"
                  value={formData.paSystem !== undefined && formData.paSystem !== null ? formData.paSystem : ''}
                  onChange={(e) => handleChange('paSystem', e.target.value === '' ? undefined : parseInt(e.target.value))}
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
                  onChange={(e) => handleChange('parentPoleDistance', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>Road Crossing Length from Parent Pole</label>
                <input
                  type="number"
                  step="any"
                  value={formData.parentPoleRoadCrossing || ''}
                  onChange={(e) => handleChange('parentPoleRoadCrossing', e.target.value === '' ? undefined : parseFloat(e.target.value))}
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

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="save-button">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

