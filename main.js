// Main program orchestration
// Handles the connection between the editor, parser, and Tone.js

let jar; // CodeJar instance
let sampleBank = {}; // Store loaded samples

/**
 * Helper function to get or create a player for a specific sound
 * @param {Object} synthBank - Collection of available synths
 * @param {string} soundName - Name of the sound to get a player for
 * @returns {Tone.Player|Tone.Synth} The appropriate player or synth
 */
const getSynthForSound = (synthBank, soundName) => {
  // If we already have a synth for this sound in the synthBank, return it
  if (synthBank[soundName]) {
    return synthBank[soundName];
  }

  // Check if we have a sample for this sound
  if (sampleBank[soundName]) {
    // Create a new player with the same buffer to allow multiple simultaneous playbacks
    const player = new Tone.Player(sampleBank[soundName].buffer).toDestination();
    
    // Make sure it's ready to play
    player.sync();
    
    // Add it to our bank for reuse
    synthBank[soundName] = player;
    console.log(`Created new player for ${soundName}`);
    return player;
  }

  // If no sample is available, create a fallback synth
  console.warn(`No sample found for "${soundName}", using fallback synth`);
  const fallbackSynth = getFallbackSynth(soundName);

  // Add it to our bank for reuse
  synthBank[soundName] = fallbackSynth;
  console.log(`Created fallback synth for ${soundName}`);

  return fallbackSynth;
};

/**
 * Helper function to get appropriate note for a sound based on pitch adjustment
 * @param {string} soundName - Name of the sound
 * @param {number} pitch - Pitch adjustment
 * @returns {string} The appropriate note
 */
const getNoteForSound = (soundName, pitch) => {
  // Generate an appropriate note based on the sound type and pitch
  switch (soundName.toLowerCase()) {
    case 'kick':
      // Lower pitch for kick drums
      return Tone.Frequency(36 + pitch, 'midi').toNote();
    case 'snare':
      // We don't need a specific note for noise-based synths
      return 'C2';
    case 'hihat':
      // Higher pitch for hihats
      return Tone.Frequency(80 + pitch, 'midi').toNote();
    case 'synth':
      // For melodic instruments, use the pitch directly
      return Tone.Frequency(60 + pitch, 'midi').toNote();
    default:
      // Default to middle C + pitch
      return Tone.Frequency(60 + pitch, 'midi').toNote();
  }
};

/**
 * Helper function to create a Tone.js effect
 * @param {string} effectType - Type of effect to create
 * @param {Array} params - Effect parameters
 * @returns {Tone.Effect} The created effect or null if failed
 */
const createToneEffect = (effectType, params) => {
  try {
    switch (String(effectType).toLowerCase()) {
      case 'chorus':
        return new Tone.Chorus(
          params[0] || 4, // frequency
          params[1] || 2.5, // delayTime
          params[2] || 0.7  // depth
        ).start();
      case 'reverb':
        return new Tone.Reverb(params[0] || 3); // decay time
      case 'delay':
        return new Tone.FeedbackDelay(
          params[0] || '8n', // delay time
          params[1] || 0.5   // feedback
        );
      case 'distortion':
        return new Tone.Distortion(params[0] || 0.4); // amount
      default:
        console.warn(`Unknown effect type: ${effectType}`);
        return null;
    }
  } catch (err) {
    console.error(`Error creating effect ${effectType}:`, err);
    return null;
  }
};

/**
 * Play a drum machine with multiple arrangements
 * @param {Object} event - The drum machine event
 * @param {Object} synthBank - Collection of available synths
 * @param {number} time - The time to start playing
 * @returns {number} The total duration of the drum machine
 */
