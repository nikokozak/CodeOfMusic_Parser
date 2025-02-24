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
         .trim();

// Parser object with methods for parsing the Lisp-like syntax
const parser = {
    // Tokenize input string into array of tokens
    tokenize(input) {
        try {
            return preprocess(input)
                .replace(/[()]/g, ' $& ')
                .trim()
                .split(/\s+/)
                .filter(token => token.length > 0);
        } catch (e) {
            const { line, column } = getLineAndColumn(input, 0);
            throw new ParserError(`Tokenization error: ${e.message}`, line, column, input.slice(0, 20) + '...');
        }
    },

    // Parse tokens into nested structure
    parse(input) {
        try {
            const tokens = this.tokenize(input);
            const ast = [];
            let current = ast;
            const stack = [current];
            let position = 0;

            tokens.forEach(token => {
                if (token === '(') {
                    const newList = [];
                    current.push(newList);
                    stack.push(current);
                    current = newList;
                } else if (token === ')') {
                    if (stack.length <= 1) {
                        const { line, column } = getLineAndColumn(input, position);
                        throw new ParserError("Unexpected closing parenthesis", line, column, input.slice(position - 10, position + 10));
                    }
                    current = stack.pop();
                } else {
                    // Handle strings with or without quotes
                    if (token.startsWith('"') && token.endsWith('"')) {
                        current.push(token.slice(1, -1));
                    } else if (!isNaN(token)) {
                        current.push(Number(token));
                    } else {
                        current.push(token);
                    }
                }
                position += token.length + 1; // +1 for the space
            });

            if (stack.length > 1) {
                const { line, column } = getLineAndColumn(input, input.length);
                throw new ParserError("Missing closing parenthesis", line, column, input.slice(input.length - 20));
            }

            return ast[0];
        } catch (e) {
            if (e instanceof ParserError) throw e;
            
            const { line, column } = getLineAndColumn(input, 0);
            throw new ParserError(`Parsing error: ${e.message}`, line, column, input.slice(0, 20) + '...');
        }
    },

    // Find a section in a node by its name
    findSection(node, name) {
        for (let i = 0; i < node.length; i++) {
            if (Array.isArray(node[i]) && node[i][0] === name) {
                return node[i];
            }
        }
        return null;
    },

    // Find argument value in a node
    findArgument(node, argName) {
        for (let i = 0; i < node.length; i++) {
            if (node[i] === argName && i + 1 < node.length) {
                // Convert numeric values
                const value = node[i + 1];
                return isNaN(value) ? value : Number(value);
            }
        }
        return null;
    },

    // Extract drum machine data from AST
    extractData(ast) {
        try {
            if (!ast || ast[0] !== 'drum-machine') {
                throw new Error('Invalid drum machine syntax: must start with (drum-machine ...)');
            }

            const data = {
                name: ast[1],
                arrangements: []
            };

            // Find arrangements
            for (let i = 2; i < ast.length; i++) {
                const node = ast[i];
                if (Array.isArray(node) && node[0] === 'arrangement') {
                    const isActive = this.findArgument(node, ':active') === 1;
                    const bars = this.findArgument(node, ':bars') || 1;

                    const arrangement = {
                        id: `arr_${i}`,
                        active: isActive,
                        bars: bars,
                        tracks: []
                    };

                    // Find tracks in arrangement
                    for (let j = 2; j < node.length; j++) {
                        const trackNode = node[j];
                        if (Array.isArray(trackNode) && trackNode[0] === 'track') {
                            const trackActive = this.findArgument(trackNode, ':active') === 1;
                            const trackBars = this.findArgument(trackNode, ':bars') || 1;
                            const time = this.findArgument(trackNode, ':time') || 16;

                            const track = {
                                name: trackNode[1],
                                sample: trackNode[2],
                                active: trackActive !== null ? trackActive : true,
                                notes: [],
                                bars: trackBars,
                                time: time
                            };

                            // Find notes section dynamically
                            const notesNode = this.findSection(trackNode, 'notes');
                            if (!notesNode) {
                                throw new Error(`Invalid track syntax: missing notes section in track ${trackNode[1]}`);
                            }

                            for (let k = 1; k < notesNode.length; k++) {
                                const noteNode = notesNode[k];
                                if (Array.isArray(noteNode) && noteNode[0] === 'note') {
                                    const noteActive = this.findArgument(noteNode, ':active') === 1;
                                    const notePitch = this.findArgument(noteNode, ':pitch') || 0;
                                    const noteVolume = this.findArgument(noteNode, ':volume') || 0;
                                    
                                    track.notes.push({
                                        active: noteActive !== null ? noteActive : false,
                                        pitch: notePitch,
                                        volume: noteVolume
                                    });
                                }
                            }

                            arrangement.tracks.push(track);
                        }
                    }

                    data.arrangements.push(arrangement);
                }
            }

            return data;
        } catch (e) {
            if (e instanceof ParserError) throw e;
            
            throw new Error(`Invalid drum machine syntax: ${e.message}`);
        }
    }
};

// Export the parser for use in other modules
if (typeof module !== 'undefined') {
    module.exports = parser;
} 