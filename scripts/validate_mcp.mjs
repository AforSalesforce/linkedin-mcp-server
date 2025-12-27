import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.resolve(__dirname, '../dist/index.js');

console.log(`Starting server at: ${serverPath}`);

const serverProcess = spawn('node', [serverPath], {
    env: { ...process.env, LINKEDIN_LI_AT_COOKIE: 'dummy_cookie_for_validation' }
});

let buffer = '';

serverProcess.stderr.on('data', (data) => {
    console.log(`[Server Log]: ${data.toString()}`);
});

serverProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep the incomplete line in the buffer

    for (const line of lines) {
        if (!line.trim()) continue;

        try {
            const message = JSON.parse(line);
            console.log('Received Message:', JSON.stringify(message, null, 2));

            // If we receive the initialized response (after we send initialize), we are good.
            if (message.id === 1) { // We'll verify the ID matches our request
                console.log('✅ Validation Successful: Server responded to initialize request.');

                // Now ask for tools list
                const toolsRequest = {
                    jsonrpc: "2.0",
                    id: 2,
                    method: "tools/list"
                };
                serverProcess.stdin.write(JSON.stringify(toolsRequest) + "\n");
            }

            if (message.id === 2) {
                console.log('✅ Validation Successful: Server returned tool list.');
                console.log('Tools found:', message.result.tools.map(t => t.name));
                serverProcess.kill();
                process.exit(0);
            }
        } catch (e) {
            console.error('Failed to parse line:', line, e);
        }
    }
});

// Send Initialize Request
const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
            name: "validation-script",
            version: "1.0.0"
        }
    }
};

serverProcess.stdin.write(JSON.stringify(initRequest) + "\n");

// Timeout safety
setTimeout(() => {
    console.error('❌ Validation Timeout: Server did not respond in time.');
    serverProcess.kill();
    process.exit(1);
}, 5000);