const playDrumMachine = (event, synthBank, time) => {
  const { arrangements, tempo = 120, signature = 4 } = event;
  let maxDuration = 0;

  console.log('Playing drum machine:', {
    tempo,
    signature,
    arrangementCount: arrangements ? arrangements.length : 0,
    arrangements: arrangements
  });

  // Only play active arrangements
  if (!arrangements || !Array.isArray(arrangements)) {
    console.error('No arrangements found in drum machine or arrangements is not an array');
    return 0;
  }

  arrangements.forEach((arrangement, index) => {
    console.log(`Processing arrangement ${index}:`, arrangement);
    
    if (arrangement && arrangement.type === 'arrangement') {
      const duration = playArrangement(arrangement, synthBank, time, { tempo, signature });
      console.log(`Arrangement ${index} duration:`, duration);
      maxDuration = Math.max(maxDuration, duration);
    } else {
      console.warn(`Arrangement ${index} is invalid:`, arrangement);
    }
  });

  console.log('Total drum machine duration:', maxDuration);
  return maxDuration;
};

/**
 * Play an arrangement with multiple tracks
 * @param {Object} event - The arrangement event
 * @param {Object} synthBank - Collection of available synths
 * @param {number} time - The time to start playing
 * @param {Object} context - Context information like tempo, signature
 * @returns {number} The total duration of the arrangement
 */
const playArrangement = (event, synthBank, time, context = {}) => {
  const { tracks, active = true, bars = 1 } = event;
  const { tempo = 120, signature = 4 } = context;

  console.log('Playing arrangement:', {
    active,
    bars,
    tempo,
    signature,
    trackCount: tracks ? tracks.length : 0
  });

  // Only play if arrangement is active
  if (!active) {
    console.log('Arrangement is not active, skipping');
    return 0;
  }

  // Calculate total duration of this arrangement
  const barDuration = (60 / tempo) * signature;
  const totalDuration = bars * barDuration;

  console.log('Arrangement timing:', {
    barDuration,
    totalDuration,
    startTime: time
  });

  // Play all tracks in this arrangement
  if (!tracks || !Array.isArray(tracks)) {
    console.error('No tracks found in arrangement or tracks is not an array');
    return totalDuration;
  }

  tracks.forEach((track, index) => {
    console.log(`Processing track ${index}:`, track);
    
    if (track && track.type === 'track') {
      playTrack(track, synthBank, time, {
        tempo,
        signature,
        bars,
        barDuration,
        arrangementDuration: totalDuration
      });
    } else {
      console.warn(`Track ${index} is invalid:`, track);
    }
  });

  return totalDuration;
};

/**
 * Play a track with multiple steps
 * @param {Object} event - The track event
 * @param {Object} synthBank - Collection of available synths
 * @param {number} time - The time to start playing
 * @param {Object} context - Context information
 * @returns {number} The total duration of the track
 */
const playTrack = (event, synthBank, time, context = {}) => {
  const { soundName, steps } = event;
  const { tempo = 120, arrangementDuration } = context;

  // Debug track structure
  console.log('Playing track:', {
    soundName,
    stepsCount: steps ? steps.length : 0,
    arrangementDuration
  });

  // Get or create synth for this sound
  const synth = getSynthForSound(synthBank, soundName);
  console.log(`Got synth for sound "${soundName}":`, synth ? 'Success' : 'Failed');

  // Calculate step duration based on total arrangement duration and number of steps
  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    console.error(`No steps found in track "${soundName}" or steps is not an array`);
    return arrangementDuration;
  }

  const stepDuration = arrangementDuration / steps.length;
  console.log(`Step duration for track "${soundName}":`, stepDuration);

  // Play each step
  steps.forEach((step, index) => {
    const stepTime = time + (index * stepDuration);
    console.log(`Processing step ${index} at time ${stepTime}:`, step);
    
    if (step && (step.type === 'step' || step.type === 'effect')) {
      if (step.type === 'step') {
        playStep(step, synth, stepTime, {
          stepDuration,
          soundName
        });
      } else if (step.type === 'effect') {
        playEffect(step, synth, stepTime, {
          stepDuration,
          soundName
        });
      }
    } else {
      console.warn(`Step ${index} is invalid:`, step);
    }
  });

  return arrangementDuration;
};

/**
 * Play a step in a track
 * @param {Object} event - The step event
 * @param {Tone.Player|Tone.Synth} synth - The synth or player to use
 * @param {number} time - The time to play the step
 * @param {Object} context - Context information
 * @returns {number} The duration of the step
 */
