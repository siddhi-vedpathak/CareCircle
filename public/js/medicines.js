/**
 * Medicines Tab Controller
 * Displays the full medication schedule grouped by Morning, Afternoon, and Night.
 * Rich cards with 96px pill art, colored label chips, and full instructions.
 */

import { getCareData, saveCareData, persistLanguage, getActiveRole } from './storage.js';
import { generatePillSvg, getLocalizedPillDescription } from './pillSvg.js';
import { renderLanguageSwitcherHtml, t } from './i18n.js';
import { renderTopBarRoleChip } from './roles.js';
import { Icons } from './icons.js';

export class MedicinesView {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.onLanguageChange = options.onLanguageChange || (() => {});
    this.onRoleSwitch = options.onRoleSwitch || (() => {});
    this.activeRole = options.activeRole || getActiveRole() || 'elder';
  }

  init() {
    this.render();
  }

  render() {
    const data = getCareData();
    const meds = data.medications || [];
    const language = data.profile?.language || 'mr';
    const isCaretaker = this.activeRole === 'caretaker';

    const morningMeds = meds.filter(m => m.period === 'morning' || !m.period);
    const afternoonMeds = meds.filter(m => m.period === 'afternoon');
    const nightMeds = meds.filter(m => m.period === 'night');

    const renderEmptySlot = () => `
      <div class="empty-slot-card illustrated-empty-card">
        <img src="img/empty-no-medicines.svg" alt="No medicines" width="160" height="100" loading="lazy" class="empty-state-art fade-in-image">
        <p class="empty-state-caption">${t('emptyNoMedicines', language)}</p>
      </div>
    `;

    this.container.innerHTML = `
      <div class="medicines-screen fade-in-view">
        
        <!-- Top bar with Role Chip & Language Switcher -->
        <div class="top-nav-row">
          <div class="screen-title-badge">
            ${Icons.pill(26)}
            <h1 class="screen-title-text">${t('tabMedicines', language)}</h1>
          </div>
          <div class="top-bar-actions">
            ${renderTopBarRoleChip(this.activeRole, language)}
            <span class="offline-pill ${navigator.onLine ? 'hidden' : ''}" id="offlineIndicator">${Icons.alert(16)} <span>${t('offlineStatus', language)}</span></span>
            ${renderLanguageSwitcherHtml(language)}
          </div>
        </div>

        <main class="medicines-main-body">

          <!-- Morning Schedule -->
          <section class="schedule-slot-section slide-up-card">
            <div class="slot-badge-header">
              ${Icons.sun(28, 'slot-icon-morning')}
              <h2 class="slot-title">Morning · ${morningMeds.length} ${morningMeds.length === 1 ? 'pill' : 'pills'}</h2>
            </div>
            <div class="schedule-cards-list">
              ${morningMeds.length > 0 ? morningMeds.map(m => this.renderMedCard(m, language)).join('') : renderEmptySlot()}
            </div>
          </section>

          <!-- Afternoon Schedule -->
          <section class="schedule-slot-section slide-up-card">
            <div class="slot-badge-header">
              ${Icons.sunAfternoon(28, 'slot-icon-afternoon')}
              <h2 class="slot-title">Afternoon · ${afternoonMeds.length} ${afternoonMeds.length === 1 ? 'pill' : 'pills'}</h2>
            </div>
            <div class="schedule-cards-list">
              ${afternoonMeds.length > 0 ? afternoonMeds.map(m => this.renderMedCard(m, language)).join('') : renderEmptySlot()}
            </div>
          </section>

          <!-- Night Schedule -->
          <section class="schedule-slot-section slide-up-card">
            <div class="slot-badge-header">
              ${Icons.moon(28, 'slot-icon-night')}
              <h2 class="slot-title">Night · ${nightMeds.length} ${nightMeds.length === 1 ? 'pill' : 'pills'}</h2>
            </div>
            <div class="schedule-cards-list">
              ${nightMeds.length > 0 ? nightMeds.map(m => this.renderMedCard(m, language)).join('') : renderEmptySlot()}
            </div>
          </section>

          <!-- Add Medicine Caregiver Button (Only visible for Caretaker role) -->
          ${isCaretaker ? `
            <div class="add-med-wrap slide-up-card">
              <button type="button" class="btn btn-secondary" id="btnAddMedicine">
                ${Icons.plus(24)}
                <span>Add Another Medicine</span>
              </button>
            </div>
          ` : ''}
              ${Icons.plus(24)}
              <span>Add Another Medicine</span>
            </button>
          </div>

        </main>

        <footer class="app-disclaimer-footer">
          <p>${t('footerDisclaimer', language)}</p>
        </footer>

        <!-- Add Medicine Modal -->
        <div class="modal-overlay hidden" id="addMedModalOverlay">
          <div class="modal-card">
            <h3 class="modal-title">Add Medicine</h3>
            <p class="modal-desc">Configure dose and instructions.</p>

            <div class="form-group">
              <label class="form-label" for="newMedName">Medicine Name</label>
              <input type="text" id="newMedName" class="form-input" placeholder="e.g. Paracetamol">
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label" for="newMedDose">Dose</label>
                <input type="text" id="newMedDose" class="form-input" placeholder="650 mg">
              </div>
              <div class="form-group">
                <label class="form-label" for="newMedPeriod">Period</label>
                <select id="newMedPeriod" class="form-input">
                  <option value="morning">Morning (08:30)</option>
                  <option value="afternoon">Afternoon (13:00)</option>
                  <option value="night">Night (21:00)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="newMedLabel">Purpose Label</label>
              <input type="text" id="newMedLabel" class="form-input" placeholder="e.g. For Fever">
            </div>

            <div class="modal-actions-row">
              <button type="button" class="btn btn-secondary" id="btnCancelAddMed">Cancel</button>
              <button type="button" class="btn btn-primary" id="btnSaveNewMed">Save</button>
            </div>
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
  }

  renderMedCard(med, language) {
    const app = med.appearance || {};
    return `
      <div class="card med-full-card">
        <div class="med-left-graphic">
          <div class="pill-tinted-circle">
            ${generatePillSvg(app, 72, 72)}
          </div>
        </div>
        <div class="med-body-details">
          <div class="med-header-row">
            <h3 class="med-title-text">${med.name}</h3>
            <span class="chip-label chip-dose">${med.dose}</span>
          </div>
          <div class="pill-chips-row">
            <span class="chip-label chip-purpose">${med.label || 'Daily'}</span>
            <span class="chip-label chip-time">${Icons.clock(16)} ${med.timeOfDay || '08:30'}</span>
            ${med.afterFood ? '<span class="chip-label chip-food">After food</span>' : '<span class="chip-label chip-water">With water</span>'}
          </div>
          <p class="med-localized-desc">${getLocalizedPillDescription(med, language)}</p>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.container.querySelector('#btnTopRoleSwitch')?.addEventListener('click', () => {
      this.onRoleSwitch();
    });

    document.querySelectorAll('[data-change-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        const newLang = btn.dataset.changeLang;
        persistLanguage(newLang);
        this.onLanguageChange(newLang);
      });
    });

    const addBtn = document.getElementById('btnAddMedicine');
    const modal = document.getElementById('addMedModalOverlay');
    const cancelBtn = document.getElementById('btnCancelAddMed');
    const saveBtn = document.getElementById('btnSaveNewMed');

    addBtn?.addEventListener('click', () => modal?.classList.remove('hidden'));
    cancelBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

    saveBtn?.addEventListener('click', () => {
      const name = document.getElementById('newMedName')?.value.trim();
      const dose = document.getElementById('newMedDose')?.value.trim() || '1 Tablet';
      const period = document.getElementById('newMedPeriod')?.value;
      const label = document.getElementById('newMedLabel')?.value.trim() || 'General';

      if (!name) {
        alert('Please enter medicine name');
        return;
      }

      const current = getCareData();
      const newMed = {
        id: `med_${Date.now()}`,
        name,
        dose,
        period,
        timeOfDay: period === 'morning' ? '08:30' : (period === 'afternoon' ? '13:00' : '21:00'),
        windowStart: period === 'morning' ? '08:00' : (period === 'afternoon' ? '12:30' : '20:30'),
        windowEnd: period === 'morning' ? '10:00' : (period === 'afternoon' ? '14:30' : '22:30'),
        label,
        afterFood: true,
        appearance: {
          shape: 'round',
          color: '#60A5FA',
          colorName: 'Blue',
          size: 'medium',
          markings: '',
          description: `Blue round pill, ${label}`
        }
      };

      current.medications.push(newMed);
      saveCareData(current);
      modal?.classList.add('hidden');
      this.render();
    });
  }
}
