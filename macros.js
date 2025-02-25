// Macro expansion system for Code of Music Parser
// Provides shorthand patterns that expand into common code snippets

/**
 * Macro definitions
 * Each macro is defined as a key-value pair:
 * - key: The macro trigger text (e.g., "*-notes-4")
 * - value: Either a string to insert or a function that returns a string
 *   Functions receive the trigger text and can extract parameters from it
 */
const macros = {
    // Basic note patterns
    "*-notes-": (trigger) => {
        // Extract count from the pattern "*-notes-N"
        const count = parseInt(trigger.split('-').pop(), 10);
        if (isNaN(count) || count <= 0) return null;
        
        // Generate N inactive notes
        return Array(count).fill('(note :active 0)').join('\n');
    },
    
    "*-active-": (trigger) => {
        // Extract count from the pattern "*-active-N"
        const count = parseInt(trigger.split('-').pop(), 10);
        if (isNaN(count) || count <= 0) return null;
        
        // Generate N active notes
        return Array(count).fill('(note :active 1)').join('\n');
    },
    
    // Common rhythmic patterns
    "*-four-on-floor": 
        '(note :active 1)\n(note :active 0)\n(note :active 0)\n(note :active 0)',
    
    "*-basic-beat": 
        '(note :active 1)\n(note :active 0)\n(note :active 0)\n(note :active 0)\n' +
        '(note :active 0)\n(note :active 1)\n(note :active 0)\n(note :active 0)',
    
    "*-hihat-8": 
        '(note :active 1)\n(note :active 1)\n(note :active 1)\n(note :active 1)\n' +
        '(note :active 1)\n(note :active 1)\n(note :active 1)\n(note :active 1)',
    
    // Track templates
    "*-kick-track": 
        '(track "kick" kick :active 1 :volume 2 :bars 1\n' +
        '  (notes\n' +
        '    (note :active 1)\n' +
        '    (note :active 0)\n' +
        '    (note :active 0)\n' +
        '    (note :active 0)\n' +
        '  )\n' +
        ')',
    
    "*-hihat-track": 
        '(track "hihat" hihat :active 1 :volume -3 :time 8 :bars 1\n' +
        '  (notes\n' +
        '    (note :active 1)\n' +
        '    (note :active 1)\n' +
        '    (note :active 1)\n' +
        '    (note :active 1)\n' +
        '    (note :active 1)\n' +
        '    (note :active 1)\n' +
        '    (note :active 1)\n' +
        '    (note :active 1)\n' +
        '  )\n' +
        ')',
    
    "*-snare-track": 
        '(track "snare" snare :active 1 :volume 0 :bars 1\n' +
        '  (notes\n' +
        '    (note :active 0)\n' +
        '    (note :active 0)\n' +
        '    (note :active 1)\n' +
        '    (note :active 0)\n' +
        '  )\n' +
        ')',
    
    // Full templates
    "*-basic-arrangement": 
        '(arrangement :active 1 :bars 2 :volume 0\n' +
        '  (track "kick" kick :active 1 :volume 2 :bars 1\n' +
        '    (notes\n' +
        '      (note :active 1)\n' +
        '      (note :active 0)\n' +
        '      (note :active 0)\n' +
        '      (note :active 0)\n' +
        '    )\n' +
        '  )\n' +
        '  (track "hihat" hihat :active 1 :volume -3 :time 8 :bars 1\n' +
        '    (notes\n' +
        '      (note :active 1)\n' +
        '      (note :active 1)\n' +
        '      (note :active 1)\n' +
        '      (note :active 1)\n' +
        '      (note :active 1)\n' +
        '      (note :active 1)\n' +
        '      (note :active 1)\n' +
        '      (note :active 1)\n' +
        '    )\n' +
        '  )\n' +
        '  (track "snare" snare :active 1 :volume 0 :bars 1\n' +
        '    (notes\n' +
        '      (note :active 0)\n' +
        '      (note :active 0)\n' +
        '      (note :active 1)\n' +
        '      (note :active 0)\n' +
        '    )\n' +
        '  )\n' +
        ')',
    
    // Alternating patterns
    "*-alt-": (trigger) => {
        // Extract count from the pattern "*-alt-N"
        const count = parseInt(trigger.split('-').pop(), 10);
        if (isNaN(count) || count <= 0) return null;
        
        // Generate alternating active/inactive notes
        return Array(count).fill(0)
            .map((_, i) => `(note :active ${i % 2})`)
            .join('\n');
    },
    
    // Polyrhythm helpers
    "*-poly-": (trigger) => {
        // Extract pattern like "*-poly-3-4" for 3 against 4
        const parts = trigger.split('-');
        if (parts.length !== 4) return null;
        
        const rhythm1 = parseInt(parts[2], 10);
        const rhythm2 = parseInt(parts[3], 10);
        
        if (isNaN(rhythm1) || isNaN(rhythm2) || rhythm1 <= 0 || rhythm2 <= 0) return null;
        
        // Calculate least common multiple for the full pattern length
        const lcm = (a, b) => {
            const gcd = (x, y) => y === 0 ? x : gcd(y, x % y);
            return (a * b) / gcd(a, b);
        };
        
        const patternLength = lcm(rhythm1, rhythm2);
        
        // Generate the first rhythm
        const pattern1 = Array(patternLength).fill(0)
            .map((_, i) => i % (patternLength / rhythm1) === 0 ? 1 : 0);
            
        // Generate the second rhythm
        const pattern2 = Array(patternLength).fill(0)
            .map((_, i) => i % (patternLength / rhythm2) === 0 ? 1 : 0);
            
        // Return both patterns
        return {
            rhythm1: pattern1.map(v => `(note :active ${v})`).join('\n'),
            rhythm2: pattern2.map(v => `(note :active ${v})`).join('\n')
        };
    }
};