const playStep = (event, synth, time, context = {}) => {
  const { active, pitch = 0, volume = 0, duration = 0.25 } = event;
  const { stepDuration, soundName } = context;

  console.log(`Playing step for "${soundName}":`, {
    active,
    pitch,
    volume,
    duration,
    stepDuration,
    time
  });

  // Only play if step is active
  if (!active) {
    console.log(`Step for "${soundName}" is inactive, skipping`);
    return stepDuration;
  }

  // Calculate velocity/volume (normalize to 0-1 range)
  const velocity = Math.min(Math.max(0.5 + (volume * 0.5), 0), 1);

  // Check if we're dealing with a sample player or a synth
  if (synth instanceof Tone.Player) {
    // For sample players
    console.log(`Using sample player for "${soundName}"`);

    // Set playback rate based on pitch (1.0 is normal, each semitone is roughly 6% change)
    const playbackRate = Math.pow(2, pitch / 12); // 2^(semitones/12) gives the frequency ratio
    synth.playbackRate = playbackRate;

    // Set volume in dB (convert from our 0-1 scale to a reasonable dB range)
    const volumeDb = Tone.gainToDb(velocity);
    synth.volume.value = volumeDb;

    // Make sure the player is connected to the destination
    if (!synth.connected) {
      console.log(`Connecting player for "${soundName}" to destination`);
      synth.connect(Tone.getDestination());
    }

    // Play the sample
    try {
      // Use immediate scheduling for more reliable playback
      const now = Tone.now();
      synth.start(now);
      console.log(`Started sample "${soundName}" at time ${now}, duration ${duration}, playbackRate ${playbackRate}, volume ${volumeDb}dB`);
    } catch (err) {
      console.error(`Error playing sample "${soundName}":`, err);
    }
  } else {
    // For synthesizers
    console.log(`Using synthesizer for "${soundName}"`);

    // Determine the actual note based on the soundName and pitch
    const note = getNoteForSound(soundName, pitch);

    // Make sure the synth is connected to the destination
    if (!synth.connected) {
      console.log(`Connecting synth for "${soundName}" to destination`);
      synth.connect(Tone.getDestination());
    }

    // Play the sound
    try {
      // Use immediate scheduling for more reliable playback
      const now = Tone.now();
      synth.triggerAttackRelease(
        note,
        duration,
        now,
        velocity
      );
      console.log(`Triggered synth "${soundName}" with note ${note} at time ${now}, duration ${duration}, velocity ${velocity}`);
    } catch (err) {
      console.error(`Error triggering synth "${soundName}":`, err);
    }
  }

  return stepDuration;
};

/**
 * Play an effect applied to a step
 * @param {Object} event - The effect event
 * @param {Tone.Player|Tone.Synth} synth - The synth or player to use
 * @param {number} time - The time to play the effect
 * @param {Object} context - Context information
 * @returns {number} The duration of the effect
 */
const playEffect = (event, synth, time, context) => {
  const { effectType, params, target } = event;

  // Create effect instance based on type
  const effect = createToneEffect(effectType, params);

  if (effect) {
    // Store original connections
    let originalConnections;

    // Handle different types of synths/players
    if (synth instanceof Tone.Player) {
      // For sample players
      originalConnections = [...synth.getDestination()];
      synth.disconnect();
      synth.connect(effect);
    } else {
      // For synthesizers
      originalConnections = [...synth.getDestination()];
      synth.disconnect();
      synth.connect(effect);
    }

    effect.toDestination();

    // Play the target with the effect applied
    let duration = 0;
    if (target && target.type === 'step') {
      duration = playStep(target, synth, time, context);
    } else {
      console.warn('Effect target is not a valid step:', target);
      duration = context.stepDuration || 0;
    }

    // Schedule effect cleanup
    Tone.Transport.schedule(() => {
      synth.disconnect(effect);
      effect.dispose();
      // Reconnect to original destinations
      originalConnections.forEach(dest => synth.connect(dest));
    }, time + duration);

    return duration;
  }

  // If effect creation failed, just play the target directly
  if (target && target.type === 'step') {
    return playStep(target, synth, time, context);
  }
  return context.stepDuration || 0;
};

