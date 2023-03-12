import path from "path";
import os from "os";
import fs from "fs";
import ora from "ora";
import {marked} from "marked";
import TerminalRenderer from "marked-terminal";

// Prettify output to terminal
marked.setOptions({
    renderer: new TerminalRenderer({
        reflowText: true,
    })
});

class ChatSession {
    system = '' // Steer behaviour of ChatGPT across sessions
    type = 'chat'
    messages = []
    temperature = 0.5
    totalTokens = 0
    stopToken = '##END##'
    status = 'NEW'
    transient = false;

    constructor(system, temperature, type = 'chat') {
        this.system = system
        this.temperature = temperature
        this.type = type;
        this.init()
    }

    async chat(openai, prompt) {
        if (this.status == 'DONE')
            return 'Session finished'
        if (prompt === "restart") {
            return this.reset();
        }
        if (prompt === "costs") {
            return this.costs();
        }

        this.messages.push({role: 'user', content: prompt})
        let response = await this._invokeAssistant(openai);
        this.messages.push({role: 'assistant', content: response})
        this.storeSession()

        return response;
    }

    async chatAndPrintToTerminal(openai, prompt, icon = '🤖') {
        const spinner = ora('Mastermind is processing').start();
        this.chat(openai, prompt)
            .then(res => {
                spinner.stop()
                const output = marked(res).trim()
                console.log(` ${icon} ${output}`)
            })
    }

    costs() {
        return `${this.totalTokens / 1000 * 0.002} $  (${this.totalTokens} tokens)`
    }

    init() {
        this.status = 'NEW'
        this.totalTokens = 0
        this.messages = [{role: 'system', content: this.system || ""}]
    }

    reset() {
        this.init()
        this.storeSession()
        return 'Fresh session started'
    }

    async _invokeAssistant(openai) {
        const result = await openai.createChatCompletion({
            messages: this.messages,
            temperature: this.temperature,
            stop: this.stopToken,
            model: 'gpt-3.5-turbo'
        })
        if (result.status !== 200)
            console.log(`ERROR(status=${response.status}): ${result.data}`)
        this.totalTokens += result.data.usage.total_tokens
        const answer = result.data.choices[0].message

        if (answer.content.indexOf(this.stopToken) !== -1)
            console.log("Session finished")
        return answer.content
    }

    storeSession() {
        if (this.transient)
            return  // Don't store if it's a single-prompt "sessions"
        const sessionPath = ChatSession._getSessionPath(this.type)
        try {
            const backup = JSON.stringify(this);
            fs.writeFileSync(sessionPath, backup)
        } catch(e) {
            console.log('ERROR: Failed to store ChatSession:', e)
        }
    }
};

ChatSession._getSessionPath = (type = 'chat') => {
    const sessionId = process.env.TERM_SESSION_ID || 'shared'
    return path.join(os.tmpdir(), `${sessionId}-${type}.json`)
}
ChatSession.restoreOrNew = function (
    system = 'NEVER SAY YOU ARE AN AI LANGUAGE MODEL.',
    temperature = 0.8,
    type = 'chat') {
    const sessionPath = ChatSession._getSessionPath(type);
    try {
        fs.statSync(sessionPath)
        const sessionJSON = fs.readFileSync(sessionPath, {encoding: 'utf8'})
        return Object.assign(new ChatSession(), JSON.parse(sessionJSON))
    } catch (e) {
        return new ChatSession(system, 0.8, type)
    }
}

export default ChatSession
