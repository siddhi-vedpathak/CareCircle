/**
 * Demo Tools & Time Simulation Engine
 * Activated by long-pressing the clock on the Today screen.
 */

import { getCareData, saveCareData, loadSampleDemoData } from './storage.js';

let clockPressTimer = null;
let simulatedOffsetMs = 0;
let forcedMode = null; // 'reminder_now' | 'missed_dose' | null

export function initDemoSimulation() {
  const data = getCareData();
  if (data.demoState) {
    simulatedOffsetMs = (data.demoState.timeOffsetMinutes || 0) * 60 * 1000;
    forcedMode = data.demoState.forcedMode || null;
  }
}

export function getCurrentEffectiveDate() {
  const now = new Date();
  if (forcedMode === 'reminder_now') {
    const d = new Date(now);
    d.setHours(8, 30, 0, 0);
    return d;
  }
  if (forcedMode === 'missed_dose') {
    const d = new Date(now);
    d.setHours(11, 30, 0, 0);
    return d;
  }
  return new Date(now.getTime() + simulatedOffsetMs);
}

export function getSimulatedTimeDisplay() {
  const d = getCurrentEffectiveDate();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function isDemoActive() {
  return simulatedOffsetMs !== 0 || forcedMode !== null;
}

export function setupClockLongPress(clockElement, onTrigger) {
  if (!clockElement) return;

  const startPress = () => {
    clockPressTimer = setTimeout(() => {
      if (navigator.vibrate) {
        try { navigator.vibrate(50); } catch (e) {}
      }
      onTrigger();
    }, 700);
  };

  const cancelPress = () => {
    if (clockPressTimer) {
      clearTimeout(clockPressTimer);
      clockPressTimer = null;
    }
  };

  clockElement.addEventListener('pointerdown', startPress);
  clockElement.addEventListener('pointerup', cancelPress);
  clockElement.addEventListener('pointerleave', cancelPress);
  clockElement.addEventListener('pointercancel', cancelPress);
}

export function addSimulatedMinutes(minutes) {
  forcedMode = null;
  simulatedOffsetMs += minutes * 60 * 1000;
  persistDemoState();
}

export function setSimulatedTimeOfDay(hours, minutes) {
  forcedMode = null;
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  simulatedOffsetMs = target.getTime() - now.getTime();
  persistDemoState();
}

export function triggerSimulateReminderNow() {
  let data = getCareData();
  // If user hasn't set up medicines yet, load demo dataset so they can see the reminder
  if (!data.medications || data.medications.length === 0) {
    data = loadSampleDemoData();
  }

  forcedMode = 'reminder_now';
  simulatedOffsetMs = 0;

  const todayKey = new Date().toISOString().split('T')[0];
  if (data.dailyDoses) {
    delete data.dailyDoses[`${todayKey}_med_bp`];
    delete data.dailyDoses[`${todayKey}_med_sugar`];
    delete data.dailyDoses[`${todayKey}_${data.medications[0]?.id}`];
  }
  data.demoState = {
    timeOffsetMinutes: 0,
    forcedMode: 'reminder_now'
  };
  saveCareData(data);
}

export function triggerSimulateMissedDose() {
  let data = getCareData();
  if (!data.medications || data.medications.length === 0) {
    data = loadSampleDemoData();
  }

  forcedMode = 'missed_dose';
  simulatedOffsetMs = 0;

  const todayKey = new Date().toISOString().split('T')[0];
  if (data.dailyDoses) {
    delete data.dailyDoses[`${todayKey}_med_bp`];
    delete data.dailyDoses[`${todayKey}_med_sugar`];
    delete data.dailyDoses[`${todayKey}_${data.medications[0]?.id}`];
  }
  data.demoState = {
    timeOffsetMinutes: 0,
    forcedMode: 'missed_dose'
  };
  saveCareData(data);
}

export function resetToRealTime() {
  simulatedOffsetMs = 0;
  forcedMode = null;
  persistDemoState();
}

function persistDemoState() {
  const data = getCareData();
  data.demoState = {
    timeOffsetMinutes: Math.round(simulatedOffsetMs / 60000),
    forcedMode
  };
  saveCareData(data);
}
