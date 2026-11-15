/**
 * Today Screen Controller (Elder Mode)
 * Implements the 8 clean cards layout (top to bottom with 20px gaps),
 * illustrated time-of-day Hero card, Next Medicine countdown card,
 * vertical schedule timeline with expandable rows (inline missed notice),
 * family card with audio note play button, appointment card with Call clinic button,
 * mood row, shortcut tiles, and focused full-screen reminder moment.
 */

import { getCareData, saveCareData, persistLanguage } from './storage.js';
import { getCurrentEffectiveDate, setupClockLongPress } from './demo.js';
import { generatePillSvg, getLocalizedPillDescription } from './pillSvg.js';
import {
  playGentleChime,
  playReminderMoment,
  playCelebrationVoice,
  speakFullSentence,
  playAudioElement,
  prefetchNextReminderAudio,
  unlockAudio,
  isAudioReady
} from './audio.js';
import { renderLanguageSwitcherHtml, getElderDisplayName, buildSpokenReminderSentence, t } from './i18n.js';
import { Icons, renderFamilyAvatar } from './icons.js';
import { renderTopBarRoleChip } from './roles.js';
import { getActiveRole } from './storage.js';

let reminderAnnouncedBatchKey = null;
let repeatReminderTimer = null;

export class TodayView {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.onOpenDemo = options.onOpenDemo || (() => {});
    this.onCallContact = options.onCallContact || (() => {});
    this.onLanguageChange = options.onLanguageChange || (() => {});
    this.onRoleSwitch = options.onRoleSwitch || (() => {});
    this.activeRole = options.activeRole || getActiveRole() || 'elder';
    
