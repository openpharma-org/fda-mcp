“Building MCP Servers: Part 3 — Adding Prompts
Christopher Strolia-Davis
Christopher Strolia-Davis

Follow
7 min read
·
Jan 12, 2025
273


3



Press enter or click to view image in full size
An AI robot waiter showing a menu of MCP prompts to a customer
This story was written with the help of multiple AI assistants.

Building MCP Servers: Part 3 — Adding Prompts
This is part 3 of our 4-part tutorial on building MCP servers. In Part 1, we created our first MCP server with a basic resource, and in Part 2, we added resource templates and improved our code organization. Now we’ll refactor our code further and add prompt capabilities.

What are MCP Prompts?
Prompts in MCP are structured templates that servers provide to standardize interactions with language models. Unlike resources which provide data, or tools which execute actions, prompts define reusable message sequences and workflows that help guide LLM behavior in consistent, predictable ways. They can accept arguments to customize the interaction while maintaining a standardized structure. If you’ve ever researched prompt engineering, you likely have a pretty decent idea of what a prompt is. Creating these within an MCP server allows us to create a space for the prompts we find the most useful to be easily reused and even shared. If you imagine going to a restaurant, a prompt is like a menu item that you can pick from and provide to the waiter. Sometimes, you can customize the menu items by asking to add or remove certain items or to cook the result a particular way. Prompts provided this way serve a similar function.

Why Use Prompts?
Prompts help create consistent, reusable patterns for LLM interactions. Here are some practical examples:

Code Review Prompts
"name" -> code-review
Please review the following {{language}} code focusing on {{focusAreas}} for the following block of code:
```{{language}}
{{codeBlock}}
```
User: Please review the following Python code focusing on security and performance:
```Python
… code
```

Data Analysis Prompts
"name" -> analyze-sales-data
Analyze {{timeframe}} sales data focusing on {{metrics}}User: Analyze Q1 sales data focusing on revenue and growth
Content Generation Prompts
"name" -> generate-email
Generate a {{tone}} {{type}} email for {{context}}
User: Generate a formal support email for a refund request to Bob’s Barbecue LLC.

Code Organization
In part 2, we abstracted our handler code from index.ts and put it into a handlers.ts file. This file could start getting too large. We should organize our handler code into focused modules:

// src/resources.ts
export const resources = [
  {
    uri: "hello://world",
    name: "Hello World Message",
    description: "A simple greeting message",
    mimeType: "text/plain",
  },
];

export const resourceHandlers = {
  "hello://world": () => ({
    contents: [
      {
        uri: "hello://world",
        text: "Hello, World! This is my first MCP resource.",
      },
    ],
  }),
};
// src/resource-templates.ts
export const resourceTemplates = [
  {
    uriTemplate: "greetings://{name}",
    name: "Personal Greeting",
    description: "A personalized greeting message",
    mimeType: "text/plain",
  },
];

const greetingExp = /^greetings:\/\/(.+)$/;
const greetingMatchHandler =
  (uri: string, matchText: RegExpMatchArray) => () => {
    const name = decodeURIComponent(matchText[1]);
    return {
      contents: [
        {
          uri,
          text: `Hello, ${name}! Welcome to MCP.`,
        },
      ],
    };
  };
export const getResourceTemplate = (uri: string) => {
  const greetingMatch = uri.match(greetingExp);
  if (greetingMatch) return greetingMatchHandler(uri, greetingMatch);
};
Update our handlers:

