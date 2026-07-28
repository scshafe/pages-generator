import type { Metadata } from "next";
import Link from "next/link";
import { listProjects } from "@/lib/projects";
import { getSiteSettings } from "@/lib/content/site";
import { buildPageMetadata } from "@/lib/content/pageMetadata";
import "./projects.css";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return buildPageMetadata(site, {
    pageTitle: "Projects",
    description: "Projects I'm building and exploring.",
    pathname: "/projects"
  });
}

export default function ProjectsPage() {
  const projects = listProjects();

  return (
    <section className="projects-page">
      <header className="projects-header">
        <h1>Projects</h1>
        <p className="projects-intro">Things I&apos;m building, breaking, and learning from.</p>
      </header>

      {projects.length === 0 ? (
        <p className="projects-empty">Nothing here yet — check back soon.</p>
      ) : (
        <ul className="projects-grid">
          {projects.map((project) => (
            <li key={project.slug} className="projects-card">
              <div className="projects-card-meta">
                <span className={`projects-status projects-status--${project.status}`}>
                  {project.status}
                </span>
                {project.updated ? (
                  <span className="projects-updated">updated {project.updated}</span>
                ) : null}
              </div>
              <h2 className="projects-card-title">
                <Link href={`/projects/${project.slug}/`}>{project.title}</Link>
              </h2>
              <p className="projects-summary">{project.summary}</p>
              {project.tags.length > 0 ? (
                <ul className="projects-tags">
                  {project.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              ) : null}
              <div className="projects-links">
                <Link className="projects-more" href={`/projects/${project.slug}/`}>
                  Read more
                </Link>
                {project.repo ? (
                  <a href={project.repo} target="_blank" rel="noreferrer">
                    Repo
                  </a>
                ) : null}
                {project.demo ? (
                  <a href={project.demo} target="_blank" rel="noreferrer">
                    Demo
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
