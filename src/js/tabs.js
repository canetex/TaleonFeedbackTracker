// src/js/tabs.js — navegação Board / Indicadores
import { renderDashboards, resizeDashboardCharts, areDashboardsRendered } from './charts.js';

const STORAGE_TAB_KEY = 'taleon_active_tab';

function setTabButtonState(btn, selected) {
  if (!btn) return;
  btn.setAttribute('aria-selected', selected ? 'true' : 'false');
  btn.classList.toggle('app-tab--active', selected);
  btn.tabIndex = selected ? 0 : -1;
}

function showPanel(panel, visible) {
  if (!panel) return;
  panel.hidden = !visible;
}

export function getActiveTab() {
  return document.getElementById('tab-btn-board')?.getAttribute('aria-selected') === 'true'
    ? 'board'
    : 'charts';
}

export async function switchAppTab(tabId) {
  const boardBtn = document.getElementById('tab-btn-board');
  const chartsBtn = document.getElementById('tab-btn-charts');
  const boardPanel = document.getElementById('panel-board');
  const chartsPanel = document.getElementById('panel-charts');

  const isBoard = tabId === 'board';
  setTabButtonState(boardBtn, isBoard);
  setTabButtonState(chartsBtn, !isBoard);
  showPanel(boardPanel, isBoard);
  showPanel(chartsPanel, !isBoard);

  try {
    sessionStorage.setItem(STORAGE_TAB_KEY, tabId);
  } catch {
    /* ignore */
  }

  if (!isBoard) {
    if (!areDashboardsRendered()) {
      await renderDashboards();
    } else {
      resizeDashboardCharts();
    }
    window.lucide?.createIcons();
  }
}

export async function bindAppTabs() {
  const boardBtn = document.getElementById('tab-btn-board');
  const chartsBtn = document.getElementById('tab-btn-charts');
  if (!boardBtn || !chartsBtn) return;

  boardBtn.addEventListener('click', () => {
    switchAppTab('board').catch((err) => console.error(err));
  });
  chartsBtn.addEventListener('click', () => {
    switchAppTab('charts').catch((err) => console.error(err));
  });

  let initial = 'board';
  try {
    const saved = sessionStorage.getItem(STORAGE_TAB_KEY);
    if (saved === 'charts' || saved === 'board') initial = saved;
  } catch {
    /* ignore */
  }

  await switchAppTab(initial);
}
