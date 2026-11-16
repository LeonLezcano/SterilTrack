/**
 * SterilTrack — Main Application Logic
 */

import { SurgicalTrayLifecycleEngine, TRAY_STATES } from './core/surgicalTrayLifecycleEngine.js';
import { AutoclaveValidationEngine, STERILIZATION_METHODS } from './core/autoclaveValidationEngine.js';
import { AnmatImplantConsumptionEngine } from './core/anmatImplantConsumptionEngine.js';
import { SplitBillingLedgerEngine } from './core/splitBillingLedgerEngine.js';
import { SterilTrackCache } from './services/sterilTrackCache.service.js';
import { sealSterilizationProtocol } from './utils/cryptoSeal.js';
import { formatCurrency, formatDateTime } from './utils/formatters.js';
import { Sanitizer } from './utils/sanitizer.js';

// Estado global en memoria reactivo
export const state = {
  trays: [],
  cycles: [],
  actas: [],
  billings: [],
  activeTab: 'trays'
};

const trayEngine = new SurgicalTrayLifecycleEngine();
const autoclaveEngine = new AutoclaveValidationEngine();
const consumptionEngine = new AnmatImplantConsumptionEngine();
const billingEngine = new SplitBillingLedgerEngine();

export function seedDemoData() {
  const cachedTrays = SterilTrackCache.get('trays');
  if (cachedTrays && cachedTrays.length > 0) {
    state.trays = cachedTrays;
    state.cycles = SterilTrackCache.get('cycles') || [];
    state.actas = SterilTrackCache.get('actas') || [];
    state.billings = SterilTrackCache.get('billings') || [];
    return;
  }

  // Cajas de prueba
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

  // Pasarla por autoclave para tener una caja estéril lista para despacho
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

  tray1.state = TRAY_STATES.EN_AUTOCLAVE_CUARENTENA;
  const engine1 = new SurgicalTrayLifecycleEngine(tray1);
  engine1.transitionTo(TRAY_STATES.ESTERIL_LIBERADA, {
    autoclaveCycleId: cycle1.id,
    validationPassed: true
  });

  state.trays = [engine1.getTray()];
  state.cycles = [cycle1];
  persistState();
}

export function persistState() {
  SterilTrackCache.set('trays', state.trays);
  SterilTrackCache.set('cycles', state.cycles);
  SterilTrackCache.set('actas', state.actas);
  SterilTrackCache.set('billings', state.billings);
}

