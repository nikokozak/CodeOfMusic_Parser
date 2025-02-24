# Code of Music Parser Specification

## Project Overview

The Code of Music parser is a live programming environment for music creation using a Lisp-like language that compiles to Tone.js commands. The system follows a functional programming approach with clear separation of concerns.

## Architecture

The project consists of several key components:

### 1. Parser (`parser.js`)
- Converts Lisp-like syntax into an Abstract Syntax Tree (AST)
- Provides robust error handling with line and column information
- Processes comments, strings, and nested expressions

### 2. Interpreter (`interpreter.js`)
- Evaluates the AST produced by the parser
- Manages environments for variable lookup and binding
- Provides core language primitives (arithmetic, comparison, music)
- Implements special forms (quote, let, lambda, if)

### 3. Playback (`main.js`)
- Converts interpreted music events into Tone.js commands
- Manages timing and sequencing of audio events
- Handles different event types (notes, chords, sequences, parallel events)

### 4. Editor (`editor.js` + `codejar.js` + `linenumbers.js`)
- Provides a code editor with syntax highlighting
- Supports line numbers and basic editing features

## Language Features

### Core Language Constructs
- `quote`: Returns its argument unevaluated
- `let`: Creates local bindings
- `lambda`: Creates anonymous functions
- `if`: Conditional branching

### Mathematical Functions
- `+`, `-`, `*`, `/`: Basic arithmetic
- `mod`: Modulo operation
- `pow`: Exponentiation

### Comparison Functions
- `=`, `<`, `>`, `<=`, `>=`, `!=`: Comparison operators

### Music Primitives
- `note`: Creates a note with pitch and duration
- `chord`: Creates a chord with multiple notes
- `sequence`: Plays events in sequence
- `parallel`: Plays events simultaneously
- `beat-machine`: Creates rhythmic patterns
- `drum-machine`: Complex sequencer with arrangements and tracks
- `arrangement`: Defines a section of music with multiple tracks
- `track`: Defines a sequence of steps for a specific instrument
- `step`: A single event in a track that triggers a sound
- `effect`: Applies an audio effect to a step or sequence

### Named Arguments
The language supports named arguments with the syntax `:name value`:
```lisp
(note "C4" :velocity 0.8 :instrument "piano")
```

## Environment Implementation

Environments are implemented as functions that close over bindings:
- Functions can lookup variables in their creating environment (lexical scoping)
- Each environment can have a parent environment for nested scopes
- Environments are immutable - operations return new environments

## Error Handling

Robust error handling with:
- Detailed error messages
- Line and column information for syntax errors
- Context information for better debugging

## Future Enhancements

Planned features for future versions:

1. **Multiple Instrument Support**
   - Allow different synths and samples for different parts
   - Add more Tone.js instruments

2. **Advanced Music Theory**
   - Scale and chord generation functions
   - Modulation and transposition

3. **Visualization**
   - Real-time visualization of music structures
   - Timeline display of events

4. **Live Coding Features**
   - Hot code reloading
   - Pattern matching
   - Advanced looping constructs

5. **Effects Processing**
   - Support for audio effects and processing
   - Reverb, delay, filters, etc.

## Drum Machine Features

The drum machine implementation provides a powerful way to create rhythmic patterns using a structure inspired by step sequencers and Tone.js's `Part` and `Sequence` objects.

### Core Components

1. **drum-machine**
   - Top-level container for rhythm patterns
   - Parameters:
     - `:tempo` (default: 120) - Beats per minute
     - `:signature` (default: 4) - Time signature (beats per measure)

2. **arrangement**
   - A section of music with a specific length and collection of tracks
   - Parameters:
     - `:active` (default: true) - Whether the arrangement should play (1 = active, 0 = inactive)
     - `:bars` (default: 1) - Length of the arrangement in bars/measures

3. **track**
   - A sequence of steps for a specific instrument sound
   - Parameters:
     - First argument: Sound name (e.g., "kick", "snare", "hihat", "synth")
     - Remaining arguments: Steps or effects in the track

