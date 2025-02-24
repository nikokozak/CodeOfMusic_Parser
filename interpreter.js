// Interpreter for our Lisp-like music language
// This module takes an AST and executes it using Tone.js

/**
 * Create a new environment frame
 * @param {Object} bindings - Initial variable bindings
 * @param {Function} parent - Parent environment lookup function (or null)
 * @returns {Function} Environment lookup function that includes get, set, and has methods
 */
const createEnv = (bindings = {}, parent = null) => {
  // Create a copy of bindings to ensure immutability
  const env = { ...bindings };

  // Return an enhanced lookup function with additional methods
  const lookup = name => {
    if (name in env) {
      return env[name];
    }
    if (parent) {
      return parent(name);
    }
    throw new Error(`Undefined variable: ${name}`);
  };

  // Add methods to the lookup function
  lookup.get = name => lookup(name);
  lookup.has = name => name in env || (parent && parent.has(name));
  lookup.set = (name, value) => {
    // Returns a new environment with the updated binding
    const newEnv = { ...env, [name]: value };
    return createEnv(newEnv, parent);
  };

  return lookup;
};

/**
 * Extend an environment with new bindings
 * @param {Function} env - Current environment
 * @param {Object} newBindings - New bindings to add
 * @returns {Function} New environment with added bindings
 */
const extendEnv = (env, newBindings) =>
  createEnv(newBindings, env);

/**
 * Debug function to test string handling
 * @param {Array} args - Arguments to the debug function
 * @param {Function} env - The environment
 * @param {Object} namedArgs - Named arguments (unused but included for compatibility)
 * @returns {Object} Debug information about the arguments
 */
function debugStrings(args, env, namedArgs = {}) {
  return args.map(arg => ({
    original: arg,
    type: typeof arg,
    isObject: typeof arg === 'object',
    hasType: arg && typeof arg === 'object' && 'type' in arg,
    extractedValue: extractValue(arg),
    evaluated: evaluate(arg, env)
  }));
}

/**
 * Debug function to test named arguments handling
 * @param {Array} args - Regular arguments
 * @param {Function} env - The environment
 * @param {Object} namedArgs - Named arguments
 * @returns {Object} Debug information about the arguments
 */
function debugNamedArgs(args, env, namedArgs = {}) {
  return {
    regularArgs: args.map(arg => ({
      original: arg,
      type: typeof arg,
      extractedValue: extractValue(arg),
      evaluated: evaluate(arg, env)
    })),
    namedArgs: Object.entries(namedArgs).map(([key, value]) => ({
      key,
      value: {
        original: value,
        type: typeof value,
        extractedValue: extractValue(value),
        evaluated: evaluate(value, env)
      }
    }))
  };
}

/**
 * Print function for debugging
 * @param {Array} args - Arguments to print
 * @param {Function} env - The environment
 * @returns {*} The last argument (for chaining)
 */
function print(args, env) {
  const evaluatedArgs = args.map(arg => evaluate(arg, env));
  console.log(...evaluatedArgs);
  return evaluatedArgs[evaluatedArgs.length - 1] || null;
}

/**
 * Core language primitives organized by category
 * Each primitive is a pure function that takes its arguments, the environment,
 * and optionally named arguments
 */
const primitives = {
  ...mathPrimitives(),
  ...comparisonPrimitives(),
  ...musicPrimitives(),
  'debug-strings': debugStrings,
  'debug-named-args': debugNamedArgs,
  'print': print
};

/**
 * Mathematical primitives
 * @returns {Object} Map of mathematical functions
 */
function mathPrimitives() {
  return {
    // Arithmetic operations
    '+': (args, _env) => args.reduce((a, b) => a + b, 0),
    '-': (args, _env) => args.length === 1 ? -args[0] : args.reduce((a, b) => a - b),
    '*': (args, _env) => args.reduce((a, b) => a * b, 1),
    '/': (args, _env) => args.length === 1 ? 1 / args[0] : args.reduce((a, b) => a / b),
    'mod': (args, _env) => args.length === 2 ? args[0] % args[1] :
      args.reduce((a, b) => a % b),
    'pow': (args, _env) => args.length === 2 ? Math.pow(args[0], args[1]) :
      args.reduce((a, b) => Math.pow(a, b))
  };
}

