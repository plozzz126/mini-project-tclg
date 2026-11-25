import { describe, it, expect } from 'vitest'
import sample from './fixtures/sample.json'
import {
  DEFAULT_TITLE,
  MAX_EXPO,
  UNKNOWN_ARTIST,
  artistName,
  imageUrl,
  aspectRatio,
  hueBucket,
  maxPage,
  randomPage,
  encodeExpo,
  decodeExpo,
  orderByIds,
  sortByYear,
  countByDepartment,
  toItem,
  expoReducer,
  initialExpo,
  normalizeExpo,
  loadExpo,
  saveExpo,
  STORAGE_KEY,
} from './art.js'

const byId = (id) => sample.data.find((a) => a.id === id)
const iiif = sample.config.iiif_url
const lion = byId(656) // автор в 3 строки
const picasso = byId(45259)
const noImage = byId(2990) // нет image_id, thumbnail, color
const noColor = byId(21177) // есть картинка, нет color
const items = sample.data.map((a) => toItem(a, iiif))

describe('artistName', () => {
  it('берёт первую строку (пример из задания)', () => {
    expect(artistName('Claude Monet\nFrench, 1840–1926')).toBe('Claude Monet')
  })
  it('работает на реальных данных с несколькими строками', () => {
    expect(artistName(lion.artist_display)).toBe('Edward Kemeys (American, 1843–1907)')
    expect(artistName(picasso.artist_display)).toBe('Pablo Picasso')
  })
  it('без перевода строки возвращает всю строку без пробелов по краям', () => {
    expect(artistName('  Anonymous  ')).toBe('Anonymous')
  })
  it('null / пустая строка → «Неизвестный автор»', () => {
    expect(artistName(null)).toBe(UNKNOWN_ARTIST)
    expect(artistName('')).toBe(UNKNOWN_ARTIST)
    expect(artistName('\nFrench')).toBe(UNKNOWN_ARTIST)
  })
})

describe('imageUrl', () => {
  it('собирает IIIF-адрес из config.iiif_url', () => {
    expect(imageUrl(iiif, picasso.image_id)).toBe(
      `https://www.artic.edu/iiif/2/${picasso.image_id}/full/843,/0/default.jpg`,
    )
  })
  it('поддерживает другую ширину и убирает лишний слэш', () => {
    expect(imageUrl(iiif + '/', 'abc', 400)).toBe('https://www.artic.edu/iiif/2/abc/full/400,/0/default.jpg')
  })
  it('нет image_id → null', () => {
    expect(imageUrl(iiif, noImage.image_id)).toBeNull()
    expect(imageUrl(undefined, 'abc')).toBeNull()
  })
})

describe('aspectRatio', () => {
  it('считает width / height', () => {
    expect(aspectRatio(picasso.thumbnail)).toBeCloseTo(4603 / 5060)
  })
  it('нет thumbnail или нулевые размеры → 1', () => {
    expect(aspectRatio(noImage.thumbnail)).toBe(1)
    expect(aspectRatio({ width: 0, height: 10 })).toBe(1)
    expect(aspectRatio({ width: 10 })).toBe(1)
  })
})