/**
 * Find a matching macro for the given text
 * @param {string} text - The text to check for macros
 * @returns {Object|null} - The matched macro or null if no match
 */
function findMacro(text) {
    // Get all lines and check each one for macros
    const lines = text.split('\n');
    
    // Check each line, starting from the cursor position (which is usually the last line)
    for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i].trim();
        
        console.log('Checking for macro in line:', currentLine);
        
        // Check for exact matches first
        if (macros[currentLine]) {
            console.log('Found exact macro match:', currentLine);
            return {
                trigger: currentLine,
                expansion: macros[currentLine],
                fullLine: true,
                lineIndex: i
            };
        }
        
        // Check for pattern matches (e.g., "*-notes-4")
        for (const pattern of Object.keys(macros)) {
            // Skip exact matches as we already checked those
            if (pattern === currentLine) continue;
            
            // Check if the current line starts with a pattern base (e.g., "*-notes-")
            if (pattern.endsWith('-') && currentLine.startsWith(pattern)) {
                console.log('Found pattern macro match:', pattern, 'for line:', currentLine);
                return {
                    trigger: currentLine,
                    expansion: macros[pattern],
                    fullLine: true,
                    lineIndex: i
                };
            }
            
            // Check for more complex patterns with multiple parameters
            if (pattern.includes('-') && !pattern.endsWith('-')) {
                const patternBase = pattern.split('-').slice(0, -1).join('-') + '-';
                if (currentLine.startsWith(patternBase)) {
                    const patternRegex = new RegExp('^' + patternBase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '.*$');
                    if (patternRegex.test(currentLine)) {
                        console.log('Found complex pattern match:', pattern, 'for line:', currentLine);
                        return {
                            trigger: currentLine,
                            expansion: macros[pattern],
                            fullLine: true,
                            lineIndex: i
                        };
                    }
                }
            }
        }
    }
    
    // If we get here, no macro was found
    console.log('No macro found in any line');
    return null;
}

/**
 * Expand a macro
 * @param {string} text - The current editor text
 * @param {Object} macro - The matched macro
 * @returns {Object} - The expanded text and new cursor position
 */
function expandMacro(text, macro) {
    const lines = text.split('\n');
    // Use the line index from the macro object, or default to the last line
    const currentLineIndex = macro.lineIndex !== undefined ? macro.lineIndex : lines.length - 1;
    const currentLine = lines[currentLineIndex];
    
    let expansion;
    if (typeof macro.expansion === 'function') {
        expansion = macro.expansion(macro.trigger);
        
        // Handle special case for polyrhythm
        if (expansion && typeof expansion === 'object' && expansion.rhythm1 && expansion.rhythm2) {
            // For polyrhythms, we return both patterns with a comment
            expansion = `// Rhythm 1 (${macro.trigger}):\n${expansion.rhythm1}\n\n// Rhythm 2 (${macro.trigger}):\n${expansion.rhythm2}`;
        }
    } else {
        expansion = macro.expansion;
    }
    
    // If expansion is null or undefined, don't expand
    if (!expansion) return { text, cursorPos: text.length };
    
    // Replace the current line with the expansion if it's a full line macro
    if (macro.fullLine) {
        lines[currentLineIndex] = expansion;
    } else {
        // Otherwise, replace just the trigger text
        const beforeTrigger = currentLine.substring(0, currentLine.indexOf(macro.trigger));
        const afterTrigger = currentLine.substring(currentLine.indexOf(macro.trigger) + macro.trigger.length);
        lines[currentLineIndex] = beforeTrigger + expansion + afterTrigger;
    }
    
    const newText = lines.join('\n');
    
    // Calculate new cursor position (at the end of the expansion)
    let cursorPos = 0;
    for (let i = 0; i < currentLineIndex; i++) {
        cursorPos += lines[i].length + 1; // +1 for the newline
    }
    cursorPos += lines[currentLineIndex].length;
    
    return { text: newText, cursorPos };
}

// Export the macro system
if (typeof module !== 'undefined') {
    module.exports = { macros, findMacro, expandMacro };
} 