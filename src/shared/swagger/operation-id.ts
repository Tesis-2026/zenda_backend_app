import { OpenAPIObject } from '@nestjs/swagger';

const HTTP_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'patch',
  'options',
  'head',
  'trace',
] as const;

/**
 * Rewrites Nest's auto-generated `ControllerName_method` operationIds into
 * clean, collision-safe names.
 *
 * A bare method name is used when it is globally unique (e.g. `register`). When
 * the same method name is shared across controllers (e.g. `list`, `create`,
 * `update`), it is qualified with the controller's resource so every endpoint
 * keeps its own name (e.g. `listAccounts`, `createBudget`). A numeric suffix is
 * appended only as a last-resort guard so the result is always unique — invalid
 * OpenAPI otherwise breaks Swagger UI and generated clients.
 */
export function assignCleanOperationIds(document: OpenAPIObject): void {
  const bareCounts = new Map<string, number>();

  for (const pathItem of Object.values(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation?.operationId) continue;
      const bare = bareMethodName(operation.operationId);
      bareCounts.set(bare, (bareCounts.get(bare) ?? 0) + 1);
    }
  }

  const used = new Set<string>();

  for (const pathItem of Object.values(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation?.operationId) continue;

      const bare = bareMethodName(operation.operationId);
      const base =
        (bareCounts.get(bare) ?? 0) > 1
          ? `${bare}${controllerResource(operation.operationId)}`
          : bare;

      let candidate = base;
      let suffix = 2;
      while (used.has(candidate)) {
        candidate = `${base}${suffix}`;
        suffix += 1;
      }
      used.add(candidate);
      operation.operationId = candidate;
    }
  }
}

function bareMethodName(operationId: string): string {
  const separator = operationId.indexOf('_');
  return separator === -1 ? operationId : operationId.slice(separator + 1);
}

function controllerResource(operationId: string): string {
  const separator = operationId.indexOf('_');
  if (separator === -1) return '';
  return operationId.slice(0, separator).replace(/Controller$/, '');
}