/**
 * Comparison primitives
 * @returns {Object} Map of comparison functions
 */
function comparisonPrimitives() {
  return {
    '=': (args, _env) => args.every((v, i, arr) => i === 0 || v === arr[i - 1]),
    '<': (args, _env) => args.every((v, i, arr) => i === 0 || arr[i - 1] < v),
    '>': (args, _env) => args.every((v, i, arr) => i === 0 || arr[i - 1] > v),
    '<=': (args, _env) => args.every((v, i, arr) => i === 0 || arr[i - 1] <= v),
    '>=': (args, _env) => args.every((v, i, arr) => i === 0 || arr[i - 1] >= v),
    '!=': (args, _env) => args.length === 2 ? args[0] !== args[1] :
      !args.every((v, i, arr) => i === 0 || v === arr[i - 1])
  };
}

/**
 * Extract the actual value from a potential token object
 * @param {*} value - The value to extract from
 * @returns {*} The extracted value
 */
const extractValue = (value) => {
  if (value && typeof value === 'object' && value.type) {
    return value.value;
  }
  return value;
};

/**
 * Music primitives
 * @returns {Object} Map of music-related functions
 */
function musicPrimitives() {
  return {
    /**
     * Creates a note event
     * @param {Array} args - [pitch, duration]
     * @param {Function} _env - Environment (unused)
     * @param {Object} namedArgs - Named arguments like :velocity, :instrument
     * @returns {Object} Note event object
     */
    'note': (args, _env, namedArgs = {}) => {
      const [pitch, duration = 1] = args;
      return {
        type: 'note',
        pitch: extractValue(pitch),
        duration: Number(extractValue(duration)),
        velocity: namedArgs.velocity ? extractValue(namedArgs.velocity) : 0.7,
        instrument: namedArgs.instrument ? extractValue(namedArgs.instrument) : 'default'
      };
    },

    /**
     * Creates a chord event
     * @param {Array} args - [notes, duration]
     * @param {Function} _env - Environment (unused)
     * @param {Object} namedArgs - Named arguments like :velocity, :instrument
     * @returns {Object} Chord event object
     */
    'chord': (args, _env, namedArgs = {}) => {
      const [notes, duration = 1] = args;
      const processedNotes = Array.isArray(notes) ? 
        notes.map(extractValue) : 
        [extractValue(notes)];
      
      return {
        type: 'chord',
        notes: processedNotes,
        duration: Number(extractValue(duration)),
        velocity: namedArgs.velocity ? extractValue(namedArgs.velocity) : 0.7,
        instrument: namedArgs.instrument ? extractValue(namedArgs.instrument) : 'default'
      };
    },

    /**
     * Sequences multiple events in time
     * @param {Array} args - List of events to sequence
     * @param {Function} _env - Environment (unused)
     * @param {Object} namedArgs - Named arguments (unused but included for compatibility)
     * @returns {Object} Sequence event object
     */
    'sequence': (args, _env, namedArgs = {}) => ({
      type: 'sequence',
      events: args
    }),

    /**
     * Plays multiple events in parallel
     * @param {Array} args - List of events to play in parallel
     * @param {Function} _env - Environment (unused)
     * @param {Object} namedArgs - Named arguments (unused but included for compatibility)
     * @returns {Object} Parallel event object
     */
    'parallel': (args, _env, namedArgs = {}) => ({
      type: 'parallel',
      events: args
    }),

    /**
     * Creates a beat machine for repetitive patterns
     * @param {Array} args - [pattern, sounds, options]
     * @param {Function} _env - Environment
     * @param {Object} namedArgs - Named arguments like :tempo, :swing
     * @returns {Object} Beat machine event object
     */
    'beat-machine': (args, _env, namedArgs = {}) => {
      const [pattern, sounds] = args;
      const processedSounds = Array.isArray(sounds) ? 
        sounds.map(extractValue) : 
        [extractValue(sounds)];
      
      return {
        type: 'beat-machine',
        pattern: extractValue(pattern),
        sounds: processedSounds,
        tempo: namedArgs.tempo ? Number(extractValue(namedArgs.tempo)) : 120,
        swing: namedArgs.swing ? Number(extractValue(namedArgs.swing)) : 0
      };
    },

    /**
     * Creates a drum machine with multiple tracks and arrangements
     * @param {Array} args - List of arrangements
     * @param {Function} _env - Environment
     * @param {Object} namedArgs - Named arguments like :tempo, :signature
     * @returns {Object} Drum machine event object
     */
    'drum-machine': (args, _env, namedArgs = {}) => {
      return {
        type: 'drum-machine',
        arrangements: args,
        tempo: namedArgs.tempo ? Number(extractValue(namedArgs.tempo)) : 120,
        signature: namedArgs.signature ? Number(extractValue(namedArgs.signature)) : 4
      };
    },

    /**
     * Creates an arrangement with multiple tracks
     * @param {Array} args - List of tracks
     * @param {Function} _env - Environment
     * @param {Object} namedArgs - Named arguments like :active, :bars
     * @returns {Object} Arrangement event object
     */
    'arrangement': (args, _env, namedArgs = {}) => {
      return {
        type: 'arrangement',
        tracks: args,
        active: namedArgs.active ? Number(extractValue(namedArgs.active)) === 1 : true,
        bars: namedArgs.bars ? Number(extractValue(namedArgs.bars)) : 1
      };
    },
    
    /**
     * Creates a track with multiple steps
     * @param {Array} args - [soundName, quotedStepsList]
     * @param {Function} _env - Environment
     * @param {Object} namedArgs - Named arguments (currently unused)
     * @returns {Object} Track event object
     */
    'track': (args, _env, namedArgs = {}) => {
      const [soundName, steps] = args;
      
      // Only accept a quoted list of steps
      if (!Array.isArray(steps)) {
        throw new Error('Track function requires a quoted list of steps as its second argument');
      }
      
      console.log('Track function using quoted list of steps:', {
        soundName: extractValue(soundName),
        stepsCount: steps.length,
      });
      
      // Evaluate each step in the list
      const evaluatedSteps = steps.map(step => evaluate(step, _env));
      
      return {
        type: 'track',
        soundName: extractValue(soundName),
        steps: evaluatedSteps
      };
    },
    
    /**
     * Creates a step in a track sequence
     * @param {Array} args - [active]
     * @param {Function} _env - Environment
     * @param {Object} namedArgs - Named arguments like :pitch, :volume, :duration
     * @returns {Object} Step event object
     */
    'step': (args, _env, namedArgs = {}) => {
      const [active] = args;
      
      console.log('Creating step:', {
        active: Number(extractValue(active)) === 1,
        pitch: namedArgs.pitch ? Number(extractValue(namedArgs.pitch)) : 0,
        volume: namedArgs.volume ? Number(extractValue(namedArgs.volume)) : 0,
        duration: namedArgs.duration ? Number(extractValue(namedArgs.duration)) : 0.25,
        rawActive: active,
        extractedActive: extractValue(active)
      });
      
      return {
        type: 'step',
        active: Number(extractValue(active)) === 1,
        pitch: namedArgs.pitch ? Number(extractValue(namedArgs.pitch)) : 0,
        volume: namedArgs.volume ? Number(extractValue(namedArgs.volume)) : 0,
        duration: namedArgs.duration ? Number(extractValue(namedArgs.duration)) : 0.25
      };
    },
    
    /**
     * Applies an effect to a step or sequence
     * @param {Array} args - [effectType, ...params, target]
     * @param {Function} _env - Environment
     * @param {Object} namedArgs - Named arguments (currently unused)
     * @returns {Object} Effect event object
     */
    'effect': (args, _env, namedArgs = {}) => {
      // The last element should be the target the effect is applied to
      const effectType = args[0];
      const target = args[args.length - 1];
      // All elements between first and last are effect parameters
      const params = args.slice(1, args.length - 1);
      
      return {
        type: 'effect',
        effectType: extractValue(effectType),
        params: params.map(param => extractValue(param)),
        target
      };
    }
  };
}

