// Main program orchestration
// Handles the connection between the editor, parser, and Tone.js

let jar; // CodeJar instance

const initializeProgram = async () => {
    // Initialize editor first
    jar = initEditor();
    
    // Add run button handler
    document.getElementById('run').addEventListener('click', async () => {
        // Start audio context on user interaction
        await Tone.start();
        executeCode(jar.toString());
    });

    // Add Ctrl+Enter handler
    document.addEventListener('keydown', async (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            // Start audio context on user interaction
            await Tone.start();
            executeCode(jar.toString());
        }
    });
};

const executeCode = (code) => {
    const parsed = parseProgram(code);
    if (parsed === null) {
        return; // Parser error occurred
    }
    
    console.log('Parsed AST:', parsed);
    // TODO: Add execution logic here
};

// Wait for DOM and scripts to load
document.addEventListener('DOMContentLoaded', initializeProgram);

// Export for use in index.html
window.executeCode = executeCode;
window.initializeProgram = initializeProgram; 