import { Message, Echo, EchoOk, Generate, GenerateOk, Init, InitOk, isType, Routing, Broadcast, BroadcastOk, Read, ReadOk, GenericMessage, Topology, TopologyOk } from "./types"
import * as fs from 'fs'
import { format } from 'util'
import { hostname } from "os"

export const LOG = '/Users/jonah-work/codebase/raft/out.txt'

export const log = (...args: any[]) => {
    console.error(...args)
    const str = format(...args, '\n')
    fs.appendFileSync(LOG, str)
}

export class StateMachine {

    curr_id = 0
    node_id = `${hostname()}-${process.pid}`
    nodes: string[] = []
    messages: number[] = []
    topology: {[key: string]: string[]}

    constructor(private send: (reply: string) => void) {}

    receiveMsg(msg: GenericMessage) {
        log('processing msg: ', msg)
        if (isType<Read>(msg, 'read')) {
            const body = { messages: this.messages }
            const reply: ReadOk = this.getReply(msg, body, 'read_ok')
            return this.sendReply(reply)
        }
        if (isType<Broadcast>(msg, 'broadcast')) {
            this.messages.push(msg.body.message)
            const reply: BroadcastOk = this.getReply(msg, {}, 'broadcast_ok')
            return this.sendReply(reply)
        }
        if (isType<Topology>(msg, 'topology')) {
            this.topology = msg.body.topology
            const reply: TopologyOk = this.getReply(msg, {}, 'topology_ok')
            return this.sendReply(reply)
        }
        if (isType<Init>(msg, 'init')) {
            this.nodes = msg.body.node_ids
            const reply: InitOk = this.getReply(msg, {}, 'init_ok')
            return this.sendReply(reply)
        }
        if (isType<Echo>(msg, 'echo')) {
            const body = { echo: msg.body.echo }
            const reply: EchoOk = this.getReply(msg, body, 'echo_ok')
            return this.sendReply(reply)
        }
        if (isType<Generate>(msg, 'generate')) {
            const body = { id: `${this.node_id}-${this.curr_id}` }
            const reply: GenerateOk = this.getReply(msg, body, 'generate_ok')
            return this.sendReply(reply)
        }
        log('unknown msg: ', msg)
        throw new Error('unknown message')
    }

    getReply<
        T extends GenericMessage, 
        U extends {[k: string]: unknown}, 
        V extends string
    >(msg: T, body: U, desc: V): Message<U, V> {
        return {
            src: msg.dest,
            dest: msg.src,
            body: {
                ...body,
                msg_id: this.curr_id,
                type: desc,
                in_reply_to: msg.body.msg_id
            }
        }
    }

    sendReply(msg: GenericMessage) {
        this.curr_id += 1
        const reply = JSON.stringify(msg)
        this.send(reply)
    }
}