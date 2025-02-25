// Main application logic for Code of Music Parser
// Simplified based on BeatParser example

let jar; // CodeJar instance
let drumMachineData = null;
let editorTimeout;
let lastText = ''; // Store the last text to detect changes

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeEditor();
    initializeAudioControls();
    initializeMacroHelp();
});

/**
 * Initialize the code editor with CodeJar
 */
function initializeEditor() {
    const highlight = editor => {
        // We use Prism.js for syntax highlighting
        if (typeof Prism !== 'undefined') {
            editor.textContent = editor.textContent;
            Prism.highlightElement(editor);
        }
    };

    const editorElement = document.getElementById('editor');
    if (!editorElement) {
        console.error('Editor element not found');
        return;
    }

    // Set up editor with line numbers
    jar = CodeJar(editorElement, highlight, {
        tab: '  ',
        indentOn: /[(]$/,
        catchTab: false // Disable CodeJar's built-in tab handling so we can handle it ourselves
    });
    withLineNumbers(jar, {
        lineNumbers: document.querySelector('.line-numbers')
    });

    // Set initial editor content
    jar.updateCode(`(drum-machine "polyrhythm-beat" :tempo 110 :signature 4
  (arrangement :active 1 :bars 4 :volume 0
    (track "kick" kick :active 1 :volume 2 :bars 1
      (notes
        (note :active 1)
        (note :active 0)
        (note :active 1)
        (note :active 0)
      )
    )
    (track "hihat" hihat :active 1 :time 8 :volume -3 :bars 2
      (notes
        (note :active 1)
        (note :active 1)
        (note :active 1)
        (note :active 1)
        (note :active 0)
        (note :active 0)
        (note :active 0)
        (note :active 0)
      )
    )
    (track "snare" snare :active 1 :volume 0 :bars 3
      (notes
        (note :active 0)
        (note :active 1 :volume 0.5)
        (note :active 0)
        (note :active 1 :volume -0.5)
        (note :active 0)
        (note :active 1 :volume 0.8)
      )
    )
  )
)`);
    lastText = jar.toString();

    // Set up editor change event
    jar.onUpdate(code => {
        clearTimeout(editorTimeout);
        editorTimeout = setTimeout(() => {
            parseCode(code);
        }, 500);
        
        // Check for macros on each update
        checkForMacros();
    });

    // Add direct event listener to the editor element for tab key
    editorElement.addEventListener('keydown', handleTabKey);

    // Set up keyboard shortcuts
    document.addEventListener('keydown', event => {
        // Ctrl+Enter to execute code
        if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault();
            executeCode(jar.toString());
        }
        
        // Ctrl+Space to expand macro on current line
        if (event.ctrlKey && event.key === ' ') {
            event.preventDefault();
            expandMacroOnCurrentLine();
        }
    });
}

/**
 * Handle tab key for macro expansion and indentation
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleTabKey(event) {
    if (event.key === 'Tab') {
        // First check if there's a macro to expand
        const currentText = jar.toString();
        const macro = findMacro(currentText);
        
        if (macro) {
            event.preventDefault();
            expandMacroInEditor(macro);
            return;
        }
        
        // If no macro to expand, handle normal tab indentation
        if (!event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault();
            
            // Get current cursor position
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                
                // Insert two spaces at cursor position
                const spaces = '  ';
                const textNode = document.createTextNode(spaces);
                range.insertNode(textNode);
                
                // Move cursor after the inserted spaces
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                selection.removeAllRanges();
                selection.addRange(range);
                
                // Update the editor content
                jar.updateCode(jar.toString());
            }
        }
    }
}

/**
 * Check for macros in the current editor content
 */
function checkForMacros() {
    const currentText = jar.toString();
    
    // Only check if the text has changed
    if (currentText === lastText) return;
    lastText = currentText;
    
    // Check if any line contains a macro
    const macro = findMacro(currentText);
    if (macro) {
        // Show a subtle indicator that a macro is available
        showMessage('Press Tab to expand macro', 1000);
    }
}

/**
 * Expand a macro in the editor
 * @param {Object} macro - The macro to expand
 */
