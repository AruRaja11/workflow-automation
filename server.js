const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const port = Number(process.env.PORT) || 3000;
const publicDirectory = path.join(__dirname, "public");
const staticRoutes = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/prospecting", ["prospecting.html", "text/html; charset=utf-8"]],
  ["/prospecting/", ["prospecting.html", "text/html; charset=utf-8"]],
  ["/css/styles.css", ["css/styles.css", "text/css; charset=utf-8"]],
  ["/js/app.js", ["js/app.js", "text/javascript; charset=utf-8"]],
  ["/images/japan-artistic-3840x2160-25406.jpg", ["../images/japan-artistic-3840x2160-25406.jpg", "image/jpeg"]],
  ["/images/itachi-uchiha-moon-3840x2160-25777.jpg", ["../images/itachi-uchiha-moon-3840x2160-25777.jpg", "image/jpeg"]],
]);

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(data));
}

function serveStaticFile(response, relativePath, contentType) {
  const filePath = path.join(publicDirectory, relativePath);

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      console.error(`Could not read frontend asset "${relativePath}":`, error);
      sendJson(response, 500, { error: "Could not load the frontend." });
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": relativePath.endsWith(".html") ? "no-cache" : "public, max-age=300",
    });
    response.end(contents);
  });
}

const server = http.createServer((request, response) => {
  let pathname;

  try {
    pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  } catch {
    sendJson(response, 400, { error: "Invalid request URL." });
    return;
  }

  if (request.method === "GET" && staticRoutes.has(pathname)) {
    const [relativePath, contentType] = staticRoutes.get(pathname);
    serveStaticFile(response, relativePath, contentType);
    return;
  }

  const executionRoute = pathname.match(/^\/previous-runs\/([0-9a-f-]+)\/executions$/i);
  const apiPath = pathname === "/previous-runs"
    ? "/app/v1/runs"
    : executionRoute
      ? `/app/v1/runs/${executionRoute[1]}/executions`
      : null;

  if (request.method === "GET" && apiPath) {
    fetch(`http://127.0.0.1:8000${apiPath}`)
      .then(async (apiResponse) => {
        const result = await apiResponse.json();
        sendJson(response, apiResponse.status, result);
      })
      .catch((error) => {
        console.error("Could not reach the Python API:", error);
        sendJson(response, 502, {
          error: "Could not reach the Python API. Check that the backend is running.",
        });
      });
    return;
  }

  if (request.method !== "POST" || pathname !== "/submit") {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  let body = "";
  let bodyBytes = 0;
  let bodyTooLarge = false;
  request.setEncoding("utf8");
  request.on("data", (chunk) => {
    if (bodyTooLarge) {
      return;
    }

    bodyBytes += Buffer.byteLength(chunk);
    if (bodyBytes > 10_000) {
      bodyTooLarge = true;
      body = "";
      return;
    }

    body += chunk;
  });

  request.on("end", async () => {
    if (bodyTooLarge) {
      sendJson(response, 413, { error: "Request body is too large." });
      return;
    }

    let input;

    try {
      input = JSON.parse(body);
    } catch {
      sendJson(response, 400, { error: "Request body must be valid JSON." });
      return;
    }

    if (!input || typeof input !== "object" || Array.isArray(input)) {
      sendJson(response, 400, { error: "Request body must be a JSON object." });
      return;
    }

    const apiInput = {
      business1: input.businessType1,
      business2: input.businessType2,
      business3: input.businessType3,
      location: input.location,
      pitch: input.pitchType,
      places_to_scrape: Number(input.placesToScrape),
    };

    try {
      const apiResponse = await fetch(
        "http://127.0.0.1:8000/app/v1/outreach/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiInput),
        }
      );

      const result = await apiResponse.json();
      sendJson(response, apiResponse.status, result);
    } catch (error) {
      console.error("Could not reach the Python API:", error);
      sendJson(response, 502, {
        error: "Could not reach the Python API. Check that the backend is running.",
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Frontend is running at http://localhost:${port}`);
});