4. **step**
   - A single event in a track that may trigger a sound
   - Parameters:
     - First argument: Active state (1 = play sound, 0 = silent)
     - `:pitch` (default: 0) - Pitch adjustment in semitones
     - `:volume` (default: 0) - Volume adjustment (-1 to 1)
     - `:duration` (default: 0.25) - Duration of the sound in seconds

5. **effect**
   - Applies an audio effect to a step
   - Parameters:
     - First argument: Effect type (e.g., 'Chorus', 'Reverb', 'Delay', 'Distortion')
     - Middle arguments: Effect-specific parameters
     - Last argument: The step to apply the effect to

### Instrument Sounds

The system uses audio samples from the `samples/` directory for drum and percussion sounds:

- **kick**: Kick drum sample (fallback: membrane synth)
- **snare**: Snare drum sample (fallback: noise synth)
- **hihat**: Hi-hat sample (fallback: metal synth)
- **clap**: Hand clap sample
- **tom**: Tom drum sample
- **rim**: Rim shot sample
- **cowbell**: Cowbell sample
- **synth**: A polyphonic synth for melodic content (not sample-based)
- Others: Will use any matching sample name from the samples directory

When a sample is specified in a track, the system:
1. Loads the corresponding audio file from the samples/ directory
2. Creates a Tone.js Player for sample playback
3. Adjusts playback rate based on pitch parameter
4. Adjusts volume based on volume parameter
5. Controls playback duration

If a sample cannot be found, the system falls back to a synthesized sound that approximates the requested instrument.

### Effects

The system supports several audio effects that can be applied to steps:

- **Chorus**: Creates a chorus effect with parameters for frequency, delay time, and depth
- **Reverb**: Adds reverb with a configurable decay time
- **Delay**: Creates echo effects with parameters for delay time and feedback
- **Distortion**: Adds distortion with a configurable amount

## Usage Examples

### Simple Drum Machine Example
```lisp
;; A simple drum pattern with kick and hihat
(drum-machine :tempo 120 :signature 4 
  (arrangement :active 1 :bars 2 
    (track "kick" 
      (step 1)
      (step 0)
      (step 1)
      (step 0))
    (track "hihat"
      (step 0)
      (step 1)
      (step 0)
      (step 1))))
```

### Complex Drum Machine Example
```lisp
(drum-machine :tempo 120 :signature 4 '[
  (arrangement :active 1 :bars 2 '[
    (track "kick" '[ ;; Kick drum track, plays the "kick" sample every step
      (step 0)
      (effect 'Chorus 4 2.5 0.5 ;; Chorus effect with corresponding parameters
        (step 1))
      (step 0)
      (step 1 :pitch 0 :volume 1) ;; Triggers "kick" sound with neutral pitch and +1 volume
    ])
    (track "snare" '[ ;; Tracks are constructed as ToneJS Parts with multiple steps
      (step 1)
      (step 0)
      (step 1)
      (step 0)
      (step 1)
    ])
    (track "hihat" '[
      (step 0)
      (step 1)
      (step 0)
      (step 1)
    ])
  ])
  (arrangement :active 0 :bars 4 '[
    (track "synth" '[
      (step 0 :pitch 60 :duration 0.5)
      (step 1 :pitch 62 :duration 0.5)
      (step 0 :pitch 64 :duration 0.5)
      (step 1 :pitch 65 :duration 0.5)
    ])
    (track "kick" '[
      (step 0 :pitch -3 :volume 0.5)
      (step 1 :pitch -1 :volume -0.5)
      (step 0 pitch 1 :volume 0.5)
      (step 1)
    ])
  )
])
```

### Basic Melodic Example
```lisp
; Define a simple melody
(let '(
  [tempo 120]
  [beat (/ 60 tempo)]
)
  (sequence
    (note "C4" beat)
    (note "E4" beat)
    (note "G4" beat)
    (chord '["C4" "E4" "G4"] (* beat 2)))
)

; Create a beat pattern
(beat-machine "x...x...x.x." '["C2"] :tempo 120 :swing 0.2)
``` 
