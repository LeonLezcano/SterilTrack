/**
 * SterilTrack — Test Guardian Multi-Tier Test Suite (50+ Tests)
 * AiAppFactory Mandatory Standard
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SurgicalTrayLifecycleEngine, TRAY_STATES } from '../src/core/surgicalTrayLifecycleEngine.js';
import { AutoclaveValidationEngine, STERILIZATION_METHODS } from '../src/core/autoclaveValidationEngine.js';
import { AnmatImplantConsumptionEngine } from '../src/core/anmatImplantConsumptionEngine.js';
import { SplitBillingLedgerEngine } from '../src/core/splitBillingLedgerEngine.js';
import { SterilTrackCache } from '../src/services/sterilTrackCache.service.js';
import { computeSHA256, sealSterilizationProtocol } from '../src/utils/cryptoSeal.js';
import { formatCurrency, formatDateTime, formatDate } from '../src/utils/formatters.js';
import { Sanitizer } from '../src/utils/sanitizer.js';
import { state, seedDemoData, purgeDemoData, ensureProtocolSeals } from '../src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message, layer = 'UNIT') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [${layer}] ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ [${layer}] FAIL: ${message}`);
  }
}

async function runAllTests() {
  console.log('\n=============================================================');
  console.log('🧪 STERILTRACK TEST GUARDIAN — SUITE MULTI-CAPA (50+ TESTS)');
  console.log('=============================================================\n');

  // ==========================================
  // CAPA 1: PRUEBAS UNITARIAS & FUZZING (15 Tests)
  // ==========================================
  console.log('--- CAPA 1: Pruebas Unitarias & Fuzzing Caótico ---');

  // 1. Sanitizador & XSS Prevention
  assert(Sanitizer.escapeHTML('<script>alert("xss")</script>') === '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;', 'Sanitizer.escapeHTML neutraliza etiquetas script', 'UNIT');
  assert(Sanitizer.escapeHTML(null) === '' && Sanitizer.escapeHTML(undefined) === '', 'Sanitizer.escapeHTML maneja entradas nulas y undefined de forma segura', 'UNIT');
  assert(Sanitizer.sanitizeURL('javascript:alert(1)').includes('#'), 'Sanitizer.sanitizeURL bloquea esquemas javascript:', 'UNIT');
  assert(Sanitizer.sanitizeURL('https://hospital.gob.ar/protocolo') === 'https://hospital.gob.ar/protocolo', 'Sanitizer.sanitizeURL permite URLs HTTPS válidas', 'UNIT');

  // 2. Formatters
  assert(formatCurrency(150000).includes('150.000'), 'formatCurrency formatea montos en pesos argentinos', 'UNIT');
  assert(formatCurrency('abc') === '$ 0' || formatCurrency('abc').includes('0'), 'formatCurrency maneja strings no numéricos sin excepción', 'UNIT');
  assert(formatDate(null) === '-', 'formatDate maneja fecha nula retornando guión', 'UNIT');
  assert(formatDateTime('2026-11-16T10:30:00Z').includes('16/11/2026') || formatDateTime('2026-11-16T10:30:00Z').includes('2026'), 'formatDateTime formatea fechas sanitarias completas', 'UNIT');

  // 3. Creación de Cajas Quirúrgicas y Validaciones
  const trayEngine = new SurgicalTrayLifecycleEngine();
  try {
    trayEngine.createTray({ id: '', name: '', code: '' });
    assert(false, 'createTray debe fallar si faltan campos obligatorios', 'UNIT');
  } catch (e) {
    assert(true, 'createTray valida campos obligatorios y arroja error descriptivo', 'UNIT');
  }

  const tray = trayEngine.createTray({
    id: 'TRAY-TEST',
    name: 'Caja Columna Lumbar',
    code: 'CJ-COL-01',
    surgeryType: 'Neurocirugía / Columna',
    sterileExpiryDays: 45,
    implants: [
      { id: 'IMP-01', name: 'Tornillo Pedicular 6.5mm', initialQty: 8, unitPriceARS: 35000 }
    ],
    instruments: [
      { id: 'INS-01', name: 'Atornillador Pedicular', replacementPriceARS: 120000, initialQty: 1 }
    ]
  });

  assert(tray.state === TRAY_STATES.ARMADA_EN_DEPOSITO, 'Estado inicial de caja quirúrgica es ARMADA_EN_DEPOSITO', 'UNIT');
  assert(tray.sterileExpiryDays === 45, 'sterileExpiryDays se asigna correctamente', 'UNIT');

  // 4. Fuzzing Caótico en Parámetros de Autoclave
  const autoclave = new AutoclaveValidationEngine();
  const chaoticCycle = autoclave.evaluateCycle({
    cycleNumber: 999,
    autoclaveId: 'AUTO-01',
    method: STERILIZATION_METHODS.STEAM_134,
    plateauTempCelsius: 110, // Demasiado baja
    chamberPressureBar: 0.5, // Demasiado baja
    exposureMinutes: 1,      // Insuficiente
    chemicalClass5Passed: false,
    biologicalIndicatorResult: 'POSITIVE', // Fallo biológico crítico
    operatorId: 'OP-01'
  });
  assert(!chaoticCycle.isApproved && chaoticCycle.status === 'RECHAZADO_FALLA', 'Fuzzing: Ciclo con parámetros deficientes es rechazado', 'UNIT');
  assert(chaoticCycle.errors.length >= 4, 'Fuzzing: Detecta múltiples causas de rechazo simultáneas', 'UNIT');

  const pendingCycle = autoclave.evaluateCycle({
    cycleNumber: 1000,
    autoclaveId: 'AUTO-01',
    method: STERILIZATION_METHODS.STEAM_134,
    plateauTempCelsius: 134.5,
    chamberPressureBar: 2.3,
    exposureMinutes: 7,
    chemicalClass5Passed: true,
    biologicalIndicatorResult: 'PENDING', // Incubación en curso
    operatorId: 'OP-01'
  });
  assert(pendingCycle.isQuarantine && pendingCycle.status === 'CUARENTENA_BIOLOGICA', 'Ciclo con biológico pendiente pasa a CUARENTENA_BIOLOGICA', 'UNIT');

  const approvedCycle = autoclave.evaluateCycle({
    cycleNumber: 1001,
    autoclaveId: 'AUTO-01',
    method: STERILIZATION_METHODS.STEAM_134,
    plateauTempCelsius: 134.5,
    chamberPressureBar: 2.2,
    exposureMinutes: 7,
    chemicalClass5Passed: true,
    biologicalIndicatorResult: 'NEGATIVE',
    operatorId: 'OP-01'
  });
  assert(approvedCycle.isApproved && approvedCycle.status === 'APROBADO_LIBERADO', 'Ciclo con parámetros y biológico negativo es APROBADO_LIBERADO', 'UNIT');

  // ==========================================
  // CAPA 2: PRUEBAS DE INTEGRACIÓN (15 Tests)
  // ==========================================
  console.log('\n--- CAPA 2: Pruebas de Integración & Máquinas de Estado ---');

  // 1. Transición inválida directa a despacho sin esterilizar
  try {
    trayEngine.transitionTo(TRAY_STATES.EN_QUIROFANO_PRESTAMO, { hospitalRecipient: 'Sanatorio A' });
    assert(false, 'Bloqueo: No debe permitir despachar caja no esterilizada', 'INTEGRATION');
  } catch (e) {
    assert(true, 'Bloqueo de Seguridad: Impide despachar caja que no esté en ESTERIL_LIBERADA', 'INTEGRATION');
  }

  // 2. Transición a Autoclave Cuarentena
  trayEngine.transitionTo(TRAY_STATES.EN_AUTOCLAVE_CUARENTENA);
  assert(trayEngine.getTray().state === TRAY_STATES.EN_AUTOCLAVE_CUARENTENA, 'Caja ingresa a autoclave en EN_AUTOCLAVE_CUARENTENA', 'INTEGRATION');

  // 3. Intento de liberar sin validación de autoclave
  try {
    trayEngine.transitionTo(TRAY_STATES.ESTERIL_LIBERADA, { validationPassed: false });
    assert(false, 'Bloqueo: No debe liberar sin ciclo aprobado', 'INTEGRATION');
  } catch (e) {
    assert(true, 'Bloqueo Biológico: Requiere validación de autoclave aprobada para liberar', 'INTEGRATION');
  }

  // 4. Liberación con ciclo aprobado
  trayEngine.transitionTo(TRAY_STATES.ESTERIL_LIBERADA, {
    autoclaveCycleId: approvedCycle.id,
    validationPassed: true
  });
  assert(trayEngine.getTray().state === TRAY_STATES.ESTERIL_LIBERADA, 'Caja transiciona con éxito a ESTERIL_LIBERADA', 'INTEGRATION');
  assert(!trayEngine.isSterilityExpired(), 'Caja recién esterilizada tiene vigencia válida', 'INTEGRATION');

  // 5. Despacho a Quirófano
  trayEngine.transitionTo(TRAY_STATES.EN_QUIROFANO_PRESTAMO, {
    hospitalRecipient: 'Hospital Alemán'
  });
  assert(trayEngine.getTray().state === TRAY_STATES.EN_QUIROFANO_PRESTAMO, 'Caja despachada a quirófano en EN_QUIROFANO_PRESTAMO', 'INTEGRATION');
  assert(trayEngine.getTray().currentHospitalRecipient === 'Hospital Alemán', 'Se registra el sanatorio receptor en el despacho', 'INTEGRATION');

  // 6. Retorno de Quirófano a Área Sucia
  trayEngine.transitionTo(TRAY_STATES.RETORNO_AREA_SUCIA);
  assert(trayEngine.getTray().state === TRAY_STATES.RETORNO_AREA_SUCIA, 'Caja poscirugía ingresa a RETORNO_AREA_SUCIA', 'INTEGRATION');

  // 7. Lavado Ultrasónico
  trayEngine.transitionTo(TRAY_STATES.LAVADO_ULTRASONICO);
  assert(trayEngine.getTray().state === TRAY_STATES.LAVADO_ULTRASONICO, 'Caja pasa a LAVADO_ULTRASONICO para descontaminación', 'INTEGRATION');

  // 8. Reingreso a Autoclave Cuarentena para nuevo ciclo
  trayEngine.transitionTo(TRAY_STATES.EN_AUTOCLAVE_CUARENTENA);
  assert(trayEngine.getTray().state === TRAY_STATES.EN_AUTOCLAVE_CUARENTENA, 'Caja reacondicionada reingresa a EN_AUTOCLAVE_CUARENTENA', 'INTEGRATION');

  // 9. Criptografía: Sellado SHA-256 de Protocolo
  const sampleProtocol = {
    trayCode: 'CJ-COL-01',
    cycleNumber: 1001,
    autoclaveId: 'AUTO-01',
    biologicalResult: 'NEGATIVE'
  };
  const sealed = await sealSterilizationProtocol(sampleProtocol);
  assert(sealed.sealHash && sealed.sealHash.length === 64, 'sealSterilizationProtocol genera hash criptográfico SHA-256 de 64 caracteres', 'INTEGRATION');
  assert(sealed.verificationCode.startsWith('ST-'), 'verificationCode tiene prefijo institucional ST-', 'INTEGRATION');

  // 10. Cache Service Offline
  SterilTrackCache.set('test_key', { hospital: 'Sanatorio Finochietto' });
  assert(SterilTrackCache.get('test_key')?.hospital === 'Sanatorio Finochietto', 'SterilTrackCache persiste y recupera datos en almacenamiento local', 'INTEGRATION');
  SterilTrackCache.remove('test_key');
  assert(SterilTrackCache.get('test_key') === null, 'SterilTrackCache.remove elimina la clave especificada', 'INTEGRATION');

  // ==========================================
  // CAPA 3: PRUEBAS DE CONSUMO ANMAT & SPLIT BILLING (10 Tests)
  // ==========================================
  console.log('\n--- CAPA 3: Consumo ANMAT & Split Billing ---');

  const consumptionEngine = new AnmatImplantConsumptionEngine();
  const billingEngine = new SplitBillingLedgerEngine();

  // 1. Detección de Consumo Excedido
  try {
    consumptionEngine.processSurgicalConsumption({
      tray: trayEngine.getTray(),
      surgicalProtocolNumber: 'PROT-101',
      patientName: 'Test Patient',
      surgeonName: 'Dr. Test',
      consumedImplants: [
        { implantId: 'IMP-01', quantityUsed: 99 } // Solo hay 8
      ]
    });
    assert(false, 'Bloqueo: No debe permitir consumir más implantes que los existentes', 'INTEGRATION');
  } catch (e) {
    assert(true, 'Consumo Incoherente: Rechaza cantidades consumidas superiores a las disponibles en caja', 'INTEGRATION');
  }

  // 2. Registro Válido de Consumo Quirúrgico con Faltante de Instrumental
  const acta = consumptionEngine.processSurgicalConsumption({
    tray: trayEngine.getTray(),
    surgicalProtocolNumber: 'PROT-2026-884',
    patientName: 'Roberto Gómez',
    patientDni: '18.344.201',
    surgeonName: 'Dra. Silvina Larrea',
    hospitalName: 'Hospital Alemán',
    consumedImplants: [
      { implantId: 'IMP-01', quantityUsed: 4 } // 4 tornillos de $35.000 = $140.000
    ],
    returnedInstruments: [
      { instrumentId: 'INS-01', returnedQty: 0, condition: 'FALTANTE' } // Falta atornillador de $120.000
    ]
  });

  assert(acta.totalImplantAmountARS === 140000, 'totalImplantAmountARS calcula exactamente el costo de implantes consumidos ($140.000)', 'INTEGRATION');
  assert(acta.missingInstrumentsCostARS === 120000, 'missingInstrumentsCostARS computa el costo del instrumental faltante ($120.000)', 'INTEGRATION');
  assert(acta.hasDiscrepancies === true, 'hasDiscrepancies marca true al detectar faltante de instrumental', 'INTEGRATION');
  assert(acta.totalToBillARS === 260000, 'totalToBillARS consolida implantes + reposición de instrumental ($260.000)', 'INTEGRATION');

  // 3. Generación de Split Billing
  const splitBill = billingEngine.generateSplitBilling({
    actaConsumo: acta,
    insuranceName: 'La Segunda ART',
    affiliateOrClaimNumber: 'SIN-8841-2026',
    clinicName: 'Hospital Alemán',
    sterilizationFeeARS: 50000,
    emergencySurgerySurcharge: 20000
  });

  assert(splitBill.insuranceClaim.totalARS === 160000, 'Split Billing ART: Implantes ($140.000) + Urgencia ($20.000) = $160.000', 'INTEGRATION');
  assert(splitBill.clinicClaim.totalARS === 170000, 'Split Billing Clínica: Faltante ($120.000) + Esterilización ($50.000) = $170.000', 'INTEGRATION');
  assert(splitBill.grandTotalARS === 330000, 'grandTotalARS suma exactamente ambas ramas ($330.000)', 'INTEGRATION');
  assert(splitBill.clinicClaim.status === 'CON_RECLAMO_FALTANTES', 'Clínica asignada a status CON_RECLAMO_FALTANTES por desvío de instrumental', 'INTEGRATION');

  // ==========================================
  // CAPA 4: PRUEBAS DE SEGURIDAD (10 Tests)
  // ==========================================
  console.log('\n--- CAPA 4: Pruebas de Seguridad (XSS, Reglas & Headers) ---');

  // 1. Verificación de Firestore Rules
  const firestoreRulesPath = path.join(projectRoot, 'firestore.rules');
  assert(fs.existsSync(firestoreRulesPath), 'Archivo firestore.rules existe en la raíz', 'SEC');
  const rulesContent = fs.readFileSync(firestoreRulesPath, 'utf-8');
  assert(!rulesContent.includes('allow read, write: if true;'), 'firestore.rules no contiene reglas públicas abiertas (RULES-001)', 'SEC');
  assert(rulesContent.includes('isHospitalStaff()'), 'firestore.rules restringe operaciones a personal hospitalario autenticado', 'SEC');
  assert(rulesContent.includes('isAdmin()'), 'firestore.rules restringe borrados únicamente al rol ADMIN', 'SEC');

  // 2. Verificación de Cabeceras HTTP en firebase.json
  const firebaseJsonPath = path.join(projectRoot, 'firebase.json');
  assert(fs.existsSync(firebaseJsonPath), 'Archivo firebase.json existe en la raíz', 'SEC');
  const firebaseJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf-8'));
  const allHeaders = firebaseJson.hosting?.headers || [];
  const globalHeaderObj = allHeaders.find((h) => h.source === '**')?.headers || [];
  const headerKeys = globalHeaderObj.map((h) => h.key.toLowerCase());
  assert(headerKeys.includes('content-security-policy'), 'firebase.json define Content-Security-Policy (CSP)', 'SEC');
  assert(headerKeys.includes('x-frame-options') && headerKeys.includes('x-content-type-options'), 'firebase.json define X-Frame-Options y X-Content-Type-Options', 'SEC');

  const swEntry = allHeaders.find((h) => h.source === '/sw.js' || h.source === 'sw.js');
  const swCacheControl = swEntry?.headers?.find((h) => h.key.toLowerCase() === 'cache-control')?.value || '';
  assert(swCacheControl.includes('no-cache'), 'firebase.json define Cache-Control no-cache para /sw.js', 'SEC');

  const cspHeader = globalHeaderObj.find((h) => h.key.toLowerCase() === 'content-security-policy')?.value || '';
  assert(!cspHeader.includes('cdn.tailwindcss.com') && !cspHeader.includes("'unsafe-inline'"), 'CSP en firebase.json elimina cdn.tailwindcss.com y unsafe-inline', 'SEC');

  // 3. Verificación PWA Offline-First, DESIGN.md y Remediación UI
  const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf-8');
  const appJs = fs.readFileSync(path.join(projectRoot, 'src', 'app.js'), 'utf-8');
  const swJs = fs.readFileSync(path.join(projectRoot, 'sw.js'), 'utf-8');

  assert(!indexHtml.includes('cdn.tailwindcss.com') && indexHtml.includes('./styles.css'), 'index.html carga styles.css local sin CDN externo', 'SEC');
  assert(indexHtml.includes('href="./manifest.json"'), 'index.html vincula rel="manifest" a ./manifest.json', 'SEC');
  assert(fs.existsSync(path.join(projectRoot, 'manifest.json')) && fs.existsSync(path.join(projectRoot, 'styles.css')) && fs.existsSync(path.join(projectRoot, 'DESIGN.md')), 'Existen manifest.json, styles.css compilado y DESIGN.md', 'SEC');
  assert(swJs.includes('./styles.css') && swJs.includes('isNetworkFirstRequest'), 'sw.js precachea styles.css y usa Network-First para HTML/version.json', 'SEC');
  assert(!indexHtml.includes('\u2014') && !appJs.includes('\u2014'), 'Sin guiones largos (em dash) en UI de index.html y src/app.js', 'SEC');
  assert(!appJs.includes('alert('), 'src/app.js reemplaza window.alert() por feedback inline accesible', 'SEC');
  assert(appJs.includes('role="tablist"') && appJs.includes('role="tab"') && appJs.includes('aria-selected'), 'src/app.js implementa semántica ARIA tablist/tab/aria-selected', 'SEC');

  // 4. Guardia steriltrack_demo_purged y sellado SHA-256 en app.js
  SterilTrackCache.clear();
  seedDemoData();
  assert(state.trays.length === 1 && state.trays[0].isDemo === true, 'seedDemoData marca registros demo con isDemo: true', 'INTEGRATION');
  await ensureProtocolSeals();
  assert(state.cycles[0]?.cryptoSeal?.sealHash?.length === 64, 'ensureProtocolSeals sella ciclo demo con hash SHA-256 real de 64 hex', 'INTEGRATION');
  purgeDemoData();
  assert(state.trays.length === 0 && SterilTrackCache.get('demo_purged') === true, 'purgeDemoData vacía estado y activa bandera demo_purged', 'INTEGRATION');
  seedDemoData();
  assert(state.trays.length === 0, 'seedDemoData respeta demo_purged y no resiembra datos fantasma', 'INTEGRATION');
  SterilTrackCache.clear();

  // ==========================================
  // CAPA 5: FLUJO E2E Y CASO DE USO COMPLETO (6 Tests)
  // ==========================================
  console.log('\n--- CAPA 5: Flujo E2E & Ciclo Hospitalario Completo ---');

  // E2E 1. Armado de Caja
  const e2eTray = new SurgicalTrayLifecycleEngine().createTray({
    id: 'TRAY-E2E',
    name: 'Caja Hemiartroplastía Cadera Bipolar',
    code: 'CJ-CAD-99',
    surgeryType: 'Traumatología Cadera',
    implants: [
      { id: 'IMP-STEM', name: 'Tallo Femoral No Cementado', initialQty: 1, unitPriceARS: 750000, lot: 'LOT-CAD-1' },
      { id: 'IMP-HEAD', name: 'Cabeza Bipolar 28mm x 44mm', initialQty: 1, unitPriceARS: 320000, lot: 'LOT-CAD-2' }
    ],
    instruments: [
      { id: 'INS-RASP', name: 'Mango de Raspas Cadera', replacementPriceARS: 180000, initialQty: 1 }
    ]
  });
  assert(e2eTray.id === 'TRAY-E2E', 'E2E-1: Caja armada con éxito en depósito', 'E2E');

  // E2E 2. Ciclo de Autoclave Vapor 134°C
  const e2eCycle = autoclave.evaluateCycle({
    cycleNumber: 2045,
    autoclaveId: 'AUTOCLAVE-SURG-01',
    method: STERILIZATION_METHODS.STEAM_134,
    plateauTempCelsius: 134.2,
    chamberPressureBar: 2.15,
    exposureMinutes: 7.0,
    chemicalClass5Passed: true,
    biologicalIndicatorResult: 'NEGATIVE',
    operatorId: 'TEC-ANA-SOLIS'
  });
  assert(e2eCycle.isApproved, 'E2E-2: Ciclo de autoclave validado físicamente y biológicamente', 'E2E');

  // E2E 3. Liberación de Esterilidad y Sellado
  const e2eEngine = new SurgicalTrayLifecycleEngine(e2eTray);
  e2eEngine.transitionTo(TRAY_STATES.EN_AUTOCLAVE_CUARENTENA);
  e2eEngine.transitionTo(TRAY_STATES.ESTERIL_LIBERADA, {
    autoclaveCycleId: e2eCycle.id,
    validationPassed: true
  });
  assert(e2eEngine.getTray().state === TRAY_STATES.ESTERIL_LIBERADA, 'E2E-3: Caja esterilizada y liberada para cirugía', 'E2E');

  // E2E 4. Despacho a Quirófano
  e2eEngine.transitionTo(TRAY_STATES.EN_QUIROFANO_PRESTAMO, {
    hospitalRecipient: 'Clínica Olivos'
  });
  assert(e2eEngine.getTray().state === TRAY_STATES.EN_QUIROFANO_PRESTAMO, 'E2E-4: Caja entregada en quirófano de la clínica', 'E2E');

  // E2E 5. Cirugía Realizada y Acta ANMAT
  const e2eActa = consumptionEngine.processSurgicalConsumption({
    tray: e2eEngine.getTray(),
    surgicalProtocolNumber: 'PROT-CAD-9921',
    patientName: 'Eduardo M. Soria',
    patientDni: '14.221.094',
    surgeonName: 'Dr. Alejandro Peña',
    hospitalName: 'Clínica Olivos',
    consumedImplants: [
      { implantId: 'IMP-STEM', quantityUsed: 1 },
      { implantId: 'IMP-HEAD', quantityUsed: 1 }
    ],
    returnedInstruments: [
      { instrumentId: 'INS-RASP', returnedQty: 1, condition: 'BUENO' }
    ]
  });
  assert(e2eActa.totalImplantAmountARS === 1070000 && !e2eActa.hasDiscrepancies, 'E2E-5: Consumo de prótesis registrado ($1.070.000) sin instrumental faltante', 'E2E');

  // E2E 6. Retorno, Lavado y Split Billing
  e2eEngine.transitionTo(TRAY_STATES.RETORNO_AREA_SUCIA);
  e2eEngine.transitionTo(TRAY_STATES.LAVADO_ULTRASONICO);
  const e2eBilling = billingEngine.generateSplitBilling({
    actaConsumo: e2eActa,
    insuranceName: 'OSDE',
    affiliateOrClaimNumber: 'AFIL-492194-01',
    clinicName: 'Clínica Olivos',
    sterilizationFeeARS: 60000
  });
  assert(e2eBilling.insuranceClaim.totalARS === 1070000 && e2eBilling.clinicClaim.totalARS === 60000, 'E2E-6: Liquidación split bill generada con éxito a OSDE y Clínica Olivos', 'E2E');

  // ==========================================
  // REPORTE FINAL
  // ==========================================
  console.log('\n=============================================================');
  console.log(`📊 RESULTADO DE LA BATERÍA DE PRUEBAS STERILTRACK:`);
  console.log(`   Total de pruebas: ${totalTests}`);
  console.log(`   Pruebas aprobadas: ${passedTests}`);
  console.log(`   Pruebas fallidas:  ${failedTests}`);
  console.log('=============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Error fatal durante la ejecución de pruebas:', err);
  process.exit(1);
});