    // UI states
    this.expandedTimelineSlot = null; // 'morning' | 'afternoon' | 'night'
    this.focusedReminderPillIndex = 0; // index in dueMeds array for focused one-pill-at-a-time view
    this.hasEatenConfirmed = false;
  }

  init() {
    this.render();
  }

  getEffectiveState() {
    const data = getCareData();
    const currentDate = getCurrentEffectiveDate();
    const currentHours = currentDate.getHours();
    const currentMinutes = currentDate.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    const todayKey = currentDate.toISOString().split('T')[0];

    // Determine time of day theme
    let timeTheme = 'morning';
    let heroAsset = 'img/hero-morning.svg';
    if (currentHours >= 12 && currentHours < 18) {
      timeTheme = 'afternoon';
      heroAsset = 'img/hero-afternoon.svg';
    } else if (currentHours >= 18 || currentHours < 5) {
      timeTheme = 'night';
      heroAsset = 'img/hero-night.svg';
    }

    const language = data.profile?.language || 'mr';
    const displayName = getElderDisplayName(data.profile, language);
    const dailyDoses = data.dailyDoses || {};
    const meds = data.medications || [];

    let dueMeds = [];
    let takenCount = 0;
    let nextMedInfo = null;

    // Timeline slots: Morning, Afternoon, Night
    const timelineSlots = [
      {
        id: 'morning',
        titleEn: 'Morning',
        titleMr: 'सकाळ',
        titleHi: 'सुबह',
        defaultTime: '08:30 AM',
        windowStart: 8 * 60,
        windowEnd: 10 * 60,
        meds: meds.filter(m => m.period === 'morning' || (!m.period && (parseInt(m.timeOfDay) || 8) < 12))
      },
      {
        id: 'afternoon',
        titleEn: 'Afternoon',
        titleMr: 'दुपार',
        titleHi: 'दोपहर',
        defaultTime: '01:00 PM',
        windowStart: 12 * 60 + 30,
        windowEnd: 14 * 60 + 30,
        meds: meds.filter(m => m.period === 'afternoon' || (!m.period && (parseInt(m.timeOfDay) || 13) >= 12 && (parseInt(m.timeOfDay) || 13) < 18))
      },
      {
        id: 'night',
        titleEn: 'Night',
        titleMr: 'रात्र',
        titleHi: 'रात',
        defaultTime: '09:00 PM',
        windowStart: 20 * 60 + 30,
        windowEnd: 22 * 60 + 30,
        meds: meds.filter(m => m.period === 'night' || (!m.period && (parseInt(m.timeOfDay) || 21) >= 18))
      }
    ];

    // Evaluate each slot and pills
    timelineSlots.forEach(slot => {
      let slotTaken = 0;
      let slotSkipped = 0;
      let slotPending = 0;

      slot.meds.forEach(m => {
        const doseKey = `${todayKey}_${m.id}`;
        const rec = dailyDoses[doseKey];
        if (rec && rec.status === 'taken') {
          slotTaken += 1;
          takenCount += 1;
        } else if (rec && rec.status === 'skipped') {
          slotSkipped += 1;
        } else {
          slotPending += 1;

          // Check if due right now
          const [wsh, wsm] = (m.windowStart || '08:00').split(':').map(Number);
          const [weh, wem] = (m.windowEnd || '10:00').split(':').map(Number);
          const sMinutes = wsh * 60 + wsm;
          const eMinutes = weh * 60 + wem;

          if (currentTotalMinutes >= sMinutes && currentTotalMinutes <= eMinutes) {
            dueMeds.push(m);
          } else if (currentTotalMinutes < sMinutes) {
            const diff = sMinutes - currentTotalMinutes;
            if (!nextMedInfo || diff < nextMedInfo.diffMinutes) {
              nextMedInfo = { med: m, diffMinutes: diff };
            }
          }
        }
      });

      // Status determination
      if (slot.meds.length === 0) {
        slot.status = 'none';
      } else if (slotTaken === slot.meds.length) {
        slot.status = 'done';
      } else if (slotSkipped === slot.meds.length) {
        slot.status = 'skipped';
      } else if (currentTotalMinutes > slot.windowEnd && slotPending > 0) {
        slot.status = 'missed';
      } else if (slotPending > 0 && currentTotalMinutes >= slot.windowStart && currentTotalMinutes <= slot.windowEnd) {
        slot.status = 'due_now';
      } else {
        slot.status = 'upcoming';
      }
    });

    // Forced demo simulation modes
    if (data.demoState?.forcedMode === 'reminder_now') {
      dueMeds = meds.filter(m => m.period === 'morning' || m.id === 'med_bp' || m.id === 'med_sugar');
      if (dueMeds.length === 0 && meds.length > 0) dueMeds = [meds[0]];
      const morn = timelineSlots.find(s => s.id === 'morning');
      if (morn) morn.status = 'due_now';
    } else if (data.demoState?.forcedMode === 'missed_dose') {
      dueMeds = [];
      const morn = timelineSlots.find(s => s.id === 'morning');
      if (morn) morn.status = 'missed';
    }

    // Background prefetch for next reminder audio
    if (nextMedInfo) {
      prefetchNextReminderAudio(data.profile, [nextMedInfo.med], language);
    }

    return {
      data,
      currentDate,
      timeTheme,
      heroAsset,
      displayName,
      language,
      dueMeds,
      timelineSlots,
      takenCount,
      totalScheduledToday: meds.length,
      nextMedInfo,
      todayKey
    };
  }

  render() {
    const state = this.getEffectiveState();
    const {
      data,
      currentDate,
      timeTheme,
      heroAsset,
      displayName,
      language,
      dueMeds,
      timelineSlots,
      takenCount,
      totalScheduledToday,
      nextMedInfo,
      todayKey
    } = state;

    const isReminderDue = dueMeds.length > 0;

    // Automatic reminder audio trigger
    const currentDueBatchKey = `${todayKey}_${dueMeds.map(m => m.id).join('_')}`;
    if (isReminderDue && reminderAnnouncedBatchKey !== currentDueBatchKey) {
      reminderAnnouncedBatchKey = currentDueBatchKey;
      playReminderMoment({
        profile: data.profile,
        meds: dueMeds,
        voiceConfig: data.voiceConfig || {},
        language
      });

      if (repeatReminderTimer) clearTimeout(repeatReminderTimer);
      repeatReminderTimer = setTimeout(() => {
        const check = this.getEffectiveState();
        if (check.dueMeds.length > 0) {
          playReminderMoment({
            profile: data.profile,
            meds: dueMeds,
            voiceConfig: data.voiceConfig || {},
            language
          });
        }
      }, 15 * 60 * 1000);
    }

    // Time & Date formatting
    const timeStr = currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = currentDate.toLocaleDateString(language === 'mr' ? 'mr-IN' : (language === 'hi' ? 'hi-IN' : 'en-US'), {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    let greeting = t('greetingMorning', language, displayName);
    if (timeTheme === 'afternoon') greeting = t('greetingAfternoon', language, displayName);
    if (timeTheme === 'night') greeting = t('greetingNight', language, displayName);

    const primaryContact = data.contacts?.[0] || { name: 'Family', phone: '+919876543210' };

    this.container.innerHTML = `
      <div class="today-screen ${isReminderDue ? 'reminder-active' : ''}">
        
        <!-- 1. TOP BAR: App Logo + Role Chip + Offline Indicator + Language Switcher -->
        <header class="today-top-bar">
          <div class="top-brand-wrap">
            <span class="brand-heart-slot">${Icons.heart(26)}</span>
            <span class="brand-title-text">CareCircle</span>
          </div>
          <div class="top-bar-actions">
            ${renderTopBarRoleChip(this.activeRole, language)}
            <span class="offline-pill ${navigator.onLine ? 'hidden' : ''}" id="offlineIndicator">${Icons.alert(16)} <span>${t('offlineStatus', language)}</span></span>
            ${renderLanguageSwitcherHtml(language)}
          </div>
        </header>

        <!-- Audio Unlock Banner if needed -->
        ${!isAudioReady() ? `
          <div class="audio-banner-card" id="bannerUnlockAudio">
            <span class="audio-banner-ico">${Icons.speaker(24)}</span>
            <div class="audio-banner-msg">
              <strong>${t('tapToStartAudio', language)}</strong>
              <small>Allows natural voice reminders & chime</small>
            </div>
            <button type="button" class="btn-start-audio" id="btnUnlockAudio">Start</button>
          </div>
        ` : ''}

        <!-- 2. HERO CARD with Illustration, Greeting, Clock (56px bold), Date, Speaker -->
        <section class="card hero-art-card theme-${timeTheme}">
          <div class="hero-art-backdrop" style="background-image: url('${heroAsset}');"></div>
          <div class="hero-art-overlay"></div>
          <div class="hero-card-content">
            <div class="hero-row-top">
              <span class="hero-theme-indicator">
                ${timeTheme === 'morning' ? Icons.sun(32) : (timeTheme === 'afternoon' ? Icons.sunAfternoon(32) : Icons.moon(32))}
              </span>
              <button type="button" class="btn-speaker-circle" id="btnReadHeroAloud" title="${t('readScreen', language)}" aria-label="${t('readScreen', language)}">
                ${Icons.speaker(26)}
              </button>
            </div>

            <h1 class="hero-greeting-title">${greeting}</h1>

            <div class="hero-clock-container" id="heroClockContainer" title="Hold clock for demo tools">
              <div class="hero-clock-digits">${timeStr}</div>
              <div class="hero-clock-subtitle">${dateStr}</div>
              <div class="clock-hold-hint">${Icons.clock(16)} <span>Hold for demo tools</span></div>
            </div>
          </div>
        </section>

        <!-- MAIN BODY (Cards with 20px gap) -->
        <main class="today-stack-container">

          <!-- FOCUSED REMINDER MOMENT or NEXT MEDICINE COUNTDOWN CARD -->
          ${isReminderDue ? this.renderFocusedReminderMomentHtml(state) : this.renderNextMedicineCardHtml(state)}

          <!-- 4. TODAY'S SCHEDULE VERTICAL TIMELINE (Morning / Afternoon / Night) -->
          <section class="card timeline-card">
            <div class="card-header-row">
              ${Icons.clock(24)}
              <h2 class="card-section-title">Today's Schedule</h2>
            </div>
            
            <div class="timeline-rows-group">
              ${timelineSlots.map(slot => this.renderTimelineRow(slot, state)).join('')}
            </div>
          </section>

          <!-- 5. FROM FAMILY CARD (Circular Avatar, Message, Audio Play Button or Illustrated Empty State) -->
          <section class="card from-family-card">
            <div class="card-header-row">
              ${Icons.message(24)}
              <h2 class="card-section-title">${t('familyMessageTitle', language)}</h2>
            </div>
            
            ${data.familyMessage ? `
              <div class="family-message-row">
                <div class="family-avatar-slot">
                  ${renderFamilyAvatar({ name: data.familyMessage.from, photo: data.familyMessage.photo }, 54)}
                </div>
                <div class="family-bubble-wrap">
                  <p class="family-quote-text">"${data.familyMessage[`text${language.charAt(0).toUpperCase() + language.slice(1)}`] || data.familyMessage.textEn || data.familyMessage.textMr || ''}"</p>
                  <div class="family-author-meta">
                    <span class="family-author-name">— ${data.familyMessage.from} (${data.familyMessage[`relation${language.charAt(0).toUpperCase() + language.slice(1)}`] || data.familyMessage.relation || ''})</span>
                    
                    ${data.voiceConfig?.audioBlobBase64 ? `
                      <button type="button" class="btn-voice-msg-play" id="btnPlayFamilyAudioMsg" title="Play Voice Note">
                        ${Icons.play(18)}
                        <span>Play Voice</span>
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            ` : `
              <div class="illustrated-empty-card">
                <img src="img/empty-no-messages.svg" alt="Family messages" width="200" height="130" loading="lazy" class="empty-state-art fade-in-image">
                <p class="empty-state-caption">${t('emptyNoMessages', language)}</p>
              </div>
            `}
          </section>

          <!-- 6. APPOINTMENT CARD (Doctor, Time, Call clinic button or Illustrated Empty State) -->
          <section class="card appointment-card">
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

          <!-- 7. HOW ARE YOU FEELING? MOOD ROW -->
          <section class="card mood-check-card">
            <h2 class="card-section-title">${t('moodCheckTitle', language)}</h2>
            <div class="mood-faces-grid">
              <button type="button" class="mood-btn ${(data.moodHistory && data.moodHistory[todayKey] === 'great') ? 'active' : ''}" data-mood="great" id="moodBtnGreat">
                <span class="mood-emoji-art">😊</span>
                <span class="mood-lbl">${t('moodGreat', language)}</span>
              </button>
              <button type="button" class="mood-btn ${(data.moodHistory && data.moodHistory[todayKey] === 'okay') ? 'active' : ''}" data-mood="okay" id="moodBtnOkay">
                <span class="mood-emoji-art">😐</span>
                <span class="mood-lbl">${t('moodOkay', language)}</span>
              </button>
              <button type="button" class="mood-btn ${(data.moodHistory && data.moodHistory[todayKey] === 'low') ? 'active' : ''}" data-mood="low" id="moodBtnLow">
                <span class="mood-emoji-art">😔</span>
                <span class="mood-lbl">${t('moodLow', language)}</span>
              </button>
            </div>
          </section>

          <!-- 8. TWO BOTTOM SHORTCUT TILES: Call <Family> and Emergency -->
          <section class="shortcuts-tiles-row">
            <button type="button" class="shortcut-tile tile-call" id="btnShortcutCall">
              <div class="shortcut-avatar-slot">
                ${renderFamilyAvatar(primaryContact, 46)}
              </div>
              <div class="shortcut-text">
                <span class="shortcut-sub">Call</span>
                <strong class="shortcut-title">${primaryContact.name || 'Family'}</strong>
              </div>
              <div class="shortcut-icon-end">${Icons.phone(24)}</div>
            </button>

            <button type="button" class="shortcut-tile tile-emergency" id="btnShortcutEmergency">
              <div class="shortcut-icon-start">${Icons.emergency(28)}</div>
              <div class="shortcut-text">
                <span class="shortcut-sub">Instant</span>
                <strong class="shortcut-title">Emergency</strong>
              </div>
            </button>
          </section>

        </main>

        <!-- Footer Disclaimer -->
        <footer class="app-disclaimer-footer">
          <p>${t('footerDisclaimer', language)}</p>
        </footer>

        <!-- Modal: Skip Reason -->
        <div class="modal-overlay hidden" id="skipModalOverlay">
          <div class="modal-card">
            <h3 class="modal-title">${t('skipModalTitle', language)}</h3>
            <p class="modal-desc">This is completely fine. We will note it for family.</p>
            
            <div class="reason-chips-grid">
              <button type="button" class="reason-chip" data-reason="dizzy">${t('skipReasonDizzy', language)}</button>
              <button type="button" class="reason-chip" data-reason="stomach">${t('skipReasonStomach', language)}</button>
              <button type="button" class="reason-chip" data-reason="not_feeling">${t('skipReasonNotFeeling', language)}</button>
              <button type="button" class="reason-chip" data-reason="other">${t('skipReasonOther', language)}</button>
            </div>

            <div class="modal-actions-row">
              <button type="button" class="btn btn-secondary" id="btnDismissSkip">${t('skipDismiss', language)}</button>
            </div>
          </div>
        </div>

        <!-- Modal: Celebration with Asset & Confetti -->
        <div class="modal-overlay hidden" id="celebrationModalOverlay">
          <div class="celebration-card">
            <div class="celebration-particles" id="celebrationParticles"></div>
            <div class="celebration-art-wrap">
              <img src="img/celebration.svg" alt="Celebration" width="260" height="180" loading="lazy" class="celebration-img-asset fade-in-image">
            </div>
            <h2 class="celebration-title">${t('celebrationTitle', language, displayName)}</h2>
            <p class="celebration-subtitle">${t('celebrationSubtitle', language)}</p>
            <button type="button" class="btn btn-primary" id="btnCloseCelebration">${t('celebrationClose', language)}</button>
          </div>
        </div>

        <!-- Modal: Emergency SOS Support with emergency.svg -->
        <div class="modal-overlay hidden" id="emergencyModalOverlay">
          <div class="emergency-modal-card slide-up-card">
            <button type="button" class="btn-close-modal" id="btnCloseEmergencyModal" aria-label="Close">
              ${Icons.close(22)}
            </button>
            <div class="emergency-art-wrap">
              <img src="img/emergency.svg" alt="Emergency SOS" width="260" height="180" loading="lazy" class="emergency-hero-art fade-in-image">
            </div>
            <h2 class="emergency-modal-title">${t('emergencyModalTitle', language)}</h2>
            <p class="emergency-modal-sub">${t('emergencySubtitle', language)}</p>

            <div class="emergency-actions-stack">
              <a href="tel:112" class="btn btn-emergency-call btn-call-112">
                ${Icons.phone(22)}
                <span>${t('callAmbulance', language)}</span>
              </a>

              <a href="tel:${(primaryContact.phone || '').replace(/\s+/g, '')}" class="btn btn-secondary btn-call-contact">
                ${Icons.user(22)}
                <span>${t('callPrimaryContact', language)} (${primaryContact.name || 'Family'})</span>
              </a>

              <a href="tel:+912024445555" class="btn btn-secondary btn-call-doctor">
                ${Icons.heart(22)}
                <span>${t('callDoctor', language)}</span>
              </a>
            </div>

            <!-- Medical Info Badge -->
            <div class="emergency-medical-info">
              <span><strong>${t('bloodGroup', language)}:</strong> ${data.profile?.bloodGroup || 'O+'}</span>
              <span><strong>${t('allergies', language)}:</strong> ${data.profile?.allergies || 'None recorded'}</span>
            </div>
          </div>
        </div>

      </div>
    `;

    this.bindEvents(state);
  }

  /**
   * 3. "Next medicine" card: big countdown ring + pill pictures + one primary button
   */
  renderNextMedicineCardHtml(state) {
    const { takenCount, totalScheduledToday, nextMedInfo, language } = state;
    const ringRadius = 48;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const progressPercent = totalScheduledToday > 0 ? (takenCount / totalScheduledToday) : 1;
    const ringOffset = ringCircumference - (ringCircumference * progressPercent);

    let countdownTitle = 'All done!';
    let nextPillHtml = '';

    if (nextMedInfo) {
      const hours = Math.floor(nextMedInfo.diffMinutes / 60);
      const mins = nextMedInfo.diffMinutes % 60;
      let timeFormatted = '';
      if (hours > 0) timeFormatted += `${hours}h `;
      timeFormatted += `${mins}m`;
      countdownTitle = timeFormatted;

      const app = nextMedInfo.med.appearance || {};
      nextPillHtml = `
        <div class="next-pill-preview-row">
          <div class="next-pill-svg-slot">
            ${generatePillSvg(app, 64, 64)}
          </div>
          <div class="next-pill-info">
            <span class="next-pill-time-badge">${Icons.clock(16)} ${nextMedInfo.med.timeOfDay}</span>
            <h4 class="next-pill-name">${nextMedInfo.med.name} (${nextMedInfo.med.dose})</h4>
            <p class="next-pill-desc">${getLocalizedPillDescription(nextMedInfo.med, language)}</p>
          </div>
        </div>
      `;
    } else {
      nextPillHtml = `
        <div class="empty-state-pills-row">
          <img src="img/empty-no-medicines.svg" alt="All done" width="200" height="130" loading="lazy" class="empty-state-asset fade-in-image">
          <p class="empty-state-text">${t('allMedsDone', language)}</p>
        </div>
      `;
    }

    return `
      <section class="card next-medicine-card">
        <div class="next-med-card-top">
          
          <!-- Big Circular Countdown Ring -->
          <div class="countdown-ring-box">
            <svg class="countdown-ring-svg" width="128" height="128" viewBox="0 0 128 128">
              <circle class="ring-bg" cx="64" cy="64" r="${ringRadius}" stroke="#E5E7EB" stroke-width="12" fill="none"/>
              <circle class="ring-prog" cx="64" cy="64" r="${ringRadius}" stroke="var(--primary-green)" stroke-width="12" stroke-linecap="round" fill="none"
                stroke-dasharray="${ringCircumference}" stroke-dashoffset="${ringOffset}" transform="rotate(-90 64 64)"/>
            </svg>
            <div class="ring-center-stat">
              <span class="stat-prefix">${t('nextCountdownPrefix', language)}</span>
              <span class="stat-digits">${countdownTitle}</span>
            </div>
          </div>

          <div class="next-med-summary-col">
            <h3 class="next-med-heading">${t('nextMedicineIn', language)}</h3>
            <p class="next-med-fraction">${takenCount} of ${totalScheduledToday} pills taken today</p>
            <div class="slim-prog-bar">
              <div class="slim-prog-fill" style="width: ${totalScheduledToday > 0 ? (takenCount / totalScheduledToday * 100) : 100}%;"></div>
            </div>
          </div>

        </div>

        ${nextPillHtml}

        <!-- One Primary Button -->
        <button type="button" class="btn btn-primary btn-next-med-action" id="btnNextMedAction">
          ${Icons.check(24)}
          <span>${nextMedInfo ? 'View Upcoming Medicines' : 'Schedule Complete'}</span>
        </button>
      </section>
    `;
  }

  /**
   * 4. Today's schedule vertical timeline row
   * Tapping expands pills; Missed state shows a small inline badge + slim notice inside expanded row.
   */
  renderTimelineRow(slot, state) {
    const { language, todayKey, data } = state;
    const isExpanded = this.expandedTimelineSlot === slot.id;
    const title = slot[`title${language.charAt(0).toUpperCase() + language.slice(1)}`] || slot.titleEn;

    // Badges: Done green, Upcoming grey, Skipped amber, Missed coral
    let badgeClass = 'badge-upcoming';
    let badgeText = 'Upcoming';
    if (slot.status === 'done') {
      badgeClass = 'badge-done';
      badgeText = 'Done';
    } else if (slot.status === 'due_now') {
      badgeClass = 'badge-due';
      badgeText = 'Due Now';
    } else if (slot.status === 'skipped') {
      badgeClass = 'badge-skipped';
      badgeText = 'Skipped';
    } else if (slot.status === 'missed') {
      badgeClass = 'badge-missed';
      badgeText = 'Missed';
    }

    return `
      <div class="timeline-row-item ${isExpanded ? 'is-expanded' : ''}" data-slot-id="${slot.id}">
        <div class="timeline-row-header" role="button" tabindex="0" aria-expanded="${isExpanded}">
          
          <div class="timeline-row-left">
            <span class="timeline-time">${slot.defaultTime}</span>
            <div class="timeline-title-row">
              <strong class="timeline-title">${title}</strong>
              <span class="timeline-count">(${slot.meds.length} ${slot.meds.length === 1 ? 'pill' : 'pills'})</span>
            </div>
          </div>

          <!-- Small Pill Thumbnails -->
          <div class="timeline-thumbnails-group">
            ${slot.meds.map(m => generatePillSvg(m.appearance || {}, 36, 36)).join('')}
          </div>

          <!-- Inline Status Badge -->
          <div class="timeline-row-right">
            <span class="timeline-badge ${badgeClass}">${badgeText}</span>
            <span class="timeline-chevron">${isExpanded ? Icons.chevronUp(20) : Icons.chevronDown(20)}</span>
          </div>

        </div>

        <!-- Expandable Detail Drawer -->
        ${isExpanded ? `
          <div class="timeline-expanded-drawer">
            
            <!-- Slim Inline Notice for Missed Doses ONLY when expanded -->
            ${slot.status === 'missed' ? `
              <div class="slim-missed-notice">
                ${Icons.alert(20)}
                <div class="slim-notice-text">
                  <strong>${t('missedNotice', language)}</strong>
                  <span>${t('doNotDoubleUp', language)}</span>
                </div>
              </div>
            ` : ''}

            <!-- Pills Details List -->
            <div class="expanded-pills-list">
              ${slot.meds.map(med => {
                const app = med.appearance || {};
                const doseKey = `${todayKey}_${med.id}`;
                const rec = data.dailyDoses?.[doseKey];
                const isTaken = rec && rec.status === 'taken';
                return `
                  <div class="expanded-pill-card">
                    <div class="expanded-pill-art">
                      ${generatePillSvg(app, 64, 64)}
                    </div>
                    <div class="expanded-pill-info">
                      <h4 class="expanded-pill-name">${med.name} (${med.dose})</h4>
                      <p class="expanded-pill-desc">${getLocalizedPillDescription(med, language)}</p>
                      <div class="expanded-pill-tags">
                        <span class="chip-label chip-purpose">${med.label || 'Daily'}</span>
                        ${med.afterFood ? '<span class="chip-label chip-food">After food</span>' : '<span class="chip-label chip-water">With water</span>'}
                        ${isTaken ? '<span class="chip-label chip-taken">Taken</span>' : ''}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Focused full-screen Reminder Moment view
   * Shows one pill at a time on big cards, one giant primary button.
   */
  renderFocusedReminderMomentHtml(state) {
    const { dueMeds, language, displayName } = state;
    const totalPills = dueMeds.length;
    const currentIndex = Math.min(this.focusedReminderPillIndex, totalPills - 1);
    const currentMed = dueMeds[currentIndex] || dueMeds[0];
    const app = currentMed.appearance || {};
    const hasAfterFood = currentMed.afterFood;
    const isFinalPill = (currentIndex === totalPills - 1);

    return `
      <section class="card focused-reminder-card">
        <div class="focused-card-top-indicator">
          <div class="reminder-pulse-icon">
            ${Icons.pill(26)}
          </div>
          <div>
            <h2 class="focused-title">${t('reminderAlert', language)}</h2>
            <p class="focused-sub">Pill ${currentIndex + 1} of ${totalPills}</p>
          </div>
        </div>

        <!-- Big Card for One Pill at a Time -->
        <div class="focused-pill-hero">
          
          <div class="focused-art-circle">
            ${generatePillSvg(app, 96, 96)}
          </div>

          <h3 class="focused-med-name">${currentMed.name}</h3>
          <span class="chip-label chip-dose-big">${currentMed.dose}</span>
          
          <div class="focused-chips-row">
            <span class="chip-label chip-purpose">${currentMed.label || 'Medicine'}</span>
            ${currentMed.afterFood ? '<span class="chip-label chip-food">Take after food</span>' : '<span class="chip-label chip-water">With water</span>'}
          </div>

          <p class="focused-desc-text">${getLocalizedPillDescription(currentMed, language)}</p>

          <!-- After Food Question if applicable -->
          ${hasAfterFood ? `
            <div class="after-food-box-focused">
              <p class="after-food-q"><strong>${t('eatenQuestion', language)}</strong></p>
              <div class="after-food-btns">
                <button type="button" class="btn-food-choice ${this.hasEatenConfirmed ? 'active' : ''}" id="btnFoodYes">
                  ${t('eatenYes', language)}
                </button>
                <button type="button" class="btn-food-choice ${!this.hasEatenConfirmed ? 'active-warn' : ''}" id="btnFoodNo">
                  ${t('eatenNo', language)}
                </button>
              </div>
              ${!this.hasEatenConfirmed ? `
                <p class="after-food-sub-hint">${t('eatenAdvice', language)}</p>
              ` : ''}
            </div>
          ` : ''}

        </div>

        <!-- Pill step progress dots -->
        ${totalPills > 1 ? `
          <div class="pill-step-dots">
            ${dueMeds.map((_, idx) => `
              <div class="pill-dot ${idx === currentIndex ? 'active' : (idx < currentIndex ? 'done' : '')}"></div>
            `).join('')}
          </div>
        ` : ''}

        <!-- One Giant Primary Button -->
        <div class="focused-actions-stack">
          <button type="button" class="btn btn-primary btn-take-focused" id="btnTakeFocusedPill">
            ${Icons.check(28)}
            <span>${isFinalPill ? t('tookAllMeds', language) : `Take this pill & next (${currentIndex + 1}/${totalPills})`}</span>
          </button>

          <!-- Secondary quiet button -->
          <button type="button" class="btn btn-secondary-quiet" id="btnNotToday">
            <span>${t('notToday', language)}</span>
          </button>
        </div>
      </section>
    `;
  }

  bindEvents(state) {
    const { data, language, displayName, dueMeds, todayKey } = state;

    // Language switcher pills
    document.querySelectorAll('[data-change-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        const newLang = btn.dataset.changeLang;
        persistLanguage(newLang);
        this.onLanguageChange(newLang);
      });
    });

    // Clock long press for Demo Tools
    const clockEl = document.getElementById('heroClockContainer');
    if (clockEl) {
      setupClockLongPress(clockEl, () => {
        this.onOpenDemo();
      });
    }

    // Audio unlock
    document.getElementById('btnUnlockAudio')?.addEventListener('click', () => {
      unlockAudio();
      playGentleChime();
      this.render();
    });

    // Read Hero aloud
    document.getElementById('btnReadHeroAloud')?.addEventListener('click', () => {
      unlockAudio();
      if (dueMeds.length > 0) {
        const sentence = buildSpokenReminderSentence(data.profile, dueMeds, language);
        speakFullSentence(sentence, language);
      } else {
        const text = language === 'mr'
          ? `नमस्कार ${displayName}. आजच्या गोळ्या वेळेवर सुरू आहेत. सर्व ठीक आहे.`
          : (language === 'hi'
            ? `नमस्ते ${displayName}. आज की दवाइयाँ समय पर चल रही हैं.`
            : `Hello ${displayName}. Everything is on schedule today.`);
        speakFullSentence(text, language);
      }
    });

    // Timeline row expand/collapse
    document.querySelectorAll('.timeline-row-item').forEach(el => {
      const header = el.querySelector('.timeline-row-header');
      header?.addEventListener('click', () => {
        const slotId = el.dataset.slotId;
        this.expandedTimelineSlot = this.expandedTimelineSlot === slotId ? null : slotId;
        this.render();
      });
    });

    // Next Medicine action button
    document.getElementById('btnNextMedAction')?.addEventListener('click', () => {
      // Expand the next upcoming or current timeline row
      const morn = state.timelineSlots.find(s => s.status === 'upcoming' || s.status === 'due_now' || s.status === 'missed');
      if (morn) {
        this.expandedTimelineSlot = morn.id;
        this.render();
      }
    });

    // Family voice message play button
    document.getElementById('btnPlayFamilyAudioMsg')?.addEventListener('click', () => {
      if (data.voiceConfig?.audioBlobBase64) {
        playAudioElement(data.voiceConfig.audioBlobBase64);
      }
    });

    // After-food buttons in focused reminder view
    document.getElementById('btnFoodYes')?.addEventListener('click', () => {
      this.hasEatenConfirmed = true;
      this.render();
    });
    document.getElementById('btnFoodNo')?.addEventListener('click', () => {
      this.hasEatenConfirmed = false;
      this.render();
    });

    // Primary Button in Focused View
    document.getElementById('btnTakeFocusedPill')?.addEventListener('click', () => {
      const totalPills = dueMeds.length;
      if (this.focusedReminderPillIndex < totalPills - 1) {
        // Mark current pill taken and advance to next pill
        const currentMed = dueMeds[this.focusedReminderPillIndex];
        const current = getCareData();
        if (!current.dailyDoses) current.dailyDoses = {};
        current.dailyDoses[`${todayKey}_${currentMed.id}`] = { status: 'taken', timestamp: new Date().toISOString() };
        saveCareData(current);

        this.focusedReminderPillIndex += 1;
        this.render();
      } else {
        // Final pill taken -> Complete all and celebrate!
        this.handleCompleteAllReminderPills(dueMeds, todayKey, data.profile, language);
      }
    });

    // Secondary button: Not today
    document.getElementById('btnNotToday')?.addEventListener('click', () => {
      document.getElementById('skipModalOverlay')?.classList.remove('hidden');
    });

    document.querySelectorAll('.reason-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.handleSkipWithReason(dueMeds, todayKey, chip.dataset.reason, language);
      });
    });

    document.getElementById('btnDismissSkip')?.addEventListener('click', () => {
      document.getElementById('skipModalOverlay')?.classList.add('hidden');
    });

    document.getElementById('btnCloseCelebration')?.addEventListener('click', () => {
      document.getElementById('celebrationModalOverlay')?.classList.add('hidden');
      this.focusedReminderPillIndex = 0;
      this.render();
    });

    // 1-Tap Mood Check
    ['moodBtnGreat', 'moodBtnOkay', 'moodBtnLow'].forEach(id => {
      const btn = document.getElementById(id);
      btn?.addEventListener('click', () => {
        const mood = btn.dataset.mood;
        const current = getCareData();
        if (!current.moodHistory) current.moodHistory = {};
        current.moodHistory[todayKey] = mood;
        saveCareData(current);
        this.render();
      });
    });

    // Role switcher
    document.getElementById('btnTopRoleSwitch')?.addEventListener('click', () => {
      this.onRoleSwitch();
    });

    // Shortcut: Call
    document.getElementById('btnShortcutCall')?.addEventListener('click', () => {
      this.onCallContact(data.contacts?.[0]);
    });

    // Shortcut: Emergency Modal
    document.getElementById('btnShortcutEmergency')?.addEventListener('click', () => {
      document.getElementById('emergencyModalOverlay')?.classList.remove('hidden');
    });

    document.getElementById('btnCloseEmergencyModal')?.addEventListener('click', () => {
      document.getElementById('emergencyModalOverlay')?.classList.add('hidden');
    });
  }

  handleCompleteAllReminderPills(dueMeds, todayKey, profile, language) {
    const current = getCareData();
    if (!current.dailyDoses) current.dailyDoses = {};
    const nowIso = new Date().toISOString();

    dueMeds.forEach(m => {
      current.dailyDoses[`${todayKey}_${m.id}`] = { status: 'taken', timestamp: nowIso };
    });

    if (current.demoState) current.demoState.forcedMode = null;
    saveCareData(current);

    // Show celebration modal
    const modal = document.getElementById('celebrationModalOverlay');
    if (modal) {
      modal.classList.remove('hidden');
      this.triggerConfettiAnimation();
    }

    // Celebration voice announcement
    playCelebrationVoice(profile, language);

    setTimeout(() => {
      if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        this.focusedReminderPillIndex = 0;
        this.render();
      }
    }, 3400);
  }

  handleSkipWithReason(dueMeds, todayKey, reason, language) {
    const current = getCareData();
    if (!current.dailyDoses) current.dailyDoses = {};
    const nowIso = new Date().toISOString();

    dueMeds.forEach(m => {
      current.dailyDoses[`${todayKey}_${m.id}`] = { status: 'skipped', reason, timestamp: nowIso };
    });

    if (current.demoState) current.demoState.forcedMode = null;
    saveCareData(current);

    document.getElementById('skipModalOverlay')?.classList.add('hidden');
    this.focusedReminderPillIndex = 0;
    this.render();
  }

  triggerConfettiAnimation() {
    const container = document.getElementById('celebrationParticles');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6'];
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-particle';
      const color = colors[Math.floor(Math.random() * colors.length)];
      p.style.width = '8px';
      p.style.height = '14px';
      p.style.backgroundColor = color;
      p.style.borderRadius = '3px';
      p.style.left = `${Math.random() * 90}%`;
      p.style.top = `${Math.random() * 40}%`;
      p.style.animationDelay = `${Math.random() * 0.4}s`;
      p.style.transform = `rotate(${Math.random() * 360}deg) scale(${0.7 + Math.random() * 0.6})`;
      container.appendChild(p);
    }
  }
}
