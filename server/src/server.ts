import {
  createConnection,
  TextDocuments,
  // Diagnostic,
  // DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  // InitializeResult,
  InsertTextFormat,
  TextEdit,
  Range,
  InsertTextMode
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

var platform = process.platform
var NLC = platform == "win32" ? "\r\n" : "\n"

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Main Args for BAMM
const MAIN_ARGS: CompletionItem[] = 
[
  {
    label: 'browser',
    kind: CompletionItemKind.Keyword,
    detail: 'browser "type"',
    documentation: 'Specifies the browser type (chrome/firefox), this must be the first line, or it will default to firefox.',
    insertText: 'browser' // Auto-adds space
  },

  {
    label: 'feature',
    kind: CompletionItemKind.Keyword,
    detail: 'feature "name" ...',
    documentation: 'Enables specific BAMC features like proxies or SSL settings.',
    insertText: 'feature ' // Auto-adds space
  },
  {
    label: 'visit',
    kind: CompletionItemKind.Function,
    documentation: "Instructs BAMM to make a request to the specified url.",
    insertText: 'visit "${1:url}"',
    insertTextFormat: InsertTextFormat.Snippet,
    detail: 'visit "url"'
  },

  {
    label: 'wait-for-seconds',
    kind: CompletionItemKind.Function,
    insertText: 'wait-for-seconds ${1:1}',
    insertTextFormat: InsertTextFormat.Snippet,
    detail: 'wait-for-seconds number',
    documentation: "Instructs Selenium to pause execution for the specified number of second(s). Supports decimals/floats for second values (ie. 0.5, .5)",
  },

  
  {
    label: 'add-header',
    kind: CompletionItemKind.Function,
    detail: 'add-header "header-name" "header-value"',
    documentation: "Adds a header to the current Selenium session.",
    insertText: 'add-header "header-name" "header-value"',
    insertTextFormat: InsertTextFormat.Snippet,
  },

  {
    label: 'add-headers',
    kind: CompletionItemKind.Function,
    detail: 'add-headers {"header-name1": "header-value1", ... }',
    documentation: "Adds a list of headers to the current Selenium session. Input is in the form of a JSON object.",
    insertText: 'add-headers { "header-name1": "header-value1" }',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  
  {
    label: 'click',
    kind: CompletionItemKind.Function,
    insertText: 'click "${1:selector}"',
    insertTextFormat: InsertTextFormat.Snippet,
    detail: 'click "selector"',
    documentation: "Invokes a standard click event on the selector specified."
  },


  { 
    label: 'click-at-position', 
    kind: CompletionItemKind.Function, 
    insertText: 'click-at-position" "x-coordinate", "y-coordinate',
    insertTextFormat: InsertTextFormat.Snippet,
    detail: 'click-at-position" "x-coordinate", "y-coordinate',
    documentation: "For very specific cases where you have a known X and Y coordinate and need to click at exactly that location, use this."
  },

  { 
    label: 'click-exp',
    kind: CompletionItemKind.Function,
    insertText: 'click-exp \'${1:selector}\'',
    insertTextFormat: InsertTextFormat.Snippet,
    detail: "click-exp 'selector'",
    documentation: "Experimental alternative to click, this utilizes javascript. Use this if click does not fit your needs."
  },


  { 
    label: 'close-current-tab', 
    kind: CompletionItemKind.Function,
    insertText: 'close-current-tab',
    insertTextFormat: InsertTextFormat.Snippet,
    detail: 'close-current-tab',
    documentation: "Instructs selenium to close the current tab. Please note, this will terminate the current Selenium instance if there is only one open tab."
  },

  {
    label: 'fill-text',
    kind: CompletionItemKind.Function,
    insertText: 'fill-text "${1:selector}" "${2:value}"',
    insertTextFormat: InsertTextFormat.Snippet,
    detail: 'fill-text "selector" "value"',
    documentation: "Fills the 'value' attribute of the specified selector."
  },

  {
    label: 'fill-text-exp',
    kind: CompletionItemKind.Function,
    insertText: 'fill-text-exp "${1:selector}" "${2:value}"',
    insertTextFormat: InsertTextFormat.Snippet,
    detail: 'fill-text-exp "selector" "value"',
    documentation: "An experimental version of fill-text that utilizes JavaScript. Try this if fill-text doesn't work for your needs."
  },

  { 
    label: 'open-new-tab', 
    kind: CompletionItemKind.Function,
    insertText: 'open-new-tab', 
    insertTextFormat: InsertTextFormat.Snippet,
    detail: 'open-new-tab',
    documentation: "Instructs the current Selenium instance to open a new tab."
  },
  
  { 
    label: 'save-as-html',
    kind: CompletionItemKind.Function,
    insertText: 'save-as-html "${1:file.html}"',
    insertTextFormat: InsertTextFormat.Snippet,
    detail: 'save-as-html "${1:file.html}"',
    documentation: "Saves the current page's source to the HTML file specified."
  },

  // CURRENTLY THE ONLY SPECIAL BLOCK
  {
    label: 'start-javascript',
    kind: CompletionItemKind.Snippet,
    detail: 'JS Block',
    documentation: 'Inserts a JavaScript code block structure.',
    insertText: 'start-javascript\n\n// Insert your js code here\n\nend-javascript',
    insertTextFormat: InsertTextFormat.Snippet,
  },

  { 
    label: 'take-screenshot', 
    kind: CompletionItemKind.Function, 
    insertText: 'take-screenshot" "${1:file.png}', 
    insertTextFormat: InsertTextFormat.Snippet 
  },

  
  
];

// BROWSER COMMAND
const BROWSER_OPTIONS: CompletionItem[] = [
  { label: '"chrome"', kind: CompletionItemKind.Value, insertText: 'chrome' },
  { label: '"firefox"', kind: CompletionItemKind.Value, insertText: 'firefox' }
];

// FEATURE COMMANDS
const FEATURE_OPTIONS: CompletionItem[] = 
[
  {
    label: '"disable-ssl"',
    kind: CompletionItemKind.Value,
    detail: 'Disable SSL Validation',
    insertText: 'disable-ssl'
  },

  {
    label: '"disable-pycache"',
    kind: CompletionItemKind.Value,
    detail: 'Disable __pycache__',
    insertText: 'disable-pycache'
  },

  // PROXIES (With Placeholders)
  {
    label: '"use-http-proxy"',
    kind: CompletionItemKind.Snippet,
    detail: 'HTTP Proxy with Args',
    documentation: 'Format: "USER:PASS@IP:PORT" or "NULL:NULL@IP:PORT"',
    // This snippet inserts the feature name AND the argument template
    insertText: 'use-http-proxy" "${1:USER:PASS@IP:PORT}',
    insertTextFormat: InsertTextFormat.Snippet
  },

  {
    label: '"use-https-proxy"',
    kind: CompletionItemKind.Snippet,
    detail: 'HTTPS Proxy with Args',
    insertText: 'use-https-proxy" "${1:USER:PASS@IP:PORT}',
    insertTextFormat: InsertTextFormat.Snippet
  },

  {
    label: '"use-socks4-proxy"',
    kind: CompletionItemKind.Snippet,
    detail: 'SOCKS4 Proxy',
    insertText: 'use-socks4-proxy" "${1:USER:PASS@IP:PORT}',
    insertTextFormat: InsertTextFormat.Snippet
  },

  {
    label: '"use-socks5-proxy"',
    kind: CompletionItemKind.Snippet,
    detail: 'SOCKS5 Proxy',
    insertText: 'use-socks5-proxy" "${1:USER:PASS@IP:PORT}',
    insertTextFormat: InsertTextFormat.Snippet
  }
];


connection.onInitialize((params: InitializeParams) => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: [' ', '"', NLC] // Triggers on space and quotes, and newline char
      }
    }
  };
});

