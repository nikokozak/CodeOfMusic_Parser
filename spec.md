# Code of Music Parser

## Overview
A web-based code editor for music programming using Tone.js. The editor uses CodeJar for a lightweight, efficient editing experience with syntax highlighting via Prism.

## Language Features

### Core Syntax
The language is Lisp-like, with s-expressions for all operations. Basic syntax:
```lisp
(operation arg1 arg2 ...)
```

### Special Forms
- `let`: Create local bindings
  ```lisp
  (let [[name1 value1]
        [name2 value2]]
    body...)
  ```
- `lambda`: Create functions
  ```lisp
  (lambda [params...] body...)
  ```
- `if`: Conditional execution
  ```lisp
  (if condition then-expr else-expr)
  ```

### Named Arguments
Functions can take named arguments using keywords:
```lisp
(note "C4" :duration 0.5 :velocity 0.8)
```

### Music Primitives
- `note`: Play a single note
  ```lisp
  (note pitch duration)
  ```
- `chord`: Play multiple notes simultaneously
  ```lisp
  (chord [pitches] duration)
  ```
- `sequence`: Play events in sequence
  ```lisp
  (sequence event1 event2 ...)
  ```
- `parallel`: Play events simultaneously
  ```lisp
  (parallel event1 event2 ...)
  ```

### Arithmetic Operations
- `+`: Addition
- `-`: Subtraction
- `*`: Multiplication
- `/`: Division

### Comparison Operations
- `=`: Equality
- `<`: Less than
- `>`: Greater than

## Implementation Details

### Files
- `index.html`: Main application file containing the editor and all necessary scripts
- `parser.js`: Converts input text into an Abstract Syntax Tree (AST)
- `interpreter.js`: Evaluates the AST and produces music events
- `main.js`: Orchestrates the editor, parser, interpreter, and audio playback
- `editor.js`: CodeJar editor setup and configuration

### Architecture
1. User inputs code in the editor
2. On execution (Ctrl+Enter or Run button):
   - Code is parsed into an AST
   - AST is interpreted into music events
   - Events are played using Tone.js

### Environment
The interpreter maintains an immutable environment chain for variable bindings and function definitions. Each function call creates a new environment frame, allowing for lexical scoping.

## Future Enhancements
- Add more music primitives (filters, effects, etc.)
- Implement error handling with line numbers
- Add visualization for audio output
- Add save/load functionality
- Add example presets
- Add MIDI input/output support 