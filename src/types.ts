export type Msg = {
    src: string
    dest: string
}

type EchoBody = {
    type: "echo",
    msg_id: number
    echo: string
}

type EchoReplyBody = {
    type: "echo_ok",
    msg_id: number,
    in_reply_to: number
    echo: string
}

type Body = {
    type: string
    msg_id: number
    in_reply_to?: number
}

export type Echo = Msg & { body: EchoBody }

export type EchoOk = Msg & { body: EchoReplyBody }
//{"id":0,"src":"c0","dest":"n0","body":{"type":"init","node_id":"n0","node_ids":["n0"],"msg_id":1}} 
export type Init = Msg & { body: {type: 'init', node_id: string, node_ids: string[], msg_id: number}}
export type InitOk = Msg & {body: {type: 'init_ok', in_reply_to: number, msg_id: number}}

export type Generate = Msg & { body: Body & {type: 'generate'}}
export type GenerateOk = Msg & { body: Body & {type: 'generate_ok', id: string}}

// {"body":{"in_reply_to":1,"msg_id":0,"type":"init_ok"},"dest":"c0","src":"n0"}
export const isEcho = (msg: any): msg is Echo => {
    return msg?.body?.type === 'echo'
}

export const isInit = (msg: any): msg is Init => {
    return msg?.body?.type === 'init'
}

export const isGenerate = (msg: any): msg is Generate => {
    return msg?.body?.type === 'generate'
}