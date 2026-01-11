import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  Hover,
  HoverParams
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

interface BAMCCommand {
  label: string;
  syntax: string;
  description: string;
}

const BAMC_DATA: Record<string, BAMCCommand> = {
  "add-header": {
    label: "add-header",
    syntax: 'add-header "Name" "Value"',
    description: "Adds an HTTP Header for the current request."
  },
  "add-headers": {
    label: "add-headers",
    syntax: 'add-headers {"key": "value"}',
    description: "Adds multiple HTTP Headers via a JSON Object."
  },
  "browser": {
    label: "browser",
    syntax: 'browser "chrome"',
    description: "Specifies the browser type. MUST be the first valid line. Defaults to Firefox if not supplied."
  },
  "click": {
    label: "click",
    syntax: 'click "selector"',
    description: "Clicks the specified button element. Supports ID, NAME, TAG NAME, and XPATH selectors."
  },
  "click-at-position": {
    label: "click-at-position",
    syntax: 'click-at-position "x" "y"',
    description: "Clicks at a specific X/Y coordinate point on the screen."
  },
  "click-exp": {
    label: "click-exp",
    syntax: "click-exp 'css.selector'",
    description: "Alternative to click; uses CSS SELECTOR."
  },
  "close-current-tab": {
    label: "close-current-tab",
    syntax: "close-current-tab",
    description: "Closes the current tab. Closes browser if only one tab is open."
  },
  "end-javascript": {
    label: "end-javascript",
    syntax: "end-javascript",
    description: "Marks the end of a JavaScript code block."
  },
  "fill-text": {
    label: "fill-text",
    syntax: 'fill-text "selector" "value"',
    description: "Assigns the specified value to the selected element."
  },
  "fill-text-exp": {
    label: "fill-text-exp",
    syntax: 'fill-text-exp "selector" "value"',
    description: "More advanced version of fill-text."
  },
  "get-text": {
    label: "get-text",
    syntax: 'get-text "selector"',
    description: "Gets the text for a specified element."
  },
  "open-new-tab": {
    label: "open-new-tab",
    syntax: 'open-new-tab "url" "seconds"',
    description: "Opens a new tab, waits for specified seconds, then visits the URL."
  },
  "save-as-html": {
    label: "save-as-html",
    syntax: 'save-as-html "filename.html"',
    description: "Saves the current page's HTML to a file."
  },
  "save-as-html-exp": {
    label: "save-as-html-exp",
    syntax: 'save-as-html-exp "filename.html"',
    description: "Saves HTML using alternative logic if standard save fails."
  },
  "select-option": {
    label: "select-option",
    syntax: 'select-option "selector" index',
    description: "Selects an <option> from a <select> menu by index."
  },
  "select-element": {
    label: "select-element",
    syntax: 'select-element "selector"',
    description: "Selects an element (mostly for manual Python script editing)."
  },
  "set-custom-useragent": {
    label: "set-custom-useragent",
    syntax: 'set-custom-useragent "string"',
    description: "Sets a custom user agent at the current point in the script."
  },
  "start-javascript": {
    label: "start-javascript",
    syntax: "start-javascript",
    description: "Instructs parser to read following lines as JS code until end-javascript."
  },
  "take-screenshot": {
    label: "take-screenshot",
    syntax: 'take-screenshot "filename.png"',
    description: "Takes a screenshot. Recommended to use wait-for-seconds before this."
  },
  "visit": {
    label: "visit",
    syntax: 'visit "url"',
    description: "Visits a specified URL."
  },
  "wait-for-seconds": {
    label: "wait-for-seconds",
    syntax: "wait-for-seconds 1",
    description: "Waits for the specified number of seconds (supports decimals)."
  },
  "feature": {
    label: "feature",
    syntax: 'feature "feature-name"',
    description: "Enables specific BAMC features like disable-ssl or proxies."
  }
};

const BAMC_FEATURES = [
  "disable-pycache",
  "disable-ssl",
  "use-http-proxy",
  "use-https-proxy",
  "use-socks4-proxy",
  "use-socks5-proxy"
];

connection.onInitialize((params: InitializeParams) => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['"'] // Trigger completion when typing quotes (for features)
      },
      hoverProvider: true 
    }
  };
});

// ------------------------------------------------------------------
// 1. VALIDATION
// ------------------------------------------------------------------
documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const text = textDocument.getText();
  // Match the first word of every line
  const pattern = /^(\s*)([a-zA-Z0-9-]+)/gm;
  let m: RegExpExecArray | null;

  const diagnostics: Diagnostic[] = [];
  
  while ((m = pattern.exec(text))) {
    const word = m[2]; // The command word
    
    // Ignore empty lines or comments
    if (!word || text.substr(m.index, 2) === '//') continue;

    if (!BAMC_DATA[word]) {
      const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: {
          start: textDocument.positionAt(m.index + m[1].length),
          end: textDocument.positionAt(m.index + m[1].length + word.length)
        },
        message: `Unknown BAMC command: '${word}'`,
        source: 'bamc-lsp'
      };
      diagnostics.push(diagnostic);
    }
  }

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

// ------------------------------------------------------------------
// 2. AUTOCOMPLETE
// ------------------------------------------------------------------
connection.onCompletion(
  (textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    connection.console.log("User requested autocomplete!");
    const doc = documents.get(textDocumentPosition.textDocument.uri);
    if (!doc) return [];
    
    // Simple context check: if inside quotes after "feature", suggest features
    const line = doc.getText({
      start: { line: textDocumentPosition.position.line, character: 0 },
      end: textDocumentPosition.position
    });

    if (line.includes('feature') && line.includes('"')) {
       return BAMC_FEATURES.map(feat => ({
         label: feat,
         kind: CompletionItemKind.Value,
         detail: "Feature Flag"
       }));
    }

    // Otherwise, return all Commands
    return Object.keys(BAMC_DATA).map(key => ({
      label: key,
      kind: CompletionItemKind.Function,
      data: key
    }));
  }
);

connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    const data = BAMC_DATA[item.label];
    if (data) {
      item.detail = data.syntax;
      item.documentation = data.description;
    }
    return item;
  }
);

// ------------------------------------------------------------------
// 3. HOVER SUPPORT
// ------------------------------------------------------------------
connection.onHover(
  (params: HoverParams): Hover | null => {
    // Logic to find word under cursor would go here.
    // For simplicity, we assume the LSP client handles word range detection mostly.
    // A robust implementation requires analyzing the document at params.position.
    return null; 
  }
);

documents.listen(connection);
connection.listen();