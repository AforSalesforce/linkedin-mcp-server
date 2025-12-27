const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.resolve(__dirname, '../.env');

(async () => {
    console.log("🔵 Launching browser for authentication...");
    console.log("👉 Please log in to LinkedIn in the unexpected window.");

    const browser = await puppeteer.launch({
        headless: false, // Show the browser
        defaultViewport: null,
        args: ['--start-maximized'] // Make it clear this is for the user
    });

    const page = await browser.newPage();

    // Go to LinkedIn
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });

    console.log("⏳ Waiting for login (checking for 'li_at' cookie)...");

    // Poll for cookies every 2 seconds
    const checkCookieInterval = setInterval(async () => {
        try {
            const cookies = await page.cookies();
            const li_at = cookies.find(c => c.name === 'li_at');

            if (li_at) {
                console.log("✅ Login detected! Found 'li_at' cookie.");
                clearInterval(checkCookieInterval);

                await saveCookieAndExit(li_at.value);
            }
        } catch (err) {
            // Ignore errors if browser closes
        }
    }, 2000);

    // Handle closure
    browser.on('disconnected', () => {
        console.log("❌ Browser closed before cookie was found.");
        clearInterval(checkCookieInterval);
        process.exit(0);
    });

    async function saveCookieAndExit(cookieValue) {
        // Read existing .env
        let envContent = '';
        if (fs.existsSync(ENV_PATH)) {
            envContent = fs.readFileSync(ENV_PATH, 'utf8');
        }

        // Replace or Append
        const key = "LINKEDIN_LI_AT_COOKIE";
        const newLine = `${key}=${cookieValue}`;

        if (envContent.includes(key)) {
            envContent = envContent.replace(new RegExp(`${key}=.*`), newLine);
        } else {
            envContent += `\n${newLine}`;
        }

        fs.writeFileSync(ENV_PATH, envContent.trim() + '\n');
        console.log(`💾 Cookie saved to ${ENV_PATH}`);

        await browser.close();
        console.log("🎉 Setup complete. You can now use the MCP server.");
        process.exit(0);
    }
})();
