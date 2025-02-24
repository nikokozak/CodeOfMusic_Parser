// Lisp-like syntax parser
// Converts string input into nested arrays representing the AST

// Custom error for parser issues
class ParserError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ParserError';
    }
}

// Remove comments and normalize whitespace
const preprocess = input => 
    input.replace(/;[^\n]*/g, '')  // Remove comments
         .trim()
         .replace(/\s+/g, ' ');    // Normalize whitespace

// Tokenizer - breaks input string into individual tokens
const tokenize = input => {
    const tokens = [];
    let i = 0;
    const chars = preprocess(input);
    
    while (i < chars.length) {
        const char = chars[i];
        
        // Skip spaces
        if (char === ' ') { i++; continue; }
        
        // Handle quotes, parens, and brackets
        if ("'()[]".includes(char)) {
            tokens.push(char);
            i++;
            continue;
        }
        
        // Handle strings
        if (char === '"') {
            let str = '';
            i++; // Skip opening quote
            while (i < chars.length && chars[i] !== '"') {
                str += chars[i++];
            }
            if (i >= chars.length) throw 'Unterminated string';
            tokens.push(`"${str}"`);
            i++; // Skip closing quote
            continue;
        }
        
        // Handle atoms (symbols and numbers)
        let atom = '';
        while (i < chars.length && !' \'()[]"'.includes(chars[i])) {
            atom += chars[i++];
        }
        tokens.push(isNaN(atom) ? atom : Number(atom));
    }
    
    return tokens;
};

// Parser - converts tokens into nested arrays
const parse = tokens => {
    const parseExpr = () => {
        if (tokens.length === 0) throw 'Unexpected EOF';
        
        const token = tokens.shift();
        
        // Handle quotes
        if (token === "'") {
            const quoted = parseExpr();
            return ['quote', quoted];
        }
        
        // Handle lists
        if (token === '(' || token === '[') {
            const list = [];
            while (tokens.length > 0 && tokens[0] !== ')' && tokens[0] !== ']') {
                list.push(parseExpr());
            }
            if (tokens.length === 0) throw 'Missing closing bracket';
            tokens.shift(); // Remove closing bracket
            return list;
        }
        
        // Handle atoms
        if (token === ')' || token === ']') throw 'Unexpected closing bracket';
        return token;
    };
    
    const result = [];
    while (tokens.length > 0) {
        result.push(parseExpr());
    }
    return result;
};

// Main parse function
const parseProgram = input => {
    try {
        const ast = parse(tokenize(input));
        console.log('Generated AST:', JSON.stringify(ast, null, 2));
        return ast;
    } catch (e) {
        console.error('Parse error:', e);
        return null;
    }
};

// Export the parser interface
window.parseProgram = parseProgram; 