/**
 * Ensure the Tone.js audio context is started
 * @returns {Promise} Promise that resolves when the audio context is started
 */
const ensureAudioContext = async () => {
  if (Tone.context.state !== 'running') {
    console.log('Starting Tone.js audio context...');
    await Tone.start();
    console.log('Tone.js audio context started:', Tone.context.state);
    
    // Play a silent sound to ensure the audio context is fully activated
    const silentOsc = new Tone.Oscillator().toDestination();
    silentOsc.volume.value = -Infinity;
    silentOsc.start();
    silentOsc.stop('+0.1');
    
    return true;
  } else {
    console.log('Tone.js audio context already running');
    return false;
  }
};

/**
 * Test audio playback with a simple beep
 */
const testAudio = () => {
  try {
    console.log('Testing audio with a simple beep...');
    
    // Create a simple synth
    const synth = new Tone.Synth({
      oscillator: {
        type: 'sine'
      },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 0.4
      }
    }).toDestination();
    
    // Play a note
    synth.triggerAttackRelease('C4', 0.3);
    
    console.log('Test beep played');
  } catch (err) {
    console.error('Error testing audio:', err);
  }
};

const initializeProgram = async () => {
  // Initialize editor first
  jar = initEditor();

  // Load samples
  try {
    console.log('Loading audio samples...');
    await loadSamples();
  } catch (err) {
    console.error('Error loading samples:', err);
  }

  // Add run button handler
  document.getElementById('run').addEventListener('click', async () => {
    try {
      // Start audio context on user interaction
      await ensureAudioContext();
      
      // Execute the code
      executeCode(jar.toString());
    } catch (err) {
      console.error('Error starting audio context:', err);
    }
  });

  // Add test audio button if it exists
  const testButton = document.getElementById('test-audio');
  if (testButton) {
    testButton.addEventListener('click', async () => {
      try {
        await ensureAudioContext();
        testAudio();
      } catch (err) {
        console.error('Error testing audio:', err);
      }
    });
  }

  // Add Ctrl+Enter handler
  document.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      try {
        // Start audio context on user interaction
        await ensureAudioContext();
        
        // Execute the code
        executeCode(jar.toString());
      } catch (err) {
        console.error('Error starting audio context:', err);
      }
    }
  });
};

/**
 * Execute the code from the editor
 * This function parses the code, interprets it, and handles the music playback
 */
const executeCode = (code) => {
  try {
    // Parse the code into an AST
    const ast = parseProgram(code);
    if (ast === null) {
      console.error('Failed to parse code');
      return;
    }

    console.log('Parsed AST:', ast);

    // Interpret the AST
    try {
      const result = interpret(ast);
      console.log('Interpreted result:', result);

      // Play the music events
      try {
        playMusicEvents(result);
      } catch (e) {
        console.error('Playback error:', e);
      }
    } catch (e) {
      console.error('Interpretation error:', e);
    }
  } catch (e) {
    console.error('Execution error:', e);
  }
};

/**
 * Play a single note event
 * @param {Object} event - The note event
 * @param {Tone.PolySynth} synth - The synth to use
 * @param {number} time - The time to play the note
 * @returns {number} The duration of the event
 */
const playNote = (event, synth, time) => {
  synth.triggerAttackRelease(
    event.pitch,
    event.duration,
    time,
    event.velocity || 0.7
  );
  return event.duration;
};

/**
 * Play a chord event
 * @param {Object} event - The chord event
 * @param {Tone.PolySynth} synth - The synth to use
 * @param {number} time - The time to play the chord
 * @returns {number} The duration of the event
 */
const playChord = (event, synth, time) => {
  synth.triggerAttackRelease(
    event.notes,
    event.duration,
    time,
    event.velocity || 0.7
  );
  return event.duration;
};

/**
 * Play a sequence of events in order
 * @param {Object} event - The sequence event
 * @param {Tone.PolySynth} synth - The synth to use
 * @param {number} startTime - The starting time
 * @returns {number} The total duration of the sequence
 */
const playSequence = (event, synth, startTime) => {
  let currentTime = startTime;
  let totalDuration = 0;

  event.events.forEach(e => {
    if (!e) return;

    const duration = playEvent(e, synth, currentTime);
    currentTime += duration;
    totalDuration += duration;
  });

  return totalDuration;
};

