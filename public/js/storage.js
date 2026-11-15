/**
 * CareCircle - Storage Layer & Data Models
 * Uses existing CareStorage helper with localStorage persistence.
 * Strict first-run logic: Fresh starts contain NO preloaded elder or demo data.
 */

export const STORAGE_KEYS = {
  CARE_CIRCLE: 'carecircle_data',
  CHECK_INS: 'carecircle_checkins',
  ALERTS: 'carecircle_alerts'
};

export const CareStorage = {
  get(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (err) {
      console.error(`[CareCircle Storage] Error reading key "${key}":`, err);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`[CareCircle Storage] Error setting key "${key}":`, err);
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`[CareCircle Storage] Error removing key "${key}":`, err);
    }
  },

  clear() {
    try {
      localStorage.clear();
    } catch (err) {
      console.error('[CareCircle Storage] Error clearing storage:', err);
    }
  }
};

/**
 * Empty fresh-start state: NO preloaded elder, NO hardcoded names, NO demo data.
 */
export function getBlankInitialState() {
  return {
    setupCompleted: false,
    activeElderId: `elder_${Date.now()}`,
    elders: [],
    profile: {
      name: '',
      honorific: 'Ajoba', // 'Ajoba' or 'Ajji'
      language: 'mr' // 'mr', 'hi', or 'en'
    },
    voiceConfig: {
      type: 'general',
      personName: '',
      fallbackPhrase: '',
      audioBlobBase64: null
    },
    medications: [],
    contacts: [],
    appointment: null,
    familyMessage: null,
    dailyDoses: {},
    moodHistory: {},
    missedAcknowledgements: {},
    security: {
      caretakerPasscode: '1234',
      familyPasscode: '5678',
      elderPasscode: '',
      oneTapElder: true
    },
    demoState: {
      timeOffsetMinutes: 0,
      forcedMode: null
    }
  };
}

/**
 * Sample Demo Data - Loaded ONLY via "Load demo data" in Demo Tools
 */
export const SAMPLE_DEMO_DATA = {
  setupCompleted: true,
  activeElderId: 'elder_demo_1',
  elders: [],
  security: {
    caretakerPasscode: '1234',
    familyPasscode: '5678',
    elderPasscode: '',
    oneTapElder: true
  },
  missedAcknowledgements: {},
  profile: {
    name: 'Dattatray',
    honorific: 'Ajoba',
    language: 'mr'
  },
  voiceConfig: {
    type: 'family',
    personName: 'Aarav (Grandson)',
    fallbackPhrase: 'आजोबा, गोळ्या घेण्याची वेळ झाली आहे.',
    audioBlobBase64: null
  },
  medications: [
    {
      id: 'med_bp',
      name: 'Telmisartan',
      dose: '40 mg',
      timeOfDay: '08:30',
      period: 'morning',
      windowStart: '08:00',
      windowEnd: '10:00',
      label: 'For BP',
      labelMr: 'रक्तदाब',
      labelHi: 'बीपी',
      afterFood: false,
      appearance: {
        shape: 'round',
        color: '#F472B6',
        colorName: 'Pink',
        size: 'small',
        markings: 'T40',
        description: 'गुलाबी गोल गोळी, बीपी साठी'
      }
    },
    {
      id: 'med_sugar',
      name: 'Metformin',
      dose: '500 mg',
      timeOfDay: '08:30',
      period: 'morning',
      windowStart: '08:00',
      windowEnd: '10:00',
      label: 'For Sugar',
      labelMr: 'साखर (मधुमेह)',
      labelHi: 'शुगर',
      afterFood: true,
      appearance: {
        shape: 'oblong',
        color: '#FFFFFF',
        colorName: 'White',
        size: 'medium',
        markings: 'M500',
        description: 'पांढरी लांबट गोळी, साखरेसाठी, जेवणानंतर'
      }
    },
    {
      id: 'med_vitamin',
      name: 'Multivitamin Silver',
      dose: '1 Capsule',
      timeOfDay: '13:00',
      period: 'afternoon',
      windowStart: '12:30',
      windowEnd: '14:30',
      label: 'For Energy',
      labelMr: 'ताकद/ऊर्जा',
      labelHi: 'ऊर्जा',
      afterFood: true,
      appearance: {
        shape: 'capsule',
        color: '#FB923C',
        colorName: 'Orange',
        size: 'large',
        markings: 'VITA',
        description: 'नारंगी कॅप्सूल, ताकदीसाठी'
      }
    },
    {
      id: 'med_chol',
      name: 'Atorvastatin',
      dose: '10 mg',
      timeOfDay: '21:00',
      period: 'night',
      windowStart: '20:30',
      windowEnd: '22:30',
      label: 'For Cholesterol',
      labelMr: 'कोलेस्टेरॉल',
      labelHi: 'कोलेस्ट्रॉल',
      afterFood: false,
      appearance: {
        shape: 'round',
        color: '#FDE047',
        colorName: 'Yellow',
        size: 'small',
        markings: 'A10',
        description: 'पिवळी गोल गोळी, कोलेस्टेरॉलसाठी'
      }
    },
    {
      id: 'med_calcium',
      name: 'Calcium + D3',
      dose: '500 mg',
      timeOfDay: '21:00',
      period: 'night',
      windowStart: '20:30',
      windowEnd: '22:30',
      label: 'For Bones',
      labelMr: 'हाडे मजबूत करण्यासाठी',
      labelHi: 'हड्डियों के लिए',
      afterFood: true,
      appearance: {
        shape: 'round',
        color: '#FFFFFF',
        colorName: 'White',
        size: 'large',
        markings: 'CAL',
        description: 'पांढरी मोठी गोळी, हाडांसाठी, जेवणानंतर'
      }
    }
  ],
  contacts: [
    {
      id: 'contact_1',
      name: 'Rahul',
      relation: 'Son',
      relationMr: 'मुलगा',
      relationHi: 'बेटा',
      phone: '+91 98765 43210',
      email: 'rahul@familycare.in',
      role: 'Primary Caregiver',
      passcode: '1234'
    }
  ],
  appointment: {
    id: 'apt_1',
    doctor: 'Dr. Kulkarni',
    specialtyMr: 'हृदयरोग तज्ज्ञ',
    specialtyHi: 'हृदय रोग विशेषज्ञ',
    specialtyEn: 'Heart Specialist',
    time: '4:30 PM',
    date: 'Today',
    location: 'City Clinic, Sadashiv Peth'
  },
  familyMessage: {
    from: 'Aarav',
    relation: 'Grandson',
    relationMr: 'नातू',
    relationHi: 'पोता',
    textMr: 'आजोबा, काळजी घ्या! मी संध्याकाळी ५ वाजता शाळेतून आल्यावर फोन करेन.',
    textHi: 'दादाजी, अपना ख्याल रखियेगा! मैं शाम ५ बजे स्कूल से आकर कॉल करूँगा.',
    textEn: 'Have a wonderful day! I will call you after school at 5 PM',
    time: '8:00 AM'
  },
  dailyDoses: {},
  moodHistory: {},
  demoState: {
    timeOffsetMinutes: 0,
    forcedMode: null
  }
};

