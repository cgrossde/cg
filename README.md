# ChatGPT CLI client

```
CLI interface for ChatGPT to chat or help constructing shell commands.
Will keep a history of conversation unless -r or -s is used.

Usage: cg [options] <query>

Options:
      --version  Show version number                                   [boolean]
  -r, --reset    Start a fresh session                                 [boolean]
  -s, --shell    Return a shell command                                [boolean]
  -e, --explain  If used with -s will explain the command              [boolean]
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
