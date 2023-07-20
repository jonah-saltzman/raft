import * as MSG from "./types"
import { isType } from "./types"
import * as fs from 'fs'
import { format } from 'util'

export const LOG = '/Users/jonah-work/codebase/raft/out.txt'

type SentMessage = {
    id: number
    msg: MSG.GenericMessage
    handler: ReplyHandler<unknown, unknown>
    ts: number
}

type ReplyHandler<T, U> = (msg: MSG.Message<T, U>) => void

export class StateMachine {

    currentMsgId = 0
    self: string
    nodes: Set<string> = new Set()
    messages: Set<number> = new Set()
    topology: {[key: string]: string[]}
    sent: Map<Number, SentMessage> = new Map()
    gossips: Map<number, {received: Set<string>, timer: NodeJS.Timeout}> = new Map()

    constructor(private out: (reply: string) => void, retryDelayMS: number, retryIntervalMS: number) {
        setInterval(() => this.retryMessages(retryDelayMS), retryIntervalMS)
    }

    receiveMsg(msg: MSG.GenericMessage) {
        this.log('processing msg: ', msg)
        const inReplyTo = msg.body.in_reply_to
        if (inReplyTo) {
            const handler = this.sent.get(inReplyTo).handler
            handler(msg)
            this.sent.delete(inReplyTo)
            return
        }
        if (isType<MSG.Gossip>(msg, 'gossip')) {
            const body = msg.body
            const value = body.value
            this.messages.add(value)
            const gossip = this.gossips.get(value) ?? {received: new Set([this.self]), timer: undefined}
            gossip.received = add(gossip.received, new Set(body.completedNodes))
            this.gossips.set(value, gossip)
            if (body.steps > 1) {
                this.gossip(value, body.steps - 1)
            } else {
                // decay
            }
            const reply: MSG.GossipOk = this.getReply(msg, {completedNodes: [...this.gossips.get(value).received]}, 'gossip_ok')
            return this.send(reply)
        }
        if (isType<MSG.Broadcast>(msg, 'broadcast')) {
            const value = msg.body.message
            this.messages.add(value)
            const reply: MSG.BroadcastOk = this.getReply(msg, {}, 'broadcast_ok')
            this.send(reply)
            if (!this.gossips.has(value)) {
                this.gossips.set(value, {received: new Set([this.self]), timer: undefined})
                this.gossip(value, 10)
            }
            return
        }
        if (isType<MSG.Read>(msg, 'read')) {
            const body = { messages: [...this.messages] }
            const reply: MSG.ReadOk = this.getReply(msg, body, 'read_ok')
            return this.send(reply)
        }
        if (isType<MSG.Topology>(msg, 'topology')) {
            this.topology = msg.body.topology
            const reply: MSG.TopologyOk = this.getReply(msg, {}, 'topology_ok')
            return this.send(reply)
        }
        if (isType<MSG.Init>(msg, 'init')) {
            this.nodes = new Set(msg.body.node_ids)
            this.self = msg.body.node_id
            this.nodes.delete(this.self)
            const reply: MSG.InitOk = this.getReply(msg, {}, 'init_ok')
            return this.send(reply)
        }
        if (isType<MSG.Echo>(msg, 'echo')) {
            const body = { echo: msg.body.echo }
            const reply: MSG.EchoOk = this.getReply(msg, body, 'echo_ok')
            return this.send(reply)
        }
        if (isType<MSG.Generate>(msg, 'generate')) {
            const body = { id: `${this.self}-${this.currentMsgId}` }
            const reply: MSG.GenerateOk = this.getReply(msg, body, 'generate_ok')
            return this.send(reply)
        }
        this.log('unknown msg: ', msg)
        throw new Error('unknown message')
    }

    gossip(value: number, steps: number) {
        const remainingNodes = subtract(this.nodes, this.gossips.get(value).received)
        const numToGossip = Math.max(Math.ceil(Math.log2(this.nodes.size)), 1)
        const nodesToGossip = pickRandom(remainingNodes, numToGossip)
        for (const node of nodesToGossip) {
            const body: MSG.GossipBody = {
                value,
                completedNodes: [...this.gossips.get(value).received],
                steps
            }
            this.sendMsg(node, body, 'gossip', (msg: MSG.Message<MSG.GossipOkBody, 'gossip_ok'>) => {
                const otherNodeSeen = new Set(msg.body.completedNodes)
                const oldGossip = this.gossips.get(value)
                this.gossips.set(value, {received: add(oldGossip.received, otherNodeSeen), timer: oldGossip.timer})
            })
        }
    }

    sendMsg<T, U extends string, V, W>(dest: string, data: T, type: U, replyHandler?: ReplyHandler<V, W>) {
        const body: MSG.Body<T, U> = {
            body: {
                msg_id: this.currentMsgId,
                ...data,
                type
            }
        }
        const msg: MSG.Message<T, U> = {
            src: this.self,
            dest,
            ...body
        }
        this.sent.set(this.currentMsgId, {
            id: this.currentMsgId,
            msg,
            handler: replyHandler ? replyHandler.bind(this) : undefined,
            ts: new Date().getTime()
        })
        this.send(msg)
    }

    getReply<
        T extends MSG.GenericMessage, 
        U extends {[k: string]: unknown}, 
        V extends string
    >(msg: T, body: U, desc: V): MSG.Message<U, V> {
        return {
            src: msg.dest,
            dest: msg.src,
            body: {
                ...body,
                msg_id: this.currentMsgId,
                type: desc,
                in_reply_to: msg.body.msg_id
            }
        }
    }

    send(msg: MSG.GenericMessage) {
        this.currentMsgId += 1
        const reply = JSON.stringify(msg)
        this.out(reply)
    }

    retryMessages(delayMS: number) {
        const now = new Date().getTime()
        for (const [val, msg] of this.sent.entries()) {
            if (now - msg.ts > delayMS) {
                this.send(msg.msg)
                this.sent.set(val, {...msg, ts: now})
            }
        }
    }

    log(...args: any[]) {
        const str = format(this.self, ...args, '\n')
        console.error(this.self, ...args)
        fs.appendFileSync(LOG, str)
    }
}

function subtract<T>(a: Set<T>, b: Set<T>): Set<T> {
    const diff = new Set(a)
    for (const ele of b) {
        diff.delete(ele)
    }
    return diff
}

function add<T>(a: Set<T>, b: Set<T>): Set<T> {
    const sum = new Set(a)
    for (const ele of b) {
        sum.add(ele)
    }
    return sum
}

function pickRandom<T>(a: Set<T>, n: number): T[] {
    const shuffled = [...a]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled.slice(0, n)
}