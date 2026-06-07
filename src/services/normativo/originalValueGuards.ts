export type OriginalFieldsSnapshot = Record<string, unknown>;

export type OriginalFieldsComparison = {
  preservado: boolean;
  camposAlterados: string[];
  camposAusentes: string[];
};

export function capturarCamposOriginal(value: unknown): OriginalFieldsSnapshot {
  const snapshot: OriginalFieldsSnapshot = {};
  capturarRecursivo(value, [], snapshot);

  return snapshot;
}

export function compararCamposOriginal(
  snapshot: OriginalFieldsSnapshot,
  value: unknown,
): OriginalFieldsComparison {
  const atual = capturarCamposOriginal(value);
  const camposAlterados: string[] = [];
  const camposAusentes: string[] = [];

  for (const [path, valorOriginal] of Object.entries(snapshot)) {
    if (!(path in atual)) {
      camposAusentes.push(path);
      continue;
    }

    if (!Object.is(atual[path], valorOriginal)) {
      camposAlterados.push(path);
    }
  }

  return {
    preservado: camposAlterados.length === 0 && camposAusentes.length === 0,
    camposAlterados,
    camposAusentes,
  };
}

function capturarRecursivo(
  value: unknown,
  path: string[],
  snapshot: OriginalFieldsSnapshot,
): void {
  if (!isRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = [...path, key];

    if (key.endsWith('Original')) {
      snapshot[childPath.join('.')] = child;
    }

    capturarRecursivo(child, childPath, snapshot);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
