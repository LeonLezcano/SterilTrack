/**
 * SterilTrack - Main Application Logic
 */

import { SurgicalTrayLifecycleEngine, TRAY_STATES } from './core/surgicalTrayLifecycleEngine.js';
import { AutoclaveValidationEngine, STERILIZATION_METHODS } from './core/autoclaveValidationEngine.js';
import { AnmatImplantConsumptionEngine } from './core/anmatImplantConsumptionEngine.js';
import { SplitBillingLedgerEngine } from './core/splitBillingLedgerEngine.js';
import { SterilTrackCache } from './services/sterilTrackCache.service.js';
import { sealSterilizationProtocol } from './utils/cryptoSeal.js';
import { formatCurrency, formatDateTime } from './utils/formatters.js';
import { Sanitizer } from './utils/sanitizer.js';

export const APP_VERSION = 'v1.0.01';

// Estado global en memoria reactivo
export const state = {
  trays: [],
  cycles: [],
  actas: [],
  billings: [],
  activeTab: 'trays',
  isLoading: false,
  feedback: null
};

const autoclaveEngine = new AutoclaveValidationEngine();
const consumptionEngine = new AnmatImplantConsumptionEngine();
const billingEngine = new SplitBillingLedgerEngine();

const ICONS = {
  shield: '<svg aria-hidden="true" class="w-6 h-6 text-teal-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>',
  trays: '<svg aria-hidden="true" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
  cycles: '<svg aria-hidden="true" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>',
  consumptions: '<svg aria-hidden="true" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>',
  billing: '<svg aria-hidden="true" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 10h8"/><path d="M8 14h5"/></svg>',
  dispatch: '<svg aria-hidden="true" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  check: '<svg aria-hidden="true" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  alert: '<svg aria-hidden="true" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
  close: '<svg aria-hidden="true" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  empty: '<svg aria-hidden="true" class="w-8 h-8 text-slate-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'
};

function isDemoPurged() {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('steriltrack_demo_purged') === 'true') {
    return true;
  }
  return SterilTrackCache.get('demo_purged') === true;
}

function setDemoPurgedFlag(purged) {
  if (purged) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('steriltrack_demo_purged', 'true');
      } catch {}
    }
    SterilTrackCache.set('demo_purged', true);
    return;
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem('steriltrack_demo_purged');
    } catch {}
  }
  SterilTrackCache.remove('demo_purged');
}

function getTabButtonClasses(isActive) {
  const base = 'min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-md inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';
  if (isActive) {
    return `${base} bg-teal-400 text-slate-950`;
  }
  return `${base} bg-slate-800 text-slate-100 hover:bg-slate-700`;
}

function setFeedback(type, message) {
  state.feedback = { type, message };
}

export async function ensureProtocolSeals() {
  let updated = false;

  for (let i = 0; i < state.cycles.length; i++) {
    const c = state.cycles[i];
    if (!c.cryptoSeal) {
      c.cryptoSeal = await sealSterilizationProtocol({
        recordType: 'AUTOCLAVE_CYCLE',
        cycleId: c.id,
        cycleNumber: c.cycleNumber,
        autoclaveId: c.autoclaveId,
        method: c.method,
        plateauTempCelsius: c.plateauTempCelsius,
        chamberPressureBar: c.chamberPressureBar,
        biologicalIndicatorResult: c.biologicalIndicatorResult,
        status: c.status
      });
      updated = true;
    }
  }

  for (let i = 0; i < state.actas.length; i++) {
    const a = state.actas[i];
    if (!a.cryptoSeal) {
      a.cryptoSeal = await sealSterilizationProtocol({
        recordType: 'ANMAT_CONSUMPTION_ACTA',
        actaId: a.id,
        trayCode: a.trayCode,
        surgicalProtocolNumber: a.surgicalProtocolNumber,
        totalToBillARS: a.totalToBillARS
      });
      updated = true;
    }
  }

  if (updated) {
    persistState();
    if (typeof document !== 'undefined') {
      renderApp();
    }
  }
}

