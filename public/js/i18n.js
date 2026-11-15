/**
 * Internationalization & Localization (Marathi, Hindi, English)
 * Always writes Marathi and Hindi in Devanagari script.
 * Provides full natural spoken sentence builders and top-bar language switcher.
 */

import { getLocalizedPillDescription } from './pillSvg.js';

export const SUPPORTED_LANGUAGES = [
  { code: 'mr', shortLabel: 'मर', label: 'मराठी (Marathi)', locale: 'mr-IN' },
  { code: 'hi', shortLabel: 'हिं', label: 'हिन्दी (Hindi)', locale: 'hi-IN' },
  { code: 'en', shortLabel: 'EN', label: 'English', locale: 'en-IN' }
];

/**
 * Returns elder display name according to language and entered name + honorific.
 * Example:
 * Marathi: "रमेश आजोबा" or "आजोबा" / "सुमन आजी" or "आजी"
 * Hindi: "रमेश दादाजी" or "दादाजी" / "सुमन दादी" or "दादी"
 * English: "Ramesh Ajoba" or "Ajoba" / "Suman Ajji" or "Ajji"
 */
export function getElderDisplayName(profile = {}, lang = 'mr') {
  const name = (profile.name || '').trim();
  const isFemale = profile.honorific === 'Ajji' || profile.gender === 'female';

  if (lang === 'mr') {
    const honorific = isFemale ? 'आजी' : 'आजोबा';
    return name ? `${name} ${honorific}` : honorific;
  }

  if (lang === 'hi') {
    const honorific = isFemale ? 'दादी' : 'दादाजी';
    return name ? `${name} ${honorific}` : honorific;
  }

  // English
  const honorific = isFemale ? 'Ajji' : 'Ajoba';
  return name ? `${name} ${honorific}` : honorific;
}

/**
 * Build the FULL spoken reminder sentence per language and speak it in one go.
 * Examples:
 * Marathi: "रमेश आजोबा, गोळ्या घेण्याची वेळ झाली आहे. गुलाबी गोल गोळी, बीपी साठी. आणि पांढरी लांबट गोळी, साखरेसाठी, जेवणानंतर."
 * Hindi: "रमेश दादाजी, दवाई लेने का समय हो गया है. गुलाबी गोल गोली, बीपी के लिए. और सफेद लंबी गोली, शुगर के लिए, खाने के बाद."
 * English: "Ramesh Ajoba, it is time for your medicines. Pink round pill, for BP. And white oblong pill, for sugar, after food."
 */
export function buildSpokenReminderSentence(profile = {}, meds = [], lang = 'mr') {
  const displayName = getElderDisplayName(profile, lang);

  if (meds.length === 0) {
    if (lang === 'mr') return `${displayName}, सध्या कोणतीही गोळी बाकी नाही. विश्रांती घ्या.`;
    if (lang === 'hi') return `${displayName}, अभी कोई दवाई बाकी नहीं है. आराम कीजिये.`;
    return `${displayName}, all medicines are done for now. Rest well.`;
  }

  const medDescriptions = meds.map(m => getLocalizedPillDescription(m, lang));

  if (lang === 'mr') {
    let pillsText = '';
    if (medDescriptions.length === 1) {
      pillsText = medDescriptions[0];
    } else {
      const allExceptLast = medDescriptions.slice(0, -1).join('. ');
      const last = medDescriptions[medDescriptions.length - 1];
      pillsText = `${allExceptLast}. आणि ${last}`;
    }
    return `${displayName}, गोळ्या घेण्याची वेळ झाली आहे. ${pillsText}. कृपया पाणी सोबत गोळ्या घ्या.`;
  }

  if (lang === 'hi') {
    let pillsText = '';
    if (medDescriptions.length === 1) {
      pillsText = medDescriptions[0];
    } else {
      const allExceptLast = medDescriptions.slice(0, -1).join('. ');
      const last = medDescriptions[medDescriptions.length - 1];
      pillsText = `${allExceptLast}. और ${last}`;
    }
    return `${displayName}, दवाई लेने का समय हो गया है. ${pillsText}. कृपया पानी के साथ दवाइयाँ लीजिये.`;
  }

  // English
  let pillsText = '';
  if (medDescriptions.length === 1) {
    pillsText = medDescriptions[0];
  } else {
    const allExceptLast = medDescriptions.slice(0, -1).join('. ');
    const last = medDescriptions[medDescriptions.length - 1];
    pillsText = `${allExceptLast}. And ${last}`;
  }
  return `${displayName}, it is time for your medicines. ${pillsText}. Please take your medicines with water.`;
}