function expandMacroInEditor(macro) {
    const currentText = jar.toString();
    const { text, cursorPos } = expandMacro(currentText, macro);
    
    // Update the editor content
    jar.updateCode(text);
    
    // Set the cursor position
    setTimeout(() => {
        const editorElement = document.getElementById('editor');
        if (editorElement) {
            // Create a range at the cursor position
            const range = document.createRange();
            const selection = window.getSelection();
            
            // Find the text node and position within it
            let currentPos = 0;
            let targetNode = null;
            let targetOffset = 0;
            
            const findPosition = (node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const nodeLength = node.nodeValue.length;
                    if (currentPos + nodeLength >= cursorPos) {
                        targetNode = node;
                        targetOffset = cursorPos - currentPos;
                        return true;
                    }
                    currentPos += nodeLength;
                } else {
                    for (let i = 0; i < node.childNodes.length; i++) {
                        if (findPosition(node.childNodes[i])) {
                            return true;
                        }
                    }
                }
                return false;
            };
            
            findPosition(editorElement);
            
            if (targetNode) {
                range.setStart(targetNode, targetOffset);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }, 0);
    
    // Show a message
    showMessage('Macro expanded', 1000);
    
    // Parse the new code
    parseCode(text);
}

/**
 * Initialize the macro help panel
 */
function initializeMacroHelp() {
    const helpButton = document.getElementById('help-button');
    const helpPanel = document.getElementById('macro-help');
    
    if (helpButton && helpPanel) {
        helpButton.addEventListener('click', () => {
            if (helpPanel.style.display === 'block') {
                helpPanel.style.display = 'none';
            } else {
                helpPanel.style.display = 'block';
            }
        });
        
        // Close the help panel when clicking outside of it
        document.addEventListener('click', (event) => {
            if (event.target !== helpButton && event.target !== helpPanel && !helpPanel.contains(event.target)) {
                helpPanel.style.display = 'none';
            }
        });
    }
}

/**
 * Initialize audio control buttons
 */
function initializeAudioControls() {
    const testButton = document.getElementById('test-audio');
    const runButton = document.getElementById('run');
    const debugButton = document.getElementById('debug-macro');

    if (testButton) {
        testButton.addEventListener('click', initializeAudioContext);
    }

    if (runButton) {
        runButton.addEventListener('click', () => {
            executeCode(jar.toString());
        });
    }
    
    if (debugButton) {
        debugButton.addEventListener('click', debugMacros);
    }
}

/**
 * Initialize the Tone.js audio context
 */
async function initializeAudioContext() {
    try {
        await Tone.start();
        console.log('Audio context started');
        showMessage('Audio context initialized');
        
        // Load samples
        await player.init(drumMachineData || {});
        
        // Disable test button after successful initialization
        const testButton = document.getElementById('test-audio');
        if (testButton) {
            testButton.textContent = 'Audio Ready';
            testButton.disabled = true;
        }
        
        // Parse current code
        parseCode(jar.toString());
    } catch (e) {
        console.error('Failed to start audio context:', e);
        showError(`Audio initialization failed: ${e.message}`);
    }
}

/**
 * Parse the Lisp-like code into a data structure
 * @param {string} code - The code to parse
 */
function parseCode(code) {
    try {
        console.log('Parsing code...');
        const ast = parser.parse(code);
        drumMachineData = parser.extractData(ast);
        console.log('Parsed data:', drumMachineData);
        hideError();
        
        // If transport is running, schedule update
        if (Tone.Transport && Tone.Transport.state === 'started') {
            player.update(drumMachineData);
        }
    } catch (e) {
        console.error('Parse error:', e);
        showError(e.message);
    }
}

/**
 * Execute the parsed code, starting audio playback
 * @param {string} code - The code to execute
 */
function executeCode(code) {
    // Ensure audio context is initialized
    if (Tone.context.state !== 'running') {
        initializeAudioContext().then(() => {
            executeCode(code);
        });
        return;
    }
    
    try {
        // Parse the code if not already parsed
        if (!drumMachineData) {
            parseCode(code);
        }
        
        if (drumMachineData) {
            console.log('Starting playback with data:', drumMachineData);
            player.start(drumMachineData);
            showMessage('Playback started');
        } else {
            showError('No valid drum machine data to play');
        }
    } catch (e) {
        console.error('Execution error:', e);
        showError(`Execution failed: ${e.message}`);
    }
}

/**
 * Show an error message
 * @param {string} message - The error message to display
 */
function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    errorElement.style.position = 'fixed';
    errorElement.style.bottom = '20px';
    errorElement.style.right = '20px';
    errorElement.style.backgroundColor = '#ff5555';
    errorElement.style.color = 'white';
    errorElement.style.padding = '10px 20px';
    errorElement.style.borderRadius = '4px';
    errorElement.style.zIndex = '1000';
    
    // Remove any existing error messages
    hideError();
    
    // Add the new error message
    document.body.appendChild(errorElement);
    
    // Automatically hide after 5 seconds
    setTimeout(() => {
        errorElement.remove();
    }, 5000);
}