export function seedDemoData({ force = false } = {}) {
  const cachedTrays = SterilTrackCache.get('trays');
  const cachedCycles = SterilTrackCache.get('cycles') || [];
  const cachedActas = SterilTrackCache.get('actas') || [];
  const cachedBillings = SterilTrackCache.get('billings') || [];

  if (!force && ((cachedTrays && cachedTrays.length > 0) || cachedCycles.length > 0 || cachedActas.length > 0)) {
    state.trays = cachedTrays || [];
    state.cycles = cachedCycles;
    state.actas = cachedActas;
    state.billings = cachedBillings;
    return;
  }

  if (!force && isDemoPurged()) {
    state.trays = [];
    state.cycles = [];
    state.actas = [];
    state.billings = [];
    return;
  }

  setDemoPurgedFlag(false);

  const tray1 = new SurgicalTrayLifecycleEngine().createTray({
    id: 'TRAY-01',
    name: 'Caja Fémur Distal LCP 4.5/5.0',
    code: 'CJ-TRAUMA-01',
    surgeryType: 'Traumatología Alta Complejidad',
    orthopedicSupplier: 'Impplant Argentina S.A.',
    sterileExpiryDays: 30,
    implants: [
      { id: 'IMP-01', name: 'Placa LCP Anatómica Fémur Titanio', lot: 'LOT-9821', anmatPM: 'PM-1450-8', initialQty: 1, unitPriceARS: 380000 },
      { id: 'IMP-02', name: 'Tornillo Bloqueado 5.0mm x 40mm', lot: 'LOT-4412', anmatPM: 'PM-1450-8', initialQty: 12, unitPriceARS: 28500 },
      { id: 'IMP-03', name: 'Tornillo Bloqueado 5.0mm x 55mm', lot: 'LOT-4419', anmatPM: 'PM-1450-8', initialQty: 12, unitPriceARS: 28500 }
    ],
    instruments: [
      { id: 'INS-01', name: 'Destornillador Dinamomérico 3.5Nm', replacementPriceARS: 210000, initialQty: 1 },
      { id: 'INS-02', name: 'Guía de Broca Doble 4.3mm', replacementPriceARS: 85000, initialQty: 2 },
      { id: 'INS-03', name: 'Mecha Quirúrgica 4.3mm Titanio', replacementPriceARS: 65000, initialQty: 2 }
    ]
  });

  const cycle1 = autoclaveEngine.evaluateCycle({
    cycleNumber: 104,
    autoclaveId: 'AUTOCLAVE-VAPOR-01',
    method: STERILIZATION_METHODS.STEAM_134,
    plateauTempCelsius: 134.5,
    chamberPressureBar: 2.2,
    exposureMinutes: 7.0,
    chemicalClass5Passed: true,
    biologicalIndicatorResult: 'NEGATIVE',
    operatorId: 'TEC-MARIA-GOMEZ'
  });
  cycle1.isDemo = true;

  tray1.state = TRAY_STATES.EN_AUTOCLAVE_CUARENTENA;
  tray1.isDemo = true;
  const engine1 = new SurgicalTrayLifecycleEngine(tray1);
  engine1.transitionTo(TRAY_STATES.ESTERIL_LIBERADA, {
    autoclaveCycleId: cycle1.id,
    validationPassed: true
  });

  state.trays = [engine1.getTray()];
  state.cycles = [cycle1];
  persistState();
}

export function purgeDemoData() {
  state.trays = [];
  state.cycles = [];
  state.actas = [];
  state.billings = [];
  SterilTrackCache.remove('trays');
  SterilTrackCache.remove('cycles');
  SterilTrackCache.remove('actas');
  SterilTrackCache.remove('billings');
  setDemoPurgedFlag(true);
  setFeedback('info', 'Datos de demostración eliminados. El almacenamiento local quedó vacío hasta cargar o registrar nuevas cajas.');
  renderApp();
}

export async function restoreDemoData() {
  state.isLoading = true;
  renderApp();
  try {
    setDemoPurgedFlag(false);
    seedDemoData({ force: true });
    await ensureProtocolSeals();
    setFeedback('success', 'Lote de demostración cargado y sellado criptográficamente con SHA-256 local.');
  } catch (err) {
    setFeedback('error', err?.message || 'No se pudo cargar el lote de demostración.');
  } finally {
    state.isLoading = false;
    renderApp();
  }
}

export function persistState() {
  SterilTrackCache.set('trays', state.trays);
  SterilTrackCache.set('cycles', state.cycles);
  SterilTrackCache.set('actas', state.actas);
  SterilTrackCache.set('billings', state.billings);
}

