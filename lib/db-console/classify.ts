import type { StatementClass } from './pools';

let _parseQuery: ((sql: string) => { stmts: Array<{ stmt: Record<string, unknown> }> }) | null = null;

async function getParser() {
  if (!_parseQuery) {
    const mod = await import('libpg-query');
    _parseQuery = mod.parseQuery ?? (mod as any).default?.parseQuery;
    if (!_parseQuery) throw new Error('libpg-query: parseQuery not found');
  }
  return _parseQuery;
}

const DDL_NODE_TYPES = new Set([
  'CreateStmt', 'AlterTableStmt', 'DropStmt', 'IndexStmt', 'CreateSeqStmt',
  'AlterSeqStmt', 'CreateSchemaStmt', 'CreateEnumStmt', 'AlterEnumStmt',
  'CreateFunctionStmt', 'AlterFunctionStmt', 'CreateTrigStmt', 'DropTrigStmt',
  'CreatePolicyStmt', 'AlterPolicyStmt', 'GrantStmt', 'RevokeStmt',
  'CreateRoleStmt', 'AlterRoleStmt', 'DropRoleStmt', 'CreateExtensionStmt',
  'AlterExtensionStmt', 'RenameStmt', 'CommentStmt', 'CreateTableAsStmt',
  'ViewStmt', 'CreateDomainStmt', 'AlterDomainStmt',
]);

const BLOCKED_NODE_TYPES = new Set([
  'CopyStmt', 'LoadStmt', 'CreatedbStmt', 'DropdbStmt',
  'ReindexStmt', 'ClusterStmt', 'VacuumStmt',
]);

export interface ClassifyResult {
  statementClass: StatementClass;
  statementCount: number;
  blocked: boolean;
  blockReason?: string;
  nodeTypes: string[];
}

export async function classifySQL(sql: string): Promise<ClassifyResult> {
  const parseQuery = await getParser();
  const parsed = parseQuery(sql);
  const stmts = parsed.stmts ?? [];
  const nodeTypes: string[] = [];

  let hasSelect = false;
  let hasInsert = false;
  let hasUpdate = false;
  let hasDelete = false;
  let hasDDL = false;
  let blocked = false;
  let blockReason: string | undefined;

  for (const { stmt } of stmts) {
    const nodeType = Object.keys(stmt)[0];
    nodeTypes.push(nodeType);

    if (BLOCKED_NODE_TYPES.has(nodeType)) {
      blocked = true;
      blockReason = `Statement type ${nodeType} is not allowed`;
      continue;
    }

    if (nodeType === 'VariableSetStmt') {
      const varSet = stmt[nodeType] as any;
      const name = varSet?.name?.toLowerCase?.();
      if (name === 'role' || name === 'session_authorization') {
        blocked = true;
        blockReason = 'SET ROLE / SET SESSION AUTHORIZATION is not allowed';
        continue;
      }
    }

    if (nodeType === 'DoStmt') {
      blocked = true;
      blockReason = 'DO blocks are not allowed (use CREATE FUNCTION instead)';
      continue;
    }

    if (DDL_NODE_TYPES.has(nodeType)) {
      hasDDL = true;
    } else if (nodeType === 'SelectStmt') {
      hasSelect = true;
    } else if (nodeType === 'InsertStmt') {
      hasInsert = true;
    } else if (nodeType === 'UpdateStmt') {
      hasUpdate = true;
    } else if (nodeType === 'DeleteStmt') {
      hasDelete = true;
    } else if (nodeType === 'ExplainStmt') {
      hasSelect = true;
    } else if (nodeType === 'TransactionStmt') {
      // BEGIN/COMMIT/ROLLBACK — classify as other, don't block
    }
  }

  let statementClass: StatementClass;
  if (blocked) {
    statementClass = 'other';
  } else if (hasDDL) {
    statementClass = 'ddl';
  } else if (hasDelete) {
    statementClass = 'delete';
  } else if (hasUpdate) {
    statementClass = 'update';
  } else if (hasInsert) {
    statementClass = 'insert';
  } else if (hasSelect) {
    statementClass = 'select';
  } else {
    statementClass = 'other';
  }

  return {
    statementClass,
    statementCount: stmts.length,
    blocked,
    blockReason,
    nodeTypes,
  };
}
