// Audio player using Tone.js for drum machine playback
const player = {
    // Core properties
    players: new Map(),         // Store for sample players
    synths: new Map(),          // Store for Tone.js synths
    transport: Tone.Transport,  // Tone.js transport
    currentStep: 0,             // Current step in the sequence
    stepLength: '16n',          // Default step length
    parts: new Map(),           // Track -> Part mapping
    trackStates: new Map(),     // Track -> active state mapping
    currentArrangementId: null, // Currently active arrangement ID
    masterLimiter: null,        // Master limiter to prevent clipping
    
    // Default sample mapping
    samples: {
        kick: '/samples/TR-505_Tape_Kick.wav',
        snare: '/samples/TR-505_Tape_Snare.wav',
        hihat: '/samples/TR-505_Tape_ClosedHH.wav',
        openhat: '/samples/TR-505_Tape_OpenHH.wav',
        clap: '/samples/TR-505_Tape_Clap.wav',
        crash: '/samples/TR-505_Tape_Crash.wav',
        ride: '/samples/TR-505_Tape_Ride.wav',
        rimshot: '/samples/TR-505_Tape_Rimshot.wav',
        hitom: '/samples/TR-505_Tape_HiTom.wav',
        midtom: '/samples/TR-505_Tape_MidTom.wav',
        lotom: '/samples/TR-505_Tape_LoTom.wav',
        hiconga: '/samples/TR-505_Tape_HiConga.wav',
        loconga: '/samples/TR-505_Tape_LowConga.wav',
        hicowbell: '/samples/TR-505_Tape_HiCowbell.wav',
        locowbell: '/samples/TR-505_Tape_LowCowbell.wav',
        timbale: '/samples/TR-505_Tape_Timbale.wav'
    },

    // Initialize player with drum machine data
    async init(data) {
        console.log('Initializing player with data:', data);
        this.stop();
        this.players.clear();
        this.synths.clear();
        this.parts.clear();
        this.trackStates.clear();
        
        // Create a master limiter to prevent clipping
        this.masterLimiter = new Tone.Limiter(-1).toDestination();
        console.log('Created master limiter');
        
        // Set default tempo and loop length
        this.transport.bpm.value = data.tempo || 120;
        
        // Default to 1 measure loop
        this.transport.setLoopPoints(0, "1m");
        this.transport.loop = true;
        
        // Preload all samples
        const loadPromises = [];
        
        for (const [name, path] of Object.entries(this.samples)) {
            try {
                // Create a proper loading promise for each sample
                const loadPromise = new Promise((resolve, reject) => {
                    const player = new Tone.Player({
                        url: path,
                        onload: () => {
                            console.log(`Loaded ${name}`);
                            // Add small fade-in/fade-out to reduce pops and clicks
                            player.fadeIn = 0.005; // 5ms fade in
                            player.fadeOut = 0.01; // 10ms fade out
                            resolve(); // Resolve promise when sample is actually loaded
                        },
                        onerror: (e) => {
                            console.error(`Error loading ${name}:`, e);
                            reject(e);
                        }
                    }).connect(this.masterLimiter); // Connect to limiter instead of destination
                    
                    this.players.set(name, player);
                    
                    // Add a timeout as a fallback
                    setTimeout(() => {
                        console.warn(`Sample ${name} load timed out, continuing anyway`);
                        resolve();
                    }, 5000);
                });
                
                loadPromises.push(loadPromise);
            } catch (err) {
                console.error(`Failed to create player for ${name}:`, err);
            }
        }

        // Set up playhead callback
        this.transport.scheduleRepeat((time) => {
            this.currentStep = (this.currentStep + 1) % 16;
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('stepChange', { 
                    detail: { step: this.currentStep }
                }));
            }
        }, this.stepLength);

        // Wait for all samples to load or timeout
        try {
            await Promise.all(loadPromises);
            console.log('All samples loaded');
        } catch (err) {
            console.warn('Some samples failed to load, continuing anyway:', err);
        }
        
        // Ensure audio context is started
        await Tone.start();
        
        // Finalize initialization
        await Tone.loaded();
        console.log('Player initialization complete');
    },

    // Create or get a synth instance
    getSynth(synthType) {
        console.log(`Getting synth of type: ${synthType}`);
        
        // Use cached synth if available
        if (this.synths.has(synthType)) {
            console.log(`Using cached synth for ${synthType}`);
            return this.synths.get(synthType);
        }
        
        // Create a new synth instance based on type
        let synth = null;
        try {
            const lowerType = synthType.toLowerCase();
            console.log(`Creating new synth of type: ${lowerType}`);
            
            switch (lowerType) {
                case 'synth':
                    synth = new Tone.Synth().connect(this.masterLimiter);
                    break;
                case 'amsynth':
                    synth = new Tone.AMSynth().connect(this.masterLimiter);
                    break;
                case 'fmsynth':
                    synth = new Tone.FMSynth().connect(this.masterLimiter);
                    break;
                case 'monosynth':
                    synth = new Tone.MonoSynth().connect(this.masterLimiter);
                    break;
                case 'polysynth':
                    synth = new Tone.PolySynth().connect(this.masterLimiter);
                    break;
                case 'pluck':
                    synth = new Tone.PluckSynth().connect(this.masterLimiter);
                    break;
                case 'membrane':
                    synth = new Tone.MembraneSynth().connect(this.masterLimiter);
                    break;
                case 'metal':
                    synth = new Tone.MetalSynth().connect(this.masterLimiter);
                    break;
                case 'noise':
                    synth = new Tone.NoiseSynth().connect(this.masterLimiter);
                    break;
                default:
                    // Default to basic Synth
                    synth = new Tone.Synth().connect(this.masterLimiter);
                    console.warn(`Unknown synth type '${synthType}', defaulting to Synth`);
            }
            
            console.log(`Successfully created synth of type ${lowerType}`);
            
            // Cache the synth instance
            this.synths.set(synthType, synth);
            return synth;
        } catch (err) {
            console.error(`Failed to create synth of type ${synthType}:`, err);
            return null;
        }
    },

    // Play a synth note immediately
    playSynth(synthEvent) {
        if (!synthEvent) return;
        
        try {
            const { synthType, note, duration, velocity } = synthEvent;
            const synth = this.getSynth(synthType);
            
            if (!synth) {
                console.error(`Could not get synth of type ${synthType}`);
                return;
            }
            
            // Apply velocity to synth volume with ramping to prevent pops
            const volumeValue = (velocity - 0.7) * 20; // Map 0-1 velocity to reasonable dB range
            synth.volume.rampTo(volumeValue, 0.01); // 10ms ramp to prevent clicks
            
            // Handle both single notes and chords
            if (Array.isArray(note)) {
                // It's a chord - check if the synth supports it
                if (synthType.toLowerCase() === 'polysynth' || 
                    synth.voices || // Check if it has voices property (PolySynth)
                    typeof synth.triggerAttackRelease === 'function') {
                    synth.triggerAttackRelease(note, duration);
                    console.log(`Playing synth ${synthType} chord [${note.join(', ')}] for duration ${duration}`);
                } else {
                    // For monophonic synths, just play the first note
                    synth.triggerAttackRelease(note[0], duration);
                    console.log(`Playing synth ${synthType} first note of chord ${note[0]} for duration ${duration}`);
                }
            } else {
                // It's a single note
                synth.triggerAttackRelease(note, duration);
                console.log(`Playing synth ${synthType} note ${note} for duration ${duration}`);
            }
        } catch (err) {
            console.error('Error playing synth note:', err);
        }
    },

    // Convert MIDI pitch number to note name
    midiToNoteName(midiPitch) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiPitch / 12) - 1;
        const noteIndex = midiPitch % 12;
        return notes[noteIndex] + octave;
    },

    // Convert duration value to Tone.js format
    convertDurationToToneFormat(duration) {
        // If duration is already a string (like "8n", "4n", etc.), return it as is
        if (typeof duration === 'string') {
            return duration;
        }
        
        // If duration is a number, interpret it as beats
        if (typeof duration === 'number') {
            // Convert common fractions to note values
            if (duration === 0.25) return "16n";      // Sixteenth note
            if (duration === 0.5) return "8n";        // Eighth note
            if (duration === 0.75) return "8n.";      // Dotted eighth note
            if (duration === 1) return "4n";          // Quarter note
            if (duration === 1.5) return "4n.";       // Dotted quarter note
            if (duration === 2) return "2n";          // Half note
            if (duration === 3) return "2n.";         // Dotted half note
            if (duration === 4) return "1n";          // Whole note
            
            // For other values, return as seconds
            return duration + "s";
        }
        
        // Default to eighth note if invalid
        console.warn(`Invalid duration value: ${duration}, defaulting to 8n`);
        return "8n";
    },

    // Create parts from drum machine data
    createParts(data) {
        if (!data || !data.arrangements) {
            console.error('Invalid data format for createParts');
            return;
        }
        
        const activeArrangement = data.arrangements.find(arr => arr.active);
        if (!activeArrangement) {
            console.warn('No active arrangement found');
            return;
        }

        console.log('Creating parts for arrangement:', activeArrangement);

        // Clear existing parts
        this.parts.forEach(part => part.dispose());
        this.parts.clear();
        this.trackStates.clear();
        
        // Set tempo from drum machine data
        if (data.tempo) {
            this.transport.bpm.value = data.tempo;
            console.log(`Setting tempo to ${data.tempo} BPM`);
        }
        
        // Set time signature if provided
        const timeSignature = data.signature || 4;
        console.log(`Using time signature: ${timeSignature}/4`);
        
        // Set arrangement loop length based on bars
        const arrangementBars = activeArrangement.bars || 1;
        this.transport.setLoopPoints(0, `${arrangementBars}m`);
        console.log(`Setting arrangement loop length to ${arrangementBars} bars`);
        
        // Get arrangement volume (default to 0 if not specified)
        const arrangementVolume = activeArrangement.volume || 0;
        console.log(`Arrangement volume: ${arrangementVolume}`);

        // Create parts for each track
        activeArrangement.tracks.forEach((track, trackIndex) => {
            // Generate a unique track ID using both name and index
            const trackId = `${track.name}_${trackIndex}`;
            console.log(`Processing track ${trackId}, active: ${track.active}, time: ${track.time}`);
            
            // Store track state with unique ID
            this.trackStates.set(trackId, track.active);
            
            const events = [];
            
            // Get track bars - this is the track's individual loop length
            // Only default to arrangement bars if not specified
            const trackBars = track.bars !== undefined ? track.bars : arrangementBars;
            console.log(`Track ${trackId} bars: ${trackBars}`);
            
            // Calculate how many notes we can fit in the track based on bars and time signature
            // time parameter represents subdivisions per measure
            const notesPerMeasure = track.time || 16;
            const totalNotes = notesPerMeasure * trackBars;
            
            // Get track volume (default to 0 if not specified)
            const trackVolume = track.volume || 0;
            console.log(`Track ${trackId} volume: ${trackVolume}`);
            
            // Convert notes to timed events
            track.notes.forEach((note, index) => {
                // Skip notes that exceed the track's length
                if (index >= totalNotes) {
                    console.warn(`Note at index ${index} exceeds track length (${totalNotes}), skipping`);
                    return;
                }
                
                if (note.active) {
                    // Calculate time based on the time signature and track's time parameter
                    const beatsPerMeasure = timeSignature;
                    const subdivision = beatsPerMeasure / notesPerMeasure;
                    
                    // Calculate which measure this note belongs to
                    const measure = Math.floor(index / notesPerMeasure);
                    
                    // Calculate position within the measure
                    const positionInMeasure = index % notesPerMeasure;
                    
                    // Calculate beat and sixteenth
                    const beat = Math.floor(positionInMeasure * subdivision);
                    const remainder = (positionInMeasure * subdivision) % 1;
                    const sixteenth = Math.floor(remainder * 4);
                    
                    const time = `${measure}:${beat}:${sixteenth}`;
                    console.log(`Note ${index} time: ${time} (measure: ${measure}, beat: ${beat}, sixteenth: ${sixteenth})`);
                    
                    events.push({
                        time,
                        sample: track.sample,
                        pitch: note.pitch || 0,
                        volume: note.volume || 0,
                        trackVolume: trackVolume,
                        arrangementVolume: arrangementVolume,
                        // Add synth information if this is a synth track
                        isSynth: track.isSynth || false,
                        synthType: track.synthType || null,
                        // Add duration for synth notes
                        duration: note.duration
                    });
                    
                    // Debug log for synth events
                    if (track.isSynth) {
                        console.log(`Created synth event: ${track.synthType} at time ${time} with pitch ${note.pitch || 0}, duration: ${note.duration || 'default'}`);
                    }
                }
            });

            console.log(`Created ${events.length} events for track ${trackId}`);

            // Create part for this track
            const part = new Tone.Part((time, event) => {
                const isTrackActive = this.trackStates.get(trackId);
                console.log(`Processing event for track ${trackId}, active: ${isTrackActive}, isSynth: ${event.isSynth}, synthType: ${event.synthType}, sample: ${event.sample}`);
                
                if (isTrackActive) {
                    // First check if this is a synth event
                    if (event.isSynth === true && event.synthType) {
                        console.log(`SYNTH EVENT DETECTED: ${event.synthType} with pitch ${event.pitch}`);
                        // Handle synth playback
                        console.log(`Attempting to play synth: ${event.synthType} with pitch ${event.pitch}`);
                        console.log(`Full event details: ${JSON.stringify(event)}`);
                        
                        const synth = this.getSynth(event.synthType);
                        console.log(`Got synth instance: ${synth ? 'Yes' : 'No'}`);
                        
                        if (synth) {
                            // Convert pitch to note name (if pitch is a MIDI number)
                            let note;
                            if (typeof event.pitch === 'number') {
                                note = this.midiToNoteName(event.pitch + 60); // Add 60 to get middle C range
                                console.log(`Converted pitch ${event.pitch} to note ${note}`);
                            } else {
                                note = event.pitch || "C4"; // Default to C4 if no pitch specified
                                console.log(`Using direct note ${note}`);
                            }
                            
                            // Apply volume adjustments
                            const noteVolume = event.volume || 0;
                            const combinedVolume = noteVolume + (event.trackVolume / 10) + (event.arrangementVolume / 10);
                            synth.volume.rampTo(combinedVolume * 20, 0.01); // Use ramping instead of direct assignment
                            
                            // Determine note duration - use event duration if available, otherwise default to "8n"
                            const duration = event.duration ? 
                                this.convertDurationToToneFormat(event.duration) : 
                                "8n";
                            
                            // Trigger the synth
                            synth.triggerAttackRelease(note, duration, time);
                            console.log(`Triggered synth ${event.synthType} with note ${note}, duration: ${duration}`);
                        }
                    } else {
                        // Handle sample playback
                        const player = this.players.get(event.sample);
                        if (player) {
                            // Apply pitch and volume adjustments if available
                            if (event.pitch !== 0) {
                                player.playbackRate = Math.pow(2, event.pitch / 12);
                            } else {
                                player.playbackRate = 1;
                            }
                            
                            // Apply combined volume adjustment with ramping to prevent pops
                            const noteVolume = event.volume || 0;
                            const combinedVolume = noteVolume + (event.trackVolume / 10) + (event.arrangementVolume / 10);
                            
                            // Scale to a reasonable dB range (-40dB to +6dB) with ramping
                            player.volume.rampTo(combinedVolume * 20, 0.01); // 10ms ramp
                            
                            // Add a tiny random offset to prevent multiple samples starting at exact same time
                            const tinyOffset = Math.random() * 0.005; // 0-5ms random offset
                            player.start(time + tinyOffset);
                        } else {
                            console.warn(`Player not found for sample: ${event.sample}`);
                        }
                    }
                }
            }, []);

            part.loop = true;
            
            // Set the loop end based on the track's bars
            // This allows each track to have its own loop length
            part.loopEnd = `${trackBars}m`;
            console.log(`Setting track ${trackId} loop length to ${trackBars}m`);
            
            // Add all events to the part
            events.forEach(event => part.add(event));
            console.log(`Added ${events.length} events to part for track ${trackId}`);
            
            this.parts.set(trackId, part);
        });
    },

    // Update parts with new data
    update(data) {
        if (!data || !data.arrangements) {
            console.error('Invalid data format for update');
            return;
        }
        
        // Check if active arrangement changed
        const activeArrangement = data.arrangements.find(arr => arr.active);
        const currentArrangementId = this.currentArrangementId;
        
        // If active arrangement changed, recreate all parts
        if (!activeArrangement || activeArrangement.id !== currentArrangementId) {
            console.log('Active arrangement changed, recreating parts');
            this.stop();
            this.createParts(data);
            if (activeArrangement) {
                this.currentArrangementId = activeArrangement.id;
                // Restart all parts
                this.parts.forEach(part => part.start(0));
                this.transport.start();
            }
            return;
        }

        // Update tempo if it changed
        if (data.tempo) {
            this.transport.bpm.value = data.tempo;
        }
        
        // Update arrangement loop length if bars changed
        const arrangementBars = activeArrangement.bars || 1;
        this.transport.setLoopPoints(0, `${arrangementBars}m`);
        
        // If same arrangement, just update tracks
        console.log('Updating parts with new data');
        
        // Get arrangement volume
        const arrangementVolume = activeArrangement.volume || 0;
        
        // Clear existing parts to avoid stale tracks
        this.parts.forEach(part => part.dispose());
        this.parts.clear();
        this.trackStates.clear();
        
        // Recreate all tracks with unique IDs
        activeArrangement.tracks.forEach((track, trackIndex) => {
            // Generate a unique track ID using both name and index
            const trackId = `${track.name}_${trackIndex}`;
            console.log(`Updating track ${trackId}, active: ${track.active}`);
            
            // Update track state with unique ID
            this.trackStates.set(trackId, track.active);
            
            // Get track bars - this is the track's individual loop length
            // Only default to arrangement bars if not specified
            const trackBars = track.bars !== undefined ? track.bars : arrangementBars;
            
            // Calculate how many notes we can fit in the track based on bars and time signature
            const timeSignature = data.signature || 4;
            const notesPerMeasure = track.time || 16;
            const totalNotes = notesPerMeasure * trackBars;
            
            // Get track volume
            const trackVolume = track.volume || 0;
            
            // Create new part for this track
            const part = new Tone.Part((time, event) => {
                const isTrackActive = this.trackStates.get(trackId);
                console.log(`Processing event for track ${trackId}, active: ${isTrackActive}, isSynth: ${event.isSynth}, synthType: ${event.synthType}, sample: ${event.sample}`);
                
                if (isTrackActive) {
                    // First check if this is a synth event
                    if (event.isSynth === true && event.synthType) {
                        console.log(`SYNTH EVENT DETECTED: ${event.synthType} with pitch ${event.pitch}`);
                        // Handle synth playback
                        console.log(`Attempting to play synth: ${event.synthType} with pitch ${event.pitch}`);
                        console.log(`Full event details: ${JSON.stringify(event)}`);
                        
                        const synth = this.getSynth(event.synthType);
                        console.log(`Got synth instance: ${synth ? 'Yes' : 'No'}`);
                        
                        if (synth) {
                            // Convert pitch to note name (if pitch is a MIDI number)
                            let note;
                            if (typeof event.pitch === 'number') {
                                note = this.midiToNoteName(event.pitch + 60); // Add 60 to get middle C range
                                console.log(`Converted pitch ${event.pitch} to note ${note}`);
                            } else {
                                note = event.pitch || "C4"; // Default to C4 if no pitch specified
                                console.log(`Using direct note ${note}`);
                            }
                            
                            // Apply volume adjustments
                            const noteVolume = event.volume || 0;
                            const combinedVolume = noteVolume + (event.trackVolume / 10) + (event.arrangementVolume / 10);
                            synth.volume.rampTo(combinedVolume * 20, 0.01); // Use ramping instead of direct assignment
                            
                            // Determine note duration - use event duration if available, otherwise default to "8n"
                            const duration = event.duration ? 
                                this.convertDurationToToneFormat(event.duration) : 
                                "8n";
                            
                            // Trigger the synth
                            synth.triggerAttackRelease(note, duration, time);
                            console.log(`Triggered synth ${event.synthType} with note ${note}, duration: ${duration}`);
                        }
                    } else {
                        // Handle sample playback
                        const player = this.players.get(event.sample);
                        if (player) {
                            // Apply pitch and volume adjustments if available
                            if (event.pitch !== 0) {
                                player.playbackRate = Math.pow(2, event.pitch / 12);
                            } else {
                                player.playbackRate = 1;
                            }
                            
                            // Apply combined volume adjustment with ramping to prevent pops
                            const noteVolume = event.volume || 0;
                            const combinedVolume = noteVolume + (event.trackVolume / 10) + (event.arrangementVolume / 10);
                            
                            // Scale to a reasonable dB range (-40dB to +6dB) with ramping
                            player.volume.rampTo(combinedVolume * 20, 0.01); // 10ms ramp
                            
                            // Add a tiny random offset to prevent multiple samples starting at exact same time
                            const tinyOffset = Math.random() * 0.005; // 0-5ms random offset
                            player.start(time + tinyOffset);
                        } else {
                            console.warn(`Player not found for sample: ${event.sample}`);
                        }
                    }
                }
            }, []);
            
            // Set loop properties
            part.loop = true;
            part.loopEnd = `${trackBars}m`;
            console.log(`Setting track ${trackId} loop length to ${trackBars}m`);
            
            // Create an array to store events for this track
            const events = [];
            
            // Add events to the part
            track.notes.forEach((note, index) => {
                // Skip notes that exceed the track's length
                if (index >= totalNotes) {
                    return;
                }
                
                if (note.active) {
                    // Calculate time based on the time signature and track's time parameter
                    const beatsPerMeasure = timeSignature;
                    const subdivision = beatsPerMeasure / notesPerMeasure;
                    
                    // Calculate which measure this note belongs to
                    const measure = Math.floor(index / notesPerMeasure);
                    
                    // Calculate position within the measure
                    const positionInMeasure = index % notesPerMeasure;
                    
                    // Calculate beat and sixteenth
                    const beat = Math.floor(positionInMeasure * subdivision);
                    const remainder = (positionInMeasure * subdivision) % 1;
                    const sixteenth = Math.floor(remainder * 4);
                    
                    const time = `${measure}:${beat}:${sixteenth}`;
                    
                    // Create the event object
                    const event = {
                        time,
                        sample: track.sample,
                        pitch: note.pitch || 0,
                        volume: note.volume || 0,
                        trackVolume: trackVolume,
                        arrangementVolume: arrangementVolume,
                        // Add synth information if this is a synth track
                        isSynth: track.isSynth || false,
                        synthType: track.synthType || null,
                        // Add duration for synth notes
                        duration: note.duration
                    };
                    
                    // Add the event to our array
                    events.push(event);
                    
                    // Debug log for synth events in update method
                    if (track.isSynth) {
                        console.log(`Update: Created synth event: ${track.synthType} at time ${time} with pitch ${note.pitch || 0}, duration: ${note.duration || 'default'}`);
                    }
                }
            });
            
            // Add all events to the part
            events.forEach(event => part.add(event));
            console.log(`Added ${events.length} events to part for track ${trackId}`);
            
            // Store and start the part
            this.parts.set(trackId, part);
            part.start(0);
        });
    },

    // Start playback
    start(data) {
        if (!data) {
            console.error('No data provided for playback');
            return;
        }
        
        this.createParts(data);
        this.currentStep = 0;
        
        // Store current arrangement ID
        const activeArrangement = data.arrangements.find(arr => arr.active);
        if (activeArrangement) {
            this.currentArrangementId = activeArrangement.id;
        } else {
            console.warn('No active arrangement found for playback');
            return;
        }
        
        // Start all parts
        this.parts.forEach(part => part.start(0));
        
        // Start transport
        this.transport.start();
        console.log('Playback started');
    },

    // Stop playback
    stop() {
        this.transport.stop();
        this.currentStep = 0;
        
        // Stop and dispose all parts
        this.parts.forEach(part => {
            part.stop();
            part.dispose();
        });
        this.parts.clear();

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('stepChange', { 
                detail: { step: this.currentStep }
            }));
        }
        console.log('Playback stopped');
    },
    
    // Set tempo
    setTempo(bpm) {
        if (typeof bpm === 'number' && bpm > 0) {
            this.transport.bpm.value = bpm;
        }
    }
};

// Export the player for use in other modules
if (typeof module !== 'undefined') {
    module.exports = player;
} 