describe('hueBucket', () => {
  it('граница включается в верхнюю группу', () => {
    expect(hueBucket({ h: 45, s: 50, l: 50 })).toBe('yellow')
    expect(hueBucket({ h: 44, s: 50, l: 50 })).toBe('orange')
    expect(hueBucket({ h: 15, s: 50, l: 50 })).toBe('orange')
    expect(hueBucket({ h: 70, s: 50, l: 50 })).toBe('green')
    expect(hueBucket({ h: 170, s: 50, l: 50 })).toBe('blue')
    expect(hueBucket({ h: 260, s: 50, l: 50 })).toBe('purple')
    expect(hueBucket({ h: 345, s: 50, l: 50 })).toBe('red')
  })
  it('красный с обеих сторон круга', () => {
    expect(hueBucket({ h: 0, s: 50, l: 50 })).toBe('red')
    expect(hueBucket({ h: 14, s: 50, l: 50 })).toBe('red')
    expect(hueBucket({ h: 359, s: 50, l: 50 })).toBe('red')
    expect(hueBucket({ h: 344, s: 50, l: 50 })).toBe('purple')
  })
  it('низкая насыщенность → gray', () => {
    expect(hueBucket({ h: 200, s: 14, l: 50 })).toBe('gray')
    expect(hueBucket({ h: 200, s: 15, l: 50 })).toBe('blue')
  })
  it('реальные данные и отсутствие цвета', () => {
    expect(hueBucket(lion.color)).toBe('yellow') // h 49
    expect(hueBucket(noColor.color)).toBeNull()
    expect(hueBucket(undefined)).toBeNull()
  })
})

describe('maxPage', () => {
  it('примеры из задания', () => {
    expect(maxPage(45, 20)).toBe(3)
    expect(maxPage(25000, 24)).toBe(416)
  })
  it('реальная пагинация поиска (133 375 результатов)', () => {
    expect(maxPage(sample.pagination.total, 24)).toBe(416)
    expect(maxPage(sample.pagination.total, 100)).toBe(100)
  })
  it('ровно 10 000 и ровно кратное число', () => {
    expect(maxPage(10000, 100)).toBe(100)
    expect(maxPage(40, 20)).toBe(2)
    expect(maxPage(1, 24)).toBe(1)
  })
  it('ничего не найдено / мусор → 0', () => {
    expect(maxPage(0, 24)).toBe(0)
    expect(maxPage(undefined, 24)).toBe(0)
    expect(maxPage(10, 0)).toBe(0)
  })
})

describe('randomPage', () => {
  it('всегда в пределах 1..max', () => {
    expect(randomPage(416, () => 0)).toBe(1)
    expect(randomPage(416, () => 0.999999)).toBe(416)
    expect(randomPage(0, () => 0.5)).toBe(0)
  })
})

describe('encodeExpo / decodeExpo', () => {
  it('пример из задания', () => {
    expect(decodeExpo('?ids=5,abc,5,-3,7')).toEqual({ title: DEFAULT_TITLE, ids: [5, 7] })
  })
  it('кодирует название и id', () => {
    expect(encodeExpo({ title: 'Кошки', ids: [1, 2, 3] })).toBe(
      `?title=${encodeURIComponent('Кошки')}&ids=1,2,3`,
    )
  })
  it('кодирует выставку с items', () => {
    expect(encodeExpo({ title: 'X', items })).toBe('?title=X&ids=656,45259,2990,21177')
  })
  it('туда-обратно сохраняет данные, в том числе & и пробелы в названии', () => {
    const expo = { title: 'Коты & кошки 2', ids: [27992, 6565] }
    expect(decodeExpo(encodeExpo(expo))).toEqual(expo)
  })
  it('нули, дроби, пустые элементы отбрасываются; не больше 12', () => {
    expect(decodeExpo('?ids=0,1.5,,2,').ids).toEqual([2])
    const many = Array.from({ length: 20 }, (_, i) => i + 1).join(',')
    expect(decodeExpo(`?ids=${many}`).ids).toHaveLength(MAX_EXPO)
  })
  it('пустое название и пустой адрес → DEFAULT_TITLE', () => {
    expect(decodeExpo('?title=%20%20&ids=1')).toEqual({ title: DEFAULT_TITLE, ids: [1] })
    expect(decodeExpo('')).toEqual({ title: DEFAULT_TITLE, ids: [] })
    expect(encodeExpo({ title: '', ids: [] })).toBe(`?title=${encodeURIComponent(DEFAULT_TITLE)}&ids=`)
  })
})

