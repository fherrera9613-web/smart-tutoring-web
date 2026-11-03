import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesSearch } from './search.js'
import { getLocalIsoDate, getCenterDateTime } from './date.js'

test('búsqueda normaliza tildes y mayúsculas', () => {
  assert.equal(matchesSearch('JOSE', 'José', 'Pérez'), true)
  assert.equal(matchesSearch('MATEMATICAS', 'Matemáticas básicas'), true)
})

test('búsqueda acepta varias palabras, independientemente del orden', () => {
  assert.equal(matchesSearch('perez ana', 'Ana', 'Pérez'), true)
  assert.equal(matchesSearch('Pérez Física', 'Ana Pérez', 'Física'), true)
  assert.equal(matchesSearch('Pérez Inglés', 'Ana Pérez', 'Física'), false)
})

test('búsqueda vacía conserva todos los registros', () => {
  assert.equal(matchesSearch('   ', 'Cualquier registro'), true)
})

test('fecha de Nicaragua usa su zona horaria al cruzar medianoche UTC', () => {
  const now = new Date('2026-11-04T02:30:00Z')
  assert.deepEqual(getCenterDateTime(now), { date: '2026-11-03', time: '20:30:00' })
})

test('fecha local retorna YYYY-MM-DD', () => {
  assert.equal(getLocalIsoDate(new Date('2026-11-03T12:00:00Z')), '2026-11-03')
})
