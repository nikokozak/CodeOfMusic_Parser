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
const preprocess = (input) => {
    // Remove comments (everything after ; until newline)
    const noComments = input.replace(/;[^\n]*/g, '');
    // Normalize whitespace (convert all whitespace to single space)
    return noComments.trim().replace(/\s+/g, ' ');
};

// Tokenizer - breaks input string into individual tokens
const tokenize = (input) => {
    const processed = preprocess(input);
    const tokens = [];
    let i = 0;
    
    while (i < processed.length) {
        let char = processed[i];
        
        // Handle parentheses
        if (char === '(' || char === ')') {
            tokens.push(char);
            i++;
            continue;
        }
        
        // Handle strings
        if (char === '"' || char === "'") {
            const quote = char;
            let str = quote;
            i++;
            
            while (i < processed.length && processed[i] !== quote) {
                str += processed[i];
                i++;
            }
            
            if (i >= processed.length) {
                throw new ParserError('Unterminated string literal');
            }
            
            str += quote;
            tokens.push(str);
            i++;
            continue;
        }
        
        // Handle symbols and numbers
        if (char !== ' ') {
            let token = '';
            while (i < processed.length && !'() '.includes(processed[i])) {
                token += processed[i];
                i++;
            }
            
            // Convert numbers if possible
            const num = Number(token);
            tokens.push(isNaN(num) ? token : num);
            continue;
        }
        
        i++;
    }
    
    return tokens;
};

// Parser - converts tokens into nested arrays
const parse = (tokens) => {
    const result = [];
    let i = 0;
    
    const parseExpr = () => {
        const expr = [];
        
        while (i < tokens.length) {
            const token = tokens[i];
            
            if (token === '(') {
                i++;
                expr.push(parseExpr());
            } else if (token === ')') {
                i++;
                return expr;
            } else {
                i++;
                expr.push(token);
            }
        }
        
        throw new ParserError('Missing closing parenthesis');
    };
    
    while (i < tokens.length) {
        const token = tokens[i];
        
        if (token === '(') {
            i++;
            result.push(parseExpr());
        } else if (token === ')') {
            throw new ParserError('Unexpected closing parenthesis');
        } else {
            i++;
            result.push(token);
        }
    }
    
    return result;
};

// Main parse function that combines tokenize and parse steps
const parseProgram = (input) => {
    try {
        const tokens = tokenize(input);
        return parse(tokens);
    } catch (e) {
        if (e instanceof ParserError) {
            console.error('Parser Error:', e.message);
            return null;
        }
        throw e;  // Re-throw unexpected errors
    }
}; 