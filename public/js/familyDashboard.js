/**
 * CareCircle - Family Member Read-Only Dashboard
 * Allows family members to:
 * - View weekly and today's adherence rate
 * - Acknowledge missed doses
 * - View appointments
 * - View comprehensive reports
 * - Compose text note or record voice message for the elder
 */

import { getCareData, saveCareData } from './storage.js';
import { getCurrentEffectiveDate } from './demo.js';
import { getElderDisplayName, renderLanguageSwitcherHtml, t } from './i18n.js';
import { renderTopBarRoleChip } from './roles.js';
import { Icons, renderFamilyAvatar } from './icons.js';
import { FamilyVoiceRecorder, playBase64Audio } from './audio.js';

export class FamilyDashboardView {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.onRoleSwitch = options.onRoleSwitch || (() => {});
    this.onLanguageChange = options.onLanguageChange || (() => {});
    this.recorder = new FamilyVoiceRecorder();
    this.isRecording = false;
  }

  init() {
    this.render();
  }

  render() {
    const data = getCareData();
    const language = data.profile?.language || 'mr';
    const elderName = getElderDisplayName(data.profile, language);
    const currentDate = getCurrentEffectiveDate();
    const todayKey = currentDate.toISOString().split('T')[0];
    const meds = data.medications || [];
    const dailyDoses = data.dailyDoses || {};
    const missedAcks = data.missedAcknowledgements || {};

    // Calculate adherence
    let takenCount = 0;
    let missedList = [];

    meds.forEach(med => {
      const doseKey = `${todayKey}_${med.id}`;
      const rec = dailyDoses[doseKey];
      if (rec && rec.status === 'taken') {
        takenCount++;
      } else if (rec && rec.status === 'skipped') {
        missedList.push({ ...med, reason: rec.reason || 'Skipped' });
      }
    });

    const totalMeds = meds.length;
    const adherencePercent = totalMeds > 0 ? Math.round((takenCount / totalMeds) * 100) : 100;

    this.container.innerHTML = `
      <div class="family-screen fade-in-view">
        
        <!-- Top Navigation Bar -->
        <header class="top-nav-row family-top-bar">
          <div class="brand-badge">
            <span class="brand-heart-slot">${Icons.heart(24)}</span>
            <span class="brand-title-text">CareCircle</span>
          </div>

          <div class="top-bar-actions">
            ${renderTopBarRoleChip('family', language)}
            <span class="offline-pill hidden" id="offlineIndicator">${Icons.alert(16)} <span>${t('offlineStatus', language)}</span></span>
            ${renderLanguageSwitcherHtml(language)}
          </div>
        </header>

        <main class="family-main-body">

          <!-- Elder Summary Header Card -->
          <section class="card family-elder-summary slide-up-card">
            <div class="family-header-content">
              <div class="elder-avatar-badge">
                <img src="img/elderly-couple.svg" alt="${elderName}" width="64" height="64" loading="lazy" class="round-elder-art fade-in-image">
              </div>
              <div class="elder-title-wrap">
                <span class="care-badge-label">${t('familyDashboardTitle', language)}</span>
                <h1 class="family-elder-name">${elderName}</h1>
                <p class="family-elder-sub">${t('todayProgress', language, takenCount, totalMeds)}</p>
              </div>
            </div>
          </section>

          <!-- 1. Adherence Rate Metrics Grid -->
          <section class="card metrics-card slide-up-card">
            <div class="card-header-row">
              ${Icons.chart(24)}
              <h2 class="card-section-title">${t('adherenceRate', language)}</h2>
            </div>

            <div class="metrics-grid">
              <div class="metric-box box-adherence">
                <div class="metric-score">${adherencePercent}%</div>
                <div class="metric-label">${t('weeklyAdherence', language)}</div>
                <div class="metric-bar-bg">
                  <div class="metric-bar-fill" style="width: ${adherencePercent}%;"></div>
                </div>
              </div>

              <div class="metric-box box-taken">
                <div class="metric-score">${takenCount} / ${totalMeds}</div>
                <div class="metric-label">${t('tabMedicines', language)}</div>
                <div class="metric-badge-ok">${takenCount === totalMeds && totalMeds > 0 ? Icons.check(18) : ''}</div>
              </div>
            </div>
          </section>

          <!-- 2. Missed Doses & Acknowledgment -->
          <section class="card missed-doses-card slide-up-card">
            <div class="card-header-row">
              ${Icons.alert(24)}
              <h2 class="card-section-title">${t('missedDoses', language)}</h2>
            </div>

            <div class="missed-doses-list">
              ${missedList.length === 0 ? `
                <div class="illustrated-empty-card">
                  <img src="img/empty-no-medicines.svg" alt="All doses on time" width="200" height="130" loading="lazy" class="empty-state-art fade-in-image">
                  <p class="empty-state-caption">${t('noMissedDoses', language)}</p>
                </div>
              ` : missedList.map(item => {
                const ackKey = `${todayKey}_${item.id}`;
                const isAcked = !!missedAcks[ackKey];
                return `
                  <div class="missed-item-row">
                    <div class="missed-item-info">
                      <strong>${item.name} (${item.dose})</strong>
                      <span class="missed-sub">${item.timeOfDay} · ${item.reason}</span>
                    </div>
                    <div class="missed-action-slot">
                      ${isAcked ? `
                        <span class="chip-acknowledged">${Icons.check(16)} ${t('acknowledged', language)}</span>
                      ` : `
                        <button type="button" class="btn btn-secondary btn-ack-missed" data-med-id="${item.id}">
                          ${Icons.check(18)}
                          <span>${t('acknowledgeMissed', language)}</span>
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </section>

          <!-- 3. Send Warm Note / Voice Note to Elder -->
          <section class="card compose-family-card slide-up-card">
            <div class="card-header-row">
              ${Icons.message(24)}
              <h2 class="card-section-title">${t('sendFamilyNote', language)}</h2>
            </div>

            <!-- Current Active Note Preview -->
            ${data.familyMessage ? `
              <div class="current-family-note-box">
                <div class="cfn-avatar">
                  ${renderFamilyAvatar({ name: data.familyMessage.from, photo: data.familyMessage.photo }, 44)}
                </div>
                <div class="cfn-content">
                  <p class="cfn-quote">"${data.familyMessage[`text${language.charAt(0).toUpperCase() + language.slice(1)}`] || data.familyMessage.textEn || data.familyMessage.textMr || ''}"</p>
                  <small class="cfn-author">— ${data.familyMessage.from}</small>
                  ${data.voiceConfig?.audioBlobBase64 ? `
                    <button type="button" class="btn-voice-msg-play" id="btnPreviewVoiceNote">
                      ${Icons.speaker(16)} <span>Play Voice</span>
                    </button>
                  ` : ''}
                </div>
              </div>
            ` : ''}

            <!-- Compose Form -->
            <div class="compose-note-form">
              <textarea class="input-family-note" id="familyNoteTextInput" rows="3" placeholder="${t('typeYourMessage', language)}"></textarea>
              
              <div class="compose-actions-row">
                <button type="button" class="btn btn-primary btn-send-note" id="btnSaveFamilyNote">
                  ${Icons.send(20)}
                  <span>${t('sendNoteBtn', language)}</span>
                </button>

                <button type="button" class="btn btn-secondary btn-record-voice" id="btnRecordFamilyVoice">
                  ${Icons.speaker(20)}
                  <span id="recordVoiceBtnText">${t('recordVoiceBtn', language)}</span>
                </button>
              </div>
              <div class="note-feedback-msg hidden" id="noteFeedbackMsg">${t('noteSentSuccess', language)}</div>
            </div>
          </section>

          <!-- 4. Today's Appointments (Read-Only) -->
          <section class="card appointment-card slide-up-card">
            <div class="card-header-row">
              ${Icons.calendar(24)}
              <h2 class="card-section-title">${t('appointmentToday', language)}</h2>
            </div>

            <div class="appointment-body-wrap">
              ${data.appointment ? `
                <div class="appointment-details">
                  <h3 class="appointment-doctor-name">${data.appointment.doctor}</h3>
                  <p class="appointment-specialty">${data.appointment[`specialty${language.charAt(0).toUpperCase() + language.slice(1)}`] || data.appointment.specialtyEn || 'Doctor'}</p>
                  <div class="appointment-time-loc">
                    <span>${Icons.clock(16)} ${data.appointment.time}</span>
                    <span>${Icons.location(16)} ${data.appointment.location}</span>
                  </div>
                </div>
                <a href="tel:+912024445555" class="btn btn-secondary btn-call-clinic">
                  ${Icons.phone(20)}
                  <span>Call Clinic</span>
                </a>
              ` : `
                <div class="illustrated-empty-card">
                  <img src="img/empty-no-appointments.svg" alt="No appointments" width="200" height="130" loading="lazy" class="empty-state-art fade-in-image">
                  <p class="empty-state-caption">${t('emptyNoAppointments', language)}</p>
                </div>
              `}
            </div>
          </section>

          <!-- 5. Weekly Reports & Adherence Insights -->
          <section class="card reports-card slide-up-card">
            <div class="card-header-row">
              ${Icons.chart(24)}
              <h2 class="card-section-title">${t('reportsTitle', language)}</h2>
            </div>

            <div class="reports-body-wrap">
              <div class="reports-illustration-wrap">
                <img src="img/celebration.svg" alt="Reports" width="240" height="160" loading="lazy" class="reports-hero-art fade-in-image">
                <div class="role-art-overlay"></div>
              </div>

              <div class="reports-stats-list">
                <div class="report-stat-row">
                  <span class="report-stat-lbl">${t('weeklyAdherence', language)}</span>
                  <strong class="report-stat-val text-green">${adherencePercent}%</strong>
                </div>
                <div class="report-stat-row">
                  <span class="report-stat-lbl">${t('doseCompliance', language)}</span>
                  <strong class="report-stat-val">${takenCount} / ${totalMeds} Doses</strong>
                </div>
                <div class="report-stat-row">
                  <span class="report-stat-lbl">${t('moodTrend', language)}</span>
                  <strong class="report-stat-val">${data.moodHistory?.[todayKey] ? data.moodHistory[todayKey].toUpperCase() : '😊 GOOD'}</strong>
                </div>
              </div>
            </div>
          </section>

        </main>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const data = getCareData();
    const currentDate = getCurrentEffectiveDate();
    const todayKey = currentDate.toISOString().split('T')[0];

    // Language switcher
    this.container.querySelectorAll('[data-change-lang]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lang = e.currentTarget.dataset.changeLang;
        this.onLanguageChange(lang);
      });
    });

    // Role switcher
    this.container.querySelector('#btnTopRoleSwitch')?.addEventListener('click', () => {
      this.onRoleSwitch();
    });

    // Acknowledge missed dose
    this.container.querySelectorAll('.btn-ack-missed').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const medId = e.currentTarget.dataset.medId;
        const current = getCareData();
        if (!current.missedAcknowledgements) current.missedAcknowledgements = {};
        current.missedAcknowledgements[`${todayKey}_${medId}`] = {
          acknowledgedBy: 'Family Member',
          timestamp: new Date().toISOString()
        };
        saveCareData(current);
        this.render();
      });
    });

    // Save text note
    this.container.querySelector('#btnSaveFamilyNote')?.addEventListener('click', () => {
      const input = document.getElementById('familyNoteTextInput');
      const text = input ? input.value.trim() : '';
      if (!text) return;

      const current = getCareData();
      if (!current.familyMessage) {
        current.familyMessage = {
          from: 'Family Member',
          relation: 'Family',
          photo: null
        };
      }
      current.familyMessage.textEn = text;
      current.familyMessage.textMr = text;
      current.familyMessage.textHi = text;
      saveCareData(current);

      const feedback = document.getElementById('noteFeedbackMsg');
      if (feedback) {
        feedback.classList.remove('hidden');
        setTimeout(() => feedback.classList.add('hidden'), 3000);
      }
      if (input) input.value = '';
      this.render();
    });

    // Voice note record
    const recordBtn = this.container.querySelector('#btnRecordFamilyVoice');
    const recordText = this.container.querySelector('#recordVoiceBtnText');
    if (recordBtn) {
      recordBtn.addEventListener('click', async () => {
        const language = data.profile?.language || 'mr';
        if (!this.isRecording) {
          try {
            await this.recorder.start();
            this.isRecording = true;
            recordBtn.classList.add('recording-pulse');
            if (recordText) recordText.textContent = t('stopRecordBtn', language);
          } catch (err) {
            console.error('Mic access error:', err);
          }
        } else {
          try {
            const base64 = await this.recorder.stop();
            this.isRecording = false;
            recordBtn.classList.remove('recording-pulse');
            if (recordText) recordText.textContent = t('recordVoiceBtn', language);

            if (base64) {
              const current = getCareData();
              if (!current.voiceConfig) current.voiceConfig = {};
              current.voiceConfig.audioBlobBase64 = base64;
              current.voiceConfig.type = 'family';
              saveCareData(current);
              this.render();
            }
          } catch (err) {
            console.error('Stop recording error:', err);
          }
        }
      });
    }

    // Play voice preview
    this.container.querySelector('#btnPreviewVoiceNote')?.addEventListener('click', () => {
      const cur = getCareData();
      if (cur.voiceConfig?.audioBlobBase64) {
        playBase64Audio(cur.voiceConfig.audioBlobBase64);
      }
    });
  }
}