describe('orderByIds', () => {
  it('восстанавливает порядок и пропускает несуществующие id', () => {
    // API вернул в другом порядке и без id 99999999
    const shuffled = [byId(21177), byId(656), byId(2990)]
    expect(orderByIds(shuffled, [656, 2990, 99999999, 21177]).map((a) => a.id)).toEqual([656, 2990, 21177])
  })
})

describe('задачи вариантов', () => {
  it('sortByYear — по date_start, неизвестные в конце, исходник не меняется', () => {
    const list = [...items, { id: 1, date_start: null }]
    const sorted = sortByYear(list)
    expect(sorted.map((a) => a.id)).toEqual([2990, 21177, 656, 45259, 1])
    expect(list[0].id).toBe(656)
  })
  it('countByDepartment', () => {
    const list = [...items, { id: 9, department_title: 'Textiles' }, { id: 10 }]
    expect(countByDepartment(list)[0]).toEqual({ department: 'Textiles', count: 2 })
    expect(countByDepartment(list).find((d) => d.department === 'Без отдела').count).toBe(1)
    expect(countByDepartment([])).toEqual([])
  })
})

describe('expoReducer', () => {
  const add = (s, item) => expoReducer(s, { type: 'add', item })
  const full = items.concat(
    Array.from({ length: 8 }, (_, i) => ({ id: 100 + i, title: `w${i}` })),
  ).reduce(add, initialExpo)

  it('add: добавляет, не дублирует, не больше 12', () => {
    const s = add(add(initialExpo, items[0]), items[0])
    expect(s.items).toHaveLength(1)
    expect(full.items).toHaveLength(MAX_EXPO)
    expect(add(full, { id: 999 })).toBe(full)
  })
  it('moveUp / moveDown / move, на краях — то же состояние', () => {
    const s = items.reduce(add, initialExpo)
    expect(expoReducer(s, { type: 'moveUp', id: 45259 }).items.map((a) => a.id)).toEqual([45259, 656, 2990, 21177])
    expect(expoReducer(s, { type: 'moveDown', id: 656 }).items[1].id).toBe(656)
    expect(expoReducer(s, { type: 'moveUp', id: 656 })).toBe(s)
    expect(expoReducer(s, { type: 'moveDown', id: 21177 })).toBe(s)
    expect(expoReducer(s, { type: 'move', from: 3, to: 0 }).items[0].id).toBe(21177)
    expect(expoReducer(s, { type: 'move', from: 0, to: 9 })).toBe(s)
  })
  it('remove / rename / sortByYear / clear / неизвестное действие', () => {
    const s = items.reduce(add, initialExpo)
    expect(expoReducer(s, { type: 'remove', id: 656 }).items).toHaveLength(3)
    expect(expoReducer(s, { type: 'remove', id: 1 })).toBe(s)
    expect(expoReducer(s, { type: 'rename', title: 'Коты' }).title).toBe('Коты')
    expect(expoReducer(s, { type: 'sortByYear' }).items[0].id).toBe(2990)
    expect(expoReducer(s, { type: 'clear' }).items).toEqual([])
    expect(expoReducer(s, { type: 'nope' })).toBe(s)
  })
})

describe('localStorage', () => {
  const fakeStorage = () => {
    const m = new Map()
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }
  }
  it('сохраняет и читает выставку', () => {
    const st = fakeStorage()
    const expo = { title: 'T', items: items.slice(0, 2) }
    saveExpo(expo, st)
    expect(loadExpo(st)).toEqual(expo)
  })
  it('битый JSON и мусор → пустая выставка', () => {
    const st = fakeStorage()
    st.setItem(STORAGE_KEY, '{oops')
    expect(loadExpo(st)).toEqual(initialExpo)
    st.setItem(STORAGE_KEY, JSON.stringify({ items: 'x' }))
    expect(loadExpo(st)).toEqual(initialExpo)
    expect(normalizeExpo({ title: 5, items: [{ id: 1 }, { id: 1 }, { id: -2 }, null] })).toEqual({
      title: DEFAULT_TITLE,
      items: [{ id: 1 }],
    })
  })
})