export function renderApp() {
  const root = document.getElementById('app');
  if (!root) return;

  const html = `
    <header class="bg-slate-900 text-white shadow-md">
      <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🔬</span>
          <div>
            <h1 class="font-extrabold text-lg tracking-wide leading-tight flex items-center gap-2">
              SterilTrack
              <span class="bg-teal-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">v1.0.00</span>
            </h1>
            <p class="text-xs text-slate-400">Central de Esterilización Hospitalaria & Cajas Quirúrgicas ANMAT</p>
          </div>
        </div>
        <nav class="flex items-center gap-1">
          <button id="nav-trays" class="px-3 py-1.5 text-xs font-bold rounded ${state.activeTab === 'trays' ? 'bg-teal-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}">
            📦 Cajas Quirúrgicas (${state.trays.length})
          </button>
          <button id="nav-cycles" class="px-3 py-1.5 text-xs font-bold rounded ${state.activeTab === 'cycles' ? 'bg-teal-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}">
            🔥 Autoclaves (${state.cycles.length})
          </button>
          <button id="nav-consumptions" class="px-3 py-1.5 text-xs font-bold rounded ${state.activeTab === 'consumptions' ? 'bg-teal-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}">
            📋 Consumo ANMAT (${state.actas.length})
          </button>
          <button id="nav-billing" class="px-3 py-1.5 text-xs font-bold rounded ${state.activeTab === 'billing' ? 'bg-teal-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}">
            💰 Split-Billing ART (${state.billings.length})
          </button>
        </nav>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-6">
      ${renderActiveView()}
    </main>

    <footer class="mt-12 border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
      SterilTrack &copy; 2026 — AiAppFactory Standard &bull; Bioseguridad Quirúrgica Certificada SHA-256
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
  return '<p>Vista no encontrada</p>';
}

function renderTraysView() {
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Cajas Quirúrgicas e Instrumental en Préstamo</h2>
          <p class="text-xs text-slate-500">Trazabilidad desde depósito a quirófano y retorno con lavado ultrasónico.</p>
        </div>
        <button id="btn-quick-dispatch" class="bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-3 py-2 rounded shadow-sm">
          🚀 Simular Despacho a Quirófano
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${state.trays.map((t) => {
          const isSterile = t.state === TRAY_STATES.ESTERIL_LIBERADA;
          const statusBg = isSterile ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-amber-50 text-amber-800 border-amber-200';
          return `
            <article class="bg-white border rounded-lg shadow-sm p-4 space-y-3">
              <div class="flex items-center justify-between border-b pb-2">
                <span class="font-mono text-xs font-bold text-slate-500">${Sanitizer.escapeHTML(t.code)}</span>
                <span class="text-[11px] font-bold px-2 py-0.5 rounded border ${statusBg}">${Sanitizer.escapeHTML(t.state)}</span>
              </div>
              <div>
                <h3 class="font-bold text-sm text-slate-900">${Sanitizer.escapeHTML(t.name)}</h3>
                <p class="text-xs text-slate-500">${Sanitizer.escapeHTML(t.surgeryType)}</p>
                <p class="text-[11px] text-slate-400 mt-0.5">Proveedor: ${Sanitizer.escapeHTML(t.orthopedicSupplier)}</p>
              </div>
              <div class="text-xs text-slate-600 bg-slate-50 p-2 rounded space-y-1">
                <div>Implantes en caja: <strong>${t.implants.length}</strong> medidas</div>
                <div>Instrumental: <strong>${t.instruments.length}</strong> piezas</div>
                ${t.sterileExpiresAt ? `<div>Vencimiento Esterilidad: <strong>${formatDateTime(t.sterileExpiresAt)}</strong></div>` : ''}
              </div>
            </article>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderCyclesView() {
  return `
    <div class="space-y-6">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Control de Autoclaves & Validación Biológica</h2>
        <p class="text-xs text-slate-500">Puerta de liberación: Temperatura, Presión, Integrador Químico Clase 5 y G. stearothermophilus.</p>
      </div>

      <div class="bg-white border rounded-lg shadow-sm overflow-x-auto">
        <table class="w-full text-xs text-left">
          <thead class="bg-slate-50 text-slate-700 font-bold border-b">
            <tr>
              <th class="p-3">Ciclo #</th>
              <th class="p-3">Autoclave</th>
              <th class="p-3">Método</th>
              <th class="p-3">Temp / Presión</th>
              <th class="p-3">Clase 5</th>
              <th class="p-3">Biológico</th>
              <th class="p-3">Dictamen</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            ${state.cycles.map((c) => `
              <tr class="hover:bg-slate-50">
                <td class="p-3 font-mono font-bold">${c.cycleNumber}</td>
                <td class="p-3">${Sanitizer.escapeHTML(c.autoclaveId)}</td>
                <td class="p-3">${c.method}</td>
                <td class="p-3">${c.plateauTempCelsius}°C / ${c.chamberPressureBar} bar</td>
                <td class="p-3">${c.chemicalClass5Passed ? '🟢 Conforme' : '🔴 Fallo'}</td>
                <td class="p-3">${c.biologicalIndicatorResult === 'NEGATIVE' ? '🟢 Negativo' : '🔴 Positivo'}</td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded font-bold text-[10px] ${c.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                    ${c.status}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderConsumptionsView() {
  return `
    <div class="space-y-6">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Actas Quirúrgicas de Consumo ANMAT</h2>
        <p class="text-xs text-slate-500">Conciliación de implantes consumidos vs retornados con número de GTIN/PM para ART.</p>
      </div>

      ${state.actas.length === 0 ? `
        <div class="bg-slate-50 border border-dashed rounded-lg p-8 text-center text-xs text-slate-500">
          No hay actas registradas aún. Al registrar una cirugía se generará la planilla de trazabilidad ANMAT.
        </div>
      ` : `
        <div class="space-y-4">
          ${state.actas.map((a) => `
            <div class="bg-white border rounded-lg p-4 shadow-sm space-y-2">
              <div class="flex items-center justify-between border-b pb-2">
                <span class="font-bold text-slate-900 text-sm">Protocolo #${Sanitizer.escapeHTML(a.surgicalProtocolNumber)} — Paciente: ${Sanitizer.escapeHTML(a.patientName)}</span>
                <span class="font-bold text-teal-700">${formatCurrency(a.totalToBillARS)}</span>
              </div>
              <p class="text-xs text-slate-600">Cirujano: ${Sanitizer.escapeHTML(a.surgeonName)} &bull; Sanatorio: ${Sanitizer.escapeHTML(a.hospitalName)}</p>
              <div class="text-xs text-slate-500">
                Implantes facturados: ${a.implantsUsed.length} &bull; Faltantes instrumental: ${a.instrumentDiscrepancies.length}
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function renderBillingView() {
  return `
    <div class="space-y-6">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Split-Billing: Liquidación ART vs Sanatorio</h2>
        <p class="text-xs text-slate-500">Separación automática de prótesis a la Aseguradora de Riesgos del Trabajo y faltantes a la clínica.</p>
      </div>

      ${state.billings.length === 0 ? `
        <div class="bg-slate-50 border border-dashed rounded-lg p-8 text-center text-xs text-slate-500">
          No hay comprobantes de split billing emitidos.
        </div>
      ` : `
        <div class="space-y-4">
          ${state.billings.map((b) => `
            <div class="bg-white border rounded-lg p-4 shadow-sm space-y-3">
              <div class="flex items-center justify-between border-b pb-2">
                <span class="font-bold text-slate-900">${Sanitizer.escapeHTML(b.id)}</span>
                <span class="font-bold text-slate-900">${formatCurrency(b.grandTotalARS)}</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div class="bg-blue-50 border border-blue-200 p-3 rounded">
                  <h4 class="font-bold text-blue-900">Aseguradora ART (${Sanitizer.escapeHTML(b.insuranceClaim.insuranceName)})</h4>
                  <p class="text-blue-700 mt-1">Siniestro: ${Sanitizer.escapeHTML(b.insuranceClaim.affiliateOrClaimNumber)}</p>
                  <p class="text-blue-900 font-bold mt-2">Monto Prótesis: ${formatCurrency(b.insuranceClaim.totalARS)}</p>
                </div>
                <div class="bg-amber-50 border border-amber-200 p-3 rounded">
                  <h4 class="font-bold text-amber-900">Clínica / Sanatorio (${Sanitizer.escapeHTML(b.clinicClaim.clinicName)})</h4>
                  <p class="text-amber-700 mt-1">Faltantes instrumental + Esterilización</p>
                  <p class="text-amber-900 font-bold mt-2">Monto Cargo: ${formatCurrency(b.clinicClaim.totalARS)}</p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function attachEventListeners() {
  document.getElementById('nav-trays')?.addEventListener('click', () => {
    state.activeTab = 'trays';
    renderApp();
  });
  document.getElementById('nav-cycles')?.addEventListener('click', () => {
    state.activeTab = 'cycles';
    renderApp();
  });
  document.getElementById('nav-consumptions')?.addEventListener('click', () => {
    state.activeTab = 'consumptions';
    renderApp();
  });
  document.getElementById('nav-billing')?.addEventListener('click', () => {
    state.activeTab = 'billing';
    renderApp();
  });

  document.getElementById('btn-quick-dispatch')?.addEventListener('click', () => {
    const sterileTray = state.trays.find((t) => t.state === TRAY_STATES.ESTERIL_LIBERADA);
    if (!sterileTray) {
      alert('No hay cajas en estado ESTERIL_LIBERADA listas para despacho.');
      return;
    }

    const engine = new SurgicalTrayLifecycleEngine(sterileTray);
    engine.transitionTo(TRAY_STATES.EN_QUIROFANO_PRESTAMO, {
      hospitalRecipient: 'Sanatorio de la Trinidad Mitre'
    });

    // Simular consumo quirúrgico
    const acta = consumptionEngine.processSurgicalConsumption({
      tray: engine.getTray(),
      surgicalProtocolNumber: 'PROT-2026-991',
      patientName: 'Juan Carlos Rodríguez',
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
        { instrumentId: 'INS-03', returnedQty: 1, condition: 'BUENO' } // Falta 1 mecha de $65.000
      ]
    });

    // Simular Split-Billing
    const bill = billingEngine.generateSplitBilling({
      actaConsumo: acta,
      insuranceName: 'Provincia ART',
      affiliateOrClaimNumber: 'ART-9921-2026',
      clinicName: 'Sanatorio de la Trinidad Mitre',
      sterilizationFeeARS: 45000
    });

    state.actas.push(acta);
    state.billings.push(bill);
    persistState();
    renderApp();
    alert('¡Despacho a Quirófano y Acta Quirúrgica procesados con éxito!');
  });
}

// Inicialización
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    seedDemoData();
    renderApp();
  });
}
