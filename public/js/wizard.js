/**
 * First-Run Setup Wizard Controller
 * Full-screen steps with friendly illustrations, big typography, and progress dots.
 * Strictly starts BLANK on fresh installations (no hardcoded names).
 */

import { getCareData, saveCareData } from './storage.js';
import { generatePillSvg, getLocalizedPillDescription, PILL_SHAPES, PILL_COLORS, PILL_SIZES } from './pillSvg.js';
import { speakFullSentence, FamilyVoiceRecorder, playBase64Audio } from './audio.js';
import { renderLanguageSwitcherHtml, getElderDisplayName, buildSpokenReminderSentence, t } from './i18n.js';
import { Icons } from './icons.js';

export class SetupWizard {
  constructor(containerElement, onComplete) {
    this.container = containerElement;
    this.onComplete = onComplete;
    this.currentStep = 1;
    this.totalSteps = 5;

    const existing = getCareData();

    // Start with blank/caretaker-provided draft
    this.wizardData = {
      profile: {
        name: existing.profile?.name || '',
        honorific: existing.profile?.honorific || 'Ajoba',
        language: existing.profile?.language || 'mr'
      },
      voiceConfig: {
        type: existing.voiceConfig?.type || 'general',
        personName: existing.voiceConfig?.personName || '',
        fallbackPhrase: existing.voiceConfig?.fallbackPhrase || '',
        audioBlobBase64: existing.voiceConfig?.audioBlobBase64 || null
      },
      medicine: {
        id: `med_${Date.now()}`,
        name: '',
        dose: '',
        timeOfDay: '08:30',
        period: 'morning',
        windowStart: '08:00',
        windowEnd: '10:00',
        label: '',
        afterFood: false,
        appearance: {
          shape: 'round',
          color: '#F472B6',
          colorName: 'Pink',
          size: 'small',
          markings: '',
          description: ''
        }
      },
      contact: {
        id: 'contact_1',
        name: '',
        relation: '',
        phone: '',
        email: '',
        role: 'Primary Caregiver',
        passcode: '1234'
      },
      security: {
        caretakerPasscode: existing.security?.caretakerPasscode || '1234',
        familyPasscode: existing.security?.familyPasscode || '5678',
        elderPasscode: existing.security?.elderPasscode || '',
        oneTapElder: existing.security?.oneTapElder !== false
      }
    };

    this.recorder = new FamilyVoiceRecorder();
    this.isRecording = false;
  }

  init() {
    this.render();
  }

  render() {
    const lang = this.wizardData.profile.language;

    this.container.innerHTML = `
      <div class="wizard-screen">
        <!-- Top bar with progress and always-visible language switcher -->
        <header class="wizard-top-nav">
          <div class="wizard-progress-bar">
            ${[1, 2, 3, 4, 5].map(step => `
              <div class="progress-dot ${step === this.currentStep ? 'active' : (step < this.currentStep ? 'completed' : '')}"></div>
            `).join('')}
          </div>
          <div class="wizard-top-actions">
            <span class="step-counter-pill">Step ${this.currentStep}/5</span>
            ${renderLanguageSwitcherHtml(lang)}
          </div>
        </header>

        <!-- Step Body with Large Header Illustration -->
        <main class="wizard-body-card">
          ${this.getStepHtml(this.currentStep)}
        </main>
      </div>
    `;

    this.bindEvents(this.currentStep);
  }