documents.onDidChangeContent(change => {
});

// AUTOCOMPLETE LOGIC
connection.onCompletion(
  (textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    
    if (!document) {
      return [];
    }

    const position = textDocumentPosition.position;

    // Retrieves the current line contents from the start up to the cursor's current position.
    const lineText = document.getText({
      start: { line: textDocumentPosition.position.line, character: 0 },
      end: textDocumentPosition.position
    });

    const replacementRange = Range.create(
      { line: position.line, character: 0 },
      position
    )

    if (lineText.match(/^\s*browser\s+$/) || lineText.match(/^\s*browser\s+"/)) {
      return BROWSER_OPTIONS;
    }

    if (lineText.match(/^\s*feature\s+$/) || lineText.match(/^\s*feature\s+"/)) {
      return FEATURE_OPTIONS;
    }

    // If the line is empty or just whitespace/partial word the possible commands are shown.
    if (!lineText.trim().includes(' '))
    {

      // Mapping over the commands ensuring the TextEdit is only attached to 'start-javascript'
      return MAIN_ARGS.map(cmd => 
      {
        if (cmd.label === 'start-javascript') 
        {
            // Cloning the item so the original const isn't modified.
            return {
              ...cmd,
              textEdit: TextEdit.replace(replacementRange, cmd.insertText as string)
            };
        }

        return cmd;
      });
    }


    return [];
  }
);

connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    return item;
  }
);

documents.listen(connection);
connection.listen();