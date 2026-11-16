/**
 * SterilTrack — Autoclave Physical, Chemical & Biological Validation Gate
 * Motor #307 / #115 (AiAppFactory Standard)
 *
 * Valida los parámetros de esterilización hospitalaria:
 * 1. Parámetros Físicos: Temperatura (>=134°C para ciclo rápido o >=121°C para estándar), Presión (bar), Tiempo meseta.
 * 2. Integrador Químico Clase 5 (Virado a color de aceptación).
 * 3. Indicador Biológico Geobacillus stearothermophilus (Lectura negativa sin turbidez / fluorescencia).
 * 4. Prueba Bowie-Dick diaria de penetración de vapor previa a la primera carga del día.
 */

export const STERILIZATION_METHODS = {
  STEAM_134: 'STEAM_134', // Vapor a 134°C - 5 a 7 min (Priones/Instrumental Quirúrgico)
  STEAM_121: 'STEAM_121', // Vapor a 121°C - 20 a 30 min (Gomas, textiles)
  ETO: 'ETO',             // Óxido de Etileno (Termosensibles)
  PLASMA_H2O2: 'PLASMA_H2O2' // Plasma de Peróxido de Hidrógeno
};

export class AutoclaveValidationEngine {
  constructor() {
    this.cycles = [];
  }

  evaluateCycle({
    cycleNumber,
    autoclaveId,
    method = STERILIZATION_METHODS.STEAM_134,
    plateauTempCelsius,
    chamberPressureBar,
    exposureMinutes,
    chemicalClass5Passed,
    biologicalIndicatorResult, // 'NEGATIVE' (aprobado) | 'POSITIVE' (fallo biológico grave) | 'PENDING'
    bowieDickPassedToday = true,
    operatorId
  }) {
    if (!cycleNumber || !autoclaveId || !operatorId) {
      throw new Error('Número de ciclo, ID de autoclave y operador técnico son obligatorios');
    }

    const errors = [];
    const warnings = [];

    // 1. Chequeo Bowie-Dick para autoclaves de vapor con prevacío
    if (method.startsWith('STEAM') && !bowieDickPassedToday) {
      errors.push('Fallo Bowie-Dick: El autoclave no cuenta con el test de penetración de vapor diario aprobado.');
    }

    // 2. Parámetros Físicos según Método
    if (method === STERILIZATION_METHODS.STEAM_134) {
      if (Number(plateauTempCelsius) < 134.0) {
        errors.push(`Temperatura insuficiente: Se registraron ${plateauTempCelsius}°C (Mínimo requerido 134.0°C).`);
      }
      if (Number(chamberPressureBar) < 2.0 || Number(chamberPressureBar) > 3.2) {
        errors.push(`Presión fuera de rango: ${chamberPressureBar} bar (Rango aceptable 2.0 - 3.2 bar).`);
      }
      if (Number(exposureMinutes) < 5.0) {
        errors.push(`Tiempo de exposición insuficiente: ${exposureMinutes} min (Mínimo 5 min).`);
      }
    } else if (method === STERILIZATION_METHODS.STEAM_121) {
      if (Number(plateauTempCelsius) < 121.0) {
        errors.push(`Temperatura insuficiente: Se registraron ${plateauTempCelsius}°C (Mínimo requerido 121.0°C).`);
      }
      if (Number(chamberPressureBar) < 1.0 || Number(chamberPressureBar) > 1.6) {
        errors.push(`Presión fuera de rango: ${chamberPressureBar} bar (Rango aceptable 1.0 - 1.6 bar).`);
      }
      if (Number(exposureMinutes) < 20.0) {
        errors.push(`Tiempo de exposición insuficiente: ${exposureMinutes} min (Mínimo 20 min).`);
      }
    }

    // 3. Indicador Químico Integrador Clase 5
    if (!chemicalClass5Passed) {
      errors.push('Fallo Químico: El indicador integrador Clase 5 no alcanzó la ventana de viraje de seguridad.');
    }

    // 4. Indicador Biológico
    if (biologicalIndicatorResult === 'POSITIVE') {
      errors.push('EMERGENCIA BIOLÓGICA: El indicador biológico (G. stearothermophilus) dio POSITIVO (crecimiento microbiano). Carga rechazada.');
    } else if (biologicalIndicatorResult === 'PENDING') {
      warnings.push('Incubación en curso: La carga queda en cuarentena hasta la lectura biológica final.');
    } else if (biologicalIndicatorResult !== 'NEGATIVE') {
      errors.push('Resultado de indicador biológico inválido o no informado.');
    }

    const isApproved = errors.length === 0 && biologicalIndicatorResult === 'NEGATIVE';
    const isQuarantine = errors.length === 0 && biologicalIndicatorResult === 'PENDING';

    const record = {
      id: `CYC-${cycleNumber}-${Date.now().toString(36)}`,
      cycleNumber,
      autoclaveId,
      method,
      plateauTempCelsius: Number(plateauTempCelsius),
      chamberPressureBar: Number(chamberPressureBar),
      exposureMinutes: Number(exposureMinutes),
      chemicalClass5Passed: Boolean(chemicalClass5Passed),
      biologicalIndicatorResult,
      isApproved,
      isQuarantine,
      status: isApproved ? 'APROBADO_LIBERADO' : isQuarantine ? 'CUARENTENA_BIOLOGICA' : 'RECHAZADO_FALLA',
      errors,
      warnings,
      evaluatedAt: new Date().toISOString(),
      operatorId
    };

    this.cycles.push(record);
    return record;
  }

  getCycle(cycleId) {
    return this.cycles.find((c) => c.id === cycleId) || null;
  }
}
