/**
 * My Info Tab Controller
 * Profile overview, voice settings with full reminder test,
 * and passcode-protected caregiver settings (Edit Profile & Switch Elder).
 */

import {
  getCareData,
  saveCareData,
  persistLanguage,
  switchToNewElder,
  switchToExistingElder,
  getLargeTextMode,
  setLargeTextMode,
  getActiveRole
} from './storage.js';
import { checkVoiceAvailability, testSpokenReminder } from './audio.js';
import { renderLanguageSwitcherHtml, getElderDisplayName, t } from './i18n.js';
import { renderTopBarRoleChip } from './roles.js';
import { Icons } from './icons.js';

export class InfoView {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.onRerunWizard = options.onRerunWizard || (() => {});
    this.onLanguageChange = options.onLanguageChange || (() => {});
    this.onRoleSwitch = options.onRoleSwitch || (() => {});
    this.activeRole = options.activeRole || getActiveRole() || 'elder';
    this.isSettingsUnlocked = (this.activeRole === 'caretaker');
    this.voiceStatus = { hasMr: true, hasHi: true, hasEn: true };
    this.initVoiceCheck();
  }

  async initVoiceCheck() {
    this.voiceStatus = await checkVoiceAvailability();
  }

  init() {
    this.render();
  }

  async render() {
    const data = getCareData();
    const profile = data.profile || {};
    const voiceConfig = data.voiceConfig || {};
    const contacts = data.contacts || [];
    const language = profile.language || 'mr';
    const displayName = getElderDisplayName(profile, language);
    const elders = data.elders || [];

    const showMrVoiceNotice = (language === 'mr' && !this.voiceStatus.hasMr);

    this.container.innerHTML = `
      <div class="info-screen fade-in-view">
        
        <!-- Top bar with Role Chip, Offline Indicator & Language Switcher -->
        <div class="top-nav-row">
          <div class="screen-title-badge">
            ${Icons.user(26)}
            <h1 class="screen-title-text">${t('tabMyInfo', language)}</h1>
          </div>
          <div class="top-bar-actions">
            ${renderTopBarRoleChip(this.activeRole, language)}
            <span class="offline-pill ${navigator.onLine ? 'hidden' : ''}" id="offlineIndicator">${Icons.alert(16)} <span>${t('offlineStatus', language)}</span></span>
            ${renderLanguageSwitcherHtml(language)}
          </div>
        </div>

        <main class="info-main-body">

          <!-- Elder Profile Hero Card -->
          <section class="card profile-hero-card slide-up-card">
            <div class="profile-hero-top">
              <div class="profile-avatar-circle">
                <img src="img/elderly-couple.svg" alt="${displayName}" width="56" height="56" loading="lazy" class="round-elder-art fade-in-image">
              </div>
              <div class="profile-hero-text">
                <h2 class="profile-name-bold">${displayName}</h2>
                <div class="profile-tags-row">
                  <span class="chip-label chip-purpose">${profile.honorific || 'Ajoba'}</span>
                  <span class="chip-label chip-time">${profile.language === 'mr' ? 'मराठी (mr)' : (profile.language === 'hi' ? 'हिन्दी (hi)' : 'English (en)')}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Voice Settings Card -->
          <section class="card voice-settings-card slide-up-card">
            <div class="card-icon-header">
              ${Icons.speaker(24)}
              <h3 class="section-title-sm">Reminder Voice</h3>
            </div>
            
            <div class="voice-settings-body">
              <p class="voice-active-desc">
                Active: <strong>${voiceConfig.type === 'family' ? `Family Voice (${voiceConfig.personName || 'Recorded'})` : 'Device General Voice (Speech AI)'}</strong>
              </p>

              <!-- Notice if no mr-IN voice exists on this device -->
              ${showMrVoiceNotice ? `
                <div class="voice-notice-banner">
                  ${Icons.alert(22)}
                  <span>Marathi voice not available on this device. Use Family Voice for the best result.</span>
                </div>
              ` : ''}

              <!-- Test Voice Button: Speaks full sentence! -->
              <div class="voice-actions-row">
                <button type="button" class="btn btn-secondary btn-test-voice" id="btnTestVoiceFull">
                  ${Icons.play(20)}
                  <span>Test Voice (Full Reminder)</span>
                </button>
              </div>
            </div>
          </section>

          <!-- Family Contacts Card -->
          <section class="card contacts-card slide-up-card">
            <div class="card-icon-header">
              ${Icons.phone(24)}
              <h3 class="section-title-sm">Family & Emergency Contacts</h3>
            </div>

            <div class="contacts-list-stack">
              ${contacts.length > 0 ? contacts.map(c => `
                <div class="contact-card-row">
                  <div class="contact-left-icon">
                    ${Icons.user(26)}
                  </div>
                  <div class="contact-details">
                    <h4 class="contact-title">${c.name} (${c.relation || 'Caregiver'})</h4>
                    <span class="contact-sub">${c.role || 'Primary Caregiver'}</span>
                    <a href="tel:${c.phone?.replace(/\s+/g, '')}" class="contact-phone-number">${c.phone}</a>
                  </div>
                  <a href="tel:${c.phone?.replace(/\s+/g, '')}" class="btn-dial-circle" aria-label="Call ${c.name}">
                    ${Icons.phone(22)}
                  </a>
                </div>
              `).join('') : '<p class="empty-text">No contacts configured</p>'}
            </div>
          </section>

          <!-- Accessibility Large-Text Toggle Card -->
          <section class="card accessibility-card slide-up-card">
            <div class="card-icon-header">
              ${Icons.user(24)}
              <h3 class="section-title-sm">${t('largeTextSetting', language)}</h3>
            </div>
            
            <div class="settings-toggle-row">
              <div class="toggle-info-wrap">
                <strong class="toggle-label-main">${t('largeTextSetting', language)}</strong>
                <p class="toggle-sub-desc">${t('largeTextSub', language)}</p>
              </div>
              <label class="switch-toggle" for="toggleLargeText">
                <input type="checkbox" id="toggleLargeText" ${getLargeTextMode() ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </section>

          <!-- Caregiver Protected Settings Section -->
          <section class="card caregiver-guard-card slide-up-card">
            <div class="card-icon-header">
              ${Icons.lock(24)}
              <h3 class="section-title-sm">Caregiver Settings</h3>
            </div>

            ${!this.isSettingsUnlocked ? `
              <div class="passcode-box">
                <p class="passcode-prompt">Enter 4-digit caretaker passcode to edit:</p>
                <div class="passcode-row">
                  <input type="password" maxlength="4" id="passcodeInput" class="form-input passcode-input" placeholder="••••">
                  <button type="button" class="btn btn-secondary btn-unlock-passcode" id="btnUnlockPasscode">Unlock</button>
                </div>
                <small class="passcode-hint">Default passcode: ${data.security?.caretakerPasscode || '1234'}</small>
              </div>
            ` : `
              <div class="unlocked-caregiver-panel">
                <div class="unlocked-badge-pill">
                  ${Icons.check(18)}
                  <span>Caregiver Mode Unlocked</span>
                </div>

                <!-- 1. Edit Profile Form -->
                <div class="edit-profile-subcard">
                  <h4 class="subcard-title">Edit Elder Profile</h4>
                  
                  <div class="form-group">
                    <label class="form-label" for="editElderName">Elder Name</label>
                    <input type="text" id="editElderName" class="form-input" value="${profile.name || ''}" placeholder="e.g. Ramesh">
                  </div>

                  <div class="form-row-2">
                    <div class="form-group">
                      <label class="form-label" for="editHonorific">Honorific</label>
                      <select id="editHonorific" class="form-input">
                        <option value="Ajoba" ${profile.honorific === 'Ajoba' ? 'selected' : ''}>Ajoba (आजोबा / दादाजी)</option>
                        <option value="Ajji" ${profile.honorific === 'Ajji' ? 'selected' : ''}>Ajji (आजी / दादी)</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="editLanguage">Language</label>
                      <select id="editLanguage" class="form-input">
                        <option value="mr" ${language === 'mr' ? 'selected' : ''}>मराठी (mr)</option>
                        <option value="hi" ${language === 'hi' ? 'selected' : ''}>हिन्दी (hi)</option>
                        <option value="en" ${language === 'en' ? 'selected' : ''}>English (en)</option>
                      </select>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="editContactName">Caregiver Name</label>
                    <input type="text" id="editContactName" class="form-input" value="${contacts[0]?.name || ''}">
                  </div>

                  <div class="form-row-2">
                    <div class="form-group">
                      <label class="form-label" for="editContactPhone">Caregiver Phone</label>
                      <input type="tel" id="editContactPhone" class="form-input" value="${contacts[0]?.phone || ''}">
                    </div>
                  </div>

                  <button type="button" class="btn btn-primary btn-save-profile" id="btnSaveProfile">
                    ${Icons.check(22)}
                    <span>Save Profile Changes</span>
                  </button>
                </div>

                <!-- 2. Passcode Management for all 3 Roles -->
                <div class="passcodes-subcard">
                  <h4 class="subcard-title">${t('passcodeSettings', language)}</h4>
                  
                  <div class="form-row-2">
                    <div class="form-group">
                      <label class="form-label" for="editCaretakerPasscode">${t('caretakerPasscodeLabel', language)}</label>
                      <input type="password" maxlength="4" id="editCaretakerPasscode" class="form-input" value="${data.security?.caretakerPasscode || '1234'}">
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="editFamilyPasscode">${t('familyPasscodeLabel', language)}</label>
                      <input type="password" maxlength="4" id="editFamilyPasscode" class="form-input" value="${data.security?.familyPasscode || '5678'}">
                    </div>
                  </div>

                  <div class="form-row-2">
                    <div class="form-group">
                      <label class="form-label" for="editElderPasscode">${t('elderPasscodeLabel', language)}</label>
                      <input type="password" maxlength="4" id="editElderPasscode" class="form-input" value="${data.security?.elderPasscode || ''}" placeholder="Optional">
                    </div>
                    <div class="form-group toggle-group-inline">
                      <label class="checkbox-label" for="toggleElderOneTap">
                        <input type="checkbox" id="toggleElderOneTap" ${data.security?.oneTapElder !== false ? 'checked' : ''}>
                        <span>${t('elderOneTapToggle', language)}</span>
                      </label>
                    </div>
                  </div>

                  <button type="button" class="btn btn-secondary btn-save-passcodes" id="btnSavePasscodes">
                    ${Icons.lock(20)}
                    <span>${t('savePasscodes', language)}</span>
                  </button>
                  <span class="passcode-feedback-msg hidden" id="passcodesFeedbackMsg">${t('passcodesSavedSuccess', language)}</span>
                </div>

                <!-- 3. Switch Elder Section -->
                <div class="switch-elder-subcard">
                  <h4 class="subcard-title">Multi-Elder Management</h4>
                  <p class="subcard-desc">Set up another elder without deleting existing data.</p>
                  
                  <button type="button" class="btn btn-secondary btn-switch-elder" id="btnStartNewElder">
                    ${Icons.plus(22)}
                    <span>Switch to a Different Elder (New Setup)</span>
                  </button>

                  ${elders.length > 0 ? `
                    <div class="saved-elders-list">
                      <label class="form-label" style="margin-top: 12px;">Or switch to existing saved elder:</label>
                      <div class="saved-elders-chips">
                        ${elders.map(e => `
                          <button type="button" class="elder-switch-chip" data-elder-id="${e.activeElderId}">
                            ${Icons.user(16)} ${e.profile?.name || 'Elder'} (${e.profile?.honorific})
                          </button>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>

                <!-- 4. Voice Toggle -->
                <button type="button" class="btn btn-secondary btn-toggle-voice" id="btnToggleVoiceMode">
                  ${Icons.refresh(20)}
                  <span>Switch Voice Mode (${voiceConfig.type === 'family' ? 'Use General Speech AI' : 'Use Family Voice'})</span>
                </button>

              </div>
            `}
          </section>

        </main>

        <footer class="app-disclaimer-footer">
          <p>${t('footerDisclaimer', language)}</p>
        </footer>

      </div>
    `;

    this.bindEvents(data);
  }

  bindEvents(data) {
    const profile = data.profile || {};
    const voiceConfig = data.voiceConfig || {};
    const language = profile.language || 'mr';

    // Role Switcher
    this.container.querySelector('#btnTopRoleSwitch')?.addEventListener('click', () => {
      this.onRoleSwitch();
    });

    // Large-Text Toggle
    document.getElementById('toggleLargeText')?.addEventListener('change', (e) => {
      setLargeTextMode(e.target.checked);
    });

    // Save Passcodes for 3 roles
    document.getElementById('btnSavePasscodes')?.addEventListener('click', () => {
      const cur = getCareData();
      if (!cur.security) cur.security = {};
      cur.security.caretakerPasscode = document.getElementById('editCaretakerPasscode')?.value.trim() || '1234';
      cur.security.familyPasscode = document.getElementById('editFamilyPasscode')?.value.trim() || '5678';
      cur.security.elderPasscode = document.getElementById('editElderPasscode')?.value.trim() || '';
      cur.security.oneTapElder = !!document.getElementById('toggleElderOneTap')?.checked;
      saveCareData(cur);
      const msg = document.getElementById('passcodesFeedbackMsg');
      if (msg) {
        msg.classList.remove('hidden');
        setTimeout(() => msg.classList.add('hidden'), 2500);
      }
    });

    // Top bar language buttons
    document.querySelectorAll('[data-change-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        const newLang = btn.dataset.changeLang;
        persistLanguage(newLang);
        this.onLanguageChange(newLang);
      });
    });

    // Test Voice Full Reminder
    document.getElementById('btnTestVoiceFull')?.addEventListener('click', () => {
      const current = getCareData();
      testSpokenReminder(
        current.profile,
        current.medications || [],
        current.voiceConfig || {},
        current.profile?.language || 'mr'
      );
    });

    // Passcode Unlock
    const unlockBtn = document.getElementById('btnUnlockPasscode');
    const passInput = document.getElementById('passcodeInput');
    if (unlockBtn && passInput) {
      unlockBtn.addEventListener('click', () => {
        const entered = passInput.value.trim();
        const correct = data.security?.caretakerPasscode || data.contacts?.[0]?.passcode || '1234';
        if (entered === correct) {
          this.isSettingsUnlocked = true;
          this.render();
        } else {
          alert('Incorrect passcode. Please try again.');
          passInput.value = '';
        }
      });
    }

    // Save Profile Changes
    document.getElementById('btnSaveProfile')?.addEventListener('click', () => {
      const current = getCareData();
      const newName = document.getElementById('editElderName')?.value.trim();
      const newHonorific = document.getElementById('editHonorific')?.value;
      const newLang = document.getElementById('editLanguage')?.value;
      const newContactName = document.getElementById('editContactName')?.value.trim();
      const newContactPhone = document.getElementById('editContactPhone')?.value.trim();
      const newPasscode = document.getElementById('editPasscode')?.value.trim();

      current.profile.name = newName;
      current.profile.honorific = newHonorific;
      current.profile.language = newLang;

      if (!current.contacts || current.contacts.length === 0) {
        current.contacts = [{ id: 'contact_1', name: newContactName, phone: newContactPhone, passcode: newPasscode }];
      } else {
        current.contacts[0].name = newContactName;
        current.contacts[0].phone = newContactPhone;
        current.contacts[0].passcode = newPasscode;
      }

      saveCareData(current);
      persistLanguage(newLang);
      alert('Profile updated successfully.');
      this.render();
    });

    // Switch to a Different Elder (Start fresh setup without deleting existing elder data)
    document.getElementById('btnStartNewElder')?.addEventListener('click', () => {
      switchToNewElder();
      this.onRerunWizard();
    });

    // Switch to existing archived elder
    document.querySelectorAll('.elder-switch-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.elderId;
        switchToExistingElder(id);
        this.render();
      });
    });

    // Toggle Voice Mode
    document.getElementById('btnToggleVoiceMode')?.addEventListener('click', () => {
      const current = getCareData();
      current.voiceConfig.type = current.voiceConfig.type === 'family' ? 'general' : 'family';
      saveCareData(current);
      this.render();
    });
  }
}
