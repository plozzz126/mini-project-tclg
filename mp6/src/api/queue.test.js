import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createQueue } from './queue.js'

describe('очередь запросов (фальшивые таймеры)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const make = () => createQueue(1000, { now: () => Date.now() })

  it('запускает не чаще 1 задачи в секунду', async () => {
    const q = make()
    const started = []
    const job = (n) => () => started.push([n, Date.now()])
    const t0 = Date.now()
    const all = Promise.all([q.enqueue(job(1)), q.enqueue(job(2)), q.enqueue(job(3))])

    await vi.advanceTimersByTimeAsync(0)
    expect(started.map(([n]) => n)).toEqual([1])
    await vi.advanceTimersByTimeAsync(999)
    expect(started).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(started).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(1000)
    await all
    expect(started.map(([, t]) => t - t0)).toEqual([0, 1000, 2000])
  })

  it('возвращает результат и ошибку задачи', async () => {
    const q = make()
    const ok = q.enqueue(() => 42)
    const bad = q.enqueue(() => {
      throw new Error('boom')
    })
    bad.catch(() => {})
    await vi.advanceTimersByTimeAsync(1000)
    await expect(ok).resolves.toBe(42)
    await expect(bad).rejects.toThrow('boom')
  })

  it('отменённая задача не выполняется и не занимает слот', async () => {
    const q = make()
    const fn = vi.fn()
    q.enqueue(() => {})
    const ctrl = new AbortController()
    const cancelled = q.enqueue(fn, ctrl.signal)
    const third = vi.fn()
    q.enqueue(third)
    ctrl.abort()
    await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(1000)
    expect(fn).not.toHaveBeenCalled()
    expect(third).toHaveBeenCalledTimes(1)
  })

  it('после паузы следующая задача стартует сразу', async () => {
    const q = make()
    q.enqueue(() => {})
    await vi.advanceTimersByTimeAsync(5000)
    const fn = vi.fn()
    q.enqueue(fn)
    await vi.advanceTimersByTimeAsync(0)
    expect(fn).toHaveBeenCalled()
  })
})