/**
 * Play multiple events in parallel
 * @param {Object} event - The parallel event
 * @param {Tone.PolySynth} synth - The synth to use
 * @param {number} time - The time to start playing
 * @returns {number} The maximum duration of any event
 */
const playParallel = (event, synth, time) => {
  // Calculate the maximum duration
  const durations = event.events.map(e => {
    if (!e) return 0;
    return playEvent(e, synth, time);
  });

  return Math.max(...durations, 0);
};

/**
 * Play a beat machine pattern
 * @param {Object} event - The beat machine event
 * @param {Tone.PolySynth} synth - The synth to use
 * @param {number} time - The time to start playing
 * @returns {number} The total duration of the pattern
 */
const playBeatMachine = (event, synth, time) => {
  const { pattern, sounds, tempo = 120, swing = 0 } = event;
  const beatDuration = 60 / tempo;

  // Parse the pattern (a string like "x...x...x...x...")
  if (typeof pattern === 'string') {
    // Convert pattern to events
    [...pattern].forEach((char, i) => {
      if (char === 'x' || char === 'X') {
        // Add swing factor for even-numbered beats
        const swingAdjustment = (i % 2 === 1) ? (beatDuration * swing) : 0;
        const noteTime = time + (i * beatDuration) + swingAdjustment;

        // Use the sound if provided, otherwise use a default sound
        const sound = Array.isArray(sounds) && sounds.length > 0 ?
          sounds[0] : "C2";

        synth.triggerAttackRelease(
          sound,
          beatDuration / 2, // Short duration for percussion sounds
          noteTime,
          0.7
        );
      }
    });

    return pattern.length * beatDuration;
  }

  return 0; // If pattern not recognized
};

/**
 * Play any type of music event
 * @param {Object} event - The music event to play
 * @param {Tone.PolySynth} synth - The synth to use
 * @param {number} time - The time to play the event
 * @param {Object} context - Additional context information
 * @returns {number} The duration of the event
 */
const playEvent = (event, synth, time, context = {}) => {
  if (!event || !event.type) return 0;

  switch (event.type) {
    case 'note':
      return playNote(event, synth, time);

    case 'chord':
      return playChord(event, synth, time);

    case 'sequence':
      return playSequence(event, synth, time);

    case 'parallel':
      return playParallel(event, synth, time);

    case 'beat-machine':
      return playBeatMachine(event, synth, time);

    case 'drum-machine':
      return playDrumMachine(event, synth, time);

    case 'arrangement':
      return playArrangement(event, synth, time, context);

    case 'track':
      return playTrack(event, synth, time, context);

    case 'step':
      return playStep(event, synth, time, context);

    case 'effect':
      return playEffect(event, synth, time, context);

    default:
      console.warn(`Unknown event type: ${event.type}`);
      return 0;
  }
};

/**
 * Play a sequence of music events using Tone.js
 * @param {Array} events - Array of music events to play
 */
const playMusicEvents = (events) => {
  try {
    console.log('Starting playback of music events:', {
      eventCount: events ? events.length : 0,
      eventTypes: events ? events.map(e => e && e.type).filter(Boolean) : []
    });

    // Create synth bank to store different synthesizers
    const synthBank = {
      default: new Tone.PolySynth().toDestination()
      // Additional synths will be created on demand by getSynthForSound
    };

    // Current time in seconds
    let time = Tone.now();
    console.log('Starting playback at time:', time);

    // Process each top-level event
    events.forEach((event, index) => {
      if (!event) {
        console.log(`Event ${index} is null, skipping`);
        return; // Skip null events
      }

      console.log(`Processing event ${index}:`, {
        type: event.type,
        time
      });

      try {
        // Handle the drum-machine case specially
        if (event && event.type === 'drum-machine') {
          console.log(`Playing drum-machine event ${index}`);
          const duration = playDrumMachine(event, synthBank, time);
          console.log(`Drum-machine event ${index} duration:`, duration);
          time += duration;
          return;
        }

        // For other events, use the appropriate synth (default if not specified)
        const synth = event.instrument && synthBank[event.instrument] ?
          synthBank[event.instrument] : synthBank.default;

        // Play the event and add its duration to the current time
        const duration = playEvent(event, synth, time);
        console.log(`Event ${index} (${event.type}) duration:`, duration);
        time += duration;
      } catch (err) {
        console.error(`Error playing event ${index} (${event && event.type}):`, err);
      }
    });

    console.log('Finished scheduling all music events');
  } catch (err) {
    console.error('Error in playMusicEvents:', err);
  }
};

