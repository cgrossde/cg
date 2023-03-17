# ChatGPT CLI client

- Easily invoke ChatGPT from the CLI
- Keeps a session, so you can have a "conversation"
- Let it suggest shell commands(`-s`) as well as explain(`-e`) or run(`-x`) them
- You can pipe data to it  e.g. `cat some.json | cg -s Write a jq command to extract all objects with tag "foo" for the following example JSON:`
- Give it a bias or let it assume one of the shipped personas (`-b`)

```
CLI interface for ChatGPT to chat or help constructing shell commands.
Will keep a history of conversation unless -r or -s is used.

Usage: cg [options] <query>

Options:
      --version  Show version number                                   [boolean]
  -r, --reset    Start a fresh session                                 [boolean]
  -b, --bias     Bias the Assistant to act in a certain way            [boolean]
  -s, --shell    Return a shell command                                [boolean]
  -e, --explain  If used with -s will explain the last command         [boolean]
  -x, --execute  If used with -s will execute the last command         [boolean]
  -h, --help     Show help                                             [boolean]

Examples:
  cg How many seconds in a day
  cg -s Generate a 2048 bit rsa key
```

## Demo

![](demo.gif)

## Setup

```
npm install -g
```

Create a config file with your API key in `~/.config/openai-config.json`
```json
{
  "APIKey": "<your-api-key>"
}
```

### Different Personas

You can try out different personas by providing a bias with `-b` or trying the ones in `/personas`
```
cg -b Always answer in German
cg How many hours in a day
  🤖 In einem Tag gibt es 24 Stunden.
```
```
cg -b $(cat personas/Glados.txt)
cg Hello
 🤖 Oh, hello there. Another human to entertain me. How exciting. Do try to keep up with me, won't you?
I wouldn't want to have to dumb myself down for your benefit.
```