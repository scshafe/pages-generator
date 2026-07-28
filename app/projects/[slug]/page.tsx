import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, listProjects } from "@/lib/projects";
import { getSiteSettings } from "@/lib/content/site";
import { buildPageMetadata } from "@/lib/content/pageMetadata";
import { markdownToHtml } from "@/lib/content/markdown";
import "../projects.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return listProjects().map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const project = getProject(params.slug);
  if (!project) return {};

  const site = await getSiteSettings();
  return buildPageMetadata(site, {
    pageTitle: project.title,
    description: project.summary,
    pathname: `/projects/${project.slug}`
  });
}

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const project = getProject(params.slug);
  if (!project) {
    notFound();
  }

  return (
    <article className="projects-detail">
      <Link className="projects-back" href="/projects/">
        ← All projects
      </Link>

      <header className="projects-detail-header">
        <div className="projects-card-meta">
          <span className={`projects-status projects-status--${project.status}`}>
            {project.status}
          </span>
          {project.started ? <span className="projects-updated">since {project.started}</span> : null}
          {project.updated ? <span className="projects-updated">updated {project.updated}</span> : null}
        </div>
        <h1>{project.title}</h1>
        <p className="projects-summary">{project.summary}</p>
        {project.tags.length > 0 ? (
          <ul className="projects-tags">
            {project.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : null}
        {project.repo || project.demo ? (
          <div className="projects-links">
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
        ) : null}
      </header>

      <div
        className="projects-article"
        dangerouslySetInnerHTML={{ __html: markdownToHtml(project.body) }}
      />
    </article>
  );
}