/**
 * Success sentence after taking medicines
 */
export function buildSpokenCelebrationSentence(profile = {}, lang = 'mr') {
  const displayName = getElderDisplayName(profile, lang);
  if (lang === 'mr') {
    return `शाब्बास, ${displayName}! तुम्ही सर्व गोळ्या वेळेवर घेतल्या आहेत. खूप छान!`;
  }
  if (lang === 'hi') {
    return `बहुत खूब, ${displayName}! आपने समय पर सभी दवाइयाँ ले ली हैं. शाबाश!`;
  }
  return `Well done, ${displayName}! You have taken all your medicines on time. Great job!`;
}

export const TRANSLATIONS = {
  mr: {
    // Time & Hero
    greetingMorning: (name) => `शुभ सकाळ, ${name}!`,
    greetingAfternoon: (name) => `शुभ दुपार, ${name}!`,
    greetingNight: (name) => `शुभ रात्री, ${name}!`,
    nextMedicineIn: 'पुढील गोळी',
    nextCountdownPrefix: 'पुढील',
    todayProgress: (done, total) => `आज ${total} पैकी ${done} गोळ्या पूर्ण`,
    allMedsDone: 'आजच्या सर्व गोळ्या पूर्ण!',
    appointmentToday: "आजची डॉक्टरांची भेट",
    familyMessageTitle: "कुटुंबाकडून संदेश",
    callFamily: (name) => `${name} यांना फोन करा`,
    emergency: "तातडीचा संपर्क",
    emergencySos: "तातडीची मदत (SOS)",
    
    // Reminder Moment
    reminderAlert: "गोळी घेण्याची वेळ झाली!",
    morningMedicines: (count) => `सकाळची औषधे · ${count} गोळ्या`,
    afternoonMedicines: (count) => `दुपारची औषधे · ${count} गोळ्या`,
    nightMedicines: (count) => `रात्रीची औषधे · ${count} गोळ्या`,
    eatenQuestion: "तुम्ही जेवण / नाश्ता केला का?",
    eatenYes: "हो, जेवण झाले",
    eatenNo: "अजून नाही",
    eatenAdvice: "कृपया आधी थोडे खाऊन घ्या, मग ही गोळी घ्या.",
    tookAllMeds: "मी सर्व गोळ्या घेतल्या",
    notToday: "आज नको (कारण सांगा)",
    skipModalTitle: "गोळी न घेण्याचे कारण निवडा",
    skipReasonDizzy: "चक्कर येत आहे",
    skipReasonStomach: "पोट बिघडले आहे",
    skipReasonNotFeeling: "इच्छा होत नाही",
    skipReasonOther: "इतर काही",
    skipConfirm: "नोंद करा",
    skipDismiss: "मागे जा",
    skippedFeedback: "काळजीपूर्वक नोंद केली. लवकर बरे वाटावे हीच सदिच्छा.",

    // Celebration
    celebrationTitle: (name) => `शाब्बास, ${name}!`,
    celebrationSubtitle: "तुम्ही सर्व गोळ्या वेळेवर घेतल्या. तुमची तब्येत उत्तम राहो!",
    celebrationClose: "छान, पुढे चला",

    // Late / Missed
    missedNotice: "ही गोळी चुकली आहे.",
    doNotDoubleUp: "कृपया एकाच वेळी दुप्पट गोळ्या घेऊ नका. अधिक माहितीसाठी आपल्या डॉक्टरांचा किंवा औषध विक्रेत्याचा सल्ला घ्या.",

    // Mood check
    moodCheckTitle: "आज कसे वाटत आहे?",
    moodGreat: "छान",
    moodOkay: "ठीक",
    moodLow: "बरे नाही",
    moodRecorded: "तुमची विचारपूस नोंदवली!",

    // Audio & accessibility
    readScreen: "स्क्रीन वाचून दाखवा",
    tapToStartAudio: "आवाज सुरू करण्यासाठी येथे स्पर्श करा",
    audioActive: "आवाज सक्रिय आहे",

    // Navigation Tabs
    tabToday: "आज",
    tabMedicines: "औषधे",
    tabMyInfo: "माझी माहिती",
    footerDisclaimer: "हे केवळ आठवण करून देणारे साधन आहे, वैद्यकीय सल्ला नाही.",

    // Setup Wizard
    wizardTitle: "केअरसर्कल सेटअप",
    step1Title: "कोणासाठी काळजी घेत आहात?",
    step1Sub: "नाव आणि आदरार्थी शब्द निवडा. हे सर्व संदेशांमध्ये वापरले जाईल.",
    step2Title: "आठवण करून देणारा आवाज",
    step2Sub: "गोळ्या घेण्याची आठवण कशी करून द्यायची?",
    step3Title: "पहिली औषधे जोडा",
    step3Sub: "गोळीचे नाव, वेळ आणि तिचा रंग-आकार निवडा.",
    step4Title: "कुटुंब संपर्क व पासकोड",
    step4Sub: "तातडीच्या संपर्कासाठी फोन आणि सेटिंग्ससाठी ४-अंकी पासकोड.",
    step5Title: "सर्व तयार!",
    handoverElder: (name) => `सर्व तयारी पूर्ण! आता हा फोन ${name} यांच्या हातात द्या.`,
    startElderMode: (name) => `${name} साठी केअरसर्कल सुरू करा`,

    // Roles & Passcode
    whoIsUsingTitle: "केअरसर्कल कोण वापरत आहे?",
    whoIsUsingSub: "पुढे जाण्यासाठी आपली भूमिका निवडा",
    roleElder: "ज्येष्ठ नागरिक",
    roleElderSub: "मोठी अक्षरे, आवाजी आठवण आणि सोपे दृश्य",
    roleElderBadge: "एका स्पर्शात सुरू",
    roleFamily: "कुटुंब सदस्य",
    roleFamilySub: "आरोग्य स्थिती, गोळ्यांचा अहवाल व संदेश पाठवा",
    roleFamilyBadge: "पासकोड आवश्यक",
    roleCaretaker: "काळजीवाहक",
    roleCaretakerSub: "औषधे, भेटी आणि संपूर्ण नियंत्रण व्यवस्थापन",
    roleCaretakerBadge: "पासकोड आवश्यक",
    enterPasscode: "४-अंकी पासकोड टाका",
    invalidPasscode: "चुकीचा पासकोड. कृपया पुन्हा प्रयत्न करा.",
    passcodePrompt: (roleName) => `${roleName} साठी ४-अंकी पासकोड टाका`,
    switchRole: "भूमिका बदला",
    cancel: "रद्द करा",
    confirm: "खात्री करा",

    // Family Dashboard & Reports
    familyDashboardTitle: "कुटुंब डॅशबोर्ड",
    adherenceRate: "औषध नियमितता दर",
    weeklyAdherence: "या आठवड्यातील नियमितता",
    missedDoses: "चुकलेल्या गोळ्या",
    noMissedDoses: "सर्व गोळ्या वेळेवर घेतल्या आहेत!",
    acknowledgeMissed: "नोंद घेतली",
    acknowledged: "नोंद झाली",
    sendFamilyNote: "प्रेमळ संदेश किंवा व्हॉईस नोट पाठवा",
    typeYourMessage: "येथे प्रेमळ संदेश लिहा...",
    sendNoteBtn: "संदेश पाठवा",
    recordVoiceBtn: "आवाज रेकॉर्ड करा",
    stopRecordBtn: "रेकॉर्डिंग थांबवा",
    noteSentSuccess: "संदेश यशस्वीपणे अद्यतनित झाला!",
    reportsTitle: "आरोग्य व नियमितता अहवाल",
    doseCompliance: "मागील ७ दिवसांची गोळ्यांची स्थिती",
    moodTrend: "मानसिक स्थितीचा कल",

    // Empty states
    emptyNoMedicines: "सध्या कोणतीही औषधे बाकी नाहीत. विश्रांती घ्या!",
    emptyNoAppointments: "आज कोणतीही भेट नाही. शांतपणे विश्रांती घ्या!",
    emptyNoMessages: "नवीन संदेश नाहीत. कुटुंब नेहमी आपल्या सोबत आहे!",

    // Emergency
    emergencyModalTitle: "तातडीची मदत (Emergency SOS)",
    emergencySubtitle: "तातडीच्या प्रसंगी खालील बटणावर स्पर्श करा",
    callAmbulance: "रुग्णवाहिका / आपत्कालीन (११२)",
    callDoctor: "डॉक्टरांना फोन करा",
    callPrimaryContact: "मुख्य कुटुंब संपर्काला फोन करा",
    bloodGroup: "रक्तगट",
    allergies: "ॲलर्जी",

    // PWA & Settings
    offlineStatus: "ऑफलाइन",
    onlineStatus: "ऑनलाइन",
    largeTextSetting: "मोठी अक्षरे (Large Text)",
    largeTextSub: "वाचनासाठी सोयीस्कर मोठी अक्षरे आणि मोठी बटणे",
    passcodeSettings: "भूमिका पासकोड सेटिंग्स",
    caretakerPasscodeLabel: "काळजीवाहक पासकोड",
    familyPasscodeLabel: "कुटुंब सदस्य पासकोड",
    elderPasscodeLabel: "ज्येष्ठ नागरिक पासकोड (पर्यायी)",
    elderOneTapToggle: "ज्येष्ठांसाठी एका स्पर्शात प्रवेश (पासकोड नाही)",
    savePasscodes: "पासकोड जतन करा",
    passcodesSavedSuccess: "पासकोड यशस्वीपणे जतन झाले!"
  },

  hi: {
    // Time & Hero
    greetingMorning: (name) => `शुभ प्रभात, ${name}!`,
    greetingAfternoon: (name) => `शुभ दोपहर, ${name}!`,
    greetingNight: (name) => `शुभ रात्रि, ${name}!`,
    nextMedicineIn: 'अगली दवाई',
    nextCountdownPrefix: 'अगली',
    todayProgress: (done, total) => `आज ${total} में से ${done} दवाइयाँ पूरी`,
    allMedsDone: 'आज की सभी दवाइयाँ पूरी!',
    appointmentToday: "आज की डॉक्टर से भेंट",
    familyMessageTitle: "परिवार का संदेश",
    callFamily: (name) => `${name} को कॉल करें`,
    emergency: "आपातकालीन संपर्क",
    emergencySos: "आपातकालीन मदद (SOS)",
    
    // Reminder Moment
    reminderAlert: "दवाई लेने का समय हो गया!",
    morningMedicines: (count) => `सुबह की दवाइयाँ · ${count} गोली`,
    afternoonMedicines: (count) => `दोपहर की दवाइयाँ · ${count} गोली`,
    nightMedicines: (count) => `रात की दवाइयाँ · ${count} गोली`,
    eatenQuestion: "क्या आपने खाना या नाश्ता कर लिया?",
    eatenYes: "हाँ, खाना हो गया",
    eatenNo: "अभी नहीं",
    eatenAdvice: "कृपया पहले थोड़ा खा लें, फिर यह दवाई लें।",
    tookAllMeds: "मैंने सारी दवाइयाँ ले लीं",
    notToday: "आज नहीं (कारण बताएं)",
    skipModalTitle: "दवाई न लेने का कारण चुनें",
    skipReasonDizzy: "चक्कर आ रहे हैं",
    skipReasonStomach: "पेट खराब है",
    skipReasonNotFeeling: "मन नहीं कर रहा",
    skipReasonOther: "अन्य वजह",
    skipConfirm: "दर्ज करें",
    skipDismiss: "वापस जाएं",
    skippedFeedback: "ध्यानपूर्वक दर्ज किया गया। आशा है आप जल्द बेहतर महसूस करेंगे।",

    // Celebration
    celebrationTitle: (name) => `बहुत खूब, ${name}!`,
    celebrationSubtitle: "आपने समय पर दवाइयाँ लीं। आपकी सेहत अच्छी रहे!",
    celebrationClose: "आगे बढ़ें",

    // Late / Missed
    missedNotice: "यह खुराक छूट गई है।",
    doNotDoubleUp: "कृपया अगली बार दोहरी खुराक न लें। अपने डॉक्टर या फार्मासिस्ट से परामर्श करें।",

    // Mood check
    moodCheckTitle: "आज आप कैसा महसूस कर रहे हैं?",
    moodGreat: "बहुत अच्छा",
    moodOkay: "ठीक-ठाक",
    moodLow: "तबीयत सुस्त",
    moodRecorded: "आपकी स्थिति दर्ज हो गई!",

    // Audio & accessibility
    readScreen: "स्क्रीन पढ़कर सुनाएँ",
    tapToStartAudio: "आवाज़ शुरू करने के लिए यहाँ दबाएँ",
    audioActive: "आवाज़ चालू है",

    // Navigation Tabs
    tabToday: "आज",
    tabMedicines: "दवाइयाँ",
    tabMyInfo: "मेरी जानकारी",
    footerDisclaimer: "यह केवल याद दिलाने का साधन है, चिकित्सीय सलाह नहीं।",

    // Setup Wizard
    wizardTitle: "केयरसर्कल सेटअप",
    step1Title: "किनके लिए देखभाल कर रहे हैं?",
    step1Sub: "नाम और आदरणीय संबोधन चुनें।",
    step2Title: "याद दिलाने वाली आवाज़",
    step2Sub: "दवाइयों की याद कैसे दिलानी है?",
    step3Title: "दवाइयाँ जोड़ें",
    step3Sub: "दवाई का नाम, समय और रंग-रूप चुनें।",
    step4Title: "पारिवारिक संपर्क व पासकोड",
    step4Sub: "कॉल करने के लिए नंबर और सेटिंग्स हेतु ४-अंकीय पासकोड।",
    step5Title: "सब तैयार!",
    handoverElder: (name) => `सब तैयार है! अब यह फ़ोन ${name} को दे दीजिए।`,
    startElderMode: (name) => `${name} के लिए शुरू करें`,

    // Roles & Passcode
    whoIsUsingTitle: "केयरसर्कल कौन इस्तेमाल कर रहा है?",
    whoIsUsingSub: "आगे बढ़ने के लिए अपनी भूमिका चुनें",
    roleElder: "वरिष्ठ नागरिक",
    roleElderSub: "बड़े अक्षर, आवाज़ से याद और आसान दृश्य",
    roleElderBadge: "एक स्पर्श में शुरू",
    roleFamily: "परिवार का सदस्य",
    roleFamilySub: "स्वास्थ्य स्थिति, दवाइयों की रिपोर्ट व संदेश भेजें",
    roleFamilyBadge: "पासकोड आवश्यक",
    roleCaretaker: "देखभालकर्ता",
    roleCaretakerSub: "दवाइयाँ, मुलाक़ातें और पूरा नियंत्रण",
    roleCaretakerBadge: "पासकोड आवश्यक",
    enterPasscode: "४-अंकों का पासकोड दर्ज करें",
    invalidPasscode: "गलत पासकोड। कृपया फिर से प्रयास करें।",
    passcodePrompt: (roleName) => `${roleName} के लिए ४-अंकों का पासकोड दर्ज करें`,
    switchRole: "भूमिका बदलें",
    cancel: "रद्द करें",
    confirm: "पुष्टि करें",

    // Family Dashboard & Reports
    familyDashboardTitle: "परिवार डैशबोर्ड",
    adherenceRate: "दवाई लेने की नियमितता",
    weeklyAdherence: "इस सप्ताह की नियमितता",
    missedDoses: "छूटी हुई दवाइयाँ",
    noMissedDoses: "सभी दवाइयाँ समय पर ली गई हैं!",
    acknowledgeMissed: "जानकारी दर्ज करें",
    acknowledged: "दर्ज हुआ",
    sendFamilyNote: "प्यार भरा संदेश या वॉयस नोट भेजें",
    typeYourMessage: "यहाँ प्यार भरा संदेश लिखें...",
    sendNoteBtn: "संदेश भेजें",
    recordVoiceBtn: "आवाज़ रिकॉर्ड करें",
    stopRecordBtn: "रिकॉर्डिंग रोकें",
    noteSentSuccess: "संदेश सफलतापूर्वक भेजा गया!",
    reportsTitle: "स्वास्थ्य और नियमितता रिपोर्ट",
    doseCompliance: "पिछले ७ दिनों की दवाई स्थिति",
    moodTrend: "मनोदशा का रुझान",

    // Empty states
    emptyNoMedicines: "अभी कोई दवाई बाकी नहीं है। आराम करें!",
    emptyNoAppointments: "आज कोई मुलाक़ात नहीं है। आराम से चाय पिएँ!",
    emptyNoMessages: "कोई नया संदेश नहीं है। परिवार सदैव आपके साथ है!",

    // Emergency
    emergencyModalTitle: "आपातकालीन सहायता (Emergency SOS)",
    emergencySubtitle: "आपात स्थिति में नीचे दिए बटन पर स्पर्श करें",
    callAmbulance: "एम्बुलेंस / आपातकालीन (११२)",
    callDoctor: "डॉक्टर को कॉल करें",
    callPrimaryContact: "मुख्य परिवार संपर्क को कॉल करें",
    bloodGroup: "ब्लड ग्रुप",
    allergies: "एलर्जी",

    // PWA & Settings
    offlineStatus: "ऑफ़लाइन",
    onlineStatus: "ऑनलाइन",
    largeTextSetting: "बड़े अक्षर (Large Text)",
    largeTextSub: "पढ़ने में आसान बड़े अक्षर और बड़े बटन",
    passcodeSettings: "भूमिका पासकोड सेटिंग्स",
    caretakerPasscodeLabel: "देखभालकर्ता पासकोड",
    familyPasscodeLabel: "परिवार सदस्य पासकोड",
    elderPasscodeLabel: "वरिष्ठ नागरिक पासकोड (वैकल्पिक)",
    elderOneTapToggle: "वरिष्ठों के लिए एक स्पर्श में प्रवेश (पासकोड नहीं)",
    savePasscodes: "पासकोड सुरक्षित करें",
    passcodesSavedSuccess: "पासकोड सफलतापूर्वक सुरक्षित किए गए!"
  },

  en: {
    // Time & Hero
    greetingMorning: (name) => `Good morning, ${name}!`,
    greetingAfternoon: (name) => `Good afternoon, ${name}!`,
    greetingNight: (name) => `Good evening, ${name}!`,
    nextMedicineIn: 'Next medicine',
    nextCountdownPrefix: 'Next',
    todayProgress: (done, total) => `${done} of ${total} medicines taken today`,
    allMedsDone: 'All medicines taken for today!',
    appointmentToday: "Today's Appointment",
    familyMessageTitle: "Family Message",
    callFamily: (name) => `Call ${name}`,
    emergency: "Emergency",
    emergencySos: "Emergency (SOS)",
    
    // Reminder Moment
    reminderAlert: "Time for your medicines!",
    morningMedicines: (count) => `Morning medicines · ${count} pill${count > 1 ? 's' : ''}`,
    afternoonMedicines: (count) => `Afternoon medicines · ${count} pill${count > 1 ? 's' : ''}`,
    nightMedicines: (count) => `Night medicines · ${count} pill${count > 1 ? 's' : ''}`,
    eatenQuestion: "Have you eaten?",
    eatenYes: "Yes, I have eaten",
    eatenNo: "Not yet",
    eatenAdvice: "Please eat something light first, then take this pill.",
    tookAllMeds: "I took all my medicines",
    notToday: "Not today (give reason)",
    skipModalTitle: "Why are you skipping today?",
    skipReasonDizzy: "Feeling dizzy",
    skipReasonStomach: "Stomach upset",
    skipReasonNotFeeling: "Don't feel like it",
    skipReasonOther: "Other reason",
    skipConfirm: "Save Reason",
    skipDismiss: "Go Back",
    skippedFeedback: "Logged gently. We hope you feel better soon.",

    // Celebration
    celebrationTitle: (name) => `Well done, ${name}!`,
    celebrationSubtitle: "You have taken all your medicines on time. Take care!",
    celebrationClose: "Done",

    // Late / Missed
    missedNotice: "This dose was missed.",
    doNotDoubleUp: "Please don't double up. Ask your doctor or pharmacist.",

    // Mood check
    moodCheckTitle: "How are you feeling today?",
    moodGreat: "Great",
    moodOkay: "Okay",
    moodLow: "Low",
    moodRecorded: "Thank you for checking in!",

    // Audio & accessibility
    readScreen: "Read screen aloud",
    tapToStartAudio: "Tap to Enable Voice & Chimes",
    audioActive: "Voice is ready",

    // Navigation Tabs
    tabToday: "Today",
    tabMedicines: "Medicines",
    tabMyInfo: "My Info",
    footerDisclaimer: "Reminder tool only, not medical advice.",

    // Setup Wizard
    wizardTitle: "CareCircle Setup",
    step1Title: "Who are we caring for?",
    step1Sub: "Enter elder's name and honorific. This will personalize every screen.",
    step2Title: "Reminder Voice",
    step2Sub: "Choose how they will hear their medication reminders.",
    step3Title: "Add First Medicines",
    step3Sub: "Medicine name, dose time, and pill appearance.",
    step4Title: "Family Contact & Passcode",
    step4Sub: "Caregiver contact and 4-digit passcode for settings.",
    step5Title: "All Set!",
    handoverElder: (name) => `All set! Hand the phone to ${name}.`,
    startElderMode: (name) => `Start CareCircle for ${name}`,

    // Roles & Passcode
    whoIsUsingTitle: "Who is using CareCircle?",
    whoIsUsingSub: "Select your role to continue",
    roleElder: "Elderly Person",
    roleElderSub: "Large text, voice reminders and simple cards",
    roleElderBadge: "One-tap access",
    roleFamily: "Family Member",
    roleFamilySub: "Track adherence, view reports and send notes",
    roleFamilyBadge: "Passcode required",
    roleCaretaker: "Caretaker",
    roleCaretakerSub: "Manage medicines, appointments and full settings",
    roleCaretakerBadge: "Passcode required",
    enterPasscode: "Enter 4-digit Passcode",
    invalidPasscode: "Incorrect passcode. Please try again.",
    passcodePrompt: (roleName) => `Enter 4-digit passcode for ${roleName}`,
    switchRole: "Switch Role",
    cancel: "Cancel",
    confirm: "Confirm",

    // Family Dashboard & Reports
    familyDashboardTitle: "Family Dashboard",
    adherenceRate: "Adherence Rate",
    weeklyAdherence: "Weekly Adherence",
    missedDoses: "Missed Doses",
    noMissedDoses: "All doses taken on time!",
    acknowledgeMissed: "Acknowledge",
    acknowledged: "Acknowledged",
    sendFamilyNote: "Send a Warm Note or Voice Message",
    typeYourMessage: "Type a warm note here...",
    sendNoteBtn: "Send Message",
    recordVoiceBtn: "Record Voice",
    stopRecordBtn: "Stop Recording",
    noteSentSuccess: "Message updated successfully!",
    reportsTitle: "Health & Adherence Reports",
    doseCompliance: "Last 7 Days Dose Compliance",
    moodTrend: "Mood Trends",

    // Empty states
    emptyNoMedicines: "No medicines due right now. Rest well!",
    emptyNoAppointments: "No appointments today. Time to relax with chai!",
    emptyNoMessages: "No new messages. Your family is thinking of you!",

    // Emergency
    emergencyModalTitle: "Emergency SOS Support",
    emergencySubtitle: "Tap any emergency contact below for immediate assistance",
    callAmbulance: "Call Ambulance / Emergency (112)",
    callDoctor: "Call Doctor",
    callPrimaryContact: "Call Primary Family Contact",
    bloodGroup: "Blood Group",
    allergies: "Allergies",

    // PWA & Settings
    offlineStatus: "Offline",
    onlineStatus: "Online",
    largeTextSetting: "Large Text Mode",
    largeTextSub: "Easier reading with at least 18px text and larger touch targets",
    passcodeSettings: "Role Passcode Settings",
    caretakerPasscodeLabel: "Caretaker Passcode",
    familyPasscodeLabel: "Family Member Passcode",
    elderPasscodeLabel: "Elderly Person Passcode (Optional)",
    elderOneTapToggle: "Enable One-Tap Mode for Elder (No Passcode)",
    savePasscodes: "Save Passcodes",
    passcodesSavedSuccess: "Passcodes saved successfully!"
  }
};

export function t(key, lang = 'mr', ...args) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.mr;
  const val = dict[key] !== undefined ? dict[key] : (TRANSLATIONS.en[key] !== undefined ? TRANSLATIONS.en[key] : key);
  if (typeof val === 'function') {
    return val(...args);
  }
  return val;
}

/**
 * Renders the top-bar pill language switcher: [ मर | हिं | EN ]
 */
export function renderLanguageSwitcherHtml(currentLang = 'mr') {
  return `
    <div class="lang-switcher-pill" role="group" aria-label="Language selector">
      <button type="button" class="lang-pill-btn ${currentLang === 'mr' ? 'active' : ''}" data-change-lang="mr" title="मराठी">मर</button>
      <button type="button" class="lang-pill-btn ${currentLang === 'hi' ? 'active' : ''}" data-change-lang="hi" title="हिन्दी">हिं</button>
      <button type="button" class="lang-pill-btn ${currentLang === 'en' ? 'active' : ''}" data-change-lang="en" title="English">EN</button>
    </div>
  `;
}
