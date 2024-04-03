# OpenAi Chat Bot Boilerplate
This is a chat bot in text command line. Excelent for learning how to use openai in node.js!

## Features
It is standalone, and very easy to modify. 
It is made as a boilerplate to experiment with your own idea for the bot.

- directly on top of openai
- support openai functions
- colored output
- support readline history
- support busy wheel while thinking

<img width="885" alt="app-screenshot" src="https://github.com/jeromeetienne/openai-chatbot-nodejs/assets/252962/d0b235f8-e4aa-40bd-b09a-0bc32947abe1">

## How to install
```
npm install
```

## How to start

Dont forget to set ```OPENAI_API_KEY``` in your environment. You can get it from https://platform.openai.com/api-keys

```bash
export OPENAI_API_KEY="sk-xxxxxx"
```

Then you can start the app with

```bash
npm start
```

## Typical usage
This is a boilerplate for a chat bot. not a library, so you copy the whole folder to your own project folder, and modify the code to fit your needs.

There is 2 versions: one based on [langchain](https://www.npmjs.com/package/langchain), the other directly on top of [openai](https://www.npmjs.com/package/openai)
- [./src//openai_chatbot_langchain.js](./src//openai_chatbot_langchain.js)
- [./src/openai_chatbot_nodejs.js](./src/openai_chatbot_nodejs.js)