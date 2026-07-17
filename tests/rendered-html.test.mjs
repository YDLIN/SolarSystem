import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(
    "test",
    `${pathname}-${process.pid}-${Date.now()}-${Math.random()}`,
  );
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the science museum project gallery", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>小小科学馆<\/title>/i);
  assert.match(html, /从好奇出发，/);
  assert.match(html, /探索会动的科学世界/);

  for (const project of ["小小太阳系", "火山的形成", "水循环", "台风的形成"]) {
    assert.match(html, new RegExp(project));
  }

  assert.match(html, /href="\/projects\/solar-system"/);
  assert.match(html, /href="\/projects\/volcano"/);
  assert.equal((html.match(/data-status="available"/g) ?? []).length, 2);
  assert.equal((html.match(/data-status="coming-soon"/g) ?? []).length, 2);
  assert.doesNotMatch(
    html,
    /href="\/projects\/(?:water-cycle|typhoon)"/,
  );
});

test("server-renders the solar system at its project route", async () => {
  const response = await render("/projects/solar-system");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<title>小小太阳系｜小小科学馆<\/title>/i);
  assert.match(html, /data-testid="solar-app"/);
  assert.match(html, /href="\/"/);
  assert.match(html, /返回小小科学馆/);
  assert.match(html, /data-mode="motion"/);
  assert.doesNotMatch(html, /data-mode="solar-system"/);
  assert.match(
    html,
    /行星一边自转，一边沿着各自倾斜的椭圆轨道绕太阳公转/,
  );
  assert.match(
    html,
    /轨道形状与倾角参考真实数据；大小、距离和速度经过教学调整/,
  );
});

test("server-renders the volcano at its project route", async () => {
  const response = await render("/projects/volcano");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<title>火山的形成｜小小科学馆<\/title>/i);
  assert.match(html, /data-testid="volcano-app"/);
  assert.match(html, /href="\/"/);
  assert.match(html, /返回小小科学馆/);
  for (const stage of ["melting", "rising", "eruption", "cooling"]) {
    assert.match(html, new RegExp(`data-stage="${stage}"`));
  }
  assert.match(html, /地幔岩石发生了部分熔融/);
});

test("keeps the solar-system feature files together", async () => {
  const [page, layout, packageJson, solarSystemApp, catalog] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../app/projects/solar-system/SolarSystemApp.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../app/projectCatalog.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /SCIENCE_PROJECTS/);
  assert.match(layout, /lang="zh-CN"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(catalog, /status: "available"/);
  assert.match(catalog, /status: "coming-soon"/);
  assert.match(solarSystemApp, /arrows=\{overlays\.arrows\}/);
  assert.match(solarSystemApp, /arrowsVisible=\{overlays\.arrows\}/);
  assert.match(solarSystemApp, /overlays\.orbits \|\| overlays\.arrows/);
  await assert.rejects(access(new URL("../app/_sites-preview", templateRoot)));
  await assert.rejects(access(new URL("../app/SolarSystemApp.tsx", templateRoot)));
});
