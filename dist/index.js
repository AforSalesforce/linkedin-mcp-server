"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const puppeteer_1 = __importDefault(require("puppeteer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Initialize Server
const server = new mcp_js_1.McpServer({
    name: "linkedin-reference-server",
    version: "1.0.0",
});
// Helper: Scrape Profile Logic
// We use Puppeteer to automate logging in with a cookie to see the full profile
async function scrapeLinkedInProfile(profileUrl, li_at_cookie) {
    const browser = await puppeteer_1.default.launch({ headless: true });
    const page = await browser.newPage();
    // Set the auth cookie so we look logged in
    await page.setCookie({
        name: "li_at",
        value: li_at_cookie,
        domain: ".linkedin.com"
    });
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
    // Simple scraping logic (You can expand this to target specific divs for Experience/Education)
    // This scrapes the visible text on the profile page
    const data = await page.evaluate(() => {
        return document.body.innerText;
    });
    await browser.close();
    // Clean up the text to make it readable for the LLM
    return data.substring(0, 10000); // Limit context window usage
}
// TOOL: Read Profile
server.tool("read_linkedin_profile", "Reads the detailed experience, education, and about section from a LinkedIn profile URL.", {
    profile_url: zod_1.z.string().describe("The public URL of the LinkedIn profile to read (e.g., https://www.linkedin.com/in/username/)")
}, async ({ profile_url }) => {
    const cookie = process.env.LINKEDIN_LI_AT_COOKIE;
    if (!cookie) {
        return {
            content: [{ type: "text", text: "Error: LINKEDIN_LI_AT_COOKIE is missing in server environment." }],
            isError: true
        };
    }
    try {
        const profileText = await scrapeLinkedInProfile(profile_url, cookie);
        return {
            content: [{
                    type: "text",
                    text: `LINKEDIN PROFILE CONTENT FOR: ${profile_url}\n\n${profileText}`
                }]
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Failed to read profile: ${error.message}` }],
            isError: true
        };
    }
});
// Start Server
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("LinkedIn Reference MCP Server running...");
}
main();
