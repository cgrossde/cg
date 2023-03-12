#! /usr/bin/env node
import yargs from "yargs/yargs"
import ChatSession from "./ChatSession.js"
import {Configuration, OpenAIApi} from "openai"

const configuration = new Configuration({
    apiKey: 'XXXX',
});
const openai = new OpenAIApi(configuration);
const argv = yargs(yargs.hideBin(process.argv))
    .boolean(['r', 's', 'e']) // Declare bools
    .alias('r', 'reset')
    .alias('s', 'shell')
    .alias('e', 'explain')
    .argv
const session = ChatSession.restoreOrNew()
const prompt = argv._.join(" ");

// ShellMode
if (argv.shell == true) {
    const shellSystem = 'Output BASH commands.'
    const freshSession = new ChatSession(shellSystem, 0.2, 'shell')
    if (argv.explain !== true)
        freshSession.chatAndPrintToTerminal(openai, "DON\'T PROVIDE ANY EXPLANATIONS. " + prompt, '🖥️')
    else {
        const restored = ChatSession.restoreOrNew(shellSystem, 0.2, 'shell');
        if (prompt !== "" || restored.messages.length === 1) {
            freshSession.chatAndPrintToTerminal(openai, prompt + ". Explain the command.", '🖥️')
        } else {
            // Explain last command
            restored.transient = true // Don't add this to the history
            restored.chatAndPrintToTerminal(openai, "Explain the command", '🖥️')
        }
    }
}

// Default: Chat mode, keep a session across multiple invocations
else {
    // Reset session
    if (argv.reset == true)
        console.log(session.reset())
    await session.chatAndPrintToTerminal(openai, prompt)
}


