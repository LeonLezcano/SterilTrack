/**
 * SterilTrack — ANMAT Implant Consumption Audit & Traceability Engine
 * Motor #130 / #141 (AiAppFactory Standard)
 *
 * Registra y concilia el consumo real de prótesis y osteosíntesis en quirófano:
 * - Mapeo de alvéolos de la caja quirúrgica (Tornillos, Placas, Clavos Endomedulares).
 * - Trazabilidad ANMAT: GTIN, Número de PM (Producto Médico), Lote y Fecha de Vencimiento.
 * - Identificación del paciente, cirujano, sanatorio y número de protocolo quirúrgico.
 * - Detección de roturas o faltantes de instrumental de colocación (mechas, machos, fresas).
 */

export class AnmatImplantConsumptionEngine {
  constructor() {
    this.consumptions = [];
  }

  processSurgicalConsumption({
    tray,
    surgicalProtocolNumber,
    patientName,
    patientDni,
    surgeonName,
    hospitalName,
    consumedImplants = [], // [ { implantId, quantityUsed, stickerPhotoUrl } ]
    returnedInstruments = [] // [ { instrumentId, returnedQty, condition } ]
  }) {
    if (!tray || !surgicalProtocolNumber || !patientName || !surgeonName) {
      throw new Error('Caja quirúrgica, protocolo, paciente y cirujano son datos obligatorios');
    }

    const implantAudit = [];
    let totalImplantAmountARS = 0;

    // Conciliación de implantes
    for (const consumption of consumedImplants) {
      const imp = tray.implants.find((i) => i.id === consumption.implantId);
      if (!imp) {
        throw new Error(`Implante con ID ${consumption.implantId} no pertenece a esta caja.`);
      }

      const qty = Math.max(0, Number(consumption.quantityUsed) || 0);
      if (qty > imp.initialQty) {
        throw new Error(
          `Consumo incoherente: Se declararon ${qty} unidades de "${imp.name}", pero la caja solo contenía ${imp.initialQty}.`
        );
      }

      const subtotal = qty * imp.unitPriceARS;
      totalImplantAmountARS += subtotal;

      implantAudit.push({
        implantId: imp.id,
        name: imp.name,
        anmatGtin: imp.anmatGtin,
        anmatPM: imp.anmatPM,
        lot: imp.lot,
        expiresAt: imp.expiresAt,
        initialQty: imp.initialQty,
        quantityUsed: qty,
        remainingQty: imp.initialQty - qty,
        unitPriceARS: imp.unitPriceARS,
        subtotalARS: subtotal
      });
    }

    // Conciliación de instrumental retornado y detección de faltantes
    const instrumentDiscrepancies = [];
    let missingInstrumentsCostARS = 0;

    for (const inst of (tray.instruments || [])) {
      const returned = returnedInstruments.find((r) => r.instrumentId === inst.id);
      const qtyReturned = returned ? Math.max(0, Number(returned.returnedQty) || 0) : inst.initialQty;
      const condition = returned ? returned.condition || 'BUENO' : 'BUENO';

      const missing = inst.initialQty - qtyReturned;
      if (missing > 0 || condition === 'ROTO_DANADO') {
        const cost = (missing > 0 ? missing : 1) * inst.replacementPriceARS;
        missingInstrumentsCostARS += cost;

        instrumentDiscrepancies.push({
          instrumentId: inst.id,
          name: inst.name,
          initialQty: inst.initialQty,
          returnedQty: qtyReturned,
          missingQty: Math.max(0, missing),
          condition,
          replacementCostARS: cost
        });
      }
    }

    const auditRecord = {
      id: `ANMAT-ACTA-${Date.now().toString(36).toUpperCase()}`,
      trayId: tray.id,
      trayCode: tray.code,
      surgicalProtocolNumber,
      patientName,
      patientDni: patientDni || 'NO_INFORMADO',
      surgeonName,
      hospitalName: hospitalName || tray.currentHospitalRecipient || 'Sanatorio Central',
      implantsUsed: implantAudit,
      totalImplantAmountARS,
      instrumentDiscrepancies,
      missingInstrumentsCostARS,
      totalToBillARS: totalImplantAmountARS + missingInstrumentsCostARS,
      hasDiscrepancies: instrumentDiscrepancies.length > 0,
      createdAt: new Date().toISOString()
    };

    this.consumptions.push(auditRecord);
    return auditRecord;
  }

  getConsumptions() {
    return this.consumptions;
  }
}
