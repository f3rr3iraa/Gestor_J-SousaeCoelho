import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

function getLocalChromePath() {
  if (process.platform === "win32") {
    const paths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ];
    for (const p of paths) {
      try {
        const fs = await import("fs");
        if (fs.existsSync(p)) return p;
      } catch { continue; }
    }
  }
  return null;
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let html;
  try {
    html = JSON.parse(event.body).html;
  } catch {
    return { statusCode: 400, body: "Body inválido" };
  }

  const isLocal = process.env.NETLIFY_DEV === "true";

  let executablePath;
  if (isLocal) {
    const paths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ];
    const fs = await import("fs");
    executablePath = paths.find(p => fs.existsSync(p));
  } else {
    executablePath = await chromium.executablePath();
  }

  const browser = await puppeteer.launch({
    args: isLocal ? ["--no-sandbox"] : chromium.args,
    defaultViewport: { width: 794, height: 1123 },
    executablePath,
    headless: true,
  });

  const page = await browser.newPage();

  // Usar setContent com base URL do site para imagens carregarem
  const baseUrl = isLocal
    ? "http://localhost:9000"
    : event.headers["x-forwarded-proto"] + "://" + event.headers["host"];

  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.evaluate((base) => {
    // Corrigir imagens relativas
    document.querySelectorAll("img").forEach(img => {
      if (img.src && !img.src.startsWith("http")) {
        img.src = base + "/" + img.getAttribute("src");
      }
    });
  }, baseUrl);

  // Esperar as imagens carregarem
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images)
        .filter(img => !img.complete)
        .map(img => new Promise(resolve => {
          img.onload = img.onerror = resolve;
        }))
    );
  });

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
  });

  await browser.close();

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=folha-horas.pdf",
    },
    body: Buffer.from(pdf).toString("base64"),
    isBase64Encoded: true,
  };
};