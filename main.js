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

/**
 * Execute the code from the editor
 * This function parses the code, interprets it, and handles the music playback
 */
const executeCode = (code) => {
    const ast = parseProgram(code);
    if (ast === null) {
        console.error('Failed to parse code');
        return;
    }
    
    console.log('Parsed AST:', ast);
    
    try {
        const result = interpret(ast);
        console.log('Interpreted result:', result);
        playMusicEvents(result);
    } catch (e) {
        console.error('Execution error:', e);
    }
};

/**
 * Play a sequence of music events using Tone.js
 * @param {Array} events - Array of music events to play
 */
const playMusicEvents = (events) => {
    // Create a polyphonic synth for playing notes and chords
    const synth = new Tone.PolySynth().toDestination();
    
    // Current time in seconds
    let time = Tone.now();
    
    // Process each event
    events.forEach(event => {
        if (!event) return; // Skip null events
        
        switch (event.type) {
            case 'note':
                synth.triggerAttackRelease(
                    event.pitch,
                    event.duration,
                    time
                );
                time += event.duration;
                break;
                
            case 'chord':
                synth.triggerAttackRelease(
                    event.notes,
                    event.duration,
                    time
                );
                time += event.duration;
                break;
                
            case 'sequence':
                event.events.forEach(e => {
                    if (e.type === 'note') {
                        synth.triggerAttackRelease(
                            e.pitch,
                            e.duration,
                            time
                        );
                        time += e.duration;
                    } else if (e.type === 'chord') {
                        synth.triggerAttackRelease(
                            e.notes,
                            e.duration,
                            time
                        );
                        time += e.duration;
                    }
                });
                break;
                
            case 'parallel':
                const maxDuration = Math.max(
                    ...event.events.map(e => e.duration || 0)
                );
                event.events.forEach(e => {
                    if (e.type === 'note') {
                        synth.triggerAttackRelease(
                            e.pitch,
                            e.duration,
                            time
                        );
                    } else if (e.type === 'chord') {
                        synth.triggerAttackRelease(
                            e.notes,
                            e.duration,
                            time
                        );
                    }
                });
                time += maxDuration;
                break;
        }
    });
};

// Wait for DOM and scripts to load
document.addEventListener('DOMContentLoaded', initializeProgram);

// Export for use in index.html
window.executeCode = executeCode;
window.initializeProgram = initializeProgram; 