/**
 * Process named arguments (keywords) in the form :name value
 * @param {Array} args - The argument list to process
 * @returns {Object} An object with { regularArgs, namedArgs }
 */
const processArgs = (args) => {
  const result = {
    regularArgs: [],
    namedArgs: {}
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const argValue = extractValue(arg);
    
    // Check if this is a keyword argument (starts with :)
    if (typeof argValue === 'string' && argValue.startsWith(':')) {
      // Make sure we have a value after the keyword
      if (i + 1 >= args.length) {
        throw new Error(`Named argument ${argValue} is missing a value`);
      }
      
      const key = argValue.slice(1);
      const value = args[++i]; // Get the next argument as the value
      result.namedArgs[key] = value;
    } else {
      result.regularArgs.push(arg);
    }
  }

  return result;
};

/**
 * Evaluate a number
 * @param {number} expr - The number to evaluate
 * @returns {number} The number itself
 */
const evalNumber = (expr) => expr;

/**
 * Evaluate a string (either a symbol or literal)
 * @param {string} expr - The string to evaluate
 * @param {Function} env - The environment
 * @returns {*} The value of the symbol or the string literal
 */
const evalString = (expr, env) => {
  // If the string has a type property, it's from our new token structure
  if (expr && typeof expr === 'object' && expr.type) {
    if (expr.type === 'string') {
      return expr.value; // Return the string value directly
    } else if (expr.type === 'symbol') {
      return env(expr.value); // Look up the symbol in the environment
    }
  }
  
  // Backward compatibility for old format
  return expr.startsWith('"') ? expr.slice(1, -1) : env(expr);
};