/**
 * Show a status message
 * @param {string} message - The message to display
 * @param {number} duration - How long to show the message (ms)
 */
function showMessage(message, duration = 2000) {
    const messageElement = document.createElement('div');
    messageElement.className = 'status-message';
    messageElement.textContent = message;
    messageElement.style.position = 'fixed';
    messageElement.style.bottom = '20px';
    messageElement.style.right = '20px';
    messageElement.style.backgroundColor = '#55aa55';
    messageElement.style.color = 'white';
    messageElement.style.padding = '10px 20px';
    messageElement.style.borderRadius = '4px';
    messageElement.style.zIndex = '1000';
    
    // Add the message
    document.body.appendChild(messageElement);
    
    // Automatically hide after specified duration
    setTimeout(() => {
        messageElement.remove();
    }, duration);
}

/**
 * Hide any displayed error messages
 */
function hideError() {
    document.querySelectorAll('.error-message').forEach(el => el.remove());
}

// Create stop function that can be called from the console for debugging
window.stopPlayback = () => {
    if (player) {
        player.stop();
        showMessage('Playback stopped');
    }
};

/**
 * Debug macros by showing available macros and testing current line
 */
function debugMacros() {
    const debugPanel = document.getElementById('debug-panel');
    if (!debugPanel) return;
    
    // Toggle debug panel visibility
    if (debugPanel.style.display === 'block') {
        debugPanel.style.display = 'none';
        return;
    }
    
    // Clear previous debug info
    debugPanel.innerHTML = '';
    debugPanel.style.display = 'block';
    
    // Get current editor content
    const currentText = jar.toString();
    const lines = currentText.split('\n');
    
    // Add debug info
    const debugInfo = document.createElement('div');
    debugInfo.innerHTML = `
        <h3>Macro Debug Info</h3>
        <p><strong>Available macros:</strong></p>
        <ul>
            ${Object.keys(macros).map(key => `<li>${key}</li>`).join('')}
        </ul>
        <p><strong>Checking all lines for macro matches:</strong></p>
    `;
    debugPanel.appendChild(debugInfo);
    
    // Test if any line matches a macro
    const macro = findMacro(currentText);
    
    const resultInfo = document.createElement('div');
    if (macro) {
        const matchedLine = lines[macro.lineIndex].trim();
        resultInfo.innerHTML = `
            <p style="color: #5f5;">✓ Macro found on line ${macro.lineIndex + 1}!</p>
            <p>Line content: "${matchedLine}"</p>
            <p>Trigger: ${macro.trigger}</p>
            <p>Expansion type: ${typeof macro.expansion === 'function' ? 'Function' : 'String'}</p>
            <button id="force-expand">Force Expand</button>
        `;
    } else {
        resultInfo.innerHTML = `
            <p style="color: #f55;">✗ No macro match found in any line</p>
            <p>Try typing a macro like "*-notes-4" on a new line</p>
        `;
    }
    debugPanel.appendChild(resultInfo);
    
    // Add force expand button functionality
    const forceButton = document.getElementById('force-expand');
    if (forceButton && macro) {
        forceButton.addEventListener('click', () => {
            expandMacroInEditor(macro);
            debugPanel.style.display = 'none';
        });
    }
    
    // Add line-by-line analysis
    const lineAnalysis = document.createElement('div');
    lineAnalysis.innerHTML = `
        <h3>Line-by-Line Analysis</h3>
        <div id="line-analysis"></div>
    `;
    debugPanel.appendChild(lineAnalysis);
    
    const lineAnalysisDiv = document.getElementById('line-analysis');
    if (lineAnalysisDiv) {
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
                const lineDiv = document.createElement('div');
                lineDiv.style.marginBottom = '5px';
                lineDiv.style.borderBottom = '1px solid #444';
                lineDiv.style.paddingBottom = '5px';
                
                // Check if this line matches any macro
                let macroMatch = null;
                
                // Check for exact matches
                if (macros[trimmedLine]) {
                    macroMatch = {
                        trigger: trimmedLine,
                        expansion: macros[trimmedLine]
                    };
                } else {
                    // Check for pattern matches
                    for (const pattern of Object.keys(macros)) {
                        if (pattern.endsWith('-') && trimmedLine.startsWith(pattern)) {
                            macroMatch = {
                                trigger: trimmedLine,
                                expansion: macros[pattern]
                            };
                            break;
                        }
                        
                        if (pattern.includes('-') && !pattern.endsWith('-')) {
                            const patternBase = pattern.split('-').slice(0, -1).join('-') + '-';
                            if (trimmedLine.startsWith(patternBase)) {
                                const patternRegex = new RegExp('^' + patternBase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '.*$');
                                if (patternRegex.test(trimmedLine)) {
                                    macroMatch = {
                                        trigger: trimmedLine,
                                        expansion: macros[pattern]
                                    };
                                    break;
                                }
                            }
                        }
                    }
                }
                
                if (macroMatch) {
                    lineDiv.innerHTML = `
                        <p><strong>Line ${index + 1}:</strong> "${trimmedLine}" <span style="color: #5f5;">✓ Macro match!</span></p>
                        <button class="expand-line-btn" data-line="${index}">Expand This Line</button>
                    `;
                } else {
                    lineDiv.innerHTML = `
                        <p><strong>Line ${index + 1}:</strong> "${trimmedLine}" <span style="color: #f55;">✗ No match</span></p>
                    `;
                }
                
                lineAnalysisDiv.appendChild(lineDiv);
            }
        });
        
        // Add event listeners to expand buttons
        document.querySelectorAll('.expand-line-btn').forEach(button => {
            button.addEventListener('click', () => {
                const lineIndex = parseInt(button.getAttribute('data-line'));
                const lineText = lines[lineIndex].trim();
                
                // Create a temporary macro object
                let tempMacro = null;
                
                // Check for exact matches
                if (macros[lineText]) {
                    tempMacro = {
                        trigger: lineText,
                        expansion: macros[lineText],
                        fullLine: true,
                        lineIndex: lineIndex
                    };
                } else {
                    // Check for pattern matches
                    for (const pattern of Object.keys(macros)) {
                        if (pattern.endsWith('-') && lineText.startsWith(pattern)) {
                            tempMacro = {
                                trigger: lineText,
                                expansion: macros[pattern],
                                fullLine: true,
                                lineIndex: lineIndex
                            };
                            break;
                        }
                        
                        if (pattern.includes('-') && !pattern.endsWith('-')) {
                            const patternBase = pattern.split('-').slice(0, -1).join('-') + '-';
                            if (lineText.startsWith(patternBase)) {
                                const patternRegex = new RegExp('^' + patternBase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '.*$');
                                if (patternRegex.test(lineText)) {
                                    tempMacro = {
                                        trigger: lineText,
                                        expansion: macros[pattern],
                                        fullLine: true,
                                        lineIndex: lineIndex
                                    };
                                    break;
                                }
                            }
                        }
                    }
                }
                
                if (tempMacro) {
                    expandMacroInEditor(tempMacro);
                    debugPanel.style.display = 'none';
                }
            });
        });
    }
    
    // Add manual test section
    const manualTest = document.createElement('div');
    manualTest.innerHTML = `
        <h3>Manual Test</h3>
        <p>Type a macro to test:</p>
        <input type="text" id="test-macro-input" placeholder="e.g., *-notes-4">
        <button id="test-macro-button">Test</button>
        <div id="test-result"></div>
    `;
    debugPanel.appendChild(manualTest);
    
    // Add test button functionality
    const testButton = document.getElementById('test-macro-button');
    const testInput = document.getElementById('test-macro-input');
    const testResult = document.getElementById('test-result');
    
    if (testButton && testInput && testResult) {
        testButton.addEventListener('click', () => {
            const testText = testInput.value.trim();
            const testMacro = findMacroForTest(testText);
            
            if (testMacro) {
                testResult.innerHTML = `
                    <p style="color: #5f5;">✓ Macro found!</p>
                    <p>Trigger: ${testMacro.trigger}</p>
                    <p>Expansion type: ${typeof testMacro.expansion === 'function' ? 'Function' : 'String'}</p>
                    <button id="insert-test-macro">Insert</button>
                `;
                
                const insertButton = document.getElementById('insert-test-macro');
                if (insertButton) {
                    insertButton.addEventListener('click', () => {
                        // Insert the test macro at the current cursor position
                        const editorElement = document.getElementById('editor');
                        if (editorElement) {
                            const selection = window.getSelection();
                            if (selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const textNode = document.createTextNode(testText);
                                range.insertNode(textNode);
                                
                                // Move cursor after the inserted text
                                range.setStartAfter(textNode);
                                range.setEndAfter(textNode);
                                selection.removeAllRanges();
                                selection.addRange(range);
                                
                                // Update the editor content
                                jar.updateCode(jar.toString());
                                
                                // Close debug panel
                                debugPanel.style.display = 'none';
                            }
                        }
                    });
                }
            } else {
                testResult.innerHTML = `
                    <p style="color: #f55;">✗ No macro match found</p>
                `;
            }
        });
    }
}

