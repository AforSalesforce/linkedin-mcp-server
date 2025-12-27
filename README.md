# LinkedIn MCP Server

This is a Model Context Protocol (MCP) server that acts as a bridge to fetch detailed LinkedIn profile data (Experience, Education, About sections) which are typically hidden from the public/lite API.

It uses a **Puppeteer** wrapper to automate a browser session with your LinkedIn cookie, ensuring it can access the full profile view that you see when logged in.

## Features

- **`read_linkedin_profile`**: A tool that takes a LinkedIn profile URL and returns the scraped text content of the profile.

## Prerequisities

- Node.js (v18+)
- A LinkedIn account
- Your LinkedIn `li_at` cookie

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Authentication)

This server needs your LinkedIn **li_at** cookie to view full profiles.

**Method A: Automatic (Recommended)**

We have included a helper tool to log you in and save the cookie automatically.

1. Run the auth script:
   ```bash
   npm run auth
   ```
2. A browser window will open. Log in to LinkedIn.
3. Once you reach the feed, the script will detect the cookie, save it to `.env`, and close the window automatically.

**Method B: Manual**

1. Create a `.env` file in the root directory.
2. Open LinkedIn in your browser (Chrome/Edge).
3. Open Developer Tools (`F12` or Right Click -> Inspect).
4. Go to the **Application** tab.
5. Under **Storage** -> **Cookies** -> `https://www.linkedin.com`, find the cookie named `li_at`.
6. Copy its value and paste it into `.env`:
   ```env
   LINKEDIN_LI_AT_COOKIE="your_cookie_value_here"
   ```

### 3. Build the Server
```bash
npm run build
# OR
npx tsc
```

(Note: `npm run build` is not currently defined in package.json, so use `npx tsc` or add the script.)

## Usage with Antigravity / Claude Desktop

Add the server to your MCP configuration file (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "linkedin-reference": {
      "command": "node",
      "args": ["/absolute/path/to/linkedin-mcp-server/dist/index.js"],
      "env": {
        "LINKEDIN_LI_AT_COOKIE": "your_cookie_value_if_not_using_dotenv"
      }
    }
  }
}
```

## How It Works

1. The MCP client sends a `read_linkedin_profile` request with a URL.
2. The server launches a headless Puppeteer browser.
3. It injects the `li_at` cookie to authenticate as you.
4. It navigates to the profile URL.
5. It extracts the `innerText` of the page body (simple approach).
6. It returns the text to the LLM for processing.

## Project Structure

- `src/index.ts`: Main server entry point and tool logic.
- `scripts/validate_mcp.mjs`: A validation script to test if the server boots up correctly.
- `dist/`: Compiled JavaScript files.