/**
 * Evaluate a special form like quote, let, lambda, or if
 * @param {Array} expr - The expression to evaluate
 * @param {Function} env - The environment
 * @returns {*} The result of evaluating the special form
 */
const evalSpecialForm = (expr, env) => {
  const [form, ...rest] = expr;

  switch (form) {
    case 'quote':
      return rest[0];

    case 'let': {
      return evalLet(rest, env);
    }

    case 'lambda': {
      return evalLambda(rest, env);
    }

    case 'if': {
      return evalIf(rest, env);
    }

    default:
      return null; // Not a special form
  }
};

/**
 * Evaluate a let expression
 * @param {Array} args - The let arguments [bindings, ...body]
 * @param {Function} env - The environment
 * @returns {*} The result of evaluating the body in the new environment
 */
const evalLet = (args, env) => {
  const [quotedBindings, ...body] = args;

  // Handle the quoted bindings list
  const bindingPairs = quotedBindings[0] === 'quote' ?
    quotedBindings[1] :
    evaluate(quotedBindings, env);

  // Create new environment with all bindings
  const newEnv = bindingPairs.reduce((acc, binding) => {
    const [name, valueExpr] = binding;
    const value = evaluate(valueExpr, acc);
    return extendEnv(acc, { [name]: value });
  }, env);

  // Evaluate body expressions in sequence
  return body.reduce((_, expr) => evaluate(expr, newEnv), null);
};

/**
 * Evaluate a lambda expression
 * @param {Array} args - The lambda arguments [params, ...body]
 * @param {Function} env - The environment
 * @returns {Function} The created function
 */
const evalLambda = (args, env) => {
  const [params, ...body] = args;
  return function(...functionArgs) {
    const newEnv = params.reduce((acc, param, i) =>
      extendEnv(acc, { [param]: functionArgs[i] }), env);
    return body.reduce((_, expr) => evaluate(expr, newEnv), null);
  };
};

/**
 * Evaluate an if expression
 * @param {Array} args - The if arguments [condition, consequent, alternative]
 * @param {Function} env - The environment
 * @returns {*} The result of evaluating either consequent or alternative
 */
const evalIf = (args, env) => {
  const [condition, consequent, alternative] = args;
  return evaluate(condition, env) ?
    evaluate(consequent, env) :
    evaluate(alternative, env);
};

