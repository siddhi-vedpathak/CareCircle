/**
 * CareCircle - Main Application Coordinator
 * Manages view routing, floating bottom nav bar, language reactivity,
 * 3-role access (Elderly Person, Family Member, Caretaker), passcodes,
 * first-run wizard enforcement, and PWA service worker.
 */

import { CareStorage, getCareData, initCareData, getActiveRole, setActiveRole, getLargeTextMode, persistLanguage } from './storage.js';
import { initDemoSimulation } from './demo.js';
import { TodayView } from './today.js';
import { MedicinesView } from './medicines.js';
import { InfoView } from './info.js';
import { FamilyDashboardView } from './familyDashboard.js';
import { RoleManager } from './roles.js';
import { SetupWizard } from './wizard.js';
import { DemoModal } from './demoModal.js';
import { unlockAudio } from './audio.js';
import { t } from './i18n.js';
import { Icons } from './icons.js';

export async function sendEmailNotification({ to, subject, text, html }) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text, html })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[CareCircle] Email error:', error);
    throw error;
  }
}

window.CareCircle = {
  storage: CareStorage,
  sendEmailNotification
};

class AppController {
  constructor() {
    this.activeTab = 'today';
    this.currentView = null;
    this.demoModal = null;
    this.clockInterval = null;
  }