/**
 * Initialize care data. If storage is empty, initialize blank state.
 */
export function initCareData() {
  const existing = CareStorage.get(STORAGE_KEYS.CARE_CIRCLE);
  if (!existing) {
    const blank = getBlankInitialState();
    CareStorage.set(STORAGE_KEYS.CARE_CIRCLE, blank);
    return blank;
  }
  return existing;
}

export function getCareData() {
  const data = CareStorage.get(STORAGE_KEYS.CARE_CIRCLE);
  return data || initCareData();
}

export function saveCareData(newData) {
  CareStorage.set(STORAGE_KEYS.CARE_CIRCLE, newData);
  return newData;
}

/**
 * Switch to a new elder: archives current elder profile into `elders` list
 * and creates a fresh unconfigured profile to launch the Setup Wizard.
 */
export function switchToNewElder() {
  const current = getCareData();
  const elders = current.elders || [];

  // Archive current elder if setup was completed
  if (current.setupCompleted && current.profile && current.profile.name) {
    const existingIdx = elders.findIndex(e => e.activeElderId === current.activeElderId);
    const snapshot = {
      activeElderId: current.activeElderId,
      profile: { ...current.profile },
      voiceConfig: { ...current.voiceConfig },
      medications: [...(current.medications || [])],
      contacts: [...(current.contacts || [])],
      appointment: current.appointment ? { ...current.appointment } : null,
      familyMessage: current.familyMessage ? { ...current.familyMessage } : null
    };
    if (existingIdx >= 0) {
      elders[existingIdx] = snapshot;
    } else {
      elders.push(snapshot);
    }
  }

  // Create fresh new elder
  const fresh = getBlankInitialState();
  fresh.elders = elders;
  fresh.profile.language = current.profile?.language || 'mr'; // keep language preference
  saveCareData(fresh);
  return fresh;
}

/**
 * Switch back to an existing elder from the elders archive
 */
export function switchToExistingElder(elderId) {
  const current = getCareData();
  const elders = current.elders || [];
  const target = elders.find(e => e.activeElderId === elderId);
  if (!target) return current;

  // Archive current first
  if (current.setupCompleted && current.profile && current.profile.name) {
    const idx = elders.findIndex(e => e.activeElderId === current.activeElderId);
    if (idx >= 0) {
      elders[idx] = { ...current };
    } else {
      elders.push({ ...current });
    }
  }

  const loaded = {
    ...target,
    setupCompleted: true,
    elders,
    dailyDoses: {},
    moodHistory: {},
    demoState: { timeOffsetMinutes: 0, forcedMode: null }
  };
  saveCareData(loaded);
  return loaded;
}

/**
 * Load Sample Demo Data (ONLY triggered by caretaker clicking "Load demo data")
 */
export function loadSampleDemoData() {
  const current = getCareData();
  const demoData = JSON.parse(JSON.stringify(SAMPLE_DEMO_DATA));
  demoData.elders = current.elders || [];
  demoData.profile.language = current.profile?.language || 'mr';
  saveCareData(demoData);
  return demoData;
}

/**
 * Global language updater that persists language in storage
 */
export function persistLanguage(lang) {
  const data = getCareData();
  if (data && data.profile) {
    data.profile.language = lang;
    saveCareData(data);
  }
}

/**
 * Active Role Management via sessionStorage ('elder' | 'family' | 'caretaker')
 */
export function getActiveRole() {
  try {
    return sessionStorage.getItem('carecircle_role') || null;
  } catch (e) {
    return null;
  }
}

export function setActiveRole(role) {
  try {
    if (role) {
      sessionStorage.setItem('carecircle_role', role);
    } else {
      sessionStorage.removeItem('carecircle_role');
    }
  } catch (e) {
    console.error('Error saving role to session:', e);
  }
}

/**
 * Large Text Mode Preference (stored in localStorage)
 */
export function getLargeTextMode() {
  try {
    return localStorage.getItem('carecircle_large_text') === 'true';
  } catch (e) {
    return false;
  }
}

export function setLargeTextMode(enabled) {
  try {
    localStorage.setItem('carecircle_large_text', enabled ? 'true' : 'false');
    if (enabled) {
      document.body.classList.add('large-text-mode');
    } else {
      document.body.classList.remove('large-text-mode');
    }
  } catch (e) {
    console.error('Error saving large text mode:', e);
  }
}
