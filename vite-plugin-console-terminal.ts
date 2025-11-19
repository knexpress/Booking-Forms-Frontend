import type { Plugin } from 'vite'

interface ConsoleLog {
  level: 'log' | 'error' | 'warn' | 'info' | 'debug'
  args: any[]
  timestamp: string
}

export function consoleToTerminal(): Plugin {
  return {
    name: 'console-to-terminal',
    apply: 'serve', // Only apply in dev server mode
    configureServer(server) {
      // Endpoint to receive console logs from browser
      server.middlewares.use('/__console-log', (req, res, next) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => {
            body += chunk.toString()
          })
          req.on('end', () => {
            try {
              const logData: ConsoleLog = JSON.parse(body)
              
              // Format and output to terminal
              const timestamp = new Date(logData.timestamp).toLocaleTimeString()
              const prefix = `[${timestamp}] [Browser ${logData.level.toUpperCase()}]`
              
              // Format arguments
              const formattedArgs = logData.args.map(arg => {
                if (typeof arg === 'object') {
                  try {
                    return JSON.stringify(arg, null, 2)
                  } catch {
                    return String(arg)
                  }
                }
                return String(arg)
              }).join(' ')
              
              // Output to terminal with appropriate color/styling
              switch (logData.level) {
                case 'error':
                  console.error(prefix, formattedArgs)
                  break
                case 'warn':
                  console.warn(prefix, formattedArgs)
                  break
                case 'info':
                  console.info(prefix, formattedArgs)
                  break
                case 'debug':
                  console.debug(prefix, formattedArgs)
                  break
                default:
                  console.log(prefix, formattedArgs)
              }
              
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true }))
            } catch (error) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Invalid request' }))
            }
          })
        } else {
          next()
        }
      })
    },
    transformIndexHtml(html) {
      // Inject script to intercept console methods
      const script = `
        <script>
          (function() {
            const originalConsole = {
              log: console.log.bind(console),
              error: console.error.bind(console),
              warn: console.warn.bind(console),
              info: console.info.bind(console),
              debug: console.debug.bind(console)
            };
            
            function sendToTerminal(level, args) {
              try {
                const logData = {
                  level: level,
                  args: args.map(arg => {
                    // Handle different types of arguments
                    if (arg instanceof Error) {
                      return {
                        type: 'Error',
                        name: arg.name,
                        message: arg.message,
                        stack: arg.stack
                      };
                    }
                    if (arg instanceof HTMLElement) {
                      return {
                        type: 'HTMLElement',
                        tagName: arg.tagName,
                        id: arg.id,
                        className: arg.className
                      };
                    }
                    if (typeof arg === 'object' && arg !== null) {
                      try {
                        // Try to serialize, but handle circular references
                        return JSON.parse(JSON.stringify(arg, (key, value) => {
                          if (typeof value === 'function') {
                            return '[Function]';
                          }
                          if (value instanceof Error) {
                            return {
                              type: 'Error',
                              name: value.name,
                              message: value.message
                            };
                          }
                          return value;
                        }));
                      } catch {
                        return String(arg);
                      }
                    }
                    return arg;
                  }),
                  timestamp: new Date().toISOString()
                };
                
                // Send to dev server (will silently fail in production)
                fetch('/__console-log', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(logData)
                }).catch(() => {
                  // Silently fail if server is not available (e.g., in production)
                });
              } catch (e) {
                // Silently fail
              }
            }
            
            // Override console methods
            console.log = function(...args) {
              originalConsole.log(...args);
              sendToTerminal('log', args);
            };
            
            console.error = function(...args) {
              originalConsole.error(...args);
              sendToTerminal('error', args);
            };
            
            console.warn = function(...args) {
              originalConsole.warn(...args);
              sendToTerminal('warn', args);
            };
            
            console.info = function(...args) {
              originalConsole.info(...args);
              sendToTerminal('info', args);
            };
            
            console.debug = function(...args) {
              originalConsole.debug(...args);
              sendToTerminal('debug', args);
            };
          })();
        </script>
      `
      
      // Insert before closing head tag or at the beginning of body
      return html.replace('</head>', script + '</head>')
    }
  }
}