/**
 * Find a macro for testing purposes
 * @param {string} testText - The text to test
 * @returns {Object|null} - The matched macro or null
 */
function findMacroForTest(testText) {
    // Check for exact matches first
    if (macros[testText]) {
        return {
            trigger: testText,
            expansion: macros[testText],
            fullLine: true
        };
    }
    
    // Check for pattern matches (e.g., "*-notes-4")
    for (const pattern of Object.keys(macros)) {
        // Skip exact matches as we already checked those
        if (pattern === testText) continue;
        
        // Check if the test text starts with a pattern base (e.g., "*-notes-")
        if (pattern.endsWith('-') && testText.startsWith(pattern)) {
            return {
                trigger: testText,
                expansion: macros[pattern],
                fullLine: true
            };
        }
        
        // Check for more complex patterns with multiple parameters
        if (pattern.includes('-') && !pattern.endsWith('-')) {
            const patternBase = pattern.split('-').slice(0, -1).join('-') + '-';
            if (testText.startsWith(patternBase)) {
                const patternRegex = new RegExp('^' + patternBase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '.*$');
                if (patternRegex.test(testText)) {
                    return {
                        trigger: testText,
                        expansion: macros[pattern],
                        fullLine: true
                    };
                }
            }
        }
    }
    
    return null;
}

