import { TerminologyPanel } from "@/blogcomponents/settings/TerminologyPanel";

export default function TerminologyPage() {
  if (process.env.NEXT_PUBLIC_BUILD_MODE === "publish") {
    return (
      <section className="surface hero">
        <h1>Terminology</h1>
        <p>Terminology is only available in Author Mode.</p>
      </section>
    );
  }

  return (
    <section className="surface hero">
      <TerminologyPanel />
    </section>
  );
}