  getStepHtml(step) {
    const data = this.wizardData;
    const lang = data.profile.language;
    const honorific = data.profile.honorific;
    const isAjji = honorific === 'Ajji';

    if (step === 1) {
      return `
        <div class="wizard-step-illustration">
          <div class="wizard-welcome-art-wrap">
            <img src="img/family-welcome.svg" alt="Welcome to CareCircle" width="220" height="150" loading="lazy" class="wizard-welcome-art fade-in-image">
            <div class="role-art-overlay"></div>
          </div>
        </div>

        <h1 class="wizard-question-title">${t('step1Title', lang)}</h1>
        <p class="wizard-question-sub">${t('step1Sub', lang)}</p>

        <div class="form-group">
          <label class="form-label" for="elderName">
            ${lang === 'mr' ? 'ज्येष्ठ व्यक्तीचे नाव' : (lang === 'hi' ? 'बुजुर्ग का नाम' : "Elder's Full Name")}
          </label>
          <input type="text" id="elderName" class="form-input" value="${data.profile.name}" placeholder="${lang === 'mr' ? 'उदा. रमेश / सुमन' : (lang === 'hi' ? 'उदा. रमेश / सुमन' : 'e.g. Ramesh / Suman')}">
        </div>

        <div class="form-group">
          <label class="form-label">
            ${lang === 'mr' ? 'कसे संबोधायचे?' : (lang === 'hi' ? 'किस संबोधन से बुलाएं?' : 'How should the app address them?')}
          </label>
          <div class="choice-cards-row">
            <button type="button" class="choice-card ${!isAjji ? 'selected' : ''}" id="btnSelectAjoba">
              <span class="choice-tag-title">${lang === 'mr' ? 'आजोबा' : (lang === 'hi' ? 'दादाजी' : 'Ajoba')}</span>
              <span class="choice-tag-sub">${lang === 'mr' ? 'Grandfather' : (lang === 'hi' ? 'Grandfather' : 'Grandfather')}</span>
            </button>
            <button type="button" class="choice-card ${isAjji ? 'selected' : ''}" id="btnSelectAjji">
              <span class="choice-tag-title">${lang === 'mr' ? 'आजी' : (lang === 'hi' ? 'दादी' : 'Ajji')}</span>
              <span class="choice-tag-sub">${lang === 'mr' ? 'Grandmother' : (lang === 'hi' ? 'Grandmother' : 'Grandmother')}</span>
            </button>
          </div>
        </div>

        <div class="wizard-actions-row">
          <button type="button" class="btn btn-primary" id="btnNext1">
            <span>${lang === 'mr' ? 'पुढे चला' : (lang === 'hi' ? 'आगे बढ़ें' : 'Next: Voice Setup')}</span>
            ${Icons.arrowRight(24)}
          </button>
        </div>
      `;
    }

    if (step === 2) {
      const displayName = getElderDisplayName(data.profile, lang);
      return `
        <div class="wizard-step-illustration">
          <div class="illus-circle illus-voice">
            ${Icons.speaker(56)}
          </div>
        </div>

        <h1 class="wizard-question-title">${t('step2Title', lang)}</h1>
        <p class="wizard-question-sub">${t('step2Sub', lang)}</p>

        <div class="voice-cards-stack">
          <!-- Option A: General Voice -->
          <div class="voice-selection-card ${data.voiceConfig.type === 'general' ? 'selected' : ''}" id="cardSelectGeneral">
            <div class="voice-card-top">
              <span class="voice-opt-badge">A</span>
              <div class="voice-card-text">
                <h3 class="voice-card-title">${lang === 'mr' ? 'डिव्हाइसचा आवाज (Speech AI)' : (lang === 'hi' ? 'डिवाइस की आवाज़ (Speech AI)' : 'General Device Voice (Speech AI)')}</h3>
                <p class="voice-card-desc">${lang === 'mr' ? 'स्पष्ट व हळुवार सूचना' : (lang === 'hi' ? 'स्पष्ट और शांत आवाज़' : 'Gentle speech in Indian accent')}</p>
              </div>
            </div>
            <button type="button" class="btn btn-secondary btn-sample-play" id="btnPlaySampleGeneral">
              ${Icons.play(20)}
              <span>${lang === 'mr' ? 'नमुना ऐका' : (lang === 'hi' ? 'सैंपल सुनें' : 'Play Sample')}</span>
            </button>
          </div>

          <!-- Option B: Family Voice -->
          <div class="voice-selection-card ${data.voiceConfig.type === 'family' ? 'selected' : ''}" id="cardSelectFamily">
            <div class="voice-card-top">
              <span class="voice-opt-badge">B</span>
              <div class="voice-card-text">
                <h3 class="voice-card-title">${lang === 'mr' ? 'कुटुंबातील व्यक्तीचा आवाज' : (lang === 'hi' ? 'परिवार की आवाज़' : 'Family Voice (Personal Recording)')}</h3>
                <p class="voice-card-desc">${lang === 'mr' ? 'नातू, मुलगी किंवा नातेवाईकाचा स्वतःचा आवाज रेकॉर्ड करा' : (lang === 'hi' ? 'पोता, बेटी या परिवारजन की खुद की आवाज़ रिकॉर्ड करें' : 'Record a grandson, daughter, or loved one')}</p>
              </div>
            </div>

            <div class="family-record-box">
              <div class="form-group">
                <label class="form-label" for="voicePersonName">
                  ${lang === 'mr' ? 'कोणाचा आवाज आहे?' : (lang === 'hi' ? 'किसकी आवाज़ है?' : 'Who is speaking?')}
                </label>
                <input type="text" id="voicePersonName" class="form-input" value="${data.voiceConfig.personName}" placeholder="${lang === 'mr' ? 'उदा. आरव (नातू)' : (lang === 'hi' ? 'उदा. आरव (पोता)' : 'e.g. Grandson')}">
              </div>

              <div class="record-controls-row">
                <button type="button" class="btn btn-secondary ${this.isRecording ? 'recording-active' : ''}" id="btnRecordToggle">
                  ${Icons.mic(22)}
                  <span id="recordLabel">${this.isRecording ? 'Stop Recording' : (data.voiceConfig.audioBlobBase64 ? 'Re-record' : 'Record (5-10 sec)')}</span>
                </button>
                ${data.voiceConfig.audioBlobBase64 ? `
                  <button type="button" class="btn btn-secondary" id="btnPlayFamilyPreview">
                    ${Icons.play(20)}
                    <span>Listen</span>
                  </button>
                ` : ''}
              </div>

              <div class="fallback-box">
                <label class="form-label" style="font-size: 18px;" for="fallbackPhrase">
                  ${lang === 'mr' ? 'किंवा हवी ती वाक्यरचना लिहा:' : (lang === 'hi' ? 'या मनचाहा वाक्य लिखें:' : 'Or type custom phrase:')}
                </label>
                <input type="text" id="fallbackPhrase" class="form-input" style="font-size: 18px;" value="${data.voiceConfig.fallbackPhrase}" placeholder="${lang === 'mr' ? `${displayName}, गोळ्या खाण्याची वेळ झाली आहे.` : `${displayName}, दवाई लेने का समय हो गया है.`}">
              </div>
            </div>
          </div>
        </div>

        <div class="wizard-actions-row">
          <button type="button" class="btn btn-secondary btn-back" id="btnPrev2">${Icons.arrowLeft(24)} ${lang === 'mr' ? 'मागे' : (lang === 'hi' ? 'वापस' : 'Back')}</button>
          <button type="button" class="btn btn-primary" id="btnNext2">
            <span>${lang === 'mr' ? 'पुढे चला' : (lang === 'hi' ? 'आगे बढ़ें' : 'Next: Medicine')}</span>
            ${Icons.arrowRight(24)}
          </button>
        </div>
      `;
    }

    if (step === 3) {
      const med = data.medicine;
      const app = med.appearance;
      return `
        <div class="wizard-step-illustration">
          <div class="illus-circle illus-pill">
            ${Icons.pill(56)}
          </div>
        </div>

        <h1 class="wizard-question-title">${t('step3Title', lang)}</h1>
        <p class="wizard-question-sub">${t('step3Sub', lang)}</p>

        <div class="form-group">
          <label class="form-label" for="medName">
            ${lang === 'mr' ? 'औषधाचे नाव' : (lang === 'hi' ? 'दवाई का नाम' : 'Medicine Name')}
          </label>
          <input type="text" id="medName" class="form-input" value="${med.name}" placeholder="${lang === 'mr' ? 'उदा. Telmisartan / Paracetamol' : 'e.g. Metformin / Telmisartan'}">
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label" for="medDose">Dose</label>
            <input type="text" id="medDose" class="form-input" value="${med.dose}" placeholder="40 mg / 1 pill">
          </div>
          <div class="form-group">
            <label class="form-label" for="medTime">Time</label>
            <input type="time" id="medTime" class="form-input" value="${med.timeOfDay}">
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label" for="medLabel">Purpose Label</label>
            <input type="text" id="medLabel" class="form-input" value="${med.label}" placeholder="e.g. For BP / Sugar">
          </div>
          <div class="form-group">
            <label class="form-label">Food Timing</label>
            <div class="toggle-group">
              <button type="button" class="toggle-btn ${!med.afterFood ? 'active' : ''}" id="btnBeforeFood">Before food</button>
              <button type="button" class="toggle-btn ${med.afterFood ? 'active' : ''}" id="btnAfterFood">After food</button>
            </div>
          </div>
        </div>

        <!-- Pill Designer Card -->
        <div class="pill-designer-box">
          <div class="pill-designer-hero">
            <div class="pill-designer-graphic" id="designerGraphic">
              ${generatePillSvg(app, 96, 96)}
            </div>
            <div class="pill-designer-desc" id="designerDesc">
              ${getLocalizedPillDescription(med, lang)}
            </div>
          </div>

          <!-- Color Swatches -->
          <div class="selector-row-item">
            <span class="selector-title">Color:</span>
            <div class="color-palette-row">
              ${PILL_COLORS.map(c => `
                <button type="button" class="swatch-btn ${app.colorName === c.nameEn ? 'active' : ''}" data-hex="${c.hex}" data-name="${c.nameEn}" style="background-color: ${c.hex};" title="${c.nameEn}"></button>
              `).join('')}
            </div>
          </div>

          <!-- Shape Buttons -->
          <div class="selector-row-item">
            <span class="selector-title">Shape:</span>
            <div class="shape-buttons-row">
              ${PILL_SHAPES.map(s => `
                <button type="button" class="shape-btn ${app.shape === s.id ? 'active' : ''}" data-shape="${s.id}">${s.labelEn}</button>
              `).join('')}
            </div>
          </div>

          <!-- Size Buttons -->
          <div class="selector-row-item">
            <span class="selector-title">Size:</span>
            <div class="size-buttons-row">
              ${PILL_SIZES.map(s => `
                <button type="button" class="size-btn ${app.size === s.id ? 'active' : ''}" data-size="${s.id}">${s.labelEn}</button>
              `).join('')}
            </div>
          </div>

          <!-- Markings -->
          <div class="form-group" style="margin-top: 10px; margin-bottom: 0;">
            <label class="form-label" style="font-size: 18px;" for="medMarkings">Markings on pill (e.g. T40):</label>
            <input type="text" id="medMarkings" class="form-input" style="font-size: 18px;" value="${app.markings}">
          </div>
        </div>

        <div class="wizard-actions-row">
          <button type="button" class="btn btn-secondary btn-back" id="btnPrev3">${Icons.arrowLeft(24)} ${lang === 'mr' ? 'मागे' : (lang === 'hi' ? 'वापस' : 'Back')}</button>
          <button type="button" class="btn btn-primary" id="btnNext3">
            <span>${lang === 'mr' ? 'पुढे चला' : (lang === 'hi' ? 'आगे बढ़ें' : 'Next: Family Contact')}</span>
            ${Icons.arrowRight(24)}
          </button>
        </div>
      `;
    }

    if (step === 4) {
      const c = data.contact;
      return `
        <div class="wizard-step-illustration">
          <div class="illus-circle illus-phone">
            ${Icons.phone(56)}
          </div>
        </div>

        <h1 class="wizard-question-title">${t('step4Title', lang)}</h1>
        <p class="wizard-question-sub">${t('step4Sub', lang)}</p>

        <div class="form-group">
          <label class="form-label" for="contactName">Caregiver / Family Name</label>
          <input type="text" id="contactName" class="form-input" value="${c.name}" placeholder="e.g. Rahul / Priya">
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label" for="contactRelation">Relation</label>
            <input type="text" id="contactRelation" class="form-input" value="${c.relation}" placeholder="e.g. Son / Daughter">
          </div>
          <div class="form-group">
            <label class="form-label" for="contactPhone">Phone Number</label>
            <input type="tel" id="contactPhone" class="form-input" value="${c.phone}" placeholder="+91 98765 43210">
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label" for="contactEmail">Email</label>
            <input type="email" id="contactEmail" class="form-input" value="${c.email}" placeholder="rahul@familycare.in">
          </div>
          <div class="form-group">
            <label class="form-label" for="contactPasscode">${t('caretakerPasscodeLabel', lang)}</label>
            <input type="password" maxlength="4" id="contactPasscode" class="form-input" value="${c.passcode || '1234'}">
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label" for="wizardFamilyPasscode">${t('familyPasscodeLabel', lang)}</label>
            <input type="password" maxlength="4" id="wizardFamilyPasscode" class="form-input" value="${this.wizardData.security.familyPasscode || '5678'}">
          </div>
          <div class="form-group toggle-group-inline">
            <label class="checkbox-label" for="wizardElderOneTap">
              <input type="checkbox" id="wizardElderOneTap" ${this.wizardData.security.oneTapElder ? 'checked' : ''}>
              <span>${t('elderOneTapToggle', lang)}</span>
            </label>
          </div>
        </div>

        <div class="wizard-actions-row">
          <button type="button" class="btn btn-secondary btn-back" id="btnPrev4">${Icons.arrowLeft(24)} ${lang === 'mr' ? 'मागे' : (lang === 'hi' ? 'वापस' : 'Back')}</button>
          <button type="button" class="btn btn-primary" id="btnNext4">
            <span>${lang === 'mr' ? 'समीक्षा करा' : (lang === 'hi' ? 'समीक्षा करें' : 'Finish')}</span>
            ${Icons.arrowRight(24)}
          </button>
        </div>
      `;
    }

    if (step === 5) {
      const displayName = getElderDisplayName(data.profile, lang);
      return `
        <div class="wizard-finish-wrap">
          <div class="wizard-finish-art-wrap">
            <img src="img/celebration.svg" alt="Setup Complete" width="220" height="150" loading="lazy" class="finish-celebration-art fade-in-image">
            <div class="role-art-overlay"></div>
          </div>
          <h1 class="finish-title">${t('step5Title', lang)}</h1>
          <p class="finish-prompt">${t('handoverElder', lang, displayName)}</p>
          <p class="finish-sub">CareCircle is now set up. No passwords or confusing settings for ${displayName}.</p>

          <div class="finish-summary-chip">
            <span>${displayName}</span>
            <span>•</span>
            <span>${data.voiceConfig.type === 'family' ? 'Family Voice' : 'Speech AI'}</span>
            <span>•</span>
            <span>${data.profile.language.toUpperCase()}</span>
          </div>

          <button type="button" class="btn btn-primary btn-launch-app" id="btnFinishLaunch">
            <span>${t('startElderMode', lang, displayName)}</span>
            ${Icons.arrowRight(24)}
          </button>
        </div>
      `;
    }

    return '';
  }