/**
 * Load audio samples from the samples/ directory
 * @returns {Promise} Promise that resolves when all samples are loaded
 */
const loadSamples = async () => {
  try {
    console.log('Starting to load audio samples...');
    
    // Define the default samples to load
    const defaultSamples = {
      'kick': 'samples/TR-505_Tape_Kick.wav',
      'snare': 'samples/TR-505_Tape_Snare.wav',
      'hihat': 'samples/TR-505_Tape_ClosedHH.wav',
      'clap': 'samples/TR-505_Tape_Clap.wav',
      'tom': 'samples/TR-505_Tape_HiTom.wav',
      'rim': 'samples/TR-505_Tape_Rimshot.wav',
      'cowbell': 'samples/TR-505_Tape_LowCowbell.wav'
    };

    console.log('Sample paths:', defaultSamples);

    // Try to scan the samples directory for additional samples
    // This would normally use a server-side API or fetch, but for simplicity
    // we'll just use the default list for now

    // In a real implementation, you would do something like:
    // const response = await fetch('/api/list-samples');
    // const additionalSamples = await response.json();
    // const allSamples = { ...defaultSamples, ...additionalSamples };

    const allSamples = defaultSamples;

    // Create a buffer for each sample
    const loadPromises = Object.entries(allSamples).map(([name, path]) => {
      console.log(`Attempting to load sample: ${name} from ${path}`);
      return new Promise((resolve, reject) => {
        try {
          const player = new Tone.Player({
            url: path,
            onload: () => {
              console.log(`Successfully loaded sample: ${name}`);
              sampleBank[name] = player;
              resolve();
            },
            onerror: (err) => {
              console.warn(`Failed to load sample: ${name} from ${path}`, err);
              // Create a fallback synth instead
              sampleBank[name] = getFallbackSynth(name);
              resolve(); // Resolve anyway to continue loading other samples
            }
          }).toDestination();
        } catch (err) {
          console.warn(`Error creating player for sample: ${name}`, err);
          sampleBank[name] = getFallbackSynth(name);
          resolve(); // Resolve anyway to continue loading other samples
        }
      });
    });

    await Promise.all(loadPromises);
    console.log('All samples loaded successfully');

    // Display loaded samples in the console for debugging
    console.log('Available samples:', Object.keys(sampleBank).join(', '));

    return true;
  } catch (err) {
    console.error('Error loading samples:', err);
    return false;
  }
};

/**
 * Get a fallback synth for a sample that failed to load
 * @param {string} sampleName - Name of the sample
 * @returns {Tone.Synth} A synthesizer that approximates the sample
 */
const getFallbackSynth = (sampleName) => {
  switch (sampleName.toLowerCase()) {
    case 'kick':
      return new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 10,
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.001,
          decay: 0.4,
          sustain: 0.01,
          release: 1.4,
          attackCurve: 'exponential'
        }
      }).toDestination();
    case 'snare':
      return new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: {
          attack: 0.001,
          decay: 0.2,
          sustain: 0.01,
          release: 0.4
        }
      }).toDestination();
    case 'hihat':
      return new Tone.MetalSynth({
        frequency: 200,
        envelope: {
          attack: 0.001,
          decay: 0.1,
          release: 0.1
        },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 1000,
        octaves: 1.5
      }).toDestination();
    default:
      return new Tone.PolySynth().toDestination();
  }
};

// Wait for DOM and scripts to load
document.addEventListener('DOMContentLoaded', initializeProgram);

// Export for use in index.html
window.executeCode = executeCode;
window.initializeProgram = initializeProgram; 
