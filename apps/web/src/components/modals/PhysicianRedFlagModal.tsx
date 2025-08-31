'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';

interface PhysicianAlert {
  id: string;
  type: 'blood_pressure' | 'blood_sugar' | 'heart_rate' | 'weight_change' | 'medication_interaction' | 'lab_values';
  severity: 'moderate' | 'high' | 'critical';
  title: string;
  description: string;
  values: {
    current: string | number;
    normal: string;
    unit?: string;
  };
  recommendations: string[];
  emergencyContacts?: {
    name: string;
    phone: string;
    relation: string;
  }[];
  triggeredAt: string;
}

interface PhysicianRedFlagModalProps {
  alert: PhysicianAlert | null;
  isOpen: boolean;
  onClose: () => void;
  onContactPhysician: () => void;
  onEmergencyCall: () => void;
  onDismiss: (alertId: string) => void;
}

export function PhysicianRedFlagModal({
  alert,
  isOpen,
  onClose,
  onContactPhysician,
  onEmergencyCall,
  onDismiss
}: PhysicianRedFlagModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);

  useEffect(() => {
    if (isOpen && alert) {
      setIsVisible(true);
      setTimeRemaining(30);
      
      // Start countdown for critical alerts
      if (alert.severity === 'critical') {
        const interval = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        return () => clearInterval(interval);
      }
    } else {
      setIsVisible(false);
    }
  }, [isOpen, alert]);

  if (!alert || !isOpen) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-error-500 text-white';
      case 'high':
        return 'bg-warning-500 text-white';
      case 'moderate':
        return 'bg-primary-500 text-white';
      default:
        return 'bg-neutral-500 text-white';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'moderate':
        return '⚡';
      default:
        return 'ℹ️';
    }
  };

  const getTypeTitle = (type: string) => {
    const titles = {
      blood_pressure: 'Blood Pressure Alert',
      blood_sugar: 'Blood Sugar Alert',
      heart_rate: 'Heart Rate Alert',
      weight_change: 'Weight Change Alert',
      medication_interaction: 'Medication Interaction Alert',
      lab_values: 'Lab Values Alert'
    };
    return titles[type as keyof typeof titles] || 'Health Alert';
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={clsx(
          'fixed inset-0 bg-black bg-opacity-75 z-50 transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={() => alert.severity !== 'critical' && onClose()}
      />
      
      {/* Modal */}
      <div 
        className={clsx(
          'fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300',
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="physician-alert-title"
        aria-describedby="physician-alert-description"
      >
        <div className="bg-background-primary rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className={clsx(
            'px-6 py-4 rounded-t-2xl flex items-center justify-between',
            getSeverityColor(alert.severity)
          )}>
            <div className="flex items-center space-x-3">
              <span className="text-2xl" role="img" aria-label={`${alert.severity} severity`}>
                {getSeverityIcon(alert.severity)}
              </span>
              <div>
                <h2 id="physician-alert-title" className="text-lg font-bold">
                  {getTypeTitle(alert.type)}
                </h2>
                <p className="text-sm opacity-90 capitalize">
                  {alert.severity} Priority
                </p>
              </div>
            </div>
            
            {alert.severity === 'critical' && (
              <div className="text-right">
                <div className="text-xs opacity-75">Auto-dismiss in</div>
                <div className="text-xl font-bold">{timeRemaining}s</div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Alert Description */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {alert.title}
              </h3>
              <p id="physician-alert-description" className="text-text-secondary">
                {alert.description}
              </p>
            </div>

            {/* Values Display */}
            <div className="bg-background-secondary rounded-lg p-4">
              <h4 className="font-semibold text-text-primary mb-3">Current Reading</h4>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-2xl font-bold text-error-600">
                    {alert.values.current}
                    {alert.values.unit && <span className="text-sm ml-1">{alert.values.unit}</span>}
                  </div>
                  <div className="text-sm text-text-secondary">Current Value</div>
                </div>
                <div className="text-right">
                  <div className="text-lg text-success-600 font-medium">
                    {alert.values.normal}
                  </div>
                  <div className="text-sm text-text-secondary">Normal Range</div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="font-semibold text-text-primary mb-3">Immediate Recommendations</h4>
              <ul className="space-y-2">
                {alert.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-primary-500 mt-1">•</span>
                    <span className="text-text-secondary text-sm">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Emergency Contacts (for critical alerts) */}
            {alert.severity === 'critical' && alert.emergencyContacts && (
              <div className="bg-error-50 border border-error-200 rounded-lg p-4">
                <h4 className="font-semibold text-error-800 mb-3">Emergency Contacts</h4>
                <div className="space-y-2">
                  {alert.emergencyContacts.map((contact, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-error-800">{contact.name}</div>
                        <div className="text-sm text-error-600">{contact.relation}</div>
                      </div>
                      <button
                        onClick={() => window.open(`tel:${contact.phone}`, '_self')}
                        className="bg-error-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-error-700 transition-colors"
                        aria-label={`Call ${contact.name}`}
                      >
                        Call
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {alert.severity === 'critical' ? (
                <>
                  <button
                    onClick={onEmergencyCall}
                    className="w-full bg-error-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-error-700 transition-colors focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2"
                  >
                    🚨 Call Emergency Services
                  </button>
                  <button
                    onClick={onContactPhysician}
                    className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    📞 Contact My Physician
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onContactPhysician}
                    className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    📞 Contact My Physician
                  </button>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => onDismiss(alert.id)}
                      className="flex-1 bg-neutral-200 text-neutral-800 py-2 px-4 rounded-lg font-medium hover:bg-neutral-300 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 bg-background-secondary text-text-primary py-2 px-4 rounded-lg font-medium hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
                    >
                      Remind Later
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Disclaimer */}
            <div className="bg-background-secondary rounded-lg p-4 text-xs text-text-secondary">
              <p className="font-medium mb-1">⚠️ Medical Disclaimer</p>
              <p>
                This alert is based on health data analysis and should not replace professional medical advice. 
                Always consult with your healthcare provider for medical concerns.
              </p>
            </div>

            {/* Timestamp */}
            <div className="text-xs text-text-secondary text-center">
              Alert triggered: {new Date(alert.triggeredAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Example usage hook
export function usePhysicianRedFlagModal() {
  const [alert, setAlert] = useState<PhysicianAlert | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const showAlert = (alertData: PhysicianAlert) => {
    setAlert(alertData);
    setIsOpen(true);
  };

  const closeAlert = () => {
    setIsOpen(false);
    setTimeout(() => setAlert(null), 300); // Allow animation to complete
  };

  const handleContactPhysician = () => {
    // Integration with physician contact system
    console.log('Contacting physician for alert:', alert?.id);
    // This would integrate with the actual physician contact system
    closeAlert();
  };

  const handleEmergencyCall = () => {
    // Emergency services integration
    window.open('tel:911', '_self'); // Or local emergency number
    closeAlert();
  };

  const handleDismiss = (alertId: string) => {
    // Mark alert as acknowledged
    console.log('Dismissing alert:', alertId);
    // This would call the API to mark the alert as acknowledged
    closeAlert();
  };

  return {
    alert,
    isOpen,
    showAlert,
    closeAlert,
    handleContactPhysician,
    handleEmergencyCall,
    handleDismiss
  };
}

// Example alert data for testing
export const exampleAlerts: PhysicianAlert[] = [
  {
    id: 'bp-001',
    type: 'blood_pressure',
    severity: 'critical',
    title: 'Critically High Blood Pressure Detected',
    description: 'Your blood pressure reading is significantly above normal range and requires immediate medical attention.',
    values: {
      current: '180/120',
      normal: '< 140/90',
      unit: 'mmHg'
    },
    recommendations: [
      'Sit down and rest immediately',
      'Avoid physical exertion',
      'Take prescribed blood pressure medication if available',
      'Monitor symptoms like headache, chest pain, or difficulty breathing',
      'Seek emergency medical care if symptoms worsen'
    ],
    emergencyContacts: [
      { name: 'Dr. Sarah Johnson', phone: '+1-555-0123', relation: 'Primary Care Physician' },
      { name: 'City General Hospital', phone: '+1-555-0911', relation: 'Emergency Department' }
    ],
    triggeredAt: new Date().toISOString()
  },
  {
    id: 'bs-002',
    type: 'blood_sugar',
    severity: 'high',
    title: 'Elevated Blood Sugar Levels',
    description: 'Your blood glucose levels are consistently above target range and may require medication adjustment.',
    values: {
      current: 280,
      normal: '< 180 mg/dL',
      unit: 'mg/dL'
    },
    recommendations: [
      'Check blood sugar more frequently',
      'Review recent meals and carbohydrate intake',
      'Ensure medication adherence',
      'Stay hydrated with water',
      'Contact your physician to discuss medication adjustment'
    ],
    triggeredAt: new Date().toISOString()
  }
];