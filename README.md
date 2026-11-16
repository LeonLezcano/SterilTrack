# 🔬 SterilTrack — Centrales de Esterilización Hospitalaria, Trazabilidad de Cajas Quirúrgicas & Consumo de Implantes ANMAT

> **Vertical:** Centrales de Esterilización Hospitalaria, Autoclaves & Ortopedias Quirúrgicas (Cajas de Implantes en Préstamo ANMAT)  
> **Arquetipo:** Patrón B/C — Loaner Surgical Tray Lifecycle, ANMAT Implant Consumption Audit & Autoclave Biological Cycle Gate  
> **Versión:** `v1.0.00` &bull; **AiAppFactory Standard**

---

## 🎯 1. Dolor Real de la Industria y Solución Operativa

1. **Caos en Cajas Quirúrgicas en Préstamo (*Loaner Trays*):**
   - Para cirugías ortopédicas de alta complejidad (fémur, cadera, columna), la ortopedia proveedora envía cajas con docenas de medidas de tornillos, placas e instrumental de colocación. Al finalizar la intervención, se requiere auditar de forma inmediata qué lotes y números de **PM ANMAT** se implantaron en el paciente y registrar cualquier faltante de instrumental de alto costo.
2. **Validación de Autoclave y Bioseguridad Hospitalaria:**
   - Puerta de liberación estricta: ninguna caja puede asignarse a un quirófano sin verificar temperatura meseta ($134^\circ\text{C}$ / $121^\circ\text{C}$), presión barométrica, tiempo de exposición, prueba química integradora **Clase 5** y lectura negativa del indicador biológico (*Geobacillus stearothermophilus*).
3. **Split-Billing Automatizado (ART / Obra Social vs Sanatorio):**
   - Emisión separada de la liquidación: prótesis e implantes autorizados facturados a la Aseguradora de Riesgos del Trabajo (ART) / Obra Social, y reposición de instrumental extraviado o roto facturado a la clínica/sanatorio.

---

## 🏗️ 2. Motores Nucleares Integrados

| Motor | Archivo | Responsabilidad |
| :--- | :--- | :--- |
| **#120/#170** | `src/core/surgicalTrayLifecycleEngine.js` | Máquina de estados: `ARMADA_EN_DEPOSITO` $\to$ `EN_AUTOCLAVE_CUARENTENA` $\to$ `ESTERIL_LIBERADA` $\to$ `EN_QUIROFANO_PRESTAMO` $\to$ `RETORNO_AREA_SUCIA` $\to$ `LAVADO_ULTRASONICO`. |
| **#307/#115** | `src/core/autoclaveValidationEngine.js` | Evaluación de parámetros físicos, químicos (Clase 5) y biológicos con bloqueo ante desvíos o fallos Bowie-Dick. |
| **#130/#141** | `src/core/anmatImplantConsumptionEngine.js` | Conciliación de alvéolos pre/post cirugía, registro de GTIN/PM/Lote y detección de faltantes de instrumental. |
| **#134** | `src/core/splitBillingLedgerEngine.js` | Desglose y emisión de comprobantes split-bill entre aseguradoras y prestadores sanitarios. |
| **#159/#245** | `src/utils/cryptoSeal.js` | Sello criptográfico SHA-256 para actas de consumo y certificados de esterilización. |

---

## 🧪 3. Arnés de Pruebas Multi-Capa (52 Tests 100% PASS)

```bash
# Ejecución de pruebas
node tests/run_tests.js
```

- **Capa 1 (Unitarias & Fuzzing):** Sanitización XSS, formateo monetario y fuzzing caótico sobre parámetros de autoclave.
- **Capa 2 (Integración & Ciclo de Vida):** Transiciones de estado de cajas quirúrgicas, bloqueo de despacho no estéril y persistencia offline.
- **Capa 3 (Consumo ANMAT & Split Billing):** Conciliación de cantidades, detección de faltantes y cálculo dual de liquidación.
- **Capa 4 (Seguridad & Reglas):** Verificación de `firestore.rules` y CSP cualitativa en `firebase.json`.
- **Capa 5 (E2E):** Flujo integral de preparación, esterilización, entrega en quirófano, cirugía y facturación.

---

## 🛡️ 4. Auditoría de Seguridad (AppSec Guardian)

```bash
node ../AiAppFactory/tools/security-guardian/index.mjs . --abuse
```

- **Puntaje:** **100/100 Puntos**
- **Vulnerabilidades:** 0 Críticas | 0 Altas | 0 Medias | 0 Bajas
- **Resistencia a Abusos (Capa 7):** Rate limiting activo, protección contra saturación de payloads (Memory Flood) y defensa Strix DAST/SSRF.
