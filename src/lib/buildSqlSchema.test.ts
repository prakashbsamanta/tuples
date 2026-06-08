import { describe, it, expect } from 'vitest';
import { buildSqlSchema } from './buildSqlSchema';
import type { TableSchema } from './schema';

const patients: TableSchema = {
  name: 'patients',
  columns: [
    { name: 'patient_id', type: 'INT', pk: true },
    { name: 'patient_name', type: 'TEXT', pk: false },
  ],
  foreignKeys: [],
  isView: false,
};

describe('buildSqlSchema', () => {
  it('maps each table to its list of column names', () => {
    expect(buildSqlSchema([patients])).toEqual({
      patients: ['patient_id', 'patient_name'],
    });
  });

  it('includes views as well as tables', () => {
    const view: TableSchema = {
      name: 'active_patients',
      columns: [{ name: 'patient_id', type: 'INT', pk: false }],
      foreignKeys: [],
      isView: true,
    };
    expect(buildSqlSchema([patients, view])).toEqual({
      patients: ['patient_id', 'patient_name'],
      active_patients: ['patient_id'],
    });
  });

  it('returns an empty object for no tables', () => {
    expect(buildSqlSchema([])).toEqual({});
  });
});