function renderFeedbackBanner() {
  if (state.isLoading) {
    return `
      <div role="status" aria-live="polite" class="mb-5 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 flex items-center gap-3">
        <span class="font-semibold">Procesando sello criptográfico SHA-256...</span>
      </div>
    `;
  }

  if (!state.feedback) return '';

  const stylesByType = {
    success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    error: 'border-rose-300 bg-rose-50 text-rose-900',
    info: 'border-slate-300 bg-white text-slate-900'
  };
  const styleClass = stylesByType[state.feedback.type] || stylesByType.info;
  const roleAttr = state.feedback.type === 'error' ? 'role="alert"' : 'role="status"';

  return `
    <div ${roleAttr} aria-live="polite" class="mb-5 rounded-lg border px-4 py-3 text-sm flex items-center justify-between gap-3 ${styleClass} no-print">
      <div class="flex items-center gap-2.5 min-w-0">
        ${state.feedback.type === 'error' ? ICONS.alert : ICONS.check}
        <span class="font-medium">${Sanitizer.escapeHTML(state.feedback.message)}</span>
      </div>
      <button id="btn-dismiss-feedback" type="button" aria-label="Cerrar notificación" class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md hover:bg-slate-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
        ${ICONS.close}
      </button>
    </div>
  `;
}

export function renderApp() {
  if (typeof document === 'undefined') return;
  const root = document.getElementById('app');
  if (!root) return;

  const sealedCount = state.cycles.filter((c) => c.cryptoSeal?.sealHash).length + state.actas.filter((a) => a.cryptoSeal?.sealHash).length;

  const html = `
    <header class="bg-slate-900 text-white border-b border-slate-800">
      <div class="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-slate-800 border border-slate-700">
            ${ICONS.shield}
          </div>
          <div>
            <div class="flex flex-wrap items-baseline gap-2">
              <span class="text-lg font-bold tracking-tight text-white">SterilTrack</span>
              <span class="text-xs font-mono text-slate-300">${Sanitizer.escapeHTML(APP_VERSION)}</span>
            </div>
            <p class="text-xs text-slate-300">Central de Esterilización Hospitalaria y Cajas Quirúrgicas ANMAT</p>
          </div>
        </div>

        <nav role="tablist" aria-label="Módulos operativos" class="flex flex-wrap items-center gap-2 no-print">
          <button id="nav-trays" type="button" role="tab" aria-selected="${state.activeTab === 'trays' ? 'true' : 'false'}" aria-controls="panel-main" class="${getTabButtonClasses(state.activeTab === 'trays')}">
            ${ICONS.trays}
            <span>Cajas Quirúrgicas (${state.trays.length})</span>
          </button>
          <button id="nav-cycles" type="button" role="tab" aria-selected="${state.activeTab === 'cycles' ? 'true' : 'false'}" aria-controls="panel-main" class="${getTabButtonClasses(state.activeTab === 'cycles')}">
            ${ICONS.cycles}
            <span>Autoclaves (${state.cycles.length})</span>
          </button>
          <button id="nav-consumptions" type="button" role="tab" aria-selected="${state.activeTab === 'consumptions' ? 'true' : 'false'}" aria-controls="panel-main" class="${getTabButtonClasses(state.activeTab === 'consumptions')}">
            ${ICONS.consumptions}
            <span>Consumo ANMAT (${state.actas.length})</span>
          </button>
          <button id="nav-billing" type="button" role="tab" aria-selected="${state.activeTab === 'billing' ? 'true' : 'false'}" aria-controls="panel-main" class="${getTabButtonClasses(state.activeTab === 'billing')}">
            ${ICONS.billing}
            <span>Split-Billing ART (${state.billings.length})</span>
          </button>
        </nav>
      </div>
    </header>

    <main id="panel-main" role="tabpanel" tabindex="0" class="flex-1 w-full max-w-7xl mx-auto px-4 py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
      ${renderFeedbackBanner()}
      ${renderActiveView()}
    </main>

    <footer class="mt-auto border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-600">
      SterilTrack &copy; 2026 | AiAppFactory Standard | Sellado local Web Crypto SHA-256 (${sealedCount} protocolos sellados) | Almacenamiento local Offline-First
    </footer>
  `;

  Sanitizer.safeSetInnerHTML(root, html);
  attachEventListeners();
}

