/**
 * CareCircle - Role Selection & Passcode Verification
 * Manages the 3 Roles:
 * 1. Elderly Person ('elder')
 * 2. Family Member ('family')
 * 3. Caretaker ('caretaker')
 */

import { getCareData, getActiveRole, setActiveRole } from './storage.js';
import { getElderDisplayName, renderLanguageSwitcherHtml, t } from './i18n.js';
import { Icons } from './icons.js';

export class RoleManager {
  constructor(options = {}) {
    this.onRoleChanged = options.onRoleChanged || (() => {});
    this.onLanguageChange = options.onLanguageChange || (() => {});
    this.pendingRole = null;
    this.enteredPin = '';
  }

  /**
   * Render "Who is using this?" full-screen selection view
   */
  renderSelectionScreen(containerEl) {
    const data = getCareData();
    const language = data.profile?.language || 'mr';
    const elderName = getElderDisplayName(data.profile, language);
    const security = data.security || {
      caretakerPasscode: '1234',
      familyPasscode: '5678',
      elderPasscode: '',
      oneTapElder: true
    };

    containerEl.innerHTML = `
      <div class="role-selection-screen fade-in-view">
        <header class="role-top-nav">
          <div class="brand-badge">
            <span class="brand-heart-slot">${Icons.heart(26)}</span>
            <span class="brand-title-text">CareCircle</span>
          </div>
          ${renderLanguageSwitcherHtml(language)}
        </header>

        <main class="role-selection-body">
          <div class="role-header-text">
            <h1 class="role-title">${t('whoIsUsingTitle', language)}</h1>
            <p class="role-subtitle">${t('whoIsUsingSub', language)}</p>
          </div>

          <div class="role-cards-grid">
            <!-- 1. Elderly Person Card -->
            <button type="button" class="role-select-card card-elder" data-role="elder" id="btnRoleElder">
              <div class="role-card-art-wrap">
                <img src="img/elderly-couple.svg" alt="Elderly Person" width="240" height="180" loading="lazy" class="role-card-art fade-in-image">
                <div class="role-art-overlay"></div>
              </div>
              <div class="role-card-info">
                <div class="role-card-top-row">
                  <h2 class="role-card-name">${elderName}</h2>
                  <span class="role-type-badge badge-green">${security.oneTapElder ? t('roleElderBadge', language) : t('roleFamilyBadge', language)}</span>
                </div>
                <p class="role-card-desc">${t('roleElderSub', language)}</p>
              </div>
            </button>

            <!-- 2. Family Member Card -->
            <button type="button" class="role-select-card card-family" data-role="family" id="btnRoleFamily">
              <div class="role-card-art-wrap">
                <img src="img/family-welcome.svg" alt="Family Member" width="240" height="180" loading="lazy" class="role-card-art fade-in-image">
                <div class="role-art-overlay"></div>
              </div>
              <div class="role-card-info">
                <div class="role-card-top-row">
                  <h2 class="role-card-name">${t('roleFamily', language)}</h2>
                  <span class="role-type-badge badge-blue">${t('roleFamilyBadge', language)}</span>
                </div>
                <p class="role-card-desc">${t('roleFamilySub', language)}</p>
              </div>
            </button>

            <!-- 3. Caretaker Card -->
            <button type="button" class="role-select-card card-caretaker" data-role="caretaker" id="btnRoleCaretaker">
              <div class="role-card-art-wrap">
                <img src="img/hero-morning.svg" alt="Caretaker" width="240" height="180" loading="lazy" class="role-card-art fade-in-image">
                <div class="role-art-overlay"></div>
              </div>
              <div class="role-card-info">
                <div class="role-card-top-row">
                  <h2 class="role-card-name">${t('roleCaretaker', language)}</h2>
                  <span class="role-type-badge badge-amber">${t('roleCaretakerBadge', language)}</span>
                </div>
                <p class="role-card-desc">${t('roleCaretakerSub', language)}</p>
              </div>
            </button>
          </div>
        </main>

        <!-- Passcode Modal Container -->
        <div id="rolePasscodeMount"></div>
      </div>
    `;

    // Attach listeners
    containerEl.querySelectorAll('[data-change-lang]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lang = e.currentTarget.dataset.changeLang;
        this.onLanguageChange(lang);
      });
    });

    containerEl.querySelector('#btnRoleElder')?.addEventListener('click', () => {
      if (security.oneTapElder || !security.elderPasscode) {
        this.selectRoleDirectly('elder');
      } else {
        this.showPasscodeModal('elder');
      }
    });

    containerEl.querySelector('#btnRoleFamily')?.addEventListener('click', () => {
      this.showPasscodeModal('family');
    });

    containerEl.querySelector('#btnRoleCaretaker')?.addEventListener('click', () => {
      this.showPasscodeModal('caretaker');
    });
  }

  selectRoleDirectly(role) {
    setActiveRole(role);
    this.onRoleChanged(role);
  }

  showPasscodeModal(role) {
    this.pendingRole = role;
    this.enteredPin = '';
    const data = getCareData();
    const language = data.profile?.language || 'mr';

    let roleName = t('roleCaretaker', language);
    if (role === 'elder') roleName = t('roleElder', language);
    if (role === 'family') roleName = t('roleFamily', language);

    const mount = document.getElementById('rolePasscodeMount');
    if (!mount) return;

    mount.innerHTML = `
      <div class="modal-overlay passcode-overlay">
        <div class="passcode-card slide-up-card">
          <button type="button" class="btn-close-modal" id="btnCancelPasscode" aria-label="Close">
            ${Icons.close(22)}
          </button>
          
          <div class="passcode-header">
            <div class="passcode-shield-icon">${Icons.emergency(32)}</div>
            <h2 class="passcode-title">${t('passcodePrompt', language, roleName)}</h2>
            <p class="passcode-hint" id="passcodeErrorHint">${t('enterPasscode', language)}</p>
          </div>

          <!-- 4 Dots display -->
          <div class="passcode-dots-row" id="passcodeDots">
            <span class="p-dot" id="pdot-0"></span>
            <span class="p-dot" id="pdot-1"></span>
            <span class="p-dot" id="pdot-2"></span>
            <span class="p-dot" id="pdot-3"></span>
          </div>

          <!-- Numeric Keypad -->
          <div class="passcode-keypad">
            <button type="button" class="keypad-digit" data-digit="1">1</button>
            <button type="button" class="keypad-digit" data-digit="2">2</button>
            <button type="button" class="keypad-digit" data-digit="3">3</button>
            <button type="button" class="keypad-digit" data-digit="4">4</button>
            <button type="button" class="keypad-digit" data-digit="5">5</button>
            <button type="button" class="keypad-digit" data-digit="6">6</button>
            <button type="button" class="keypad-digit" data-digit="7">7</button>
            <button type="button" class="keypad-digit" data-digit="8">8</button>
            <button type="button" class="keypad-digit" data-digit="9">9</button>
            <button type="button" class="keypad-special" id="btnKeypadClear">C</button>
            <button type="button" class="keypad-digit" data-digit="0">0</button>
            <button type="button" class="keypad-special" id="btnKeypadBackspace">⌫</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnCancelPasscode')?.addEventListener('click', () => {
      mount.innerHTML = '';
      this.pendingRole = null;
    });

    mount.querySelectorAll('.keypad-digit').forEach(btn => {
      btn.addEventListener('click', () => {
        this.appendDigit(btn.dataset.digit);
      });
    });

    document.getElementById('btnKeypadBackspace')?.addEventListener('click', () => {
      this.backspaceDigit();
    });

    document.getElementById('btnKeypadClear')?.addEventListener('click', () => {
      this.clearPin();
    });
  }

  appendDigit(digit) {
    if (this.enteredPin.length < 4) {
      this.enteredPin += digit;
      this.updateDots();
      if (this.enteredPin.length === 4) {
        setTimeout(() => this.verifyPin(), 120);
      }
    }
  }

  backspaceDigit() {
    if (this.enteredPin.length > 0) {
      this.enteredPin = this.enteredPin.slice(0, -1);
      this.updateDots();
    }
  }

  clearPin() {
    this.enteredPin = '';
    this.updateDots();
  }

  updateDots() {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`pdot-${i}`);
      if (dot) {
        if (i < this.enteredPin.length) {
          dot.classList.add('filled');
        } else {
          dot.classList.remove('filled');
        }
      }
    }
  }

  verifyPin() {
    const data = getCareData();
    const language = data.profile?.language || 'mr';
    const security = data.security || {};

    let expected = '1234';
    if (this.pendingRole === 'family') {
      expected = security.familyPasscode || '5678';
    } else if (this.pendingRole === 'elder') {
      expected = security.elderPasscode || '1234';
    } else {
      expected = security.caretakerPasscode || '1234';
    }

    if (this.enteredPin === expected) {
      const mount = document.getElementById('rolePasscodeMount');
      if (mount) mount.innerHTML = '';
      const chosenRole = this.pendingRole;
      this.pendingRole = null;
      this.selectRoleDirectly(chosenRole);
    } else {
      // Shake dots & error message
      const dotsEl = document.getElementById('passcodeDots');
      dotsEl?.classList.add('shake-anim');
      const hintEl = document.getElementById('passcodeErrorHint');
      if (hintEl) {
        hintEl.textContent = t('invalidPasscode', language);
        hintEl.classList.add('text-error');
      }
      setTimeout(() => {
        dotsEl?.classList.remove('shake-anim');
        this.clearPin();
      }, 600);
    }
  }
}

/**
 * Top bar role chip HTML generator
 */
export function renderTopBarRoleChip(activeRole = 'elder', language = 'mr') {
  let roleLabel = t('roleElder', language);
  let roleClass = 'role-chip-elder';

  if (activeRole === 'family') {
    roleLabel = t('roleFamily', language);
    roleClass = 'role-chip-family';
  } else if (activeRole === 'caretaker') {
    roleLabel = t('roleCaretaker', language);
    roleClass = 'role-chip-caretaker';
  }

  return `
    <button type="button" class="top-bar-role-chip ${roleClass}" id="btnTopRoleSwitch" title="${t('switchRole', language)}" aria-label="${t('switchRole', language)}">
      <span class="role-status-dot"></span>
      <span class="role-chip-text">${roleLabel}</span>
      <span class="role-chip-arrow">▾</span>
    </button>
  `;
}
