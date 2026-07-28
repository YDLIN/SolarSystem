import type { ProjectVisual, ScienceProject } from "./projectCatalog";

function ProjectIllustration({ visual }: { visual: ProjectVisual }) {
  if (visual === "solar-system") {
    return (
      <div className="project-illustration solar-illustration" aria-hidden="true">
        <span className="solar-glow" />
        <span className="mini-sun" />
        <span className="orbit orbit-one">
          <i />
        </span>
        <span className="orbit orbit-two">
          <i />
        </span>
        <span className="orbit orbit-three">
          <i />
        </span>
      </div>
    );
  }

  if (visual === "volcano") {
    return (
      <div
        className="project-illustration volcano-illustration"
        aria-hidden="true"
      >
        <span className="smoke smoke-one" />
        <span className="smoke smoke-two" />
        <span className="smoke smoke-three" />
        <span className="volcano-cone" />
        <span className="lava-flow" />
      </div>
    );
  }

  if (visual === "seasons") {
    return (
      <div className="project-illustration seasons-illustration" aria-hidden="true">
        <span className="season-sun" />
        <span className="season-orbit">
          <i className="season-earth" />
        </span>
        <span className="season-axis" />
        <span className="season-quadrant season-spring">春</span>
        <span className="season-quadrant season-summer">夏</span>
        <span className="season-quadrant season-autumn">秋</span>
        <span className="season-quadrant season-winter">冬</span>
      </div>
    );
  }

  if (visual === "water-cycle") {
    return (
      <div className="project-illustration water-illustration" aria-hidden="true">
        <span className="water-sun" />
        <span className="cloud cloud-one" />
        <span className="cloud cloud-two" />
        <span className="rain rain-one" />
        <span className="rain rain-two" />
        <span className="rain rain-three" />
        <span className="water-wave" />
      </div>
    );
  }

  return (
    <div className="project-illustration typhoon-illustration" aria-hidden="true">
      <span className="typhoon-ring ring-one" />
      <span className="typhoon-ring ring-two" />
      <span className="typhoon-ring ring-three" />
      <span className="typhoon-eye" />
    </div>
  );
}

function CardContents({ project }: { project: ScienceProject }) {
  return (
    <>
      <div className="project-card-topline">
        <span>
          {project.category} · {project.index}
        </span>
        <span className="project-status">
          <i aria-hidden="true" />
          {project.status === "available" ? "可进入" : "即将上线"}
        </span>
      </div>

      <ProjectIllustration visual={project.visual} />

      <div className="project-card-copy">
        <h3>{project.title}</h3>
        <p>{project.description}</p>
      </div>

      <div className="project-card-footer">
        <span>
          {project.status === "available" ? "现在探索" : "展厅布置中"}
        </span>
        <span className="project-arrow" aria-hidden="true">
          {project.status === "available" ? "↗" : "·"}
        </span>
      </div>
    </>
  );
}

export default function ProjectCard({
  project,
}: {
  project: ScienceProject;
}) {
  const className = [
    "project-card",
    `project-card--${project.visual}`,
    project.status === "available" ? "is-available" : "is-coming-soon",
  ].join(" ");

  if (project.status === "available") {
    return (
      <a
        className={className}
        href={project.href}
        data-project={project.slug}
        data-status={project.status}
        aria-label={`进入${project.title}`}
      >
        <CardContents project={project} />
      </a>
    );
  }

  return (
    <article
      className={className}
      data-project={project.slug}
      data-status={project.status}
    >
      <CardContents project={project} />
    </article>
  );
}
