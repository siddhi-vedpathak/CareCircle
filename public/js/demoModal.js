/**
 * Demo Control Panel Modal
 * Allows testing of reminder states, time shifts, and loading optional demo data.
 */

import {
  getSimulatedTimeDisplay,
  isDemoActive,
  addSimulatedMinutes,
  setSimulatedTimeOfDay,
  triggerSimulateReminderNow,
  triggerSimulateMissedDose,
  resetToRealTime
} from './demo.js';
import { loadSampleDemoData } from './storage.js';
import { Icons } from './icons.js';

export class DemoModal {
  constructor(options = {}) {
    this.onStateChanged = options.onStateChanged || (() => {});
    this.onRerunWizard = options.onRerunWizard || (() => {});
  }

  show() {
    let overlay = document.getElementById('demoModalOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'demoModalOverlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    const simTime = getSimulatedTimeDisplay();
    const isActive = isDemoActive();

    overlay.innerHTML = `
      <div class="modal-card demo-modal-card">
        <div class="demo-modal-header">
          <div class="demo-badge">
            ${Icons.clock(22)}
            <span>Demo Tools</span>
          </div>
          <button type="button" class="btn-close-modal" id="btnCloseDemoModal" aria-label="Close">
            ${Icons.close(20)}
          </button>
        </div>

        <p class="demo-modal-desc">
          Test reminder moments, missed dose alerts, time-of-day themes, or load sample demo data.
        </p>

        <div class="demo-status-box">
          <span>Clock: <strong>${simTime}</strong></span>
          ${isActive ? '<span class="demo-active-tag">Simulated</span>' : '<span class="demo-real-tag">Real Time</span>'}
        </div>

        <!-- Optional Load Demo Data Button (Requirement A) -->
        <div class="demo-section">
          <h4 class="demo-section-heading">Sample Demo Data</h4>
          <button type="button" class="btn btn-secondary demo-action-btn" id="btnLoadDemoData">
            ${Icons.plus(22)}
            <span>Load Demo Data (Ajoba + 5 Pills)</span>
          </button>
        </div>

        <!-- Instant State Simulators -->
        <div class="demo-section">
          <h4 class="demo-section-heading">Instant State Simulators</h4>
          <div class="demo-buttons-grid">
            <button type="button" class="btn btn-primary demo-action-btn" id="btnSimReminderNow">
              ${Icons.pill(22)}
              <span>Simulate Reminder Now (08:30 AM)</span>
            </button>
            <button type="button" class="btn btn-secondary demo-action-btn" id="btnSimMissedDose">
              ${Icons.alert(22)}
              <span>Simulate Missed Dose (11:30 AM)</span>
            </button>
          </div>
        </div>

        <!-- Fast-forward Time -->
        <div class="demo-section">
          <h4 class="demo-section-heading">Fast-Forward Clock</h4>
          <div class="demo-buttons-row">
            <button type="button" class="demo-chip-btn" id="btnFf15m">+15 Mins</button>
            <button type="button" class="demo-chip-btn" id="btnFf1h">+1 Hour</button>
            <button type="button" class="demo-chip-btn" id="btnFf2h">+2 Hours</button>
            <button type="button" class="demo-chip-btn" id="btnResetRealTime">↺ Real Clock</button>
          </div>
        </div>

        <!-- Jump to Specific Time of Day -->
        <div class="demo-section">
          <h4 class="demo-section-heading">Jump to Time of Day</h4>
          <div class="demo-buttons-row">
            <button type="button" class="demo-chip-btn" id="btnJumpMorning">Morning (8:30 AM)</button>
            <button type="button" class="demo-chip-btn" id="btnJumpAfternoon">Afternoon (1:00 PM)</button>
            <button type="button" class="demo-chip-btn" id="btnJumpNight">Night (9:00 PM)</button>
          </div>
        </div>

        <!-- Wizard -->
        <div class="demo-section">
          <button type="button" class="btn btn-secondary demo-action-btn" id="btnRerunWizardFromDemo">
            ${Icons.settings(22)}
            <span>Open Caretaker Setup Wizard</span>
          </button>
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');
    this.bindEvents(overlay);
  }

  hide() {
    const overlay = document.getElementById('demoModalOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  bindEvents(overlay) {
    document.getElementById('btnCloseDemoModal')?.addEventListener('click', () => this.hide());

    document.getElementById('btnLoadDemoData')?.addEventListener('click', () => {
      loadSampleDemoData();
      resetToRealTime();
      this.hide();
      this.onStateChanged();
    });

    document.getElementById('btnSimReminderNow')?.addEventListener('click', () => {
      triggerSimulateReminderNow();
      this.hide();
      this.onStateChanged();
    });

    document.getElementById('btnSimMissedDose')?.addEventListener('click', () => {
      triggerSimulateMissedDose();
      this.hide();
      this.onStateChanged();
    });

    document.getElementById('btnFf15m')?.addEventListener('click', () => {
      addSimulatedMinutes(15);
      this.show();
      this.onStateChanged();
    });

    document.getElementById('btnFf1h')?.addEventListener('click', () => {
      addSimulatedMinutes(60);
      this.show();
      this.onStateChanged();
    });

    document.getElementById('btnFf2h')?.addEventListener('click', () => {
      addSimulatedMinutes(120);
      this.show();
      this.onStateChanged();
    });

    document.getElementById('btnResetRealTime')?.addEventListener('click', () => {
      resetToRealTime();
      this.show();
      this.onStateChanged();
    });

    document.getElementById('btnJumpMorning')?.addEventListener('click', () => {
      setSimulatedTimeOfDay(8, 30);
      this.hide();
      this.onStateChanged();
    });

    document.getElementById('btnJumpAfternoon')?.addEventListener('click', () => {
      setSimulatedTimeOfDay(13, 0);
      this.hide();
      this.onStateChanged();
    });

    document.getElementById('btnJumpNight')?.addEventListener('click', () => {
      setSimulatedTimeOfDay(21, 0);
      this.hide();
      this.onStateChanged();
    });

    document.getElementById('btnRerunWizardFromDemo')?.addEventListener('click', () => {
      this.hide();
      this.onRerunWizard();
    });
  }
}
