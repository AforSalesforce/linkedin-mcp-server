import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import puppeteer from "puppeteer";
import dotenv from "dotenv";

dotenv.config();

// Initialize Server
const server = new McpServer({
    name: "linkedin-reference-server",
    version: "1.0.0",
});

// Helper: Scrape Profile Logic
// We use Puppeteer to automate logging in with a cookie to see the full profile
async function scrapeLinkedInProfile(profileUrl: string, li_at_cookie: string) {
    const browser = await puppeteer.launch({ headless: true });
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
server.tool(
    "read_linkedin_profile",
    "Reads the detailed experience, education, and about section from a LinkedIn profile URL.",
    {
        profile_url: z.string().describe("The public URL of the LinkedIn profile to read (e.g., https://www.linkedin.com/in/username/)")
    },
    async ({ profile_url }) => {
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
        } catch (error: any) {
            return {
                content: [{ type: "text", text: `Failed to read profile: ${error.message}` }],
                isError: true
            };
        }
    }
);

// Start Server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("LinkedIn Reference MCP Server running...");
}

main();