  bindEvents(step) {
    const lang = this.wizardData.profile.language;

    // Global language changer in top bar
    document.querySelectorAll('[data-change-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.wizardData.profile.language = btn.dataset.changeLang;
        this.render();
      });
    });

    if (step === 1) {
      const nameInput = document.getElementById('elderName');
      nameInput.addEventListener('input', (e) => this.wizardData.profile.name = e.target.value.trim());

      document.getElementById('btnSelectAjoba').addEventListener('click', () => {
        this.wizardData.profile.honorific = 'Ajoba';
        this.render();
      });

      document.getElementById('btnSelectAjji').addEventListener('click', () => {
        this.wizardData.profile.honorific = 'Ajji';
        this.render();
      });

      document.getElementById('btnNext1').addEventListener('click', () => {
        this.currentStep = 2;
        this.render();
      });
    }

    if (step === 2) {
      document.getElementById('cardSelectGeneral').addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        this.wizardData.voiceConfig.type = 'general';
        this.render();
      });

      document.getElementById('cardSelectFamily').addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        this.wizardData.voiceConfig.type = 'family';
        this.render();
      });

      document.getElementById('btnPlaySampleGeneral').addEventListener('click', () => {
        const sentence = buildSpokenReminderSentence(this.wizardData.profile, [], lang);
        speakFullSentence(sentence, lang);
      });

      const personInput = document.getElementById('voicePersonName');
      if (personInput) {
        personInput.addEventListener('input', (e) => this.wizardData.voiceConfig.personName = e.target.value.trim());
      }

      const phraseInput = document.getElementById('fallbackPhrase');
      if (phraseInput) {
        phraseInput.addEventListener('input', (e) => this.wizardData.voiceConfig.fallbackPhrase = e.target.value.trim());
      }

      const recBtn = document.getElementById('btnRecordToggle');
      if (recBtn) {
        recBtn.addEventListener('click', async () => {
          if (!this.isRecording) {
            try {
              this.isRecording = true;
              this.render();
              await this.recorder.start((sec) => {
                const lbl = document.getElementById('recordLabel');
                if (lbl) lbl.textContent = `Recording... ${sec}s`;
              });
            } catch (err) {
              this.isRecording = false;
              alert('Microphone access unavailable. You can enter a phrase below.');
              this.render();
            }
          } else {
            this.isRecording = false;
            const res = await this.recorder.stop();
            if (res && res.base64) {
              this.wizardData.voiceConfig.audioBlobBase64 = res.base64;
            }
            this.render();
          }
        });
      }

      const playFamBtn = document.getElementById('btnPlayFamilyPreview');
      if (playFamBtn && this.wizardData.voiceConfig.audioBlobBase64) {
        playFamBtn.addEventListener('click', () => {
          playBase64Audio(this.wizardData.voiceConfig.audioBlobBase64);
        });
      }

      document.getElementById('btnPrev2').addEventListener('click', () => {
        this.currentStep = 1;
        this.render();
      });

      document.getElementById('btnNext2').addEventListener('click', () => {
        this.currentStep = 3;
        this.render();
      });
    }

    if (step === 3) {
      const med = this.wizardData.medicine;
      const app = med.appearance;

      const refreshPill = () => {
        const gEl = document.getElementById('designerGraphic');
        const dEl = document.getElementById('designerDesc');
        app.description = getLocalizedPillDescription(med, lang);
        if (gEl) gEl.innerHTML = generatePillSvg(app, 96, 96);
        if (dEl) dEl.textContent = app.description;
      };

      document.getElementById('medName').addEventListener('input', (e) => {
        med.name = e.target.value;
        refreshPill();
      });
      document.getElementById('medDose').addEventListener('input', (e) => med.dose = e.target.value);
      document.getElementById('medTime').addEventListener('input', (e) => med.timeOfDay = e.target.value);
      document.getElementById('medLabel').addEventListener('input', (e) => {
        med.label = e.target.value;
        refreshPill();
      });

      document.getElementById('btnBeforeFood').addEventListener('click', () => {
        med.afterFood = false;
        document.getElementById('btnBeforeFood').classList.add('active');
        document.getElementById('btnAfterFood').classList.remove('active');
        refreshPill();
      });

      document.getElementById('btnAfterFood').addEventListener('click', () => {
        med.afterFood = true;
        document.getElementById('btnAfterFood').classList.add('active');
        document.getElementById('btnBeforeFood').classList.remove('active');
        refreshPill();
      });

      document.querySelectorAll('.swatch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          app.color = btn.dataset.hex;
          app.colorName = btn.dataset.name;
          document.querySelectorAll('.swatch-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          refreshPill();
        });
      });

      document.querySelectorAll('.shape-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          app.shape = btn.dataset.shape;
          document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          refreshPill();
        });
      });

      document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          app.size = btn.dataset.size;
          document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          refreshPill();
        });
      });

      document.getElementById('medMarkings').addEventListener('input', (e) => {
        app.markings = e.target.value;
        refreshPill();
      });

      document.getElementById('btnPrev3').addEventListener('click', () => {
        this.currentStep = 2;
        this.render();
      });

      document.getElementById('btnNext3').addEventListener('click', () => {
        this.currentStep = 4;
        this.render();
      });
    }

    if (step === 4) {
      const c = this.wizardData.contact;
      const sec = this.wizardData.security;
      document.getElementById('contactName')?.addEventListener('input', (e) => c.name = e.target.value);
      document.getElementById('contactRelation')?.addEventListener('input', (e) => c.relation = e.target.value);
      document.getElementById('contactPhone')?.addEventListener('input', (e) => c.phone = e.target.value);
      document.getElementById('contactEmail')?.addEventListener('input', (e) => c.email = e.target.value);
      document.getElementById('contactPasscode')?.addEventListener('input', (e) => {
        c.passcode = e.target.value;
        sec.caretakerPasscode = e.target.value;
      });
      document.getElementById('wizardFamilyPasscode')?.addEventListener('input', (e) => sec.familyPasscode = e.target.value);
      document.getElementById('wizardElderOneTap')?.addEventListener('change', (e) => sec.oneTapElder = e.target.checked);

      document.getElementById('btnPrev4')?.addEventListener('click', () => {
        this.currentStep = 3;
        this.render();
      });

      document.getElementById('btnNext4')?.addEventListener('click', () => {
        this.currentStep = 5;
        this.render();
      });
    }

    if (step === 5) {
      document.getElementById('btnFinishLaunch')?.addEventListener('click', () => {
        this.completeWizard();
      });
    }
  }

  completeWizard() {
    const current = getCareData();

    current.setupCompleted = true;
    current.profile = {
      ...current.profile,
      name: this.wizardData.profile.name,
      honorific: this.wizardData.profile.honorific,
      language: this.wizardData.profile.language
    };
    current.voiceConfig = {
      ...current.voiceConfig,
      ...this.wizardData.voiceConfig
    };
    current.security = {
      caretakerPasscode: this.wizardData.security?.caretakerPasscode || this.wizardData.contact?.passcode || '1234',
      familyPasscode: this.wizardData.security?.familyPasscode || '5678',
      elderPasscode: this.wizardData.security?.elderPasscode || '',
      oneTapElder: this.wizardData.security?.oneTapElder !== false
    };

    // If medicine was specified, save it
    if (this.wizardData.medicine.name) {
      if (!current.medications || current.medications.length === 0) {
        current.medications = [this.wizardData.medicine];
      } else {
        current.medications.push(this.wizardData.medicine);
      }
    }

    // Save contact
    if (this.wizardData.contact.name || this.wizardData.contact.phone) {
      current.contacts = [this.wizardData.contact];
    }

    saveCareData(current);

    if (this.onComplete) {
      this.onComplete();
    }
  }
}