// src/handlers.ts
import {
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { type Server } from "@modelcontextprotocol/sdk/server/index.js";
import { resourceHandlers, resources } from "./resources.js";
import {
  getResourceTemplate,
  resourceTemplates,
} from "./resource-templates.js";

export const setupHandlers = (server: Server): void => {
  // List available resources when clients request them
  server.setRequestHandler(
    ListResourcesRequestSchema,
    () => ({ resources }),
  );
  // Resource Templates
  server.setRequestHandler(ListResourceTemplatesRequestSchema, () => ({
    resourceTemplates,
  }));
  // Return resource content when clients request it
  server.setRequestHandler(ReadResourceRequestSchema, (request) => {
    const { uri } = request.params ?? {};
    const resourceHandler =
      resourceHandlers[uri as keyof typeof resourceHandlers];
    if (resourceHandler) return resourceHandler();
    const resourceTemplateHandler = getResourceTemplate(uri);
    if (resourceTemplateHandler) return resourceTemplateHandler();
    throw new Error("Resource not found");
  });
};
Adding Prompts
Now add our new prompt functionality:

// src/prompts.ts
export const prompts = {
  "create-greeting": {
    name: "create-greeting",
    description: "Generate a customized greeting message",
    arguments: [
        { 
            name: "name",
            description: "Name of the person to greet",
            required: true,
        },
        {
            name: "style",
            description: "The style of greeting, such a formal, excited, or casual. If not specified casual will be used"
        }
    ],
  },
};

export const promptHandlers = {
  "create-greeting": ({ name, style = "casual" }: { name: string, style?: string }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please generate a greeting in ${style} style to ${name}.`,
          },
        },
      ],
    };
  },
};
Add our new prompt handlers to the handlers file:

// src/handlers.ts
import {
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  // ... other imports
} from "@modelcontextprotocol/sdk/types.js";
// ... other imports
import { promptHandlers, prompts } from "./prompts.js";

export const setupHandlers = (server: Server): void => {
 
  // ... Other resource handlers here

  // Prompts
  server.setRequestHandler(ListPromptsRequestSchema, () => ({
    prompts: Object.values(prompts),
  }));
  server.setRequestHandler(GetPromptRequestSchema, (request) => {
    const { name, arguments: args } = request.params;
    const promptHandler = promptHandlers[name as keyof typeof promptHandlers];
    if (promptHandler) return promptHandler(args as { name: string, style?: string });
    throw new Error("Prompt not found");
  });
};
Finally, we need to update the server initialization:

// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupHandlers } from "./handlers.js";

const server = new Server(
  {
    name: "hello-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      prompts: {}, // <-- Add prompts
      resources: {},
    },
  },
);

setupHandlers(server);

// ... remaining code
Understanding the Code
Module Organization
Resources and templates have been placed in their own modules
Prompts are cleanly separated
Handlers are now acting as a routing layer
Prompt Structure
Each prompt has a name, description, and arguments if needed
Arguments describe the expected inputs for a prompt
Handlers generate structured message(s) for prompting the target AI
Message Sequences
Prompts return arrays of messages
Messages have roles (‘user’ or ‘assistant’)
Content can include both the initial request and subsequent responses for multi-step workflows (note that multi-step workflows have limited support at this time)
Testing with the Inspector
Launch the Inspector:

Get Christopher Strolia-Davis’s stories in your inbox
Join Medium for free to get updates from this writer.

Enter your email
Subscribe
npx @modelcontextprotocol/inspector node build/index.js
Test prompts:

Click “Prompts” tab
Find “create-greeting”
Try different argument combinations:
name: "Alice", style: "excited"
{
  "messages": [
    {
      "role": "user",
      "content": {
        "type": "text",
        "text": "Please generate a greeting in excited style to Alice."
      }
    }
  ]
}
Testing with Claude Desktop
Try these examples:

Basic prompt:
1: Open Claude Desktop
Assumptions:

You have already built your server (npx tsc) and set up Claude Desktop to use it.
2: Similar to how we added resources, click on the “Attach from MCP”

Image of the Claude Desktop chat interface, with an arrow pointing at the plug and socket icon on the lower right of the chat input box
3: In the modal pop-up, click “Choose and integration” and then select the “create-greeting” prompt from the list under “hello-mcp”

Image of the “Share context with Claude” modal window, with the “Choose Integration” selection box open, and a hand icon pointer pointing to the “create-greeting” menu item under “hello-mcp”
4: For now, test with just a name. Type something like “John” into the name field and click “Submit”

Imange of a “Fill Prompt Arguments” modal with “name” and “style” inputs. The word “John” is filled in, within the “name” input and there is a hand icon pointer, hovering over the “Submit” button
5: You will notice a “create-greeting” attachment. Click on it to see what’s in it.

An image of the Claude chat input, with an arrow pointing at an attachment under the lower left of the input that says “create-greeting”
6: You will see that there is a prompt here for Claude that reads “Please generate a casual greeting to John.”

Image of a part of a modal pop-up that shows the text “Please generate a casual greeting to John”
7: Without entering any other prompt of your own, simply click to submit arrow on the top right of the chat box

Image of a portion of the right side of the chat input box wth an arrow pointing to an icon button on the top right that has an “up arrow” icon.
8: You will see a response similar to “Hi John! How are you doing today?”

Image of the text response from Claude for the prompt. It reads “Hi John! How are you doing today?”
Styled prompt:
1: Now, try a greeting with a different, specific style. Open the “Attach from MCP” dialog and select the “create-greeting” prompt again. This time, we can add a name of “Alice” and a style of “formal” then submit the chat, once again with the arrow or perhaps simply hitting the enter key will work, I haven’t tried.

Image of the “Fill Prompt Arguments” modal (same as for step 4), with “name” and “style” inputs. The word “Alice” is in the “name” input and “formal” is entered into the “style” input.
2: This time, you may see a message returned that looks like this:

Dear Alice,

I hope this message finds you well. I am writing to extend my warmest greetings.

Best regards,
Claude

An image of a chat response from Claude. It has the words: “Dear Alice, I hope this message finds you well. I am writing to extend my warmest greetings. Best regards, Claude”
What’s Next?
In Part 4, we’ll:

Learn about MCP tools and how they differ from prompts
Add tool capabilities to our server
See how tools can provide dynamic functionality
Complete our greeting server with all primary MCP capabilities
Sources and additional reading:
https://modelcontextprotocol.io/docs/concepts/prompts
https://github.com/amidabuddha/unichat-mcp-server
https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview
https://dev.to/get_pieces/10-prompt-engineering-best-practices-23dk
https://promptingguide.ai
AI
Model Context Protocol
Typescript
Nodejs
Anthropic Claude
273


3


Christopher Strolia-Davis
Written by Christopher Strolia-Davis
373 followers
·
64 following
Adventurer, Problem Solver, Thinker. I know lots of things about lots of things and I've mastered a few. I have a unique perspective on a lot of issues.


Follow
Responses (3)

Write a response

What are your thoughts?

Cancel
Respond
Mr Nameko
Mr Nameko

Apr 14


The only bit that needs updating is the fact that the text field label is the same value as the name value, which is actually a variable, and therefore should be in camel case.
This doesn't look great when applied to a text field label.
Perhaps there…more
2

Reply

K Symbol
K Symbol

Jul 9


So unlike tools, prompts and resources need to be attacted manually? Can LLM ask for prompts and resources by themselves when need?
Reply

Allen Kim
Allen Kim

Apr 16


single-file source code.
https://gist.github.com/allenhwkim/2dd8a629564c983cdf066098836c1cb6#file-part3-index-ts
Reply

