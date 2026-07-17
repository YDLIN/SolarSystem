import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the solar system application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>小小太阳系<\/title>/i);
  assert.match(html, /小小太阳系/);
  assert.match(html, /data-mode="motion"/);
  assert.doesNotMatch(html, /data-mode="solar-system"/);
  assert.match(html, /行星一边自转，一边沿着各自倾斜的椭圆轨道绕太阳公转/);
  assert.match(html, /轨道形状与倾角参考真实数据；大小、距离和速度经过教学调整/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("removes the disposable starter preview", async () => {
  const [page, layout, packageJson, solarSystemApp] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/SolarSystemApp.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /SolarSystemApp/);
  assert.match(layout, /lang="zh-CN"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(solarSystemApp, /arrows=\{overlays\.arrows\}/);
  assert.match(solarSystemApp, /arrowsVisible=\{overlays\.arrows\}/);
  assert.match(solarSystemApp, /overlays\.orbits \|\| overlays\.arrows/);
  await assert.rejects(access(new URL("../app\/_sites-preview", templateRoot)));
});
