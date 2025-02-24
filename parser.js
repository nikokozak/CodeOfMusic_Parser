// Lisp-like syntax parser
// Converts string input into nested arrays representing the AST

// Custom error for parser issues
class ParserError extends Error {
    constructor(message, line, column, context) {
        const contextInfo = context ? `\nContext: ${context}` : '';
        const formattedMessage = `${message} at line ${line}, column ${column}${contextInfo}`;
        super(formattedMessage);
        this.name = 'ParserError';
        this.line = line;
        this.column = column;
        this.context = context;
    }
}

/**
 * Calculate line and column number from position in a string
 * @param {string} input - The input string
 * @param {number} position - The current position in the string
 * @returns {Object} Object with line and column properties
 */
const getLineAndColumn = (input, position) => {
    const lines = input.slice(0, position).split('\n');
    return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1
    };
};

/**
 * Remove comments and normalize whitespace
 * @param {string} input - The raw input string
 * @returns {string} Preprocessed string with comments removed and whitespace normalized
 */
const preprocess = input => 
    input.replace(/;[^\n]*/g, '')  // Remove comments
         .trim()
         .replace(/\s+/g, ' ');    // Normalize whitespace

/**
 * Tokenize the input string into individual tokens
 * @param {string} input - The preprocessed input string
 * @returns {Array} Array of tokens and their position information
 */
const tokenize = input => {
    const tokens = [];
    let i = 0;
    const chars = preprocess(input);
    const originalInput = input; // Keep original for error reporting
    
    while (i < chars.length) {
        const char = chars[i];
        const position = i;
        
        // Skip spaces
        if (char === ' ') { i++; continue; }
        
        // Handle quotes, parens, and brackets
        if ("'()[]".includes(char)) {
            tokens.push({
                value: char,
                position,
                ...getLineAndColumn(originalInput, position)
            });
            i++;
            continue;
        }
        
        // Handle strings
        if (char === '"') {
            let str = '';
            const startPos = i;
            i++; // Skip opening quote
            
            while (i < chars.length && chars[i] !== '"') {
                // Handle escaped characters
                if (chars[i] === '\\' && i + 1 < chars.length) {
                    i++; // Skip the backslash
                    // Handle common escape sequences
                    if (chars[i] === 'n') str += '\n';
                    else if (chars[i] === 't') str += '\t';
                    else str += chars[i]; // Other escaped chars (like " or \)
                    i++;
                } else {
                    str += chars[i++];
                }
            }
            
            if (i >= chars.length) {
                const { line, column } = getLineAndColumn(originalInput, startPos);
                throw new ParserError('Unterminated string', line, column, 
                    `"${str.slice(0, 10)}${str.length > 10 ? '...' : ''}"`);
            }
            
            // Store the string value without quotes, but mark it as a string type
            tokens.push({
                value: str, // Store without quotes
                type: 'string', // Mark as string type
                position: startPos,
                ...getLineAndColumn(originalInput, startPos)
            });
            i++; // Skip closing quote
            continue;
        }
        
        // Handle atoms (symbols and numbers)
        let atom = '';
        const atomStartPos = i;
        
        while (i < chars.length && !' \'()[]"'.includes(chars[i])) {
            atom += chars[i++];
        }
        
        tokens.push({
            value: isNaN(atom) ? atom : Number(atom),
            type: isNaN(atom) ? 'symbol' : 'number',
            position: atomStartPos,
            ...getLineAndColumn(originalInput, atomStartPos)
        });
    }
    
    return tokens;
};

/**
 * Parse tokens into a nested AST
 * @param {Array} tokens - Array of tokens from the tokenizer
 * @param {string} originalInput - Original input for error reporting
 * @returns {Array} The parsed AST
 */
const parse = (tokens, originalInput) => {
    let position = 0;
    
    const parseExpr = () => {
        if (position >= tokens.length) {
            const lastToken = tokens[tokens.length - 1];
            throw new ParserError('Unexpected end of input', 
                lastToken ? lastToken.line : 1, 
                lastToken ? lastToken.column : 0);
        }
        
        const token = tokens[position++];
        
        // Handle quotes
        if (token.value === "'") {
            const quoted = parseExpr();
            return ['quote', quoted];
        }
        
        // Handle lists
        if (token.value === '(' || token.value === '[') {
            const openBracket = token.value;
            const closeBracket = openBracket === '(' ? ')' : ']';
            const list = [];
            
            while (position < tokens.length && 
                   tokens[position].value !== ')' && 
                   tokens[position].value !== ']') {
                list.push(parseExpr());
            }
            
            if (position >= tokens.length) {
                throw new ParserError(`Missing closing ${closeBracket}`, 
                    token.line, token.column,
                    `Opening ${openBracket} at line ${token.line}, column ${token.column}`);
            }
            
            const closeToken = tokens[position];
            if (closeToken.value !== closeBracket) {
                throw new ParserError(
                    `Mismatched brackets: expected '${closeBracket}' but got '${closeToken.value}'`,
                    closeToken.line, closeToken.column,
                    `Opening ${openBracket} at line ${token.line}, column ${token.column}`
                );
            }
            
            position++; // Remove closing bracket
            return list;
        }
        
        // Handle closing brackets outside of lists
        if (token.value === ')' || token.value === ']') {
            throw new ParserError(`Unexpected ${token.value}`, 
                token.line, token.column);
        }
        
        // For string literals, wrap them to distinguish from symbols
        if (token.type === 'string') {
            return { type: 'string', value: token.value };
        }
        
        // For numbers and symbols, return the value directly
        if (token.type === 'number') {
            return token.value;
        }
        
        // For symbols, return the value directly
        return token.value;
    };
    
    const result = [];
    try {
        while (position < tokens.length) {
            result.push(parseExpr());
        }
        return result;
    } catch (e) {
        if (e instanceof ParserError) {
            throw e; // Re-throw custom parser errors
        } else {
            // Convert generic errors to ParserError with position info
            const token = position < tokens.length ? tokens[position] : 
                (tokens.length > 0 ? tokens[tokens.length - 1] : { line: 1, column: 1 });
            throw new ParserError(`Parse error: ${e.message}`, token.line, token.column);
        }
    }
};

/**
 * Main parse function
 * @param {string} input - The input code to parse
 * @returns {Array|null} The parsed AST or null if there was an error
 */
const parseProgram = input => {
    try {
        const tokens = tokenize(input);
        const ast = parse(tokens, input);
        console.log('Generated AST:', JSON.stringify(ast, null, 2));
        return ast;
    } catch (e) {
        if (e instanceof ParserError) {
            console.error(`Parse error: ${e.message}`);
        } else {
            console.error('Unexpected error during parsing:', e);
        }
        return null;
    }
};

// Export the parser interface
window.parseProgram = parseProgram; 