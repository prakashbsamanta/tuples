import { describe, it, expect } from 'vitest';
import { buildGraph } from './schemaGraph';
import type { TableSchema } from './schema';

const patients: TableSchema = {
  name: 'patients',
  columns: [{ name: 'patient_id', type: 'INT', pk: true }],
  foreignKeys: [],
  isView: false,
};

const dosageLogs: TableSchema = {
  name: 'dosage_logs',
  columns: [
    { name: 'log_id', type: 'INT', pk: true },
    { name: 'patient_id', type: 'INT', pk: false },
  ],
  foreignKeys: [],
  isView: false,
};

describe('buildGraph', () => {
  it('creates one node per table with the table in node data', () => {
    const { nodes } = buildGraph([patients, dosageLogs]);
    expect(nodes.map((n) => n.id)).toEqual(['patients', 'dosage_logs']);
    expect(nodes[0].data.table).toEqual(patients);
    expect(nodes[0].type).toBe('table');
    expect(typeof nodes[0].position.x).toBe('number');
    expect(typeof nodes[0].position.y).toBe('number');
  });

  it('infers an edge from a column matching another table primary key', () => {
    const { edges } = buildGraph([patients, dosageLogs]);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('dosage_logs');
    expect(edges[0].target).toBe('patients');
    expect(edges[0].animated).toBe(true);
  });

  it('creates an edge for an explicit foreign key', () => {
    const orders: TableSchema = {
      name: 'orders',
      columns: [{ name: 'order_id', type: 'INT', pk: true }, { name: 'sym', type: 'TEXT', pk: false }],
      foreignKeys: [{ fromColumn: 'sym', toTable: 'assets', toColumn: 'symbol' }],
      isView: false,
    };
    const assets: TableSchema = {
      name: 'assets',
      columns: [{ name: 'symbol', type: 'TEXT', pk: true }],
      foreignKeys: [],
      isView: false,
    };
    const { edges } = buildGraph([orders, assets]);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('orders');
    expect(edges[0].target).toBe('assets');
  });

  it('does not duplicate an edge that is both explicit and inferable', () => {
    const a: TableSchema = {
      name: 'a',
      columns: [{ name: 'b_id', type: 'INT', pk: false }],
      foreignKeys: [{ fromColumn: 'b_id', toTable: 'b', toColumn: 'b_id' }],
      isView: false,
    };
    const b: TableSchema = {
      name: 'b',
      columns: [{ name: 'b_id', type: 'INT', pk: true }],
      foreignKeys: [],
      isView: false,
    };
    const { edges } = buildGraph([a, b]);
    expect(edges).toHaveLength(1);
  });

  it('does not infer a self-edge from a table own primary key', () => {
    const { edges } = buildGraph([patients]);
    expect(edges).toHaveLength(0);
  });

  it('falls back to the first column as the key when no primary key is declared', () => {
    // Mirrors the real curriculum: tables have no PRIMARY KEY, the first column is the identifier.
    const assets: TableSchema = {
      name: 'assets',
      columns: [
        { name: 'symbol', type: 'TEXT', pk: false },
        { name: 'company_name', type: 'TEXT', pk: false },
      ],
      foreignKeys: [],
      isView: false,
    };
    const orders: TableSchema = {
      name: 'orders',
      columns: [
        { name: 'order_id', type: 'INT', pk: false },
        { name: 'symbol', type: 'TEXT', pk: false },
      ],
      foreignKeys: [],
      isView: false,
    };
    const trades: TableSchema = {
      name: 'trades',
      columns: [
        { name: 'trade_id', type: 'INT', pk: false },
        { name: 'order_id', type: 'INT', pk: false },
        { name: 'symbol', type: 'TEXT', pk: false },
      ],
      foreignKeys: [],
      isView: false,
    };
    const { edges } = buildGraph([assets, orders, trades]);
    const pairs = edges.map((e) => `${e.source}->${e.target}`).sort();
    // orders.symbol->assets, trades.symbol->assets, trades.order_id->orders
    expect(pairs).toEqual(['orders->assets', 'trades->assets', 'trades->orders']);
  });

  it('does not let a non-key table first column hijack a real primary key owner', () => {
    // `a` has no PK; its first column happens to be `b_id`, which is `b`'s real PK.
    const a: TableSchema = {
      name: 'a',
      columns: [{ name: 'b_id', type: 'INT', pk: false }],
      foreignKeys: [],
      isView: false,
    };
    const b: TableSchema = {
      name: 'b',
      columns: [{ name: 'b_id', type: 'INT', pk: true }],
      foreignKeys: [],
      isView: false,
    };
    const { edges } = buildGraph([a, b]);
    // The PK owner (b) wins, so the edge points a -> b, not b -> a.
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('a');
    expect(edges[0].target).toBe('b');
  });
});
