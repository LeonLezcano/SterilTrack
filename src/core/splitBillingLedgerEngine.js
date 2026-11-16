/**
 * SterilTrack — Split Billing & Insurance Claims Engine
 * Motor #134 (AiAppFactory Standard)
 *
 * Divide y concilia la liquidación económica de la cirugía:
 * 1. Cobertura ART / Obra Social: Prótesis e implantes autorizados según Vademécum ANMAT y número de siniestro/afiliado.
 * 2. Cargo a Clínica/Sanatorio por Pérdida o Rotura de Instrumental en Préstamo (Loaner Tray Missing Tools).
 * 3. Cargo por Esterilización Urgente / Reprocesamiento de Instrumental Contaminado.
 */

export class SplitBillingLedgerEngine {
  constructor() {
    this.invoices = [];
  }

  generateSplitBilling({
    actaConsumo,
    insuranceName, // ej: "Provincia ART" o "OSDE"
    affiliateOrClaimNumber, // Siniestro ART o Nro Afiliado
    clinicName,
    sterilizationFeeARS = 45000,
    emergencySurgerySurcharge = 0
  }) {
    if (!actaConsumo || !insuranceName) {
      throw new Error('El acta de consumo y el nombre de ART/Obra Social son obligatorios');
    }

    // Porción 1: A facturar a la ART / Obra Social (Implantes utilizados en paciente)
    const insuranceSubtotal = Number(actaConsumo.totalImplantAmountARS) || 0;
    const insuranceTotal = insuranceSubtotal + Number(emergencySurgerySurcharge);

    // Porción 2: A facturar a la Clínica/Sanatorio (Faltantes de instrumental o roturas + servicio de esterilización)
    const missingToolsFee = Number(actaConsumo.missingInstrumentsCostARS) || 0;
    const clinicTotal = missingToolsFee + Number(sterilizationFeeARS);

    const billingStatement = {
      id: `FAC-SPLIT-${Date.now().toString(36).toUpperCase()}`,
      actaId: actaConsumo.id,
      surgicalProtocolNumber: actaConsumo.surgicalProtocolNumber,
      patientName: actaConsumo.patientName,
      createdAt: new Date().toISOString(),

      // Ramo 1: ART / Obra Social
      insuranceClaim: {
        insuranceName,
        affiliateOrClaimNumber: affiliateOrClaimNumber || 'SIN-000000',
        items: actaConsumo.implantsUsed.map((i) => ({
          description: `${i.name} (Lote: ${i.lot} | PM: ${i.anmatPM})`,
          quantity: i.quantityUsed,
          unitPriceARS: i.unitPriceARS,
          subtotalARS: i.subtotalARS
        })),
        emergencySurchargeARS: Number(emergencySurgerySurcharge),
        totalARS: insuranceTotal,
        status: 'PENDIENTE_AUTORIZACION_PAGO'
      },

      // Ramo 2: Clínica / Sanatorio
      clinicClaim: {
        clinicName: clinicName || actaConsumo.hospitalName,
        missingOrDamagedInstruments: actaConsumo.instrumentDiscrepancies,
        missingToolsFeeARS: missingToolsFee,
        sterilizationFeeARS: Number(sterilizationFeeARS),
        totalARS: clinicTotal,
        status: missingToolsFee > 0 ? 'CON_RECLAMO_FALTANTES' : 'CONFORME_SERVICIO'
      },

      grandTotalARS: insuranceTotal + clinicTotal
    };

    this.invoices.push(billingStatement);
    return billingStatement;
  }

  getInvoices() {
    return this.invoices;
  }
}
