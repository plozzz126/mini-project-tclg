// Очередь запросов: задачи запускаются по одной и не чаще 1 раза в interval мс.
// Таймер и часы передаются снаружи — так очередь тестируется с vi.useFakeTimers.

export function abortError() {
  return new DOMException('Запрос отменён', 'AbortError')
}

export function createQueue(interval = 1000, { now = () => Date.now() } = {}) {
  const tasks = []
  let lastStart = -Infinity
  let timer = null

  function pump() {
    timer = null
    // выкидываем задачи, которые отменили, пока они ждали
    while (tasks.length && tasks[0].signal?.aborted) {
      tasks.shift().reject(abortError())
    }
    if (!tasks.length) return
    const wait = lastStart + interval - now()
    if (wait > 0) {
      timer = setTimeout(pump, wait)
      return
    }
    const task = tasks.shift()
    lastStart = now()
    Promise.resolve()
      .then(task.fn)
      .then(task.resolve, task.reject)
    if (tasks.length) timer = setTimeout(pump, interval)
  }

  function enqueue(fn, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(abortError())
      const task = { fn, resolve, reject, signal }
      tasks.push(task)
      signal?.addEventListener(
        'abort',
        () => {
          const i = tasks.indexOf(task)
          if (i !== -1) {
            tasks.splice(i, 1)
            reject(abortError())
          }
        },
        { once: true },
      )
      if (timer === null) pump()
    })
  }

  return { enqueue, size: () => tasks.length }
}
