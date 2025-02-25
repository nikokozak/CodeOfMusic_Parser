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
     - `:volume` (default: 0) - Volume adjustment from -10 to 10

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
     - `:volume` (default: 0) - Volume adjustment from -10 to 10
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

## Parameter Hierarchy and Usage Guidelines

To ensure consistent behavior in the drum machine, the following guidelines should be followed:

### Tempo
- The `:tempo` parameter should only be specified at the `drum-machine` level
- It sets the global tempo in beats per minute (BPM)
- Default: 120 BPM

### Time Signature
- The `:signature` parameter should only be specified at the `drum-machine` level
- It sets the number of beats per measure (the top number in a time signature)
- Currently only supports signatures with 4 as the bottom number (e.g., 4/4, 3/4, 5/4)
- Default: 4 (for 4/4 time)

### Bars
- The `:bars` parameter can be specified at both the `arrangement` and `track` levels
- At the `arrangement` level, it sets the overall loop length for the transport
- At the `track` level, it sets the individual loop length for that specific track
- If a track's `:bars` parameter is not specified, it defaults to the arrangement's bars
- This allows for polyrhythmic patterns where tracks can have different loop lengths
- If a track has more notes than can fit in its bars, excess notes will be ignored
- Default: 1 bar

### Time (Steps per Measure)
- The `:time` parameter is specified at the `track` level
- It defines how many steps/notes fit within one measure for that track
- This allows different tracks to have different rhythmic divisions
- Default: 16 steps per measure

### Note Parameters
- `:active` - Whether the note triggers a sound (1) or is silent (0)
- `:pitch` - Pitch adjustment in semitones (affects playback rate)
- `:volume` - Volume adjustment from -10 to 10

### Volume Control
- The `:volume` parameter can be specified at multiple levels:
  - **Arrangement level**: Sets the base volume for all tracks in the arrangement (range: -10 to 10)
  - **Track level**: Sets the volume for a specific track (range: -10 to 10)
  - **Note level**: Fine-tune volume for individual notes (range: -1 to 1)
- Volumes are additive across levels (arrangement + track + note)
- Default: 0 (neutral volume)

## Example with Parameters

```lisp
(drum-machine "example" :tempo 110 :signature 3
  (arrangement :active 1 :bars 2 :volume 2
    (track "kick" kick :active 1 :time 6 :volume 0
      (notes
        (note :active 1)
        (note :active 0)
        (note :active 1)
        (note :active 0)
        (note :active 1)
        (note :active 0)
      )
    )
    (track "hihat" hihat :active 1 :time 12 :volume -4
      (notes
        (note :active 1 :volume 0.5)
        (note :active 1)
        (note :active 1 :volume 0.5)
        (note :active 1)
        (note :active 1 :volume 0.5)
        (note :active 1)
        (note :active 1 :volume 0.5)
        (note :active 1)
        (note :active 1 :volume 0.5)
        (note :active 1)
        (note :active 1 :volume 0.5)
        (note :active 1)
      )
    )
  )
)
```

In this example:
- The tempo is 110 BPM
- The time signature is 3/4 (3 beats per measure)
- The arrangement is 2 bars long with a volume boost of +2
- The kick track has 6 steps per measure (2 steps per beat) with neutral volume
- The hihat track has 12 steps per measure (4 steps per beat) with reduced volume (-4)
- Every other hihat note has a slight volume boost (+0.5)

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

## Implementation Update

The project has been streamlined by incorporating elements from the BeatParser example to create a more focused and functional implementation. The following changes were made:

### 1. Simplified Parser

The parser has been simplified to focus on the drum machine functionality. It now:
- Tokenizes Lisp-like syntax into a basic token stream
- Parses tokens into a nested structure
- Extracts drum machine data with proper track and note information
- Provides better error handling with clear messages

### 2. Dedicated Player Module

A dedicated player.js module has been added that:
- Manages sample loading and playback
- Creates Tone.js Parts for each track
- Handles track state changes in real-time
- Provides proper timing calculation based on track settings

### 3. Streamlined Main Module

The main.js file has been simplified to:
- Focus on core functionality (parsing, playback, UI integration)
- Provide clear error handling and status messages
- Integrate the CodeJar editor with real-time parsing

### 4. Drum Machine Focus

The implementation now focuses specifically on the drum machine functionality:
- Each track can have a different time signature
- Notes can have pitch and volume adjustments
- Arrangement changes are handled smoothly
- Real-time editing during playback is supported

This update provides a more focused and functional implementation that prioritizes a working drum machine over a more complex but less functional system.

## Macro System

The Code of Music Parser includes a macro expansion system to speed up common coding patterns. Macros are shorthand text patterns that expand into larger code snippets when triggered.

### Using Macros

1. Type a macro pattern (e.g., `*-notes-4`) on a new line in the editor
2. Press the Tab key to expand the macro into the full code snippet
3. A help panel is available by clicking the "?" button in the top-right corner

### Available Macros

#### Note Patterns

- `*-notes-N`: Expands to N inactive notes
  ```lisp
  (note :active 0)
  (note :active 0)
  ...
  ```

- `*-active-N`: Expands to N active notes
  ```lisp
  (note :active 1)
  (note :active 1)
  ...
  ```

- `*-alt-N`: Expands to N alternating active/inactive notes
  ```lisp
  (note :active 1)
  (note :active 0)
  (note :active 1)
  ...
  ```

#### Rhythm Patterns

- `*-four-on-floor`: Basic kick drum pattern (one kick on the downbeat)
  ```lisp
  (note :active 1)
  (note :active 0)
  (note :active 0)
  (note :active 0)
  ```

- `*-basic-beat`: Standard kick and snare pattern
  ```lisp
  (note :active 1)
  (note :active 0)
  (note :active 0)
  (note :active 0)
  (note :active 0)
  (note :active 1)
  (note :active 0)
  (note :active 0)
  ```

- `*-hihat-8`: Eight active hihat notes
  ```lisp
  (note :active 1)
  (note :active 1)
  ...
  ```

#### Track Templates

- `*-kick-track`: Complete kick drum track
- `*-hihat-track`: Complete hihat track
- `*-snare-track`: Complete snare track

#### Full Templates

- `*-basic-arrangement`: Complete arrangement with kick, hihat, and snare tracks

#### Polyrhythm Helpers

- `*-poly-X-Y`: Generates two rhythms for X against Y polyrhythm
  For example, `*-poly-3-4` generates patterns for 3 against 4 polyrhythm

### Extending the Macro System

The macro system is defined in `macros.js` and can be easily extended with new patterns. Each macro is defined as a key-value pair in the `macros` object:

```javascript
const macros = {
    "*-my-macro": "(note :active 1)\n(note :active 0)",
    
    "*-dynamic-": (trigger) => {
        // Extract parameters from the trigger text
        const param = trigger.split('-').pop();
        // Generate and return the expanded code
        return `// Generated with parameter: ${param}`;
    }
};
```

Macros can be either:
1. Static strings that are inserted directly
2. Functions that generate dynamic content based on the trigger text
