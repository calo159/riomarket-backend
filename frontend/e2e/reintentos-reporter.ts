import { appendFileSync } from 'node:fs';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

/**
 * Anota qué pruebas pasaron solo en un reintento (inestables), para que no queden ocultas
 * detrás de un trabajo en verde. Escribe en el resumen del trabajo de GitHub Actions.
 */
class ReintentosReporter implements Reporter {
  private readonly inestables = new Set<string>();

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.retry > 0 && result.status === 'passed') this.inestables.add(test.titlePath().slice(1).join(' › '));
  }

  onEnd() {
    const lineas = [...this.inestables].map((nombre) => `- ${nombre}`);
    if (lineas.length === 0) return;
    const texto = `### Pruebas e2e que necesitaron reintento\n\n${lineas.join('\n')}\n`;
    process.stdout.write(`\n${texto}`);
    const resumen = process.env.GITHUB_STEP_SUMMARY;
    if (resumen) appendFileSync(resumen, texto);
  }
}

export default ReintentosReporter;