/**
 * Evaluate a function application
 * @param {Array} expr - The expression to evaluate
 * @param {Function} env - The environment
 * @returns {*} The result of applying the function
 */
const evalApplication = (expr, env) => {
  const [first, ...rest] = expr;

  // Function application
  const fn = first in primitives ?
    primitives[first] :
    evaluate(first, env);

  // Process arguments, handling both regular and named args
  const { regularArgs, namedArgs } = processArgs(rest);
  const evaluatedArgs = regularArgs.map(arg => evaluate(arg, env));
  const evaluatedNamedArgs = Object.fromEntries(
    Object.entries(namedArgs).map(([k, v]) => [k, evaluate(v, env)])
  );

  if (typeof fn !== 'function') {
    throw new Error(`${first} is not a function`);
  }

  // Check if function accepts named args
  // Music primitives and certain other functions always accept named args
  const musicPrimitivesList = [
    'note', 'chord', 'sequence', 'parallel', 'beat-machine', 
    'drum-machine', 'arrangement', 'track', 'step', 'effect'
  ];
  
  const acceptsNamedArgs = 
    musicPrimitivesList.includes(first) || // Music primitives always accept named args
    fn.length >= 3 ||                      // Functions with 3+ params (args, env, namedArgs)
    first === 'debug-named-args' ||        // Special debug function
    first === 'debug-strings';             // Special debug function
  
  if (Object.keys(evaluatedNamedArgs).length > 0 && !acceptsNamedArgs) {
    throw new Error(
      `Function '${first}' does not accept named arguments, but received: ${
        Object.keys(evaluatedNamedArgs).join(', ')
      }`
    );
  }

  return fn(evaluatedArgs, env, evaluatedNamedArgs);
};

/**
 * Evaluate an expression in the given environment
 * @param {Array|string|number|Object} expr - The expression to evaluate
 * @param {Function} env - The environment lookup function
 * @returns {*} The result of evaluation
 */
const evaluate = (expr, env) => {
  try {
    // Handle token objects with type information
    if (expr && typeof expr === 'object' && expr.type) {
      if (expr.type === 'number') {
        return expr.value;
      }
      if (expr.type === 'string') {
        return expr.value;
      }
      if (expr.type === 'symbol') {
        return env(expr.value);
      }
    }

    // Numbers evaluate to themselves
    if (typeof expr === 'number') {
      return evalNumber(expr);
    }

    // Strings that start with " are literals, others are symbols
    if (typeof expr === 'string') {
      return evalString(expr, env);
    }

    // Arrays represent function calls or special forms
    if (Array.isArray(expr)) {
      if (expr.length === 0) {
        return [];
      }

      // Try to evaluate as a special form first
      const specialFormResult = evalSpecialForm(expr, env);
      if (specialFormResult !== null) {
        return specialFormResult;
      }

      // If not a special form, evaluate as function application
      return evalApplication(expr, env);
    }

    throw new Error(`Cannot evaluate expression: ${JSON.stringify(expr)}`);
  } catch (err) {
    // Add more context to the error
    if (err.message.includes('Cannot evaluate expression')) {
      throw err; // Already has context
    }
    
    const context = Array.isArray(expr) ? 
      `in expression (${expr[0]} ...)` : 
      `with value ${JSON.stringify(expr)}`;
      
    throw new Error(`Evaluation error ${context}: ${err.message}`);
  }
};

/**
 * Create the global environment with our primitive operations
 */
const createGlobalEnv = () => createEnv(primitives);

/**
 * Main entry point for the interpreter
 * @param {Array} ast - The AST to interpret
 * @returns {*} The result of evaluation
 */
const interpret = (ast) => {
  const globalEnv = createGlobalEnv();
  return ast.map(expr => evaluate(expr, globalEnv));
};

// Export the interpreter interface in a more functional way
const interpreter = {
  interpret,
  evaluate,
  createEnv,
  extendEnv,
  primitives
};

// Make it available to the window
Object.assign(window, interpreter); 
