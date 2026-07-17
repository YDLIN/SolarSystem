import type { Metadata } from "next";
import { headers } from "next/headers";
import ProjectCard from "./ProjectCard";
import "./home.css";
import { SCIENCE_PROJECTS } from "./projectCatalog";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";
  const title = "小小科学馆";
  const description =
    "从好奇出发，探索太阳系、火山、水循环与台风等会动的科学世界。";
  const imageUrl = `${origin}/og.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1536,
          height: 1024,
          alt: "小小科学馆互动科学展厅",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function Home() {
  const availableCount = SCIENCE_PROJECTS.filter(
    (project) => project.status === "available",
  ).length;

  return (
    <main className="museum-home" data-testid="museum-home">
      <div className="paper-grid" aria-hidden="true" />

      <header className="museum-header">
        <a className="museum-brand" href="#projects" aria-label="小小科学馆首页">
          <span className="museum-brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>
            <strong>小小科学馆</strong>
            <small>互动科学展厅</small>
          </span>
        </a>

        <p className="museum-header-note">
          把复杂的自然现象，变成可以观察、可以触碰、也可以慢慢发现的互动实验。
        </p>
      </header>

      <section className="museum-intro" aria-labelledby="museum-title">
        <div>
          <p className="museum-kicker">欢迎来到线上科学馆</p>
          <h1 id="museum-title">
            从好奇出发，
            <span>探索会动的科学世界</span>
          </h1>
        </div>

        <div className="museum-intro-copy">
          <p>
            选择一个展厅，跟着动画看见星球的轨迹、地球的力量，
            以及风和水如何改变我们的世界。
          </p>
          <span className="open-count">
            <i aria-hidden="true" />
            {availableCount} 个互动展厅已开放
          </span>
        </div>
      </section>

      <section
        className="project-exhibition"
        id="projects"
        aria-labelledby="projects-heading"
      >
        <div className="section-heading">
          <div>
            <p>EXHIBITIONS · 01—04</p>
            <h2 id="projects-heading">选择一个展厅</h2>
          </div>
          <span>每一次点击，都是新发现</span>
        </div>

        <div className="project-grid">
          {SCIENCE_PROJECTS.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </section>

      <footer className="museum-footer">
        <p>小小科学馆 · 让自然现象变得看得见</p>
        <p>{availableCount.toString().padStart(2, "0")} / 04 已开放</p>
      </footer>
    </main>
  );
}