  init() {
    initCareData();
    initDemoSimulation();

    // Apply Large Text Mode if enabled in Settings
    if (getLargeTextMode()) {
      document.body.classList.add('large-text-mode');
    }

    // Register PWA Service Worker (caches static assets only)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('[CareCircle] Service Worker registration failed:', err);
      });
    }

    // Online / Offline state reactivity
    const updateOnlinePills = () => {
      document.querySelectorAll('#offlineIndicator').forEach(pill => {
        if (navigator.onLine) {
          pill.classList.add('hidden');
        } else {
          pill.classList.remove('hidden');
        }
      });
    };
    window.addEventListener('online', updateOnlinePills);
    window.addEventListener('offline', updateOnlinePills);

    // First touch audio unlock
    const handleGesture = () => {
      unlockAudio();
      document.removeEventListener('pointerdown', handleGesture);
      document.removeEventListener('keydown', handleGesture);
    };
    document.addEventListener('pointerdown', handleGesture, { once: true });
    document.addEventListener('keydown', handleGesture, { once: true });

    this.demoModal = new DemoModal({
      onStateChanged: () => this.refreshCurrentView(),
      onRerunWizard: () => this.launchWizard()
    });

    const data = getCareData();
    // Fresh start opens straight into Setup Wizard
    if (!data.setupCompleted) {
      this.launchWizard();
    } else {
      // Check if role is stored in session
      const activeRole = getActiveRole();
      if (!activeRole) {
        this.showRoleSelection();
      } else {
        this.mountAppShell();
        this.switchTab('today');
      }
    }

    // Interval to refresh time-based states
    this.clockInterval = setInterval(() => {
      if (this.activeTab === 'today' && this.currentView && this.currentView.render) {
        this.currentView.render();
      }
    }, 15000);
  }

  showRoleSelection() {
    const appEl = document.getElementById('app');
    appEl.innerHTML = '<div id="roleSelectMount"></div>';
    const mountEl = document.getElementById('roleSelectMount');
    const roleManager = new RoleManager({
      onRoleChanged: (role) => {
        this.mountAppShell();
        this.switchTab('today');
      },
      onLanguageChange: (lang) => {
        persistLanguage(lang);
        this.showRoleSelection();
      }
    });
    roleManager.renderSelectionScreen(mountEl);
  }

  launchWizard() {
    const appEl = document.getElementById('app');
    appEl.innerHTML = '<div id="wizardMount"></div>';
    const mountEl = document.getElementById('wizardMount');
    const wizard = new SetupWizard(mountEl, () => {
      this.showRoleSelection();
    });
    wizard.init();
  }

  mountAppShell() {
    const data = getCareData();
    const lang = data.profile?.language || 'mr';

    const appEl = document.getElementById('app');
    appEl.innerHTML = `
      <div class="carecircle-shell">
        <!-- Main Scrollable Area -->
        <div class="tab-content-area" id="tabContentArea"></div>

        <!-- Floating Bottom Navigation Bar -->
        <nav class="floating-nav-bar" id="floatingNavBar" role="navigation" aria-label="Bottom Navigation">
          <button type="button" class="floating-nav-tab active" data-tab="today" id="tabBtnToday">
            <span class="nav-icon-slot">${Icons.clock(22)}</span>
            <span class="nav-label-slot">${t('tabToday', lang)}</span>
          </button>

          <button type="button" class="floating-nav-tab" data-tab="medicines" id="tabBtnMedicines">
            <span class="nav-icon-slot">${Icons.pill(22)}</span>
            <span class="nav-label-slot">${t('tabMedicines', lang)}</span>
          </button>

          <button type="button" class="floating-nav-tab" data-tab="info" id="tabBtnInfo">
            <span class="nav-icon-slot">${Icons.user(22)}</span>
            <span class="nav-label-slot">${t('tabMyInfo', lang)}</span>
          </button>
        </nav>
      </div>
    `;

    document.querySelectorAll('.floating-nav-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;

    // Update floating tab active states
    document.querySelectorAll('.floating-nav-tab').forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const contentArea = document.getElementById('tabContentArea');
    if (!contentArea) return;

    const activeRole = getActiveRole() || 'elder';

    const handleRoleSwitch = () => {
      setActiveRole(null);
      this.showRoleSelection();
    };

    const handleLangChange = (lang) => {
      if (lang) persistLanguage(lang);
      const data = getCareData();
      const currentLang = data.profile?.language || 'mr';
      const todayLabel = document.querySelector('#tabBtnToday .nav-label-slot');
      const medLabel = document.querySelector('#tabBtnMedicines .nav-label-slot');
      const infoLabel = document.querySelector('#tabBtnInfo .nav-label-slot');

      if (todayLabel) todayLabel.textContent = t('tabToday', currentLang);
      if (medLabel) medLabel.textContent = t('tabMedicines', currentLang);
      if (infoLabel) infoLabel.textContent = t('tabMyInfo', currentLang);

      this.refreshCurrentView();
    };

    if (tabName === 'today') {
      if (activeRole === 'family') {
        // Family Member sees Read-Only Dashboard (adherence, missed doses, appointments, reports, send note)
        this.currentView = new FamilyDashboardView(contentArea, {
          onRoleSwitch: handleRoleSwitch,
          onLanguageChange: handleLangChange
        });
        this.currentView.init();
      } else {
        // Elderly Person & Caretaker see TodayView
        this.currentView = new TodayView(contentArea, {
          onOpenDemo: () => this.demoModal.show(),
          onCallContact: (contact) => {
            if (contact && contact.phone) {
              window.location.href = `tel:${contact.phone.replace(/\s+/g, '')}`;
            }
          },
          onRoleSwitch: handleRoleSwitch,
          onLanguageChange: handleLangChange,
          activeRole
        });
        this.currentView.init();
      }
    } else if (tabName === 'medicines') {
      this.currentView = new MedicinesView(contentArea, {
        onRoleSwitch: handleRoleSwitch,
        onLanguageChange: handleLangChange,
        activeRole
      });
      this.currentView.init();
    } else if (tabName === 'info') {
      this.currentView = new InfoView(contentArea, {
        onRerunWizard: () => this.launchWizard(),
        onRoleSwitch: handleRoleSwitch,
        onLanguageChange: handleLangChange,
        activeRole
      });
      this.currentView.init();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  refreshCurrentView() {
    if (this.currentView && this.currentView.render) {
      this.currentView.render();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.init();
});
