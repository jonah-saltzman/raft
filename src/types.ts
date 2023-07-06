export type Routing = {
    src: string
    dest: string
}

type Body<T, U> = {
    body: {
        msg_id: number
        in_reply_to?: number
    } & T & { type: U }
}

export type Message<T, U> = Routing & Body<T, U>
export type GenericMessage = Message<unknown, string>

export type Echo = Message<{echo: string}, 'echo'>
export type EchoOk = Message<{echo: string}, 'echo_ok'>

export type Init = Message<{node_id: string, node_ids: string[]}, 'init'>
export type InitOk = Message<{}, 'init_ok'>

export type Generate = Message<{}, 'generate'>
export type GenerateOk = Message<{id: string}, 'generate_ok'>

export type Broadcast = Message<{message: number}, 'broadcast'>
export type BroadcastOk = Message<{}, 'broadcast_ok'>

export type Read = Message<{}, 'read'>
export type ReadOk = Message<{messages: number[]}, 'read_ok'>

export type Topology = Message<{topology: {[key: string]: string[]}}, 'topology'>
export type TopologyOk = Message<{}, 'topology_ok'>

export function isMessage(msg: unknown): msg is GenericMessage {
    if (typeof msg['src'] !== 'string') return false
    if (typeof msg['dest'] !== 'string') return false
    if (typeof msg['body'] !== 'object') return false
    if (typeof msg['body']['type'] !== 'string') return false
    if (typeof msg['body']['msg_id'] !== 'number') return false
    return true
}

export function isType<T extends GenericMessage>(msg: GenericMessage, type: string): msg is T {
    return msg.body.type === type
}