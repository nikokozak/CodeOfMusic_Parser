// Audio player using Tone.js for drum machine playback
const player = {
    // Core properties
    players: new Map(),         // Store for sample players
    transport: Tone.Transport,  // Tone.js transport
    currentStep: 0,             // Current step in the sequence
    stepLength: '16n',          // Default step length
    parts: new Map(),           // Track -> Part mapping
    trackStates: new Map(),     // Track -> active state mapping
    currentArrangementId: null, // Currently active arrangement ID
    
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
        this.parts.clear();
        this.trackStates.clear();
        
        // Set default tempo and loop length
        this.transport.bpm.value = data.tempo || 120;
        
        // Default to 1 measure loop
        this.transport.setLoopPoints(0, "1m");
        this.transport.loop = true;
        
        // Preload all samples
        const loadPromises = [];
        
        for (const [name, path] of Object.entries(this.samples)) {
            try {
                const player = new Tone.Player({
                    url: path,
                    onload: () => console.log(`Loaded ${name}`),
                    onerror: (e) => console.error(`Error loading ${name}:`, e)
                }).toDestination();
                
                this.players.set(name, player);
                loadPromises.push(new Promise((resolve, reject) => {
                    player.onstop = resolve;
                    player.onerror = reject;
                    // Add timeout in case the sample never loads
                    setTimeout(resolve, 5000);
                }));
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
        
        // Finalize initialization
        await Tone.loaded();
        console.log('Player initialization complete');
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

        // Create parts for each track
        activeArrangement.tracks.forEach(track => {
            console.log(`Processing track ${track.name}, active: ${track.active}, time: ${track.time}`);
            
            // Store track state
            this.trackStates.set(track.name, track.active);
            
            const events = [];
            
            // Calculate how many notes we can fit in the track based on bars and time signature
            // time parameter represents subdivisions per measure
            const notesPerMeasure = track.time || 16;
            const totalNotes = notesPerMeasure * (track.bars || arrangementBars);
            
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
                        volume: note.volume || 0
                    });
                }
            });

            console.log(`Created ${events.length} events for track ${track.name}`);

            // Create part for this track
            const part = new Tone.Part((time, event) => {
                const isTrackActive = this.trackStates.get(track.name);
                if (isTrackActive) {
                    const player = this.players.get(event.sample);
                    if (player) {
                        // Apply pitch and volume adjustments if available
                        if (event.pitch !== 0) {
                            player.playbackRate = Math.pow(2, event.pitch / 12);
                        } else {
                            player.playbackRate = 1;
                        }
                        
                        // Apply volume adjustment
                        const volumeAdjust = event.volume || 0;
                        player.volume.value = volumeAdjust * 20; // Convert to dB scale
                        
                        player.start(time);
                    } else {
                        console.warn(`Player not found for sample: ${event.sample}`);
                    }
                }
            }, events);

            part.loop = true;
            
            // Set the loop end based on the arrangement's bars
            // This ensures all tracks loop together with the arrangement
            part.loopEnd = `${arrangementBars}m`;
            console.log(`Setting track ${track.name} loop length to ${arrangementBars}m`);
            
            this.parts.set(track.name, part);
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
        activeArrangement.tracks.forEach(track => {
            console.log(`Updating track ${track.name}, active: ${track.active}`);
            
            // Update track state
            this.trackStates.set(track.name, track.active);
            
            // Get or create part for this track
            let part = this.parts.get(track.name);
            if (!part) {
                console.log(`Part for track ${track.name} not found, recreating all parts`);
                this.createParts(data);
                part = this.parts.get(track.name);
                return;
            }

            if (part) {
                // Update loop end to match arrangement bars
                part.loopEnd = `${arrangementBars}m`;
                
                // Update events
                part.clear();
                
                // Calculate how many notes we can fit in the track based on bars and time signature
                const timeSignature = data.signature || 4;
                const notesPerMeasure = track.time || 16;
                const totalNotes = notesPerMeasure * (track.bars || arrangementBars);
                
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
                        
                        part.add({
                            time,
                            sample: track.sample,
                            pitch: note.pitch || 0,
                            volume: note.volume || 0
                        });
                    }
                });
            }
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
            console.log(`Tempo set to ${bpm} BPM`);
        }
    }
}; 