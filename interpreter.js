// Interpreter for our Lisp-like music language
// This module takes an AST and executes it using Tone.js

/**
 * Create a new environment frame
 * @param {Object} bindings - Initial variable bindings
 * @param {Function} parent - Parent environment lookup function (or null)
 * @returns {Function} Environment lookup function
 */
const createEnv = (bindings = {}, parent = null) => {
    // Return a lookup function that closes over the bindings and parent
    return name => {
        if (name in bindings) {
            return bindings[name];
        }
        if (parent) {
            return parent(name);
        }
        throw new Error(`Undefined variable: ${name}`);
    };
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
 * Core language primitives
 * Each primitive is a pure function that takes its arguments and the environment
 */
const primitives = {
    // Arithmetic
    '+': (args, _env) => args.reduce((a, b) => a + b, 0),
    '-': (args, _env) => args.length === 1 ? -args[0] : args.reduce((a, b) => a - b),
    '*': (args, _env) => args.reduce((a, b) => a * b, 1),
    '/': (args, _env) => args.length === 1 ? 1/args[0] : args.reduce((a, b) => a / b),

    // Comparison
    '=': (args, _env) => args.every((v, i, arr) => i === 0 || v === arr[i-1]),
    '<': (args, _env) => args.every((v, i, arr) => i === 0 || arr[i-1] < v),
    '>': (args, _env) => args.every((v, i, arr) => i === 0 || arr[i-1] > v),

    // Music primitives
    'note': (args, _env) => {
        const [pitch, duration = 1] = args;
        return {
            type: 'note',
            pitch,
            duration: Number(duration)
        };
    },

    'chord': (args, _env) => {
        const [notes, duration = 1] = args;
        return {
            type: 'chord',
            notes: Array.isArray(notes) ? notes : [notes],
            duration: Number(duration)
        };
    },

    'sequence': (args, _env) => ({
        type: 'sequence',
        events: args
    }),

    'parallel': (args, _env) => ({
        type: 'parallel',
        events: args
    })
};

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
        if (typeof arg === 'string' && arg.startsWith(':')) {
            const key = arg.slice(1);
            const value = args[++i];
            result.namedArgs[key] = value;
        } else {
            result.regularArgs.push(arg);
        }
    }

    return result;
};

/**
 * Evaluate an expression in the given environment
 * @param {Array|string|number} expr - The expression to evaluate
 * @param {Function} env - The environment lookup function
 * @returns {*} The result of evaluation
 */
const evaluate = (expr, env) => {
    // Numbers and strings evaluate to themselves
    if (typeof expr === 'number' || typeof expr === 'string') {
        return expr;
    }

    // Arrays represent function calls or special forms
    if (Array.isArray(expr)) {
        if (expr.length === 0) {
            return null;
        }

        const [first, ...rest] = expr;

        // Handle special forms
        switch (first) {
            case 'let': {
                const [bindings, ...body] = rest;
                const newEnv = bindings.reduce((acc, [name, valueExpr]) => {
                    const value = evaluate(valueExpr, acc);
                    return extendEnv(acc, { [name]: value });
                }, env);
                return body.reduce((_, expr) => evaluate(expr, newEnv), null);
            }

            case 'lambda': {
                const [params, ...body] = rest;
                return (...args) => {
                    const newEnv = params.reduce((acc, param, i) => 
                        extendEnv(acc, { [param]: args[i] }), env);
                    return body.reduce((_, expr) => evaluate(expr, newEnv), null);
                };
            }

            case 'if': {
                const [condition, consequent, alternative] = rest;
                return evaluate(condition, env) ? 
                    evaluate(consequent, env) : 
                    evaluate(alternative, env);
            }

            default: {
                // Function application
                const fn = first in primitives ? 
                    primitives[first] : 
                    evaluate(first, env);
                
                // Process arguments, handling both regular and named args
                const { regularArgs, namedArgs } = processArgs(rest);
                const evaluatedArgs = regularArgs.map(arg => evaluate(arg, env));
                
                if (typeof fn !== 'function') {
                    throw new Error(`${first} is not a function`);
                }
                
                return fn(evaluatedArgs, env, namedArgs);
            }
        }
    }

    // Look up variables in the environment
    return env(expr);
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

// Export the interpreter interface
window.interpret = interpret; 