/**
 * Expand a macro on the current line (where the cursor is)
 */
function expandMacroOnCurrentLine() {
    const currentText = jar.toString();
    const lines = currentText.split('\n');
    
    // Get the current cursor position to determine which line we're on
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const editorElement = document.getElementById('editor');
    if (!editorElement) return;
    
    // Find the line number based on cursor position
    let currentNode = range.startContainer;
    let currentOffset = range.startOffset;
    let textBeforeCursor = '';
    
    // Traverse the DOM to get all text before the cursor
    const getTextBeforeCursor = (node, offset) => {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.nodeValue.substring(0, offset);
        }
        
        let text = '';
        for (let i = 0; i < offset; i++) {
            text += getTextContent(node.childNodes[i]);
        }
        return text;
    };
    
    const getTextContent = (node) => {
        if (!node) return '';
        if (node.nodeType === Node.TEXT_NODE) {
            return node.nodeValue;
        }
        let text = '';
        for (let child of node.childNodes) {
            text += getTextContent(child);
        }
        return text;
    };
    
    textBeforeCursor = getTextBeforeCursor(currentNode, currentOffset);
    
    // Count newlines to determine current line
    let currentLineIndex = 0;
    let nodeParent = currentNode;
    while (nodeParent && nodeParent !== editorElement) {
        let prevSibling = nodeParent.previousSibling;
        while (prevSibling) {
            textBeforeCursor = getTextContent(prevSibling) + textBeforeCursor;
            prevSibling = prevSibling.previousSibling;
        }
        nodeParent = nodeParent.parentNode;
    }
    
    currentLineIndex = (textBeforeCursor.match(/\n/g) || []).length;
    
    // Get the current line
    const currentLine = lines[currentLineIndex].trim();
    
    // Check if the current line contains a macro
    let tempMacro = null;
    
    // Check for exact matches
    if (macros[currentLine]) {
        tempMacro = {
            trigger: currentLine,
            expansion: macros[currentLine],
            fullLine: true,
            lineIndex: currentLineIndex
        };
    } else {
        // Check for pattern matches
        for (const pattern of Object.keys(macros)) {
            if (pattern.endsWith('-') && currentLine.startsWith(pattern)) {
                tempMacro = {
                    trigger: currentLine,
                    expansion: macros[pattern],
                    fullLine: true,
                    lineIndex: currentLineIndex
                };
                break;
            }
            
            if (pattern.includes('-') && !pattern.endsWith('-')) {
                const patternBase = pattern.split('-').slice(0, -1).join('-') + '-';
                if (currentLine.startsWith(patternBase)) {
                    const patternRegex = new RegExp('^' + patternBase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '.*$');
                    if (patternRegex.test(currentLine)) {
                        tempMacro = {
                            trigger: currentLine,
                            expansion: macros[pattern],
                            fullLine: true,
                            lineIndex: currentLineIndex
                        };
                        break;
                    }
                }
            }
        }
    }
    
    // Expand the macro if found
    if (tempMacro) {
        expandMacroInEditor(tempMacro);
        showMessage('Macro expanded on current line', 1000);
    } else {
        showMessage('No macro found on current line', 1000);
    }
}
