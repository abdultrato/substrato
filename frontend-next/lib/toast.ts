type Callback = (msg: any) => void
let subscribers: Callback[] = []

export function subscribe(cb: Callback) {
  subscribers.push(cb)
  return () => { subscribers = subscribers.filter(s => s !== cb) }
}

export function publish(msg: any) {
  subscribers.forEach(s => s(msg))
}