function renderActiveView() {
  if (state.activeTab === 'trays') return renderTraysView();
  if (state.activeTab === 'cycles') return renderCyclesView();
  if (state.activeTab === 'consumptions') return renderConsumptionsView();
  if (state.activeTab === 'billing') return renderBillingView();
  return '<p class="text-sm text-slate-700">Vista no encontrada.</p>';
}

function renderTraysView() {
  const hasAnyData = state.trays.length > 0 || state.cycles.length > 0 || state.actas.length > 0 || state.billings.length > 0;
  const hasReadyTray = state.trays.some((t) => t.state === TRAY_STATES.ESTERIL_LIBERADA);

  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">Cajas Quirúrgicas e Instrumental en Préstamo</h1>
          <p class="text-sm text-slate-600">Trazabilidad desde depósito a quirófano y retorno con lavado ultrasónico.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2 no-print">
          ${hasAnyData ? `
            <button id="btn-purge-demo" type="button" class="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
              Limpiar Datos [DEMO]
            </button>
          ` : `
            <button id="btn-restore-demo" type="button" class="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-md bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
              Cargar Lote [DEMO]
            </button>
          `}
          <button id="btn-quick-dispatch" type="button" ${state.isLoading || !hasReadyTray ? 'disabled' : ''} class="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-700 disabled:cursor-not-allowed inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
            ${ICONS.dispatch}
            <span>Simular Despacho a Quirófano [MOCK]</span>
          </button>
        </div>
      </div>

      ${state.trays.length === 0 ? `
        <section class="bg-white border border-dashed border-slate-300 rounded-lg p-8 text-center space-y-3">
          ${ICONS.empty}
          <h2 class="text-lg font-semibold text-slate-900">Sin cajas quirúrgicas registradas</h2>
          <p class="text-sm text-slate-600 max-w-xl mx-auto">No hay cajas cargadas en el almacenamiento local. Puedes cargar el lote de demostración para inspeccionar el ciclo de esterilización, consumo ANMAT y liquidación Split-Billing.</p>
          <div class="pt-2 no-print">
            <button id="btn-restore-demo-empty" type="button" class="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
              Cargar Lote [DEMO]
            </button>
          </div>
        </section>
      ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${state.trays.map((t) => {
            const isSterile = t.state === TRAY_STATES.ESTERIL_LIBERADA;
            const statusClasses = isSterile
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200';
            return `
              <article class="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-semibold text-slate-700">${Sanitizer.escapeHTML(t.code)}</span>
                    ${t.isDemo ? '<span class="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">[DEMO]</span>' : ''}
                  </div>
                  <span class="text-xs font-semibold px-2.5 py-0.5 rounded border ${statusClasses}">${Sanitizer.escapeHTML(t.state)}</span>
                </div>

                <div class="space-y-1">
                  <h2 class="text-lg font-semibold text-slate-900 leading-snug">${Sanitizer.escapeHTML(t.name)}</h2>
                  <p class="text-sm text-slate-700">${Sanitizer.escapeHTML(t.surgeryType)}</p>
                  <p class="text-xs text-slate-600">Proveedor: ${Sanitizer.escapeHTML(t.orthopedicSupplier)}</p>
                </div>

                <dl class="border-t border-slate-200 pt-3 space-y-1.5 text-xs text-slate-700">
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-slate-600">Implantes en caja</dt>
                    <dd class="font-semibold text-slate-900">${t.implants.length} medidas</dd>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-slate-600">Instrumental</dt>
                    <dd class="font-semibold text-slate-900">${t.instruments.length} piezas</dd>
                  </div>
                  ${t.sterileExpiresAt ? `
                    <div class="flex items-center justify-between gap-2">
                      <dt class="text-slate-600">Vencimiento esterilidad</dt>
                      <dd class="font-semibold font-mono text-slate-900">${Sanitizer.escapeHTML(formatDateTime(t.sterileExpiresAt))}</dd>
                    </div>
                  ` : ''}
                  ${t.currentHospitalRecipient ? `
                    <div class="flex items-center justify-between gap-2">
                      <dt class="text-slate-600">Destino actual</dt>
                      <dd class="font-semibold text-slate-900">${Sanitizer.escapeHTML(t.currentHospitalRecipient)}</dd>
                    </div>
                  ` : ''}
                </dl>
              </article>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

function renderCyclesView() {
  return `
    <div class="space-y-6">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Control de Autoclaves y Validación Biológica</h1>
        <p class="text-sm text-slate-600">Puerta de liberación: Temperatura, Presión, Integrador Químico Clase 5 y G. stearothermophilus.</p>
      </div>

      ${state.cycles.length === 0 ? `
        <section class="bg-white border border-dashed border-slate-300 rounded-lg p-8 text-center space-y-3">
          ${ICONS.empty}
          <h2 class="text-lg font-semibold text-slate-900">Sin ciclos de autoclave registrados</h2>
          <p class="text-sm text-slate-600 max-w-xl mx-auto">No hay validaciones físicas ni biológicas registradas en esta sesión local.</p>
        </section>
      ` : `
        <div class="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead class="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th scope="col" class="p-3">Ciclo #</th>
                <th scope="col" class="p-3">Autoclave</th>
                <th scope="col" class="p-3">Método</th>
                <th scope="col" class="p-3">Temp / Presión</th>
                <th scope="col" class="p-3">Clase 5</th>
                <th scope="col" class="p-3">Biológico</th>
                <th scope="col" class="p-3">Dictamen</th>
                <th scope="col" class="p-3">Sello SHA-256</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 text-slate-800">
              ${state.cycles.map((c) => `
                <tr class="hover:bg-slate-50">
                  <td class="p-3 font-mono font-semibold text-slate-900">
                    ${Sanitizer.escapeHTML(String(c.cycleNumber))}
                    ${c.isDemo ? '<span class="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">[DEMO]</span>' : ''}
                  </td>
                  <td class="p-3">${Sanitizer.escapeHTML(c.autoclaveId)}</td>
                  <td class="p-3 font-mono">${Sanitizer.escapeHTML(c.method)}</td>
                  <td class="p-3 font-mono">${Sanitizer.escapeHTML(String(c.plateauTempCelsius))}°C / ${Sanitizer.escapeHTML(String(c.chamberPressureBar))} bar</td>
                  <td class="p-3">
                    <span class="inline-flex items-center gap-1.5 font-semibold ${c.chemicalClass5Passed ? 'text-emerald-800' : 'text-rose-800'}">
                      ${c.chemicalClass5Passed ? ICONS.check : ICONS.alert}
                      <span>${c.chemicalClass5Passed ? 'Conforme' : 'Fallo'}</span>
                    </span>
                  </td>
                  <td class="p-3">
                    <span class="inline-flex items-center gap-1.5 font-semibold ${c.biologicalIndicatorResult === 'NEGATIVE' ? 'text-emerald-800' : 'text-rose-800'}">
                      ${c.biologicalIndicatorResult === 'NEGATIVE' ? ICONS.check : ICONS.alert}
                      <span>${c.biologicalIndicatorResult === 'NEGATIVE' ? 'Negativo' : 'Positivo'}</span>
                    </span>
                  </td>
                  <td class="p-3">
                    <span class="px-2 py-0.5 rounded border font-semibold text-xs ${c.isApproved ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}">
                      ${Sanitizer.escapeHTML(c.status)}
                    </span>
                  </td>
                  <td class="p-3 font-mono text-slate-700">
                    ${c.cryptoSeal ? `
                      <span title="${Sanitizer.escapeHTML(c.cryptoSeal.sealHash)}">${Sanitizer.escapeHTML(c.cryptoSeal.verificationCode)}</span>
                    ` : 'Pendiente...'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

function renderConsumptionsView() {
  return `
    <div class="space-y-6">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Actas Quirúrgicas de Consumo ANMAT</h1>
        <p class="text-sm text-slate-600">Conciliación de implantes consumidos vs retornados con número de GTIN/PM para ART.</p>
      </div>

      ${state.actas.length === 0 ? `
        <section class="bg-white border border-dashed border-slate-300 rounded-lg p-8 text-center space-y-3">
          ${ICONS.empty}
          <h2 class="text-lg font-semibold text-slate-900">No hay actas quirúrgicas registradas</h2>
          <p class="text-sm text-slate-600 max-w-xl mx-auto">Al despachar y conciliar una cirugía desde Cajas Quirúrgicas se generará la planilla de trazabilidad ANMAT con sello SHA-256.</p>
        </section>
      ` : `
        <div class="space-y-4">
          ${state.actas.map((a) => `
            <article class="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-lg font-semibold text-slate-900">Protocolo #${Sanitizer.escapeHTML(a.surgicalProtocolNumber)} | Paciente: ${Sanitizer.escapeHTML(a.patientName)}</h2>
                  ${a.isMock ? '<span class="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">[MOCK - SIMULADO]</span>' : ''}
                </div>
                <span class="text-base font-bold font-mono text-teal-800">${Sanitizer.escapeHTML(formatCurrency(a.totalToBillARS))}</span>
              </div>
              <p class="text-sm text-slate-700">Cirujano: ${Sanitizer.escapeHTML(a.surgeonName)} | Sanatorio: ${Sanitizer.escapeHTML(a.hospitalName)}</p>
              <div class="border-t border-slate-200 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <span>Implantes facturados: <strong class="text-slate-900">${a.implantsUsed.length}</strong> | Faltantes instrumental: <strong class="text-slate-900">${a.instrumentDiscrepancies.length}</strong></span>
                <span class="font-mono text-slate-700">
                  ${a.cryptoSeal ? `Sello SHA-256: ${Sanitizer.escapeHTML(a.cryptoSeal.verificationCode)} (${Sanitizer.escapeHTML(a.cryptoSeal.sealHash.slice(0, 12))}...)` : 'Sello SHA-256 pendiente'}
                </span>
              </div>
            </article>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function renderBillingView() {
  return `
    <div class="space-y-6">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Split-Billing: Liquidación ART vs Sanatorio</h1>
        <p class="text-sm text-slate-600">Separación automática de prótesis a la Aseguradora de Riesgos del Trabajo y faltantes a la clínica.</p>
      </div>

      ${state.billings.length === 0 ? `
        <section class="bg-white border border-dashed border-slate-300 rounded-lg p-8 text-center space-y-3">
          ${ICONS.empty}
          <h2 class="text-lg font-semibold text-slate-900">No hay comprobantes de split-billing emitidos</h2>
          <p class="text-sm text-slate-600 max-w-xl mx-auto">Los desgloses hacia ART/Obra Social y Sanatorio aparecerán aquí tras registrar un consumo quirúrgico.</p>
        </section>
      ` : `
        <div class="space-y-4">
          ${state.billings.map((b) => `
            <article class="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-lg font-semibold font-mono text-slate-900">${Sanitizer.escapeHTML(b.id)}</h2>
                  ${b.isMock ? '<span class="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">[MOCK - SIMULADO]</span>' : ''}
                </div>
                <span class="text-base font-bold font-mono text-slate-900">${Sanitizer.escapeHTML(formatCurrency(b.grandTotalARS))}</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:divide-x md:divide-slate-200">
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between gap-2">
                    <h3 class="text-base font-semibold text-blue-900">Aseguradora ART (${Sanitizer.escapeHTML(b.insuranceClaim.insuranceName)})</h3>
                    <span class="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">Prótesis</span>
                  </div>
                  <p class="text-xs text-slate-600">Siniestro: <span class="font-mono text-slate-800">${Sanitizer.escapeHTML(b.insuranceClaim.affiliateOrClaimNumber)}</span></p>
                  <p class="text-sm font-bold font-mono text-slate-900 pt-1">Monto Prótesis: ${Sanitizer.escapeHTML(formatCurrency(b.insuranceClaim.totalARS))}</p>
                </div>

                <div class="md:pl-6 space-y-1.5">
                  <div class="flex items-center justify-between gap-2">
                    <h3 class="text-base font-semibold text-amber-900">Clínica / Sanatorio (${Sanitizer.escapeHTML(b.clinicClaim.clinicName)})</h3>
                    <span class="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">Sanatorio</span>
                  </div>
                  <p class="text-xs text-slate-600">Faltantes instrumental + Esterilización</p>
                  <p class="text-sm font-bold font-mono text-slate-900 pt-1">Monto Cargo: ${Sanitizer.escapeHTML(formatCurrency(b.clinicClaim.totalARS))}</p>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

async function handleQuickDispatchMock() {
  const sterileTray = state.trays.find((t) => t.state === TRAY_STATES.ESTERIL_LIBERADA);
  if (!sterileTray) {
    setFeedback('error', 'No hay cajas en estado ESTERIL_LIBERADA listas para despacho. Limpia y recarga el lote demo para probar nuevamente.');
    renderApp();
    return;
  }

  state.isLoading = true;
  renderApp();

  try {
    const engine = new SurgicalTrayLifecycleEngine(sterileTray);
    engine.transitionTo(TRAY_STATES.EN_QUIROFANO_PRESTAMO, {
      hospitalRecipient: 'Sanatorio de la Trinidad Mitre'
    });

    const updatedTray = engine.getTray();
    const trayIndex = state.trays.findIndex((t) => t.id === updatedTray.id);
    if (trayIndex !== -1) {
      state.trays[trayIndex] = updatedTray;
    }

    const acta = consumptionEngine.processSurgicalConsumption({
      tray: updatedTray,
      surgicalProtocolNumber: 'PROT-2026-991 [MOCK]',
      patientName: 'Juan Carlos Rodríguez [MOCK]',
      patientDni: '28.412.980',
      surgeonName: 'Dr. Fernando Rossi',
      hospitalName: 'Sanatorio de la Trinidad Mitre',
      consumedImplants: [
        { implantId: 'IMP-01', quantityUsed: 1 },
        { implantId: 'IMP-02', quantityUsed: 6 }
      ],
      returnedInstruments: [
        { instrumentId: 'INS-01', returnedQty: 1, condition: 'BUENO' },
        { instrumentId: 'INS-02', returnedQty: 2, condition: 'BUENO' },
        { instrumentId: 'INS-03', returnedQty: 1, condition: 'BUENO' }
      ]
    });
    acta.isMock = true;
    acta.cryptoSeal = await sealSterilizationProtocol({
      recordType: 'ANMAT_CONSUMPTION_ACTA',
      actaId: acta.id,
      trayCode: acta.trayCode,
      surgicalProtocolNumber: acta.surgicalProtocolNumber,
      totalToBillARS: acta.totalToBillARS
    });

    const bill = billingEngine.generateSplitBilling({
      actaConsumo: acta,
      insuranceName: 'Provincia ART [MOCK]',
      affiliateOrClaimNumber: 'ART-9921-2026',
      clinicName: 'Sanatorio de la Trinidad Mitre',
      sterilizationFeeARS: 45000
    });
    bill.isMock = true;

    state.actas.push(acta);
    state.billings.push(bill);
    persistState();
    setFeedback('success', `Despacho simulado [MOCK] procesado. Acta ANMAT sellada (${acta.cryptoSeal.verificationCode}) y Split-Billing generado.`);
  } catch (err) {
    setFeedback('error', err?.message || 'Error al procesar el despacho simulado.');
  } finally {
    state.isLoading = false;
    renderApp();
  }
}

function attachEventListeners() {
  const tabs = [
    { id: 'nav-trays', key: 'trays' },
    { id: 'nav-cycles', key: 'cycles' },
    { id: 'nav-consumptions', key: 'consumptions' },
    { id: 'nav-billing', key: 'billing' }
  ];

  tabs.forEach((tab, index) => {
    const el = document.getElementById(tab.id);
    if (!el) return;
    el.addEventListener('click', () => {
      state.activeTab = tab.key;
      renderApp();
    });
    el.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const nextTab = tabs[(index + delta + tabs.length) % tabs.length];
      state.activeTab = nextTab.key;
      renderApp();
      document.getElementById(nextTab.id)?.focus();
    });
  });

  document.getElementById('btn-dismiss-feedback')?.addEventListener('click', () => {
    state.feedback = null;
    renderApp();
  });

  document.getElementById('btn-purge-demo')?.addEventListener('click', () => {
    purgeDemoData();
  });

  document.getElementById('btn-restore-demo')?.addEventListener('click', () => {
    restoreDemoData();
  });

  document.getElementById('btn-restore-demo-empty')?.addEventListener('click', () => {
    restoreDemoData();
  });

  document.getElementById('btn-quick-dispatch')?.addEventListener('click', () => {
    handleQuickDispatchMock();
  });
}

// Inicialización
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    seedDemoData();
    renderApp();
    ensureProtocolSeals().catch(() => {});
  });
}
