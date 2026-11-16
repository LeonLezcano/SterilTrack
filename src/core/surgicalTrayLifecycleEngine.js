/**
 * SterilTrack — Surgical Tray Lifecycle State Machine Engine
 * Motor #120 / #170 (AiAppFactory Standard)
 *
 * Controla el ciclo inquebrantable de cajas quirúrgicas e instrumental en préstamo (Loaner Trays):
 * ARMADA_EN_DEPOSITO -> EN_QUIROFANO_PRESTAMO -> RETORNO_AREA_SUCIA ->
 * LAVADO_ULTRASONICO -> EN_AUTOCLAVE_CUARENTENA -> ESTERIL_LIBERADA.
 */

export const TRAY_STATES = {
  ARMADA_EN_DEPOSITO: 'ARMADA_EN_DEPOSITO',
  EN_QUIROFANO_PRESTAMO: 'EN_QUIROFANO_PRESTAMO',
  RETORNO_AREA_SUCIA: 'RETORNO_AREA_SUCIA',
  LAVADO_ULTRASONICO: 'LAVADO_ULTRASONICO',
  EN_AUTOCLAVE_CUARENTENA: 'EN_AUTOCLAVE_CUARENTENA',
  ESTERIL_LIBERADA: 'ESTERIL_LIBERADA',
  BAJA_MANTENIMIENTO: 'BAJA_MANTENIMIENTO'
};

const VALID_TRANSITIONS = {
  [TRAY_STATES.ARMADA_EN_DEPOSITO]: [TRAY_STATES.EN_AUTOCLAVE_CUARENTENA, TRAY_STATES.BAJA_MANTENIMIENTO],
  [TRAY_STATES.ESTERIL_LIBERADA]: [TRAY_STATES.EN_QUIROFANO_PRESTAMO, TRAY_STATES.BAJA_MANTENIMIENTO],
  [TRAY_STATES.EN_QUIROFANO_PRESTAMO]: [TRAY_STATES.RETORNO_AREA_SUCIA],
  [TRAY_STATES.RETORNO_AREA_SUCIA]: [TRAY_STATES.LAVADO_ULTRASONICO, TRAY_STATES.BAJA_MANTENIMIENTO],
  [TRAY_STATES.LAVADO_ULTRASONICO]: [TRAY_STATES.EN_AUTOCLAVE_CUARENTENA, TRAY_STATES.BAJA_MANTENIMIENTO],
  [TRAY_STATES.EN_AUTOCLAVE_CUARENTENA]: [TRAY_STATES.ESTERIL_LIBERADA, TRAY_STATES.LAVADO_ULTRASONICO], // si falla el ciclo vuelve a lavado
  [TRAY_STATES.BAJA_MANTENIMIENTO]: [TRAY_STATES.LAVADO_ULTRASONICO]
};

export class SurgicalTrayLifecycleEngine {
  constructor(initialTray = null) {
    if (initialTray) {
      this.tray = { ...initialTray };
    } else {
      this.tray = null;
    }
  }

  createTray({ id, name, code, surgeryType, orthopedicSupplier, implants = [], instruments = [], sterileExpiryDays = 30 }) {
    if (!id || !name || !code) {
      throw new Error('ID, nombre y código de caja quirúrgica son obligatorios');
    }

    this.tray = {
      id,
      name,
      code, // ej: "CJ-OSTEO-701"
      surgeryType, // ej: "Traumatología - Placas y Tornillos Fémur"
      orthopedicSupplier: orthopedicSupplier || 'Ortopedia Quirúrgica Central',
      state: TRAY_STATES.ARMADA_EN_DEPOSITO,
      sterileExpiryDays: Math.max(1, Number(sterileExpiryDays) || 30),
      sterilizedAt: null,
      sterileExpiresAt: null,
      currentAutoclaveCycleId: null,
      currentHospitalRecipient: null,
      implants: implants.map((imp) => ({
        id: imp.id,
        name: imp.name,
        anmatGtin: imp.anmatGtin || '7790000000000',
        anmatPM: imp.anmatPM || 'PM-1450-8',
        lot: imp.lot || 'LOTE-DEFAULT',
        expiresAt: imp.expiresAt || '2028-12-31',
        initialQty: Number(imp.initialQty) || 1,
        consumedQty: 0,
        unitPriceARS: Number(imp.unitPriceARS) || 0
      })),
      instruments: instruments.map((inst) => ({
        id: inst.id,
        name: inst.name,
        code: inst.code || inst.id,
        initialQty: Number(inst.initialQty) || 1,
        returnedQty: Number(inst.initialQty) || 1,
        replacementPriceARS: Number(inst.replacementPriceARS) || 0
      })),
      history: [
        {
          fromState: null,
          toState: TRAY_STATES.ARMADA_EN_DEPOSITO,
          timestamp: new Date().toISOString(),
          reason: 'Alta y armado inicial de caja en depósito'
        }
      ]
    };

    return this.tray;
  }

  canTransitionTo(targetState) {
    if (!this.tray) return false;
    const allowed = VALID_TRANSITIONS[this.tray.state] || [];
    return allowed.includes(targetState);
  }

  transitionTo(targetState, metadata = {}) {
    if (!this.tray) throw new Error('No hay caja quirúrgica activa');
    if (!this.canTransitionTo(targetState)) {
      throw new Error(
        `Transición inválida: No se puede mover la caja desde '${this.tray.state}' hacia '${targetState}'.`
      );
    }

    // Regla de Oro: Solo se puede despachar a quirófano si está ESTERIL_LIBERADA y vigente
    if (targetState === TRAY_STATES.EN_QUIROFANO_PRESTAMO) {
      if (this.tray.state !== TRAY_STATES.ESTERIL_LIBERADA) {
        throw new Error('Bloqueo de Seguridad: Solo una caja con esterilidad liberada puede despacharse a quirófano.');
      }
      if (this.isSterilityExpired()) {
        throw new Error('Bloqueo de Seguridad: La esterilidad del paquete ha caducado. Requiere reprocesamiento.');
      }
      if (!metadata.hospitalRecipient) {
        throw new Error('Debe indicarse la clínica/sanatorio receptor para el préstamo de la caja.');
      }
      this.tray.currentHospitalRecipient = metadata.hospitalRecipient;
    }

    // Regla de autoclave a estéril: exige ciclo validado
    if (targetState === TRAY_STATES.ESTERIL_LIBERADA) {
      if (!metadata.autoclaveCycleId || !metadata.validationPassed) {
        throw new Error('Bloqueo Biológico: No se puede liberar sin validación de ciclo de autoclave aprobada.');
      }
      const now = new Date();
      this.tray.sterilizedAt = now.toISOString();
      const expires = new Date(now.getTime() + this.tray.sterileExpiryDays * 24 * 60 * 60 * 1000);
      this.tray.sterileExpiresAt = expires.toISOString();
      this.tray.currentAutoclaveCycleId = metadata.autoclaveCycleId;
    }

    const previousState = this.tray.state;
    this.tray.state = targetState;
    this.tray.history.push({
      fromState: previousState,
      toState: targetState,
      timestamp: new Date().toISOString(),
      metadata
    });

    return this.tray;
  }

  isSterilityExpired() {
    if (!this.tray || !this.tray.sterileExpiresAt) return true;
    return new Date() > new Date(this.tray.sterileExpiresAt);
  }

  getTray() {
    return this.tray;
  }
}
